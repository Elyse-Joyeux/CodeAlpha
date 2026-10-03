const orders = require("../services/orderService");

exports.place = async (req, res) =>
  res.status(201).json(await orders.place(req.body.table_id, req.body.items, req.body.note));

exports.list = async (req, res) =>
  res.json(await orders.list({ status: req.query.status, date: req.query.date }));

exports.setStatus = async (req, res) =>
  res.json(await orders.changeStatus(req.params.id, req.body.status));
