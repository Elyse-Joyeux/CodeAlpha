const express = require('express');
const User = require('../models/User');
const Post = require('../models/Post');
const { auth, optionalAuth } = require('../middleware/auth');

const router = express.Router();

// @route   GET /api/users/me
router.get('/me', auth, async (req, res) => {
  const user = await User.findById(req.userId);
  if (!user) return res.status(404).json({ message: 'User not found' });
  res.json(user.toPublicJSON());
});

// @route   PUT /api/users/me  (update profile: bio, avatar)
router.put('/me', auth, async (req, res) => {
  try {
    const { bio, avatar } = req.body;
    const user = await User.findById(req.userId);
    if (!user) return res.status(404).json({ message: 'User not found' });

    if (bio !== undefined) user.bio = bio;
    if (avatar !== undefined) user.avatar = avatar;
    await user.save();

    res.json(user.toPublicJSON());
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error updating profile' });
  }
});

// @route   GET /api/users/search?q=term
router.get('/search', optionalAuth, async (req, res) => {
  const q = (req.query.q || '').trim();
  if (!q) return res.json([]);
  const users = await User.find({ username: { $regex: q, $options: 'i' } }).limit(10);
  res.json(users.map((u) => u.toPublicJSON()));
});

// @route   GET /api/users/suggestions
router.get('/suggestions', auth, async (req, res) => {
  try {
    const me = await User.findById(req.userId).select('following');
    if (!me) return res.status(404).json({ message: 'User not found' });
    const excluded = [req.userId, ...me.following.map((id) => id.toString())];
    const users = await User.find({ _id: { $nin: excluded } }).select('username avatar bio').limit(5);
    res.json(users.map((user) => user.toPublicJSON()));
  } catch (err) {
    res.status(500).json({ message: 'Could not load people to follow' });
  }
});

// @route   GET /api/users/:id  (public profile)
router.get('/:id', optionalAuth, async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    const isFollowing = req.userId
      ? user.followers.some((f) => f.toString() === req.userId)
      : false;

    res.json({ ...user.toPublicJSON(), isFollowing, isSelf: req.userId === req.params.id });
  } catch (err) {
    res.status(400).json({ message: 'Invalid user id' });
  }
});

// @route   GET /api/users/:id/posts
router.get('/:id/posts', async (req, res) => {
  try {
    const posts = await Post.find({ author: req.params.id })
      .sort({ createdAt: -1 })
      .populate('author', 'username avatar');
    res.json(posts);
  } catch (err) {
    res.status(400).json({ message: 'Invalid user id' });
  }
});

// @route   POST /api/users/:id/follow
router.post('/:id/follow', auth, async (req, res) => {
  try {
    const targetId = req.params.id;
    if (targetId === req.userId) {
      return res.status(400).json({ message: "You can't follow yourself" });
    }

    const target = await User.findById(targetId);
    const me = await User.findById(req.userId);
    if (!target || !me) return res.status(404).json({ message: 'User not found' });

    const alreadyFollowing = target.followers.some((f) => f.toString() === req.userId);

    if (alreadyFollowing) {
      target.followers.pull(req.userId);
      me.following.pull(targetId);
    } else {
      target.followers.push(req.userId);
      me.following.push(targetId);
    }

    await target.save();
    await me.save();

    res.json({
      following: !alreadyFollowing,
      followersCount: target.followers.length,
    });
  } catch (err) {
    console.error(err);
    res.status(400).json({ message: 'Invalid user id' });
  }
});

module.exports = router;
