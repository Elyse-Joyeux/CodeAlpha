const express = require("express");
const Event = require("../models/Event");
const Registration = require("../models/Registration");
const {
  authenticate,
  optionalAuth,
  requireAdmin,
} = require("../middleware/auth");
const { isObjectId, str, escapeRegex } = require("../utils");

const router = express.Router();

router.param("id", (req, res, next, id) => {
  if (!isObjectId(id)) {
    return res.status(404).json({ error: "Event not found." });
  }

  next();
});

const EVENT_FIELDS = ["title", "description", "location", "date", "capacity"];

//only these fields can be set by teh client (never registeredCount or createdBy)
function pickEventFields(body) {
  const out = {};
  for (const field of EVENT_FIELDS) {
    if (body[field] !== undefined) out[field] = body[field];
  }
  return out;
}

// public: list and details

//get /api/events?q=text&past=true
router.get("/", optionalAuth, async (req, res) => {
  const filter = {};
  if (req.query.past !== "true") filter.date = { $gt: new Date() };

  const q = str(req.query.q);
  if (q) {
    const pattern = { $regex: escapeRegex(q), $options: "i" };
    filter.$or = [{ title: pattern }, { location: pattern }];
  }

  const events = await Event.find(filter).sort({ date: 1 });

  let registeredIds = new Set();
  if (req.user && events.length) {
    const ids = await Registration.find({
      user: req.user._id,
      status: "registered",
      event: { $in: events.map((e) => e._id) },
    }).distinct("event");
    registeredIds = new Set(ids.map(String));
  }

  res.json({
    events: events.map((e) => ({
      ...e.toJSON(),
      registered: registeredIds.has(e.id),
    })),
  });
});

router.get("/:id", optionalAuth, async (req, res) => {
  const event = await Event.findById(req.params.id).populate(
    "createdBy",
    "name",
  );
  if (!event) return res.status(404).json({ error: "Event not found." });

  const registered = req.user
    ? !!(await Registration.exists({
        event: event._id,
        user: req.user._id,
        status: "registered",
      }))
    : false;

  res.json({ event: { ...event.toJSON(), registered } });
});

// registration form

router.post("/:id/register", authenticate, async (req, res) => {
  const body = req.body || {};
  const form = {
    fullName: str(body.fullName) || req.user.name,
    phone: str(body.phone),
    notes: str(body.notes),
  };
  const eventId = req.params.id;

  const existing = await Registration.findOne({
    event: eventId,
    user: req.user._id,
  });
  if (existing && existing.status === "registered") {
    return res
      .status(409)
      .json({ error: "You are already registered for this event." });
  }

  const target = await Event.findById(eventId);
  if (!target) return res.status(404).json({ error: "Event not found." });
  if (target.date <= new Date()) {
    return res
      .status(400)
      .json({
        error: "Registration is closed because this event has started.",
      });
  }

  // reserve a spot atomically: the update only matches while registeredCount is
  // still below capacity, so two people can never take the last spot.
  const event = await Event.findOneAndUpdate(
    { _id: eventId, registeredCount: { $lt: target.capacity } },
    { $inc: { registeredCount: 1 } },
    { returnDocument: "after" },
  );
  if (!event) return res.status(409).json({ error: "This event is full." });

  try {
    let registration;
    if (existing) {
      // registering again after a cancellation reactivates the old record
      registration = await Registration.findOneAndUpdate(
        { _id: existing._id, status: "cancelled" },
        { ...form, status: "registered", $unset: { cancelledAt: 1 } },
        { returnDocument: "after", runValidators: true },
      );
      if (!registration)
        throw Object.assign(new Error("duplicate"), { code: 11000 });
    } else {
      registration = await Registration.create({
        ...form,
        event: eventId,
        user: req.user._id,
      });
    }
    res.status(201).json({ registration, event });
  } catch (err) {
    // give the spot back if the registration could not be saved
    await Event.updateOne({ _id: eventId }, { $inc: { registeredCount: -1 } });
    if (err.code === 11000) {
      return res
        .status(409)
        .json({ error: "You are already registered for this event." });
    }
    throw err;
  }
});

// admin only (organizer)

router.post("/", authenticate, requireAdmin, async (req, res) => {
  const event = new Event({
    ...pickEventFields(req.body || {}),
    createdBy: req.user._id,
  });
  if (event.date && event.date <= new Date()) {
    return res.status(400).json({ error: "Event date must be in the future." });
  }
  await event.save();
  res.status(201).json({ event });
});

router.put("/:id", authenticate, requireAdmin, async (req, res) => {
  const event = await Event.findById(req.params.id);
  if (!event) return res.status(404).json({ error: "Event not found." });

  event.set(pickEventFields(req.body || {}));
  if (event.capacity < event.registeredCount) {
    return res.status(400).json({
      error: `Capacity cannot be lower than the ${event.registeredCount} people already registered.`,
    });
  }
  await event.save();
  res.json({ event });
});

router.delete("/:id", authenticate, requireAdmin, async (req, res) => {
  const event = await Event.findByIdAndDelete(req.params.id);
  if (!event) return res.status(404).json({ error: "Event not found." });
  await Registration.deleteMany({ event: event._id });
  res.status(204).end();
});

router.get(
  "/:id/registrations",
  authenticate,
  requireAdmin,
  async (req, res) => {
    const event = await Event.findById(req.params.id);
    if (!event) return res.status(404).json({ error: "Event not found." });

    const registrations = await Registration.find({ event: event._id })
      .populate("user", "name email")
      .sort({ createdAt: 1 });
    res.json({ registrations });
  },
);

module.exports = router;
