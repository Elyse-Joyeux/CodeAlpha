require("dotenv").config()

const express = require('express')
const mongoose = require('mongoose')
const path = require('path')
const authRoutes = require('./routes/authRoutes')
const userRoutes = require('./routes/userRoutes')
const postRoutes = require('./routes/postRoutes')

const app = express()
app.use(express.json({ limit: '1mb'}))
app.use(express.static(path.join(__dirname, '..', 'public')))
app.use('/api/auth', authRoutes)
app.use('/api', userRoutes)
app.use('/api', postRoutes)
app.get(/.*/, (req, res) => res.sendFile(path.join(__dirname, '..', 'public', 'index.html')))


const port = process.env.PORT || 3000
mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1/kindred')
    .then(() => app.listen(port, () => console.log(`Kindred is already running at http://localhost:${port}`)))
    .catch(err => { 
        console.error('MongoDB connection failed:', err.message)
        process.exit(1)
    })
