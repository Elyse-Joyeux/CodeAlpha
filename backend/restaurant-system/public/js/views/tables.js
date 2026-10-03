import { S } from "../state.js";
import { api } from "../api.js";
import { $, esc, toast, today } from "../ui.js";

const shape = (t) => (t.seats <= 2 ? "s2" : t.seats <= 4 ? "s4" : "s8");

function plan() {
  $("#plan").innerHTML = S.tables
    .map((t) => {
      const soon =
        t.next_reservation &&
        new Date(t.next_reservation.replace(" ", "T")) - Date.now() <
          90 * 60000;
      const cls = [
        shape(t),
        t.status === "occupied" ? "occupied" : "",
        soon ? "soon" : "",
        S.avail ? (S.avail.has(t.id) ? "fits" : "dim") : "",
        S.pick == t.id ? "pick" : "",
      ].join(" ");
      return `<button class="tbl ${cls}" data-act="pick" data-id="${t.id}" aria-pressed="${S.pick == t.id}"><b>${t.number}</b><small>${t.seats} seats</small></button>`;
    })
    .join("");
}

// table availability check for the chosen date/time/party
export async function checkAvailability() {
  const d = $("#rd").value,
    tm = $("#rt").value,
    p = $("#rg").value || 1;
  if (!d || !tm) return;
  try {
    const free = await api(
      `/tables/availability?starts_at=${d} ${tm}&party=${p}`,
    );
    S.avail = new Set(free.map((t) => t.id));
    $("#rhint").textContent = free.length
      ? `${free.length} of ${S.tables.length} tables fit a party of ${p} at that time.`
      : "No table fits that party at that time. Try another time.";
  } catch (e) {
    S.avail = null;
  }
  plan();
}

export async function render() {
  const [t, r] = await Promise.all([api("/tables"), api("/reservations")]);
  S.tables = t;
  S.pick = null;
  S.avail = null;
  $("#view").innerHTML =
    `<h1>Tables and reservations</h1><div class="split"><div><div class="plan" id="plan"></div>
  <div class="legend"><span><i class="o"></i>In use</span><span><i class="d"></i>Booked within 90 minutes</span><span><i class="f"></i>Free for the chosen time</span></div></div>
  <aside class="ticket"><h2>Reserve a table</h2>
  <label>Name<input id="rn" autocomplete="off"></label><label>Phone<input id="rp" inputmode="tel"></label>
  <label>Party size<input id="rg" type="number" min="1" value="2"></label>
  <label>Date<input id="rd" type="date" min="${today()}" value="${today()}"></label>
  <label>Time<input id="rt" type="time" value="19:00"></label>
  <p class="muted" id="rhint">Tap a table to choose it, or leave it and Hearth picks the smallest one that fits. The chosen table is also used for new orders.</p>
  <button class="btn" data-act="reserve">Reserve table</button>
  <h2 style="margin-top:14px">Upcoming</h2>
  ${
    r.length
      ? r
          .map(
            (
              x,
            ) => `<div class="res"><b>${esc(x.name)}, party of ${x.party}</b><span class="muted">Table ${x.table_number} on ${x.starts_at.slice(0, 10)} at ${x.starts_at.slice(11)}, ${esc(x.phone)}</span>
    <button class="link" style="justify-self:start" data-act="cancelRes" data-id="${x.id}">Cancel booking</button></div>`,
          )
          .join("")
      : '<p class="empty">No upcoming reservations.</p>'
  }</aside></div>`;
  plan();
  checkAvailability();
}

export const actions = {
  pick(id) {
    S.pick = S.pick == id ? null : id;
    S.table = S.pick || S.table;
    plan();
  },
  async reserve() {
    const r = await api("/reservations", {
      method: "POST",
      body: {
        table_id: S.pick || undefined,
        name: $("#rn").value,
        phone: $("#rp").value,
        party: +$("#rg").value,
        starts_at: `${$("#rd").value} ${$("#rt").value}`,
      },
    });
    toast(`Table ${r.table_number} reserved for ${r.name}`);
    render();
  },
  async cancelRes(id) {
    if (confirm("Cancel this booking?")) {
      await api("/reservations/" + id, { method: "DELETE" });
      toast("Booking cancelled");
      render();
    }
  },
};
