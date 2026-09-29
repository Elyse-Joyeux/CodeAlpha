const mongoose = require('mongoose');

const urlSchema = new mongoose.Schema(
  {
    // short code that appears in the shortened link, e.g. "aB3xY9Z"
    shortCode: { type: String, required: true, unique: true },

    // original long URL the short code points to
    longUrl: { type: String, required: true, index: true },

    // how many times the short link has been opened
    clicks: { type: Number, default: 0 },
  },
  { timestamps: true } // adds createdAt and updatedAt
);

module.exports = mongoose.model('Url', urlSchema);
