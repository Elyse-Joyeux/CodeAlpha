require("dotenv").config({quiet: true})

// A trailing slash after the database name becomes part of MongoDB's
// namespace (for example, `event-registration/.events`).
const mongoUri = (process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/event-registration')
  .trim()
  .replace(/\/+([?#]|$)/, '$1')

if(!process.env.JWT_SECRET){
    if(process.env.NODE_ENV === 'production'){
        throw new Error("JWT_SECRET must be set in production")
    }
    console.warn('JWT_SECRET is not set. Using an insecure development secret')
}

module.exports = {
    port: process.env.PORT || 3000,
    mongoUri,
    jwtSecret: process.env.JWT_SECRET || '986abcw09ahdkah978092nqalndad9y9bjkv',
    jwtExpiresIn: '7d',
  };
