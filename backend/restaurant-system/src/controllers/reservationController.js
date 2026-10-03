const tables = require("../services/tableService");


exports.create = async (req, res) =>
  res.status(201).json(await tables.reserve(req.body));
exports.list = async (req, res) =>
  res.json(await tables.upcomingReservations(req.query.from));
exports.cancel = async (req, res) => {
  await tables.cancelReservation(req.params.id);
  res.json({ ok: true });
};
