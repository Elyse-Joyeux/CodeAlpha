const express = require('express');
const mongoose = require('mongoose');
const Message = require('../models/Message');
const User = require('../models/User');
const { auth } = require('../middleware/auth');

const router = express.Router();

// Recent conversation partners for the signed-in user.
router.get('/conversations', auth, async (req, res) => {
  try {
    const me = new mongoose.Types.ObjectId(req.userId);
    const rows = await Message.aggregate([
      { $match: { $or: [{ from: me }, { to: me }] } },
      { $sort: { createdAt: -1 } },
      { $group: { _id: { $cond: [{ $eq: ['$from', me] }, '$to', '$from'] }, latest: { $first: '$$ROOT' } } },
      { $sort: { 'latest.createdAt': -1 } },
    ]);
    const users = await User.find({ _id: { $in: rows.map((row) => row._id) } }).select('username avatar');
    const userById = new Map(users.map((user) => [user._id.toString(), user]));
    res.json(rows.map((row) => {
      const partner = userById.get(row._id.toString());
      return partner ? {
        user: { id: partner._id, username: partner.username, avatar: partner.avatar },
        latestMessage: { text: row.latest.text, createdAt: row.latest.createdAt, from: row.latest.from },
      } : null;
    }).filter(Boolean));
  } catch (err) {
    res.status(500).json({ message: 'Could not load conversations' });
  }
});

router.get('/:userId', auth, async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.userId)) return res.status(400).json({ message: 'Invalid user id' });
    const partner = await User.findById(req.params.userId).select('username avatar');
    if (!partner) return res.status(404).json({ message: 'User not found' });
    const messages = await Message.find({
      $or: [
        { from: req.userId, to: partner._id },
        { from: partner._id, to: req.userId },
      ],
    }).sort({ createdAt: 1 }).limit(300);
    res.json(messages.map((message) => ({
      id: message._id,
      from: message.from,
      to: message.to,
      text: message.text,
      createdAt: message.createdAt,
    })));
  } catch (err) {
    res.status(500).json({ message: 'Could not load messages' });
  }
});

router.post('/:userId', auth, async (req, res) => {
  try {
    const text = typeof req.body.text === 'string' ? req.body.text.trim() : '';
    if (!text) return res.status(400).json({ message: 'Message cannot be empty' });
    if (text.length > 2000) return res.status(400).json({ message: 'Message is too long' });
    if (!mongoose.isValidObjectId(req.params.userId)) return res.status(400).json({ message: 'Invalid user id' });
    if (req.params.userId === req.userId) return res.status(400).json({ message: 'You cannot message yourself' });
    const recipient = await User.findById(req.params.userId);
    if (!recipient) return res.status(404).json({ message: 'User not found' });
    const message = await Message.create({ from: req.userId, to: recipient._id, text });
    res.status(201).json({ id: message._id, from: message.from, to: message.to, text: message.text, createdAt: message.createdAt });
  } catch (err) {
    res.status(500).json({ message: 'Could not send message' });
  }
});

module.exports = router;
