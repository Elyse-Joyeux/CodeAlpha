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
    else if (key.startsWith("on"))
      el.addEventListener(key.slice(2).toLowerCase(), value);
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
  state.user = null;
  localStorage.removeItem("token");
  go("events");
}

const go = (view) => {
  state.view = view;
  render();
};

function field(label, input) {
  return h("label", {}, label, input);
}

function passwordField(label, input) {
  const wrapper = h("span", { class: "password-control" });
  const toggle = h(
    "button",
    {
      class: "password-toggle",
      type: "button",
      "aria-label": "Show password",
      "aria-pressed": "false",
      onclick() {
        const visible = input.type === "password";
        input.type = visible ? "text" : "password";
        toggle.setAttribute("aria-label", visible ? "Hide password" : "Show password");
        toggle.setAttribute("aria-pressed", String(visible));
        toggle.replaceChildren(eyeIcon(visible));
      },
    },
    eyeIcon(false),
  );
  wrapper.append(input, toggle);
  return field(label, wrapper);
}

function eyeIcon(visible) {
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("viewBox", "0 0 24 24");
  svg.setAttribute("aria-hidden", "true");
  svg.setAttribute("focusable", "false");
  const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
  path.setAttribute("d", visible
    ? "M3 3l18 18M10.6 10.6a2 2 0 002.8 2.8M9.9 5.2A10.8 10.8 0 0112 5c5 0 9 4 10 7-.4 1.4-1.4 2.8-2.8 3.9M6.2 6.2C3.8 7.5 2.4 9.5 2 12c1 3 5 7 10 7 1 0 2-.2 2.9-.5"
    : "M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7-10-7-10-7zm10-3a3 3 0 100 6 3 3 0 000-6z");
  path.setAttribute("fill", "none");
  path.setAttribute("stroke", "currentColor");
  path.setAttribute("stroke-width", "2");
  path.setAttribute("stroke-linecap", "round");
  path.setAttribute("stroke-linejoin", "round");
  svg.append(path);
  return svg;
}

// views
async function eventsView(root) {
  root.append(
    h(
      "section",
      { class: "hero", "aria-labelledby": "welcome-title" },
      h("p", { class: "eyebrow" }, "EVENTBOARD · FIND YOUR PEOPLE"),
      h("h1", { id: "welcome-title" }, "Make room for something new."),
      h(
        "p",
        { class: "hero-copy" },
        "Discover workshops, talks, and meetups. Register for events and keep your bookings together in My events.",
      ),
      state.user
        ? h("button", { onclick: () => go("mine") }, "View my events")
        : h("button", { onclick: () => go("signup") }, "Create a free account"),
    ),
  );

  root.append(h("h1", {}, "Upcoming events"));
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
  if (ev.registered) return "You are registered";
  if (ev.spotsLeft <= 0) return "Full";
  return `${ev.spotsLeft} of ${ev.capacity} spots left.`;
}

function eventCard(ev) {
  const date = new Date(ev.date);
  const panel = h("div", { class: "panel", hidden: true });
  const toggle = h(
    "button",
    {
      class: "secondary",
      "aria-expanded": "false",
      async onClick() {
        panel.hidden = !panel.hidden;
        toggle.setAttribute("aria-expanded", String(!panel.hidden));
        toggle.textContent = panel.hidden ? "Details" : "Hide details";
        if (panel.hidden || panel.dataset.loaded === "true") return;

        panel.replaceChildren(h("p", { class: "meta" }, "Loading details…"));
        try {
          const { event } = await api(`/events/${ev.id}`);
          panel.replaceChildren(...eventPanel(event));
          panel.dataset.loaded = "true";
        } catch (err) {
          panel.replaceChildren(h("p", { class: "error" }, err.message));
        }
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
        { class: "spots" + (!ev.registered && ev.spotsLeft <= 5 ? " low" : "") },
        spotsText(ev),
      ),
      toggle,
      panel,
    ),
  );
}

function eventPanel(ev) {
  const parts = [
    h("p", { class: "meta" }, fmtFull(ev.date)),
    h("p", { class: "meta" }, ev.location),
    h(
      "p",
      { class: "spots" },
      ev.spotsLeft > 0
        ? `${ev.spotsLeft} of ${ev.capacity} places available.`
        : "This event is full.",
    ),
  ];
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
  } else if (ev.spotsLeft > 0) {
    if (!state.user) {
      parts.push(
        h("button", { onclick: () => go("auth") }, "Log in to register"),
      );
    } else {
      parts.push(registrationForm(ev));
    }
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
        e.preventDefault();
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

function authView(root, initialMode = "login") {
  let mode = initialMode;
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
          e.preventDefault();
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
      passwordField(
        isLogin ? "Password" : "Password (at least 8 characters)",
        password,
      ),
      isLogin
        ? h("button", {
            class: "link forgot-password",
            type: "button",
            onclick: () => notice("Password reset isn't set up yet. Please contact the event organizer for help."),
          }, "Forgot password?")
        : null,
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
  root.append(
    h("h1", {}, "My events"),
    h("p", { class: "meta page-intro" }, "Your registered and cancelled events in one place."),
  );
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
  const item = (view, label, className) => {
    const props = {
      onclick: () => go(view),
      "aria-current": state.view === view ? "page" : null,
    };
    if (className) props.class = className;
    return h("button", props, label);
  };

  const items = [
    item("events", "Events"),
    state.user ? item("mine", "My events") : null,
    state.user && state.user.role === "admin"
      ? item("admin", "Organizer")
      : null,
    state.user
      ? [
          h("span", { class: "who" }, state.user.name),
          h("button", { onclick: logout }, "Log out"),
        ]
      : [
          item("auth", "Log in"),
          item("signup", "Create account", "nav-cta"),
        ],
  ];
  navEl.replaceChildren(
    ...items.flat(Infinity).filter((child) => child != null && child !== false),
  );
}

const views = {
  events: eventsView,
  auth: (root) => authView(root, "login"),
  signup: (root) => authView(root, "signup"),
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
