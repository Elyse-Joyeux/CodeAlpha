const path = require('path')
require('dotenv').config({ path: path.join(__dirname, '../../.env') })
const crypto = require("crypto");


module.exports = {
    port: process.env.PORT || 3000,
    mongoUri: process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/hearth',
    adminPassword: process.env.ADMIN_PASSWORD || 'admin123',
    tokenSecret: process.env.TOKEN_SECRET || crypto.randomBytes(32).toString('hex'),
    tokenTtlMs: 8 * 3600e3,
    stayMs: 90 * 60000,                       // how long a party is assumed to hold a table
    openStatuses: ['pending', 'preparing', 'served']
}