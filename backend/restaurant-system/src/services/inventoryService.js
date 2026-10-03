const { Inventory, MenuItem } = require("../models");
const httpError = require("../utils/httpError");

exports.list = () => Inventory.find().sort({ name: 1 });

exports.create = ({ name, unit, stock, reorder_level }) => {
  if (!name || !unit || stock === undefined || !Number.isFinite(Number(stock)) || Number(stock) < 0)
    throw httpError(400, "Name, unit and a starting stock are required.");
  if (reorder_level !== undefined && (!Number.isFinite(Number(reorder_level)) || Number(reorder_level) < 0))
    throw httpError(400, "Reorder level must be a non-negative number.");
  return Inventory.create({
    name,
    unit,
    stock: Number(stock),
    reorder_level: reorder_level === undefined ? 5 : Number(reorder_level),
  });
};

// restock { add } and/or change { reorder_level }
exports.update = async (id, { add, reorder_level }) => {
  if (add !== undefined && (!Number.isFinite(Number(add)) || Number(add) <= 0))
    throw httpError(400, "Amount to add must be a positive number");
  if (reorder_level !== undefined && (!Number.isFinite(Number(reorder_level)) || Number(reorder_level) < 0))
    throw httpError(400, "Reorder level must be a non-negative number.");
  add = add === undefined ? 0 : Number(add);
  if (add === 0 && reorder_level === undefined)
    throw httpError(400, "Enter an amount to add");
  const upd = {};
  if (add > 0) upd.$inc = { stock: add };
  if (reorder_level !== undefined)
    upd.$set = { reorder_level: Number(reorder_level) };
  const doc = await Inventory.findByIdAndUpdate(id, upd, {
    new: true,
    runValidators: true,
  });
  if (!doc) throw httpError(404, "Ingredient not found");

  return doc;
};

exports.remove = async (id) => {
  if (await MenuItem.exists({ "recipe.inventory": id }))
    throw httpError(409, "This ingredient is used in a menu recipe");
  if (!(await Inventory.findByIdAndDelete(id)))
    throw httpError(404, "Ingredient not found");
};

// stack alerts
exports.lowStock = async () =>
  (await Inventory.find())
    .filter((i) => i.stock <= i.reorder_level)
    .sort(
      (a, b) =>
        a.stock / (a.reorder_level || 1) - b.stock / (b.reorder_level || 1),
    );
