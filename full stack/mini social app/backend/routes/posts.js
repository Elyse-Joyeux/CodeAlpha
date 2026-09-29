const express = require('express');
const Post = require('../models/Post');
const Comment = require('../models/Comment');
const User = require('../models/User');
const { auth, optionalAuth } = require('../middleware/auth');

const router = express.Router();

function serializePost(post, userId) {
  const obj = post.toObject();
  obj.likesCount = obj.likes.length;
  obj.liked = userId ? obj.likes.some((l) => l.toString() === userId) : false;
  delete obj.likes;
  return obj;
}

// @route   GET /api/posts  (global feed, newest first)
router.get('/', optionalAuth, async (req, res) => {
  const posts = await Post.find()
    .sort({ createdAt: -1 })
    .limit(100)
    .populate('author', 'username avatar');
  res.json(posts.map((p) => serializePost(p, req.userId)));
});

// @route   GET /api/posts/feed  (posts from people I follow, + my own)
router.get('/feed', auth, async (req, res) => {
  const me = await User.findById(req.userId);
  const authorIds = [...me.following, me._id];
  const posts = await Post.find({ author: { $in: authorIds } })
    .sort({ createdAt: -1 })
    .limit(100)
    .populate('author', 'username avatar');
  res.json(posts.map((p) => serializePost(p, req.userId)));
});

// @route   POST /api/posts
router.post('/', auth, async (req, res) => {
  try {
    const { content, image } = req.body;
    if (!content || !content.trim()) {
      return res.status(400).json({ message: 'Post content is required' });
    }
    const post = await Post.create({ author: req.userId, content, image });
    await post.populate('author', 'username avatar');
    res.status(201).json(serializePost(post, req.userId));
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error creating post' });
  }
});

// @route   DELETE /api/posts/:id
router.delete('/:id', auth, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ message: 'Post not found' });
    if (post.author.toString() !== req.userId) {
      return res.status(403).json({ message: 'Not authorized to delete this post' });
    }
    await Comment.deleteMany({ post: post._id });
    await post.deleteOne();
    res.json({ message: 'Post deleted' });
  } catch (err) {
    res.status(400).json({ message: 'Invalid post id' });
  }
});

// @route   POST /api/posts/:id/like  (toggle like)
router.post('/:id/like', auth, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ message: 'Post not found' });

    const alreadyLiked = post.likes.some((l) => l.toString() === req.userId);
    if (alreadyLiked) {
      post.likes.pull(req.userId);
    } else {
      post.likes.push(req.userId);
    }
    await post.save();

    res.json({ liked: !alreadyLiked, likesCount: post.likes.length });
  } catch (err) {
    res.status(400).json({ message: 'Invalid post id' });
  }
});

// @route   GET /api/posts/:id/comments
router.get('/:id/comments', async (req, res) => {
  try {
    const comments = await Comment.find({ post: req.params.id })
      .sort({ createdAt: 1 })
      .populate('author', 'username avatar');
    res.json(comments);
  } catch (err) {
    res.status(400).json({ message: 'Invalid post id' });
  }
});

// @route   POST /api/posts/:id/comments
router.post('/:id/comments', auth, async (req, res) => {
  try {
    const { text } = req.body;
    if (!text || !text.trim()) {
      return res.status(400).json({ message: 'Comment text is required' });
    }
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ message: 'Post not found' });

    const comment = await Comment.create({ post: post._id, author: req.userId, text });
    await comment.populate('author', 'username avatar');
    res.status(201).json(comment);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error creating comment' });
  }
});

// @route   DELETE /api/posts/comments/:commentId
router.delete('/comments/:commentId', auth, async (req, res) => {
  try {
    const comment = await Comment.findById(req.params.commentId);
    if (!comment) return res.status(404).json({ message: 'Comment not found' });
    if (comment.author.toString() !== req.userId) {
      return res.status(403).json({ message: 'Not authorized to delete this comment' });
    }
    await comment.deleteOne();
    res.json({ message: 'Comment deleted' });
  } catch (err) {
    res.status(400).json({ message: 'Invalid comment id' });
  }
});

module.exports = router;
