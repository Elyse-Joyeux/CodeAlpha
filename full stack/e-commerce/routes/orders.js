const express = require('express');
const Order = require('../models/Order');
const Product = require('../models/Product');
const { protect } = require('../middleware/auth');

const router = express.Router();

router.post('/', protect, async (req, res, next) => {
  try {
    const { items, shippingAddress, paymentMethod } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: 'No order items' });
    }
    if (
      !shippingAddress ||
      !shippingAddress.address ||
      !shippingAddress.city ||
      !shippingAddress.postalCode ||
      !shippingAddress.country
    ) {
      return res
        .status(400)
        .json({ message: 'A complete shipping address is required' });
    }

    const orderItems = [];
    let itemsPrice = 0;

    for (const it of items) {
      if (!it.product || !it.qty || it.qty < 1) {
        return res
          .status(400)
          .json({ message: 'Each item needs a product id and qty >= 1' });
      }
      const product = await Product.findById(it.product);
      if (!product) {
        return res.status(404).json({ message: `Product not found: ${it.product}` });
      }
      if (product.countInStock < it.qty) {
        return res.status(409).json({
          message: `Not enough stock for "${product.name}" (available: ${product.countInStock})`,
        });
      }

      orderItems.push({
        product: product._id,
        name: product.name,
        qty: it.qty,
        price: product.price,
        image: product.image,
      });
      itemsPrice += product.price * it.qty;
      product.countInStock -= it.qty;
      await product.save();
    }

    const shippingPrice = itemsPrice > 100 ? 0 : 9.99;
    const taxPrice = Math.round(itemsPrice * 0.1 * 100) / 100;
    const totalPrice = Math.round((itemsPrice + shippingPrice + taxPrice) * 100) / 100;

    const order = await Order.create({
      user: req.user._id,
      items: orderItems,
      shippingAddress,
      paymentMethod: paymentMethod || 'Cash on Delivery',
      itemsPrice,
      shippingPrice,
      taxPrice,
      totalPrice,
    });

    res.status(201).json({ order });
  } catch (err) {
    next(err);
  }
});
router.get('/', protect, async (req, res, next) => {
  try {
    const orders = await Order.find({ user: req.user._id })
      .sort({ createdAt: -1 })
      .populate('user', 'name email');
    res.json({ orders });
  } catch (err) {
    next(err);
  }
});
router.get('/:id', protect, async (req, res, next) => {
  try {
    const order = await Order.findById(req.params.id).populate(
      'user',
      'name email'
    );
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }
    // Only the owner may view their order.
    if (order.user._id.toString() !== req.user._id.toString() && !req.user.isAdmin) {
      return res.status(403).json({ message: 'Not authorized to view this order' });
    }
    res.json({ order });
  } catch (err) {
    if (err.name === 'CastError') {
      return res.status(404).json({ message: 'Order not found' });
    }
    next(err);
  }
});

module.exports = router;
