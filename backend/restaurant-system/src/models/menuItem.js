const { Schema, model } = require("mongoose");
const json = require("./jsonTransform");
const ObjectId = Schema.Types.ObjectId;

// the recipe says which ingredients (and how much) one portion uses.
const recipeLine = new Schema(
  {
    inventory: {
      type: ObjectId,
      ref: "Inventory",
      required: true,
    },

    qty: {
      type: Number,
      required: true,
      min: 0.0001,
    },
  },
  {
    _id: false,
  },
);

module.exports = model(
  "MenuItem",
  new Schema(
    {
      name: {
        type: String,
        required: true,
        trim: true,
      },

      category: {
        type: String,
        required: true,
        trim: true,
      },

      price: {
        type: Number,
        required: true,
        min: 1,
      },

      description: {
        type: String,
        default: true,
      },

      available: {
        type: Boolean,
        default: "",
      },

      recipe: [recipeLine],
    },
    json(),
  ),
);
