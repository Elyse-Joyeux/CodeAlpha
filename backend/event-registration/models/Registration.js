const mongoose = require('mongoose')

const registrationSchema = new mongoose.Schema(
    {
        event: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Event',
            required: true,
        }, 

        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
            index: true,
        },

        // registration form fields
        fullName: {
            type: String,
            required: [true, 'Full name is required.'],
            trim: true,
            maxLength: [80, 'Full name must be 80 characters or fewer.'],
        }, 

        phone: {
            type: String,
            trim: true,
            maxLength: [30, 'Phone must be 30 characters or fewer.'],
            default: '',
        }, 

        notes: {
            type: String,
            trim: true,
            maxLength: [500, 'Notes must be 500 characters or fewer.'],
            default: '',
        }, 

        status: {
            type: String,
            enum: ['registered', 'cancelled'], 
            default: 'registered',
        },
        cancelledAt : { type: Date },
    }, 
    {
        timestamps: true,
        toJSON: {
            virtuals: true,
            versionKey: false,
            transform(doc, ret){
                delete ret._id;
            },
        },
    }
);


// one registration record per user per event. cancelling keeps the record
// (status: 'cancelled') and registering again reactivates it
registrationSchema.index({ event: 1, user: 1}, { unique: true })


module.exports = mongoose.model('Registration', registrationSchema);