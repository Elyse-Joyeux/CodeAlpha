const { Schema, model } = require('mongoose')
const json = require('./jsonTransform')


module.exports = model('Table', new Schema({
    number: {
        type: Number,
        required: true,
        unique: true,
    },
    seats: {
        type: Number,
        required: true,
        min: 1
    },
    status: {
        type: String,
        enum: ['free', 'occupied'],
        default: 'free'
    }
}, json()))