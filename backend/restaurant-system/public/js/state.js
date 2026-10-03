// shared client state
export const S = {
  view: "order",
  menu: [],
  tables: [],
  cart: {},
  table: "",
  note: "",
  token: sessionStorage.getItem("hearth") || "",
  day: "",
  adminTab: "reports",
  pick: null,
  avail: null,
  poll: null,
  draw: null,
};
