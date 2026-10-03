export const $ = (s) => document.querySelector(s);
export const esc = (s) =>
  String(s ?? "").replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
export const money = (n) => Number(n).toLocaleString("en-US") + " RWF";
export const today = () => new Date().toLocaleDateString("sv-SE");

let timer;

export function toast(msg, bad) {
  const t = $("#toast");
  t.textContent = msg;
  t.className = "show" + (bad ? " bad" : "");
  clearTimeout(timer);
  timer = setTimeout(() => (t.className = ""), 3200);
}
