const appEl = document.getElementById("app");
const navEl = document.getElementById("nav");
const noticeEl = document.getElementById("notice");

const state = {
  token: localStorage.getItem("token"),
  user: null,
  view: "events",
};

// helpers

// builds dom nodes with textContent only so user-provided text is never parsed as html
function h(tag, props = {}, ...kids) {
  const el = document.createElement(tag);
  for (const [key, value] of Object.entries(props)) {
    if (key === "class") el.className = value;
    else if (key.startsWith("on")) el.addEventListener(key.slice(2), value);
    else if (value !== false && value != null)
      el.setAttribute(key, value === true ? "" : value);
  }
  for (const kid of kids.flat()) {
    if (kid == null || kid === false) continue;
    el.append(kid.nodeType ? kid : document.createTextNode(kid));
  }
  return el;
}

const fmtFull = (d) =>
  new Date(d).toLocaleString(undefined, {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

let noticeTimer;
function notice(message, isError = false) {
  noticeEl.textContent = message;
  noticeEl.className = isError ? "notice bad" : "notice";
  noticeEl.hidden = false;
  clearTimeout(noticeTimer);
  noticeTimer = setTimeout(() => (noticeEl.hidden = true), 5000);
}

async function api(path, { method = "GET", body } = {}) {
  const res = await fetch("/api" + path, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(state.token ? { Authorization: `Bearer ${state.token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  const data = res.status === 204 ? null : await res.json().catch(() => null);
  if (!res.ok) {
    if (res.status === 401 && state.user) logout(); // token expired
    throw new Error((data && data.error) || "Something went wrong. Try again.");
  }

  return data;
}

function setSession({ token, user }) {
  state.token = token;
  state.user = user;
  localStorage.setItem("token", token);
}

function logout() {
  state.token = null;
  state.order = null;
  localStorage.removeItem("token");
  go("events");
}

const go = (view) => {
  state.view = view;
  render();
};

function field(label, input) {
  return h("label", {}, lable, input);
}

// views
async function eventsView(root) {
  root.append(h("h1", {}, "upcoming events"));
  const search = h("input", {
    type: "search",
    placeholder: "Search by title or location",
    "aria-label": "Search events",
  });
  const list = h("div", { class: "events" });
  root.append(search, list);

  async function load() {
    const { events } = await api(
      "/events?q=" + encodeURIComponent(search.value),
    );
    list.replaceChildren(
      ...(events.length
        ? events.map(eventCard)
        : [
            h("p", { class: "empty" }, "No upcoming events match your search."),
          ]),
    );
  }
  let timer;
  search.addEventListener("input", () => {
    clearTimeout(timer);
    timer = setTimeout(() => load().catch((e) => notice(e.message, true)), 250);
  });

  await load();
}

function spotsText(ev) {
  if (ev.registered) return "YOu are registered";
  if (ev.spotsLeft <= 0) return "Full";
  return `${ev.spotsLeft} of ${ev.capacity} spots left.`;
}

function eventCard(ev) {
  const date = new Date(ev.date);
  const panel = h("div", { class: "panel", hidden: true }, eventPanel(ev));
  const toggle = h(
    "button",
    {
      class: "secondary",
      "aria-expanded": "false",
      onClick() {
        panel.hidden = !panel.hidden;
        toggle.setAttribute("aria-expanded", String(!panel.hidden));
        toggle.textContent = panel.hidden ? "Details" : "Hide details";
      },
    },
    "Details",
  );

  return h(
    "article",
    { class: "event" },
    h(
      "div",
      { class: "leaf", "aria-hidden": "true" },
      h("span", { class: "day" }, String(date.getDate())),
      h(
        "span",
        { class: "mon" },
        date.toLocaleString(undefined, { month: "short" }),
      ),
    ),
    h(
      "div",
      {},
      h("h2", {}, ev.title),
      h("p", { class: "meta" }, fmtFull(ev.date)),
      h("p", { class: "meta" }, ev.location),
      h(
        "p",
        { class: "spots" + (!ev.registered && ev.spotsLeft <= 5 ? "low" : "") },
        spotsText(ev),
      ),
      toggle,
      panel,
    ),
  );
}

function eventPanel(ev) {
  const parts = [];
  if (ev.description) parts.push(h("p", { class: "desc" }, ev.description));

  if (ev.registered) {
    parts.push(
      h("p", { class: "ok" }, "You're registered for this event."),
      h(
        "button",
        { class: "secondary", onclick: () => go("mine") },
        "View my registrations",
      ),
    );
  } else if (ev.spotsLeft <= 0) {
    parts.push(h("p", {}, "This event is full."));
  } else if (!state.user) {
    parts.push(
      h("button", { onclick: () => go("auth") }, "Log in to register"),
    );
  } else {
    parts.push(registrationForm(ev));
  }
  return parts;
}

function registrationForm(ev) {
  const fullName = h("input", {
    required: true,
    maxLength: 80,
    value: state.user.name,
    autocomplete: "name",
  });
  const phone = h("input", { type: "tel", maxLength: 30, autocomplete: "tel" });
  const notes = h("textarea", { rows: 2, maxLength: 500 });
  const submit = h("button", { type: "submit" }, "Register");

  return h(
    "form",
    {
      async onSubmit(e) {
        submit.disabled = true;
        try {
          await api(`/events/${ev.id}/register`, {
            method: "POST",
            body: {
              fullName: fullName.value,
              phone: phone.value,
              notes: notes.value,
            },
          });

          notice(`You're registered for ${ev.title}.`);
          render();
        } catch (err) {
          notice(err.message, true);
          submit.disabled = false;
        }
      },
    },
    field("Full name", fullName),
    field("Phone (optional)", phone),
    field("Notes for the organizer (optional)", notes),
    submit,
  );
}

function authView(root) {
  let mode = "login";
  const box = h("div", { class: "auth" });
  root.append(box);

  function draw() {
    const isLogin = mode === "login";
    const name = isLogin
      ? null
      : h("input", { required: true, maxLength: 80, autocomplete: "name" });
    const email = h("input", {
      type: "email",
      required: true,
      autocomplete: "email",
    });
    const password = h("input", {
      type: "password",
      required: true,
      minLength: isLogin ? null : 8,
      autocomplete: isLogin ? "current-password" : "new-password",
    });

    const submit = h(
      "button",
      { type: "submit" },
      isLogin ? "Log in" : "Create account",
    );

    const form = h(
      "form",
      {
        async onSubmit(e) {
          submit.disabled = true;
          try {
            const data = await api(isLogin ? "/auth/login" : "/auth/register", {
              method: "POST",
              body: isLogin
                ? { email: email.value, password: password.value }
                : {
                    name: name.value,
                    email: email.value,
                    password: password.value,
                  },
            });
            setSession(data);
            notice(`Welcome, ${data.user.name}.`);
            go("events");
          } catch (err) {
            notice(err.message, true);
            submit.disabled = false;
          }
        },
      },
      name ? field("Name", name) : null,
      field("Email", email),
      field(
        isLogin ? "Password" : "Password (at least 8 characters)",
        password,
      ),
      submit,
    );

    box.replaceChildren(
      h("h1", {}, isLogin ? "Log in" : "Create an account"),
      form,
      h(
        "p",
        { class: "switch" },
        isLogin ? "New here? " : "Already have an account? ",
        h(
          "button",
          {
            class: "link",
            type: "button",
            onClick() {
              mode = isLogin ? "signup" : "login";
              draw();
            },
          },
          isLogin ? "Create an account" : "Log in",
        ),
      ),
    );
  }

  draw();
}

async function mineView(root) {
  root.append(h("h1", {}, "My registrations"));
  const { registrations } = await api("/registrations/mine");
  if (!registrations.length) {
    root.append(
      h("p", { class: "empty" }, "You haven't registered for any events yet."),
      h("button", { onclick: () => go("events") }, "Browse events"),
    );
    return;
  }

  root.append(
    h(
      "ul",
      { class: "rows" },
      registrations.map((r) => {
        const active = r.status === "registered";
        const started = new Date(r.event.date) <= new Date();
        return h(
          "li",
          { class: active ? "" : "cancelled" },
          h(
            "div",
            {},
            h("h2", {}, r.event.title),
            h("p", { class: "meta" }, fmtFull(r.event.date)),
            h("p", { class: "meta" }, r.event.location),
            h(
              "p",
              { class: active ? "spots" : "meta" },
              active ? "Registered" : "Cancelled",
            ),
          ),
          active && !started
            ? h(
                "button",
                {
                  class: "danger",
                  async onclick() {
                    if (
                      !confirm(`Cancel your registration for ${r.event.title}?`)
                    )
                      return;
                    try {
                      await api(`/registrations/${r.id}`, { method: "DELETE" });
                      notice("Registration cancelled.");
                      render();
                    } catch (err) {
                      notice(err.message, true);
                    }
                  },
                },
                "Cancel registration",
              )
            : null,
        );
      }),
    ),
  );
}

async function adminView(root) {
  root.append(h("h1", {}, "Organizer panel"), createEventForm());
  root.append(h("h2", {}, "All events"));
  const { events } = await api("/events?past=true");
  root.append(
    events.length
      ? h("ul", { class: "rows" }, events.map(adminRow))
      : h(
          "p",
          { class: "empty" },
          "No events yet. Create the first one above.",
        ),
  );
}

function createEventForm() {
  const title = h("input", { required: true, maxlength: 120 });
  const location = h("input", { required: true, maxlength: 200 });
  const when = h("input", { type: "datetime-local", required: true });
  const capacity = h("input", {
    type: "number",
    required: true,
    min: 1,
    step: 1,
  });
  const description = h("textarea", { rows: 3, maxlength: 2000 });
  const submit = h("button", { type: "submit" }, "Create event");

  return h(
    "form",
    {
      class: "admin-form",
      async onsubmit(e) {
        e.preventDefault();
        submit.disabled = true;
        try {
          await api("/events", {
            method: "POST",
            body: {
              title: title.value,
              location: location.value,
              date: new Date(when.value).toISOString(), // local time -> UTC
              capacity: Number(capacity.value),
              description: description.value,
            },
          });
          notice("Event created.");
          render();
        } catch (err) {
          notice(err.message, true);
          submit.disabled = false;
        }
      },
    },
    h("h2", {}, "New event"),
    field("Title", title),
    h(
      "div",
      { class: "pair" },
      field("Date and time", when),
      field("Capacity", capacity),
    ),
    field("Location", location),
    field("Description (optional)", description),
    submit,
  );
}

function adminRow(ev) {
  const panel = h("div", { class: "panel", hidden: true });
  const toggle = h(
    "button",
    {
      class: "secondary",
      async onclick() {
        panel.hidden = !panel.hidden;
        if (panel.hidden) return;
        try {
          const { registrations } = await api(`/events/${ev.id}/registrations`);
          panel.replaceChildren(
            registrations.length
              ? h(
                  "ul",
                  { class: "people" },
                  registrations.map((r) =>
                    h(
                      "li",
                      { class: r.status === "cancelled" ? "cancelled" : "" },
                      h("strong", {}, r.fullName),
                      ` ${r.user ? r.user.email : ""}${r.phone ? ", " + r.phone : ""}${r.status === "cancelled" ? " (cancelled)" : ""}`,
                      r.notes ? h("p", { class: "meta" }, r.notes) : null,
                    ),
                  ),
                )
              : h("p", { class: "empty" }, "No registrations yet."),
          );
        } catch (err) {
          notice(err.message, true);
        }
      },
    },
    "Registrations",
  );

  const remove = h(
    "button",
    {
      class: "danger",
      async onclick() {
        if (!confirm(`Delete "${ev.title}" and all its registrations?`)) return;
        try {
          await api(`/events/${ev.id}`, { method: "DELETE" });
          notice("Event deleted.");
          render();
        } catch (err) {
          notice(err.message, true);
        }
      },
    },
    "Delete event",
  );

  return h(
    "li",
    {},
    h(
      "div",
      {},
      h("h2", {}, ev.title),
      h("p", { class: "meta" }, `${fmtFull(ev.date)}, ${ev.location}`),
      h(
        "p",
        { class: "spots" },
        `${ev.registeredCount} of ${ev.capacity} registered`,
      ),
    ),
    h("div", { class: "actions" }, toggle, remove),
    panel,
  );
}

// navigate and start up

function renderNav() {
  const item = (view, label) =>
    h(
      "button",
      {
        onclick: () => go(view),
        "aria-current": state.view === view ? "page" : null,
      },
      label,
    );

  navEl.replaceChildren(
    item("events", "Events"),
    state.user ? item("mine", "My registrations") : null,
    state.user && state.user.role === "admin"
      ? item("admin", "Organizer")
      : null,
    state.user
      ? [
          h("span", { class: "who" }, state.user.name),
          h("button", { onclick: logout }, "Log out"),
        ]
      : item("auth", "Log in"),
  );
}

const views = {
  events: eventsView,
  auth: authView,
  mine: mineView,
  admin: adminView,
};

async function render() {
  // pages that need an account send visitors to the log-in form
  if ((state.view === "mine" || state.view === "admin") && !state.user)
    state.view = "auth";
  if (state.view === "admin" && state.user.role !== "admin")
    state.view = "events";

  renderNav();
  appEl.replaceChildren();
  try {
    await views[state.view](appEl);
  } catch (err) {
    appEl.append(h("p", { class: "error" }, err.message));
  }
}

(async function init() {
  if (state.token) {
    try {
      state.user = (await api("/auth/me")).user;
    } catch {
      state.token = null;
      localStorage.removeItem("token");
    }
  }
  render();
})();
