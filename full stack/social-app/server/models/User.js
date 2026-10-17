const mongoose = require('mongoose')

const userSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: true,
            trim: true,
            maxLength: 48,
        },

        username: {
            type: String,
            required: true,
            unique: true,
            lowercase: true,
            trim: true,
            match: /^[a-z0-9_]{3,20}$/,
        }, 

        email: {
            type: String,
            required: true,
            unique: true,
            lowercase: true,
            trim: true,
        },

        password: { type: String, required: true, select: false },
        bio: {
            type: String,
            default: 'Finding the good in the everyday.',
            maxLength: 100,
        },

        avatar: { type: String, default: '' },
        location: { type: String, default: '' },
        followers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
        following: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    },

    { timestamps: true },
)


module.exports = mongoose.model('User', userSchema)