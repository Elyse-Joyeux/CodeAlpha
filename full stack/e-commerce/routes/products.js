const express = require('express');
const Product = require('../models/Product');
const { protect, admin } = require('../middleware/auth');

const router = express.Router();
router.get('/', async (req, res, next) => {
  try {
    const pageSize = Number(req.query.limit) || 12;
    const page = Number(req.query.page) || 1;

    const filter = {};
    if (req.query.category && req.query.category !== 'All') {
      filter.category = req.query.category;
    }
    if (req.query.search) {
      filter.$or = [
        { name: { $regex: req.query.search, $options: 'i' } },
        { description: { $regex: req.query.search, $options: 'i' } },
      ];
    }

    const count = await Product.countDocuments(filter);
    const products = await Product.find(filter)
      .sort({ createdAt: -1 })
      .skip(pageSize * (page - 1))
      .limit(pageSize);

    res.json({
      products,
      page,
      pages: Math.ceil(count / pageSize) || 1,
      total: count,
    });
  } catch (err) {
    next(err);
  }
});
router.get('/categories', async (req, res, next) => {
  try {
    const cats = await Product.distinct('category');
    res.json({ categories: cats.sort() });
  } catch (err) {
    next(err);
  }
});
router.get('/:id', async (req, res, next) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }
    res.json({ product });
  } catch (err) {
    if (err.name === 'CastError') {
      return res.status(404).json({ message: 'Product not found' });
    }
    next(err);
  }
});
router.post('/', protect, admin, async (req, res, next) => {
  try {
    const product = await Product.create(req.body);
    res.status(201).json({ product });
  } catch (err) {
    next(err);
  }
});
router.put('/:id', protect, admin, async (req, res, next) => {
  try {
    const product = await Product.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }
    res.json({ product });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
