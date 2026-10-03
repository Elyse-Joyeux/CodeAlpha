const crypto = require('crypto')
const { adminPassword } = require('../config')
const httpError = require('../utils/httpError')
const token = require('../utils/token')


exports.login = (req, res) => {
    const a = Buffer.from(String(req.body.password || '')), b = Buffer.from(adminPassword);
    if(a.length !== b.length || !crypto.timingSafeEqual(a, b)) throw httpError(401, 'Wrong password') 
    res.json({ token: token.issue() })
}
