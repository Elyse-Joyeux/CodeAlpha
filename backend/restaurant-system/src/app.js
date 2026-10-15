const express = require('express')
const path = require('path')
const routes = require('./routes')
const { notFound, errorHandler } = require('./middleware/errorHandler')


const app = express()
app.use(express.json({ limit: '32kb' }))
app.use(express.static(path.join(__dirname, '..', 'public')))    // frontend
app.use('/api', routes)
app.use('/api', notFound)
app.use(errorHandler)



module.exports = app;
