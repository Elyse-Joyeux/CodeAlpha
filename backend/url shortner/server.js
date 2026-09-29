require("dotenv").config()

const path = require("path")
const crypto = require("crypto")
const express = require("express")
const mongoose = require("mongoose")
const Url = require("./models/Url")
const { config } = require("dotenv")

const PORT = process.env.PORT || 3000
const MONGODB_URI = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/url-shortener"

const CODE_LENGTH = 7;
const ALPHABET = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz"
const CODE_PATTERN = new RegExp(`^[0-9A-Za-z]{${CODE_LENGTH}}$`)

const app = express()
app.use(express.json())
app.use(express.static((path.join(__dirname, 'public'))))


// helpers
//random base62 string
function generateCode(length = CODE_LENGTH){
    let code = ""
    for (let i = 0; i < length; i++){
        code += ALPHABET[crypto.randomInt(ALPHABET.length)]
    }

    return code;
}


//returns a normalized http url string, or null if input isn't valid
function normalizeUrl(input){
    if(typeof input !== 'string') return null;

    let value = input.trim()
    if(!value) return null;

    //let people type "example.com" without scheme
    if(!value.includes("://")) value = `https://${value}`

    try{
        const parsed = new URL(value)
        if(!['http:', 'https:'].includes(parsed.protocol)) return null;
        return parsed.href;

    } catch{
        return null
    }
}

// wraps async route handlers so errors reach the error handler belo
const asyncHandler = (fn) => (req, res, next) =>
    Promise.resolve(fn(req, res, next)).catch(next);

function baseUrl(req){
    const configured = process.env.BASE_URL
    if(configured) return configured.replace(/\/+$/, '');
    return `${req.protocol}://${req.get('host')}`;
}


// api

// create a short link
app.post('/api/shorten', asyncHandler(async (req, res) => {
    const longUrl = normalizeUrl(req.body && req.body.url);
    if (!longUrl){
        return res.status(400).json({error: "Enter a valid that starts with http:// or https://"})
    }

    // if url was already shortened before, resuse its code
    let doc = await Url.findOne({longUrl})

    if(!doc){
        // a collision on the unique index is very unlikely, but retry if it happens\
        for(let attempt = 0; attempt < 5 && !doc; attempt++){
            
            try{
                doc = await Url.create({shortCode: generateCode(), longUrl})
            } catch(err){
                if(err.code !== 11000) throw err;
            }

        }

        if(!doc){
            return res.status(500).json({error: "Could not generate a unique code. Try again."})
        }
    }

    res.status(201).json({shortCode: doc.shortCode, shortUrl: `${baseUrl(req)}/${doc.shortCode}`, longUrl: doc.longUrl})
}))


// redirect 
app.get("/:code", asyncHandler(async (req, res, next) => {
    const { code } = req.params
    if(!CODE_PATTERN.test(code)) return next()

    const doc = await Url.findOneAndUpdate(
        {shortCode: code},
        {$inc: {clicks: 1}}
    )

    if(!doc) return next();

    // 302(temporarry) so browsers don't cache it and every visit is counted
    res.redirect(302,doc.longUrl)
    
}))


// fallbacks
app.use((req, res) => {
    res.status(404).sendFile(path.join(__dirname, 'public', '404.html'))
})

app.use((err, req, res, next) =>{
    console.error(err)
    res.status(500).json({error: "Something went wrong on the server."})
})