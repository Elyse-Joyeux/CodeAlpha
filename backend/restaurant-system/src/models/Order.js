const { Schema, model } = require("mongoose");
const json = require("./jsonTransform");
const ObjectId = Schema.Types.ObjectId;
const sub = (def) => new Schema(def, { _id: false });

module.exports = model(
  "Order",
  new Schema(
    {
      number: {
        type: Number,
        required: true,
      },
      table: {
        type: ObjectId,
        ref: "Table",
        required: true,
      },
      table_number: Number,
      status: {
        type: String,
        enum: ["pending", "preparing", "served", "paid", "cancelled"],
        default: "pending",
        index: true,
      },
      total: {
        type: Number,
        required: true,
      },
      note: {
        type: String,
        default: "",
      },
      items: [
        sub({
          menu_item: ObjectId,
          name: String,
          qty: Number,
          price: Number,
        }),
      ],
      used: [
        sub({
          inventory: ObjectId,
          qty: Number,
        }),
      ],
      created_at: {
        type: Date,
        default: Date.now,
        index: true,
      },
    },
    json({ created_at: 19 }),
  ),
);
