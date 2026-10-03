import { S } from "../state.js";
import { api } from "../api.js";
import { $, esc, money, toast } from "../ui.js";

const out = (m) => !m.available || m.portions < 1;
const dish = (m) => `<div class="dish${out(m) ? " out" : ""}">
  <div class="dn"><b>${esc(m.name)}</b><small>${esc(m.description)}</small></div><i class="lead"></i>
  ${!out(m) && m.portions <= 5 ? `<em class="low">${m.portions} left</em>` : ""}
  <span class="price">${Number(m.price).toLocaleString("en-US")}</span>
  <button class="btn sm" data-act="add" data-id="${m.id}" ${out(m) ? "disabled" : ""}>${out(m) ? "Sold out" : "Add"}</button></div>`;

export async function render() {
  [S.menu, S.tables] = await Promise.all([api("/menu"), api("/tables")]);
  const cats = [...new Set(S.menu.map((m) => m.category))];
  $("#view").innerHTML = `<h1>New order</h1><div class="split"><div>${cats
    .map(
      (c) =>
        `<section class="cat"><h2>${esc(c)}</h2>${S.menu
          .filter((m) => m.category === c)
          .map(dish)
          .join("")}</section>`,
    )
    .join("")}</div>
    <aside class="ticket" id="ticket"></aside></div>`;
  ticket();
}

function ticket() {
  const lines = Object.entries(S.cart)
    .map(([id, q]) => ({ m: S.menu.find((x) => x.id == id), q }))
    .filter((l) => l.m);
  const total = lines.reduce((s, l) => s + l.m.price * l.q, 0);
  $("#ticket").innerHTML = `<h2>Ticket</h2>
  <label>Table<select id="tsel"><option value="">Choose a table</option>${S.tables
    .map(
      (t) =>
        `<option value="${t.id}"${t.id == S.table ? " selected" : ""}>Table ${t.number}, ${t.seats} seats${t.status === "occupied" ? ", in use" : ""}</option>`,
    )
    .join("")}</select></label>
  ${
    lines.length
      ? lines
          .map(
            (
              l,
            ) => `<div class="line"><span>${esc(l.m.name)}</span><span class="qty">
    <button aria-label="Remove one ${esc(l.m.name)}" data-act="dec" data-id="${l.m.id}">−</button>${l.q}
    <button aria-label="Add one ${esc(l.m.name)}" data-act="add" data-id="${l.m.id}">+</button></span><span>${money(l.m.price * l.q)}</span></div>`,
          )
          .join("")
      : '<p class="empty">Add dishes from the menu to start this ticket.</p>'
  }
  <label>Note for the kitchen<input id="note" maxlength="200" value="${esc(S.note)}" placeholder="Allergies, no chilli, extra sauce"></label>
  <div class="total"><span>Total</span><b>${money(total)}</b></div>
  <button class="btn" data-act="send" ${lines.length ? "" : "disabled"}>Send to kitchen</button>`;
}

export const actions = {
  add(id) {
    const m = S.menu.find((x) => x.id == id);
    if ((S.cart[id] || 0) >= Math.min(m.portions, 20))
      return toast(
        `Only ${m.portions} of ${m.name} can be made with current stock`,
        1,
      );
    S.cart[id] = (S.cart[id] || 0) + 1;
    ticket();
  },
  dec(id) {
    if (--S.cart[id] < 1) delete S.cart[id];
    ticket();
  },
  async send() {
    if (!S.table) return toast("Choose a table first", 1);
    const items = Object.entries(S.cart).map(([id, qty]) => ({
      menu_item_id: id,
      qty,
    }));
    const o = await api("/orders", {
      method: "POST",
      body: { table_id: S.table, items, note: S.note },
    });
    S.cart = {};
    S.note = "";
    toast(`Order ${o.number} sent to the kitchen for table ${o.table_number}`);
    render();
  },
};
