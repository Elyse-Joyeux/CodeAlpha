import { S } from "../state.js";
import { api } from "../api.js";
import { $, esc, money, toast } from "../ui.js";

export async function render() {
  $("#view").innerHTML = '<h1>Kitchen</h1><div class="board" id="board"></div>';
  S.draw = async () => {
    const os = await api("/orders?status=open");
    const list = os.filter((o) => o.status === "served").reverse();
    $("#board").innerHTML = `<section class="col"><h2>Ready for payment<span class="count">${list.length}</span></h2>${
        list
          .map(
            (o) => `
        <article class="tk"><header><b class="serif big">Table ${o.table_number}</b><span class="muted">Order ${o.number} at ${o.created_at.slice(11, 16)}</span></header>
        <ul>${o.items.map((i) => `<li>${i.qty} × ${esc(i.name)}</li>`).join("")}</ul>
        ${o.note ? `<p class="note">${esc(o.note)}</p>` : ""}
        <div class="row"><button class="btn sm" data-act="step" data-id="${o.id}" data-next="paid">Mark paid</button><span class="muted">${money(o.total)}</span></div></article>`,
          )
          .join("") || '<p class="empty">No served orders awaiting payment.</p>'
      }</section>`;
  };
  await S.draw();
  S.poll = setInterval(() => S.draw().catch(() => {}), 8000); // live board
}

export const actions = {
  async step(id, b) {
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
