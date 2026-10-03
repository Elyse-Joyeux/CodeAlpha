const { Order } = require("../models");
const { ld, today, dayRange } = require("../utils/data");

// daily sales report: totals, best sellers and a 7-day trend ending on `date`.
// A restaurant day is a few hundred orders at most, so totals are computed in JS (portable, readable).
exports.daily = async (date = today()) => {
  const [start, end] = dayRange(date);
  const paid = await Order.find(
    { status: "paid", created_at: { $gte: start, $lt: end } },
    "total items",
  ).lean();
  const sold = new Map();
  for (const o of paid)
    for (const i of o.items) {
      const e = sold.get(i.name) || { name: i.name, qty: 0, revenue: 0 };
      e.qty += i.qty;
      e.revenue += i.qty * i.price;
      sold.set(i.name, e);
    }
  const top = [...sold.values()].sort((a, b) => b.qty - a.qty).slice(0, 5);
  const revenue = paid.reduce((s, o) => s + o.total, 0);

  const ws = new Date(start);
  ws.setDate(ws.getDate() - 6);
  const by = {};
  for (const o of await Order.find(
    { status: "paid", created_at: { $gte: ws, $lt: end } },
    "total created_at",
  ).lean())
    by[ld(o.created_at)] = (by[ld(o.created_at)] || 0) + o.total;
  const week = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(ws);
    d.setDate(d.getDate() + i);
    return { date: ld(d), revenue: by[ld(d)] || 0 };
  });

  return {
    date,
    orders: paid.length,
    revenue,
    average: paid.length ? Math.round(revenue / paid.length) : 0,
    top,
    week,
  };
};
