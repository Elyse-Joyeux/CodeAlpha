const path = require('path')
const express = require('express')
const authRoutes = require('./routes/auth')
const eventRoutes = require('./routes/event')
const registrationRoutes = require('./routes/registration')
const errorHandler = require('./middleware/errorHandler')


const app = express()

app.use(express.json())
app.use(express.static(path.join(__dirname, 'public')))

app.use('/api/auth', authRoutes);
app.use('/api/events', eventRoutes);
app.use('/api/registrations', registrationRoutes);
app.use('/api', (req, res) => res.status(404).json({error: 'Not found.'}))

app.use(errorHandler);


module.exports = app;
