import { S } from "../state.js";
import { api } from "../api.js";
import { $, esc, money, toast, today } from "../ui.js";

let inv = []; // ingredients, used by the recipe builder

const TABS = [
  ["reports", "Reports"],
  ["inventory", "Inventory"],
  ["menu", "Menu"],
];


// tabs
async function reports() {
  const day = S.day || today();
  const [rep, al] = await Promise.all([
    api("/admin/reports/daily?date=" + day),
    api("/admin/alerts"),
  ])

  const max = Math.max(1, ...rep.week.map((w) => w.revenue))
  
  return `<div class="head"><h2>Daily sales</h2><input type="date" id="day" value="${day}" max="${today()}" aria-label="Report date"></div>
  <div class="stats"><div class="stat"><b>${money(rep.revenue)}</b><span>Sales on ${rep.date}</span></div>
    <div class="stat"><b>${rep.orders}</b><span>Paid orders</span></div><div class="stat"><b>${money(rep.average)}</b><span>Average order</span></div></div>
  <div class="cols"><section><h2>Sales, last 7 days</h2><div class="bars">${rep.week
    .map(
      (w) => `<div class="bc${w.date === rep.date ? " sel" : ""}">
    <div class="fill" style="height:${Math.round((w.revenue / max) * 100)}%" title="${money(w.revenue)}"></div>
    <small>${new Date(w.date + "T12:00").toLocaleDateString("en-US", { weekday: "short" })}</small></div>`,
    )
    .join("")}</div></section>
  <section><h2>Best sellers</h2>${rep.top.length ? `<ol class="top">${rep.top.map((t) => `<li>${esc(t.name)}, ${t.qty} sold, ${money(t.revenue)}</li>`).join("")}</ol>` : '<p class="empty">No paid orders on this date.</p>'}</section></div>
  <section><h2>Stock alerts</h2>${
    al.length
      ? `<table class="data"><tr><th>Ingredient</th><th class="r">In stock</th><th class="r">Reorder at</th></tr>${al
          .map(
            (i) =>
              `<tr><td>${esc(i.name)}</td><td class="r low">${+i.stock.toFixed(2)} ${esc(i.unit)}</td><td class="r muted">${i.reorder_level}</td></tr>`,
          )
          .join("")}</table>`
      : '<p class="empty">Every ingredient is above its reorder level.</p>'
  }</section>`;
}

async function inventory() {
  inv = await api("/admin/inventory");
  return `<h2>Inventory</h2><table class="data"><tr><th>Ingredient</th><th class="r">In stock</th><th class="r">Reorder at</th><th class="r">Add stock</th><th></th></tr>
  ${inv
    .map(
      (
        i,
      ) => `<tr><td>${esc(i.name)}</td><td class="r ${i.stock <= i.reorder_level ? "low" : ""}">${+i.stock.toFixed(2)} ${esc(i.unit)}</td>
    <td class="r"><input class="amt" type="number" min="0" step="any" id="r${i.id}" value="${i.reorder_level}" aria-label="Reorder level for ${esc(i.name)}"></td>
    <td class="r"><input class="amt" type="number" min="0" step="any" id="a${i.id}" aria-label="Amount to add to ${esc(i.name)}"></td>
    <td class="r"><button class="btn sm" data-act="saveInv" data-id="${i.id}">Update</button> <button class="link danger" data-act="delInv" data-id="${i.id}">Delete</button></td></tr>`,
    )
    .join("")}</table>
  <div class="inv-add"><label>New ingredient<input id="in"></label><label>Unit<input id="iu" placeholder="kg"></label><label>Stock<input id="is" type="number" min="0" step="any"></label>
  <label>Reorder at<input id="il" type="number" min="0" step="any" value="5"></label><button class="btn sm" data-act="addInv">Add</button></div>`;
}

async function menu() {
  const [items] = await Promise.all([
    api("/menu"),
    api("/admin/inventory").then((r) => (inv = r)),
  ]);
  return `<h2>Menu</h2><table class="data"><tr><th>Dish</th><th class="r">Price (RWF)</th><th class="r">Status</th><th></th></tr>
  ${items
    .map(
      (
        m,
      ) => `<tr><td>${esc(m.name)}<br><span class="muted">${esc(m.category)}, ${m.portions >= 999 ? "no recipe" : m.portions + " portions possible"}</span></td>
    <td class="r"><input class="amt" type="number" min="1" id="p${m.id}" value="${m.price}" aria-label="Price of ${esc(m.name)}"> <button class="btn sm" data-act="setPrice" data-id="${m.id}">Save</button></td>
    <td class="r"><button class="btn sm" style="${m.available ? "" : "background:var(--s2);color:var(--tx)"}" data-act="toggle" data-id="${m.id}" data-on="${m.available}">${m.available ? "On the menu" : "Hidden"}</button></td>
    <td class="r"><button class="link danger" data-act="delMenu" data-id="${m.id}">Delete</button></td></tr>`,
    )
    .join("")}</table>
  <div class="form"><h2>Add a dish</h2>
    <div class="two"><label>Name<input id="mn"></label><label>Category<input id="mc" placeholder="Mains" list="cats"></label></div>
    <datalist id="cats">${[...new Set(items.map((m) => m.category))].map((c) => `<option value="${esc(c)}">`).join("")}</datalist>
    <div class="two"><label>Price (RWF)<input id="mp" type="number" min="1"></label><label>Description<input id="md"></label></div>
    <div><b>Recipe, per portion</b><div id="rrows"></div><button class="link" data-act="addRow">+ Add ingredient</button></div>
    <button class="btn" data-act="createMenu">Add to menu</button></div>`;
}

// pages
export async function render() {
  if (!S.token) {
    $("#view").innerHTML =
      `<h1>Admin</h1><form class="login" id="lf"><p class="muted">Sign in to see sales, stock levels and menu controls.</p>
      <label>Password<input id="pw" type="password" autocomplete="current-password"></label><button class="btn" data-act="login">Sign in</button></form>`;
    return;
  }
  const body = await { reports, inventory, menu }[S.adminTab]();
  $("#view").innerHTML =
    `<div class="head"><h1>Admin</h1><button class="link" data-act="logout">Sign out</button></div>
    <div class="tabs">${TABS.map(([id, t]) => `<button data-act="tab" data-id="${id}" class="${S.adminTab === id ? "on" : ""}">${t}</button>`).join("")}</div>${body}`;
}

export const actions = {
  tab(id) {
    S.adminTab = id;
    render();
  },
  async login() {
    const { token } = await api("/auth/login", {
      method: "POST",
      body: { password: $("#pw").value },
    });
    S.token = token;
    sessionStorage.setItem("hearth", token);
    render();
  },
  logout() {
    S.token = "";
    sessionStorage.removeItem("hearth");
    render();
  },

  async saveInv(id) {
    const add = Number($("#a" + id).value || 0),
      rl = $("#r" + id).value;
    await api("/admin/inventory/" + id, {
      method: "PATCH",
      body: { add, reorder_level: rl === "" ? undefined : Number(rl) },
    });
    toast("Inventory updated");
    render();
  },
  async addInv() {
    await api("/admin/inventory", {
      method: "POST",
      body: {
        name: $("#in").value,
        unit: $("#iu").value,
        stock: $("#is").value,
        reorder_level: $("#il").value,
      },
    });
    toast("Ingredient added");
    render();
  },
  async delInv(id) {
    if (confirm("Delete this ingredient?")) {
      await api("/admin/inventory/" + id, { method: "DELETE" });
      toast("Ingredient deleted");
      render();
    }
  },

  async toggle(id, b) {
    await api("/admin/menu/" + id, {
      method: "PATCH",
      body: { available: b.dataset.on !== "true" },
    });
    render();
  },
  async setPrice(id) {
    await api("/admin/menu/" + id, {
      method: "PATCH",
      body: { price: Number($("#p" + id).value) },
    });
    toast("Price updated");
    render();
  },
  async delMenu(id) {
    if (confirm("Delete this dish from the menu?")) {
      await api("/admin/menu/" + id, { method: "DELETE" });
      toast("Dish deleted");
      render();
    }
  },
  addRow() {
    $("#rrows").insertAdjacentHTML(
      "beforeend",
      `<div class="rrow"><select aria-label="Ingredient">${inv.map((i) => `<option value="${i.id}">${esc(i.name)} (${esc(i.unit)})</option>`).join("")}</select>
      <input type="number" min="0" step="any" placeholder="Qty" aria-label="Quantity per portion"><button class="link danger" data-act="dropRow">Remove</button></div>`,
    );
  },
  dropRow(_, b) {
    b.closest(".rrow").remove();
  },
  async createMenu() {
    const recipe = [...document.querySelectorAll("#rrows .rrow")]
      .map((r) => ({
        inventory_id: r.querySelector("select").value,
        qty: Number(r.querySelector("input").value),
      }))
      .filter((r) => r.qty > 0);
    await api("/admin/menu", {
      method: "POST",
      body: {
        name: $("#mn").value,
        category: $("#mc").value,
        price: Number($("#mp").value),
        description: $("#md").value,
        recipe,
      },
    });
    toast("Dish added to the menu");
    render();
  },
};

export const onChange = (e) => {
  if (e.target.id === "day") {
    S.day = e.target.value;
    render();
  }
};
