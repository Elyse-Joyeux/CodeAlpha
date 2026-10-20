const express = require('express');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { protect } = require('../middleware/auth');

const router = express.Router();

function signToken(id) {
  return jwt.sign({ id }, process.env.JWT_SECRET || 'dev_secret', {
    expiresIn: '7d',
  });
}

function publicUser(user) {
  return {
    _id: user._id,
    name: user.name,
    email: user.email,
    isAdmin: user.isAdmin,
  };
}
router.post('/register', async (req, res, next) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res
        .status(400)
        .json({ message: 'Name, email and password are required' });
    }

    const exists = await User.findOne({ email: email.toLowerCase() });
    if (exists) {
      return res.status(409).json({ message: 'Email already registered' });
    }

    const user = await User.create({ name, email, password });
    const token = signToken(user._id);

    res.status(201).json({ token, user: publicUser(user) });
  } catch (err) {
    next(err);
  }
});
router.post('/login', async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res
        .status(400)
        .json({ message: 'Email and password are required' });
    }

    // Need the password field (it's select:false by default).
    const user = await User.findOne({ email: email.toLowerCase() }).select(
      '+password'
    );
    if (!user || !(await user.matchPassword(password))) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    const token = signToken(user._id);
    res.json({ token, user: publicUser(user) });
  } catch (err) {
    next(err);
  }
});
router.get('/me', protect, async (req, res, next) => {
  try {
    res.json({ user: publicUser(req.user) });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
