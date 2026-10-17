const jwt = require('jsonwebtoken')
const User = require('../models/User')


async function auth(req, res, next){
    try {
        const token = (req.headers.authorization || "").replace(/^Bearer\s+/i, "")
        if(!token) 
            return res.status(401).json({ error: "Please sign in to continue."})

        req.user = await User.findById(
            jwt.verify(token, process.env.JWT_SECRET || "development-only-secret").id,
        )

        if(!req.user)
            return res.status(401).json({ error: "Your session has expired. Please sign in again."})

        next()

    } catch {
        res.status(401).json({ error: "Your session has expired. Please sign in again."})
    }
}



module.exports = auth;