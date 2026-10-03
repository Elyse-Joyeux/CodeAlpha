const { Inventory, MenuItem, Table, Order, Counter } = require("../models");

async function seed() {
  if (await MenuItem.countDocuments()) return;

  const inv = {};
  for (const [name, unit, stock, reorder_level] of [
    ["Chicken", "kg", 25, 6],
    ["Beef", "kg", 20, 5],
    ["Tilapia", "kg", 15, 4],
    ["Rice", "kg", 40, 10],
    ["Potatoes", "kg", 30, 8],
    ["Tomatoes", "kg", 12, 4],
    ["Cooking oil", "l", 18, 5],
    ["Plantain", "kg", 20, 5],
    ["Flour", "kg", 25, 6],
    ["Cheese", "kg", 6, 2],
    ["Coffee beans", "kg", 5, 1.5],
    ["Milk", "l", 20, 6],
    ["Passion fruit", "kg", 8, 3],
    ["Soda", "bottle", 60, 12],
  ]) {
    // A previous seed may have stopped after creating inventory but before
    // creating the menu. Reuse those rows instead of failing on the unique name.
    const item = await Inventory.findOneAndUpdate(
      { name },
      { $setOnInsert: { unit, stock, reorder_level } },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    );
    inv[name] = item._id;
  }

  const menu = await MenuItem.insertMany(
    [
      [
        "Grilled chicken",
        "Mains",
        8500,
        "Half chicken, charred over coals, with kachumbari",
        { Chicken: 0.45, Tomatoes: 0.08, "Cooking oil": 0.02 },
      ],
      [
        "Beef brochettes",
        "Mains",
        6000,
        "Five skewers, grilled plantain on the side",
        { Beef: 0.3, Plantain: 0.15 },
      ],
      [
        "Whole tilapia",
        "Mains",
        9500,
        "Fried whole, served with rice or chips",
        { Tilapia: 0.6, "Cooking oil": 0.15, Rice: 0.2 },
      ],
      [
        "Beef stew and rice",
        "Mains",
        5500,
        "Slow-cooked with tomatoes and onions",
        { Beef: 0.25, Rice: 0.25, Tomatoes: 0.1 },
      ],
      [
        "Chips and chicken wings",
        "Snacks",
        4500,
        "Hand-cut chips, six wings",
        { Chicken: 0.3, Potatoes: 0.35, "Cooking oil": 0.1 },
      ],
      [
        "Cheese sambusa",
        "Snacks",
        1500,
        "Crisp pastry, two pieces",
        { Flour: 0.06, Cheese: 0.05, "Cooking oil": 0.04 },
      ],
      [
        "Fried plantain",
        "Snacks",
        2000,
        "Ripe plantain with chilli salt",
        { Plantain: 0.3, "Cooking oil": 0.05 },
      ],
      [
        "Coffee",
        "Drinks",
        1500,
        "Brewed to order",
        { "Coffee beans": 0.02, Milk: 0.05 },
      ],
      [
        "Fresh passion juice",
        "Drinks",
        2000,
        "Pressed daily, not sweetened",
        { "Passion fruit": 0.3 },
      ],
      ["Soda", "Drinks", 1000, "Chilled bottle", { Soda: 1 }],
    ].map(([name, category, price, description, r]) => ({
      name,
      category,
      price,
      description,
      recipe: Object.entries(r).map(([k, qty]) => ({ inventory: inv[k], qty })),
    })),
  );

  const tables = await Table.insertMany([2, 2, 2, 4, 4, 4, 4, 6, 6, 8].map(
    (seats, i) => ({ number: i + 1, seats }),
  ));


  
    // demo tables 
    const rand = n => Math.floor(Math.random() * n); 
    let n = 0
    const orders = []

    for (let d = 6; d >= 0; d--)
    for (let k = 0, c = 6 + rand(10); k < c; k++) {
      const items = Array.from({ length: 1 + rand(3) }, () => {
        const m = menu[rand(menu.length)];
        return {
          menu_item: m._id,
          name: m.name,
          qty: 1 + rand(2),
          price: m.price,
        };
      });
      const t = tables[rand(tables.length)],
        when = new Date();
      when.setDate(when.getDate() - d);
      when.setHours(11 + rand(9), rand(60), 0, 0);
      orders.push({
        number: ++n,
        table: t._id,
        table_number: t.number,
        status: "paid",
        created_at: when,
        items,
        total: items.reduce((s, i) => s + i.qty * i.price, 0),
      });
    }
  await Order.insertMany(orders);
  await Counter.updateOne({ _id: "order" }, { $set: { n } }, { upsert: true });
}


module.exports = seed;

// npm run seed (creating teh demo data)
if(require.main === module){
    const connectDB = require('../config/db')
    connectDB({ reset: process.argv.includes('--reset')})
        .then(seed)
        .then(()=>{
            console.log("Database ready")
            process.exit(0)
        })
        .catch((e) => {
            console.error("Seed failed: " + e.message)
            process.exit(1)
        })
}


