const Post = require('../models/Post')
const { shapePost } = require('../utils/serializers')

const populatePost = (query) =>
    query.populate("author", "name username avatar").populate("comments.author", "name username avatar")

async function listPosts(req, res) {
    const posts = await populatePost(
        Post.find().sort({ createdAt: -1 }).limit(60),
    )
    res.json(posts.map((post) => shapePost(post, req.user._id)))
}

async function createPost(req, res) {
    const text = (req.body.text || "").trim()
    if(!text)
        return res.status(400).json({ error: "Add a little something before sharing."})

    const post = await Post.create({
        author: req.user._id,
        text,
        image: req.body.image || "",
    })

    await post.populate("author", "name username avatar")
    res.status(201).json(shapePost(post, req.user._id))
}

async function deletePost(req, res) {
    const post = await Post.findOneAndDelete({
        _id: req.params.id,
        author: req.user._id,
    })
    if(!post)
        return res.status(404).json({ error: "Post not fond, or it belongs to someone else."})

    res.json({ ok: true })
}

async function toggleLike(req, res) {
    const post = await Post.findById(req.params.id)
    if(!post)
        return res.status(404).json({ error: "Post is no longer here."})

    const index = post.likes.findIndex(
        (id) => String(id) === String(req.user._id),
    )

    if(index < 0) 
        post.likes.push(req.user._id)
    else 
        post.likes.splice(index, 1)
    
    await post.save()

    res.json({ likes: post.likes.length, liked: index < 0})
}

async function addComment(req, res) {
    const text = (req.body.text || "").trim()
    if(!text)
        return res.status(400).json({ error: "Write a comment first."})

    const post = await Post.findById(req.params.id)
    if(!post)
        return res.status(404).json({ error: "Post is no longer here."})

    post.comments.push({ author: req.user._id, text})
    await post.save()
    await post.populate("author", "name username avatar")
    await post.populate("comments.author", "name username avatar")

    res.status(201).json(shapePost(post, req.user._id))

}


module.exports = { listPosts, createPost, deletePost, toggleLike, addComment }