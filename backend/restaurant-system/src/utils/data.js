const httpError = require("./httpError");

const ld = (d) => d.toLocaleDateString("sv-SE"); // YYYY-MM-DD (local time)
const today = () => ld(new Date());
const local = (d) =>
  new Date(d.getTime() - d.getTimezoneOffset() * 60000)
    .toISOString()
    .replace("T", " ");

// [start, end) of a local calendar day
function dayRange(s) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s))
    throw httpError(400, "Use a date like 2026-10-01");
  const start = new Date(s + "T00:00:00"),
    end = new Date(start);
  end.setDate(end.getDate() + 1);
  return [start, end];
}

// "YYYY-MM-DD HH:MM" (or with a T) -> Date, or null if invalid
function parseSlot(s) {
  s = String(s || "")
    .replace("T", " ")
    .slice(0, 16);
  const d = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/.test(s)
    ? new Date(s.replace(" ", "T"))
    : null;
  return d && !isNaN(d) ? d : null;
}

module.exports = { ld, today, local, dayRange, parseSlot };
