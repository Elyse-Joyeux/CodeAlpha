const User = require('../models/User')
const Post = require('../models/Post')
const { safeUser, shapePost } = require('../utils/serializers')

function getMe(req, res) {
    if (!req.user)
        return res.status(401).json({ error: "Please sign in to continue." })

    res.json(safeUser(req.user))
}

async function updateMe(req, res) {
    for(const key of ['name', 'bio', 'avatar', 'location']) {
        if(req.body[key] !== undefined) 
            req.user[key] = req.body[key]
    }
    await req.user.save()
    res.json(safeUser(req.user))
}

async function listUsers(req, res) {
    const people = await User.find({ _id: { $ne: req.user._id}})
        .sort({ createdAt: -1})
        .limit(8)

    res.json(
        people.map((user) => ({
            ...safeUser(user),
            followed: req.user.following.some(
                (id) => String(id) === String(user._id),
            )
        }))
    )
}

async function getProfile(req, res) {
    const user = await User.findOne({ username: req.params.username.toLowerCase()})
    if(!user)
        return res.status(404).json({ error: "We couldn't find that profile."})

    const posts = await Post.find({ author: user._id})
        .sort({ createdAt: -1})
        .populate("author", "name username avatar")
        .populate("comments.author", "name username avatar")

    res.json({
        user: safeUser(user),
        posts: posts.map((post) => shapePost(post, req.user._id))
    })
}


async function toggleFollow(req, res) {
    if(String(req.user._id) === req.params.id)
        return res.status(400).json({ error: "You're already in your own corner."})

    const target = await User.findById(req.params.id)
    if(!target)
        return res.status(404).json({ error: "We couldn't find that person."})

    const following = req.user.following.some(
        (id) => String(id) === String(target._id),
    )

    if(following){
        req.user.following.pull(target._id)
        target.followers.pull(req.user._id)
    } else {
        req.user.following.addToSet(target._id)
        target.followers.addToSet(req.user._id)
    }

    await Promise.all([req.user.save(), target.save()])
    res.json({ following: !following, followers: target.followers.length})
}


module.exports = { getMe, updateMe, listUsers, getProfile, toggleFollow }

