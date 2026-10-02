const { Order, Table, MenuItem, Inventory, Counter } = require("../models");
const { openStatuses } = require("../config");
const httpError = require("../utils/httpError");
const { dayRange, today } = require("../utils/dates");
const valid = require("mongoose").isValidObjectId;

// MongoDB transactions need a replica set, so stock is taken with atomic conditional updates
// ($inc only if enough stock remains) and handed back if any later step fails.
exports.place = async (tableId, items, note) => {
  const table = valid(tableId) && (await Table.findById(tableId));

  if (!table) throw httpError(404, "Table not found");
  if (!Array.isArray(items) || !items.length)
    throw httpError(400, "Add at least one item");

  const [menu, inv] = await Promise.all([
    MenuItem.find({
      _id: { $in: items.map((i) => i.menu_item_id).filter(valid) },
    }),
    Inventory.find({}, "name").lean(),
  ]);
  const byId = new Map(menu.map((m) => [String(m._id), m])),
    names = new Map(inv.map((i) => [String(i._id), i.name]));

  // 1. Validate and work out the total ingredient need across the WHOLE order
  const need = new Map(),
    lines = [];
  let total = 0;

  for (const { menu_item_id, qty } of items) {
    const m = byId.get(String(menu_item_id));
    if (!m || !m.available)
      throw httpError(409, `${m ? m.name : "Item"} is not available`);
    if (!Number.isInteger(qty) || qty < 1 || qty > 20)
      throw httpError(400, "Quantity must be between 1 and 20");
    total += m.price * qty;
    lines.push({ menu_item: m._id, name: m.name, qty, price: m.price });
    for (const r of m.recipe)
      need.set(
        String(r.inventory),
        (need.get(String(r.inventory)) || 0) + r.qty * qty,
      );
  }

  // 2. Take stock atomically (inventory auto-update); roll back on any failure
  const taken = [];
  try {
    for (const [id, q] of need) {
      const r = await Inventory.updateOne(
        { _id: id, stock: { $gte: q - 1e-9 } },
        { $inc: { stock: -q } },
      );
      if (!r.modifiedCount)
        throw httpError(
          409,
          `Not enough ${names.get(id)} in stock for this order`,
        );
      taken.push([id, q]);
    }
    const order = await Order.create({
      number: await Counter.nextOrderNumber(),
      table: table._id,
      table_number: table.number,
      total,
      note: String(note || "").slice(0, 200),
      items: lines,
      used: taken.map(([inventory, qty]) => ({ inventory, qty })),
    });
    await Table.updateOne({ _id: table._id }, { status: "occupied" });
    return order;
  } catch (e) {
    await Promise.all(
      taken.map(([id, q]) =>
        Inventory.updateOne({ _id: id }, { $inc: { stock: q } }),
      ),
    );
    throw e;
  }
};

exports.list = ({ status, date } = {}) => {
  const filter =
    status === "open"
      ? { status: { $in: openStatuses } }
      : (([a, b]) => ({ created_at: { $gte: a, $lt: b } }))(
          dayRange(date || today()),
        );
  return Order.find(filter).sort({ number: -1 });
};

// pending > preparing > served > paid   (cancel allowed before served)
const FLOW = {
  pending: ["preparing", "cancelled"],
  preparing: ["served", "cancelled"],
  served: ["paid"],
  paid: [],
  cancelled: [],
};

exports.changeStatus = async (id, next) => {
  const o = await Order.findById(id);

  if (!o) throw httpError(404, "Order not found");
  if (!(FLOW[o.status] || []).includes(next))
    throw httpError(409, `An order that is ${o.status} cannot become ${next}`);

  const upd = await Order.findOneAndUpdate(
    { _id: o._id, status: o.status },
    { status: next },
    { new: true },
  ); // guards double clicks

  if (!upd) throw httpError(409, "This order was just changed by someone else");
  if (next === "cancelled")
    await Promise.all(
      o.used.map((u) =>
        Inventory.updateOne({ _id: u.inventory }, { $inc: { stock: u.qty } }),
      ),
    );
  if (next === "paid" || next === "cancelled") {
    if (
      !(await Order.exists({ table: o.table, status: { $in: openStatuses } }))
    )
      await Table.updateOne({ _id: o.table }, { status: "free" });
  }
  return upd;
};
