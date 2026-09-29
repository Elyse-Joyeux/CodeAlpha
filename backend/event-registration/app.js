const path = require('path')
const express = require('express')


const app = express()

app.use(express.json())
app.use(express.static(path.join(__dirname, 'public')))


module.exports = app;