const { Table, Reservation } = require("../models");
const { stayMs } = require("../config");
const httpError = require("../utils/httpError");
const { dayRange, today, parseSlot } = require("../utils/data");

// rree for a slot = fits the party, no booking within 90 minutes of the slot, and not in use
// right now when the slot falls inside the current sitting.
async function freeTables(slot, party) {
  const [tables, busy] = await Promise.all([
    Table.find({ seats: { $gte: party } }).sort({ seats: 1, number: 1 }),
    Reservation.distinct("table", {
      status: "booked",
      starts_at: {
        $gt: new Date(+slot - stayMs),
        $lt: new Date(+slot + stayMs),
      },
    }),
  ]);
  const taken = new Set(busy.map(String));
  return tables.filter(
    (t) =>
      !taken.has(String(t._id)) &&
      !(t.status === "occupied" && slot - Date.now() < stayMs),
  );
}

exports.listWithNextBooking = async () => {
  const [tables, rs] = await Promise.all([
    Table.find().sort({ number: 1 }),
    Reservation.find({
      status: "booked",
      starts_at: { $gte: new Date(Date.now() - 30 * 60000) },
    }).sort({ starts_at: 1 }),
  ]);
  const next = new Map();
  for (const r of rs)
    if (!next.has(String(r.table)))
      next.set(String(r.table), r.toJSON().starts_at);
  return tables.map((t) => ({
    ...t.toJSON(),
    next_reservation: next.get(String(t._id)) || null,
  }));
};

exports.availability = (startsAt, party) => {
  const slot = parseSlot(startsAt);
  if (!slot) throw httpError(400, "Choose a date and time");
  return freeTables(slot, Number(party) || 1);
};

exports.reserve = async ({ table_id, name, phone, starts_at, party }) => {
  party = Number(party);
  const slot = parseSlot(starts_at);
  if (!name || !phone) throw httpError(400, "Name and phone are required");
  if (!slot || slot < new Date())
    throw httpError(400, "Choose a future date and time");
  if (!Number.isInteger(party) || party < 1)
    throw httpError(400, "Party size must be at least 1");
  const free = await freeTables(slot, party);
  const pick = table_id
    ? free.find((t) => String(t._id) === String(table_id))
    : free[0];
  if (!pick)
    throw httpError(
      409,
      table_id
        ? "That table is not available at this time"
        : "No table fits this party at that time",
    );
  return Reservation.create({
    table: pick._id,
    table_number: pick.number,
    name,
    phone,
    party,
    starts_at: slot,
  });
};

exports.upcomingReservations = (from) => {
  const [start] = dayRange(from || today());
  return Reservation.find({ status: "booked", starts_at: { $gte: start } })
    .sort({ starts_at: 1 })
    .limit(50);
};

exports.cancelReservation = async (id) => {
  if (
    !(await Reservation.findOneAndUpdate(
      { _id: id, status: "booked" },
      { status: "cancelled" },
    ))
  )
    throw httpError(404, "Reservation not found");
};
