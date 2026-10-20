const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const User = require('../models/User')
const { safeUser } = require('../utils/serializers')

const tokenFor = (user) =>
    jwt.sign(
        { id: user._id}, 
        process.env.JWT_SECRET || 'development-only-secret',
        { expiresIn: '7d' }
    )


async function register(req, res) {
    try {
        const { name, username, email, password } = req.body
        if (!name || !username || !email || !password)
            return res.status(400).json({ error: "Please complete every field."})

        if(password.length < 8)
            return res.status(400).json({error: "Your password needs at least 8 characters."})

        const user = await User.create({
            name, 
            username: username.toLowerCase().replace(/^@/, ""),
            email,
            password: await bcrypt.hash(password, 12),
        })

        res.status(201).json({ token: tokenFor(user), user: safeUser(user) })
        
    } catch (error){
        res.status(error.code === 11000 ? 409 : 400)
            .json({
                error: error.code === 11000 ? "Email or username already in use." : error.message || "Could not create your account."
            })
    }
}

async function login(req, res) {
    const email = (req.body.email || "").toLowerCase().trim()
    const user = await User.findOne({ email }).select("+password")

    if(!user || (!await bcrypt.compare(req.body.password || "", user.password)))
        return res.status(401).json({ error: "Invalid credentials."})

    res.json({ token: tokenFor(user), user: safeUser(user)})
}


module.exports = { register, login }
