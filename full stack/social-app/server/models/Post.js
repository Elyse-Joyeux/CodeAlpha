const mongoose = require('mongoose')

const commentSchema = new mongoose.Schema(
    {
        author: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User", 
            required: true,
        },

        text: {
            type: String, 
            required: true,
            maxLength: 500,
            trim: true,
        },
    }, 
    { timestamps: true },
)

const postSchema = new mongoose.Schema(
    {
        author: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        text: { type: String, required: true, maxLength: 1000, trim: true },
        image: { type: String, default: ""},
        likes: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
        comments: [commentSchema],
    },
    { timestamps: true },
)


module.exports = mongoose.model("Post", postSchema)