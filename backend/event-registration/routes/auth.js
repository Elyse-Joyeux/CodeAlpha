const express = require('express')
const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const User = require('../models/User')
const { authenticate } = require('../middleware/auth')
const { jwtSecret, jwtExpiresIn } = require('../config')
const { str } = require('../utils')

const router = express.Router()

const signToken = (user) => jwt.sign({ sub: user.id, role: user.role }, jwtSecret, {
    expiresIn: jwtExpiresIn,
})

// create an account (always a regular user; organizers created with npm run seed)
router.post('/register', async(req, res) =>{
    const body = req.body || {};
    const password = typeof body.password === 'string' ? body.password : ''

    if(password.length < 8){
        return res.status(400).json({error: "Password must be at least 8 characters."})
    }

    try{
        const user = await User.create({
            name: str(body.name),
            email: str(body.email),
            passwordHash: await bcrypt.hash(password, 10)
        })

        res.status(201).json({token: signToken(user), user})

    } catch(err){
        if(err.code === 11000){
            return res.status(409).json({error: "An account with this email already exists."})
        }
        throw err;
    }
})


router.post('/login', async(req, res) =>{
    const body = req.body || {}
    // only accept strings so an object can never reach our query
    if(typeof body.email !== 'string' || typeof body.password !== 'string'){
        return res.status(400).json({error: "Enter your email and password"})
    }

    const user = await User.findOne({
        email: body.email.trim().toLowerCase(),
    }).select('+passwordHash');

    const ok = user && (await bcrypt.compare(body.password, user.passwordHash))
    if(!ok) {
        return res.status(401).json({error: "Incorrect email or password"})
    }

    res.json({token: signToken(user), user})
})


router.get('/me', authenticate, (req, res)=>{
    res.json({user: req.user})
})





module.exports = router;
