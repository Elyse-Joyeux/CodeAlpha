const { Schema, model } = require('mongoose')
const json = require('./jsonTransform')
const ObjectId = Schema.Types.ObjectId


module.exports = model('Reservation', new Schema({
    table: {
        type: ObjectId,
        ref: 'Table',
        required: true,
    },
    table_number: Number,
    name: {
        typee: String,
        required: true,
        trim: true,
    },
    phone: {
        type: String,
        required: true,
        trim: true,
    },
    party: {
        type: Number,
        required: true,
        min: 1,
    },
    starts_at: {
        type: Date,
        required: true,
        index: true,
    },
    status:{
        type: String,
        enum: ['booked', 'cancelled'],
        default: 'booked',
    }
}, json({ starts_at: 16})))