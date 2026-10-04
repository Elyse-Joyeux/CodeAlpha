const { MenuItem, Inventory } = require("../models");
const httpError = require("../utils/httpError");

// "portions" = how many of this dish the current stock can still make.
exports.listWithPortions = async () => {
  const [items, inv] = await Promise.all([
    MenuItem.find().sort({ category: 1, name: 1 }),
    Inventory.find().lean(),
  ]);
  const stock = new Map(inv.map((i) => [String(i._id), i.stock]));
  return items.map((m) => ({
    ...m.toJSON(),
    portions: m.recipe.length
      ? Math.min(
          ...m.recipe.map((r) =>
            Math.floor((stock.get(String(r.inventory)) || 0) / r.qty + 1e-9),
          ),
        )
      : 999,
  }));
};

const toRecipe = async (recipe) => {
  if (!Array.isArray(recipe))
    throw httpError(400, "Recipe must be a list of ingredients");
  const ids = recipe.map((r) => r.inventory_id);
  if (
    (await Inventory.countDocuments({ _id: { $in: ids } })) !==
    new Set(ids.map(String)).size
  )
    throw httpError(400, "Recipe contains an unknown ingredient");
  return recipe.map((r) => ({ inventory: r.inventory_id, qty: Number(r.qty) }));
};

exports.create = async ({
  name,
  category,
  price,
  description,
  recipe = [],
}) => {
  if (!name || !category || !(Number(price) > 0))
    throw httpError(400, "Name, category and a price are required");
  return MenuItem.create({
    name,
    category,
    price: Math.round(price),
    description,
    recipe: await toRecipe(recipe),
  });
};

exports.update = async (id, body) => {
  const upd = {};
  for (const k of ["name", "category", "description"])
    if (body[k] !== undefined) upd[k] = body[k];
  if (body.available !== undefined) upd.available = !!body.available;
  if (body.price !== undefined) upd.price = Math.round(body.price);
  if (body.recipe !== undefined) upd.recipe = await toRecipe(body.recipe);
  const doc = await MenuItem.findByIdAndUpdate(id, upd, {
    returnDocument: "after",
    runValidators: true,
  });
  if (!doc) throw httpError(404, "Menu item not found");
  return doc;
};

exports.remove = async (id) => {
  if (!(await MenuItem.findByIdAndDelete(id)))
    throw httpError(404, "Menu item not found");
};
