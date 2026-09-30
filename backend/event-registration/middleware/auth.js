const jwt = require('jsonwebtoken')
const User = require('../models/User')
const { jwtSecret } = require('../config')


async function loadUser(req) {
    const [scheme, token] = (req.headers.authorization || '').split(' ')
    if(scheme !== 'Bearer' || !token) return null;

    let payload;
    try{
        payload = jwt.verify(token, jwtSecret)
    } catch{
        return null;  // invalid or expired token
    }

    return User.findById(payload.sub)
}


// requires a valid login token
async function authenticate(req, res, next){
    const user = await loadUser(req)
    if(!user) return res.status(401).json({error: 'Log in to continue.'});
    req.user = user;
    next();
    
}


// attaches req.user when a valid token is sent, but allows anonymous requests
async function optionalAuth(req, res, next){
    req.user = await loadUser(req);
    next();
}

function requireAdmin(req, res, next){
    if(req.user.role !== 'admin'){
        return res.status(403).json({error: 'Only organizers can do this.'})
    }

    next();
}


module.exports = { authenticate, optionalAuth, requireAdmin };