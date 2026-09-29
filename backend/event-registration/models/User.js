const mongoose = require('mongoose')

const userSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: [true, "Name is required"],
            trim: true,
            maxLength: [80, "Name must be 80 characters or fewer"],
        }, 
        
        email: {
            type: String, 
            required: [true, "Email is required"],
            unique: true,
            lowercase: true,
            trim: true,
            match: [/^\S+@\S+\.\S+$/, 'Enter a valid email address.'],
        },

        // never returned by queries unless explicitly with selct('+passwordHash)
        passwordHash: { type: String, required: true, select: false, },
        role: { type: String, enum: ['user', 'admin'], default: 'user'},
    },

    {
        timestamps: true,
        toJSON: {
            virtuals: true,
            versionKey: false,
            transform(doc, ret){
                delete ret._id;
                delete ret.passwordHash;
            },
        },
    }
);




module.exports = mongoose.model('User', userSchema)