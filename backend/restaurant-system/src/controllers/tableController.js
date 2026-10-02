const tables = require("../services/tableService");


exports.list = async (req, res) => 
    res.json(await tables.listWithNextBooking());

exports.availability = async (req, res) =>
  res.json(await tables.availability(req.query.starts_at, req.query.party));
