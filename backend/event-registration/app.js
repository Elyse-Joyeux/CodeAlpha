const path = require('path')
const express = require('express')


const app = express()

app.use(express.json())
app.use(express.static(path.joinc(__dirname, 'public')))

