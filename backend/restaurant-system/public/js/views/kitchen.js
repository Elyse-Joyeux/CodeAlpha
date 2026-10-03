import { S } from "../state.js";
import { api } from "../api.js";
import { $, esc, money, toast } from "../ui.js";

const COLS = [
  ["pending", "Waiting", "Start cooking", "preparing"],
  ["preparing", "On the stove", "Ready to serve", "served"],
  ["served", "Served, awaiting payment", "Mark paid", "paid"],
];

export async function render() {
  $("#view").innerHTML = '<h1>Kitchen</h1><div class="board" id="board"></div>';
  S.draw = async () => {
    const os = await api("/orders?status=open");
    $("#board").innerHTML = COLS.map(([st, title, label, next]) => {
      const list = os.filter((o) => o.status === st).reverse();
      return `<section class="col"><h2>${title}<span class="count">${list.length}</span></h2>${
        list
          .map(
            (o) => `
        <article class="tk"><header><b class="serif big">Table ${o.table_number}</b><span class="muted">Order ${o.number} at ${o.created_at.slice(11, 16)}</span></header>
        <ul>${o.items.map((i) => `<li>${i.qty} × ${esc(i.name)}</li>`).join("")}</ul>
        ${o.note ? `<p class="note">${esc(o.note)}</p>` : ""}
        <div class="row"><button class="btn sm" data-act="step" data-id="${o.id}" data-next="${next}">${label}</button>
        ${st === "served" ? `<span class="muted">${money(o.total)}</span>` : `<button class="link" data-act="step" data-id="${o.id}" data-next="cancelled">Cancel</button>`}</div></article>`,
          )
          .join("") || '<p class="empty">No orders here.</p>'
      }</section>`;
    }).join("");
  };
  await S.draw();
  S.poll = setInterval(() => S.draw().catch(() => {}), 8000); // live board
}

export const actions = {
  async step(id, b) {
    if (
      b.dataset.next === "cancelled" &&
      !confirm("Cancel this order? The ingredients go back into stock.")
    )
      return;
    await api(`/orders/${id}/status`, {
      method: "PATCH",
      body: { status: b.dataset.next },
    });
    toast(
      b.dataset.next === "paid"
        ? "Payment recorded, table is free"
        : b.dataset.next === "cancelled"
          ? "Order cancelled"
          : "Order updated",
    );
    S.draw();
  },
};
