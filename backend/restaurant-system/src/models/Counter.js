const { Schema, model } = require("mongoose");

const Counter = model("Counter", newSchema({ _id: String, n: Number }));

// atomic order numbers (1, 2, 3...)
Counter.nextOrderNumber = async () =>
  (
    await Counter.findByIdAndUpdate(
      "order",
      { $inc: { n: 1 } },
      { new: true, upsert: true },
    )
  ).n;

module.exports = Counter;
