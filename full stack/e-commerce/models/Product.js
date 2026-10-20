const mongoose = require('mongoose');

const productSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Product name is required'],
      trim: true,
    },
    description: {
      type: String,
      required: [true, 'Description is required'],
    },
    price: {
      type: Number,
      required: [true, 'Price is required'],
      min: [0, 'Price cannot be negative'],
      default: 0,
    },
    image: {
      type: String,
      default: 'placeholder.png',
    },
    category: {
      type: String,
      required: true,
      default: 'General',
      index: true,
    },
    countInStock: {
      type: Number,
      required: true,
      min: [0, 'Stock cannot be negative'],
      default: 0,
    },
    rating: {
      type: Number,
      default: 0,
      min: 0,
      max: 5,
    },
    numReviews: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);
productSchema.index({ name: 'text', description: 'text' });

module.exports = mongoose.model('Product', productSchema);
