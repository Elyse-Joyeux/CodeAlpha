const { Schema, model } = require("mongoose");
const json = require("./jsonTransform");

module.exports = model(
  "Inventory",
  new Schema(
    {
      name: {
        type: String,
        required: true,
        unique: true,
        trim: true,
      },

      unit: {
        type: String,
        required: true,
        trim: true,
      },

      stock: {
        type: Number,
        required: true,
        min: 0,
      },

      reorder_level: {
        type: Number,
        default: 5,
        min: 0,
      },
    },
    json(),
  ),
);
