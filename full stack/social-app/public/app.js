const $ = (s, root = document) => root.querySelector(s);
const $$ = (s, root = document) => [...root.querySelectorAll(s)];
const state = {
  token: localStorage.getItem("kindred_token"),
  user: null,
  posts: [],
  people: [],
  mode: "login",
  view: "home",
};
const authScreen = $("#authScreen"),
  app = $("#app");
const api = async (url, options = {}) => {
  const res = await fetch("/api" + url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(state.token ? { Authorization: `Bearer ${state.token}` } : {}),
      ...(options.headers || {}),
    },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok)
    throw new Error(
      data.error || "Something went a little sideways. Please try again.",
    );
  return data;
};
function toast(message) {
  const el = $("#toast");
  el.textContent = message;
  el.classList.add("show");
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => el.classList.remove("show"), 2800);
}
function esc(value = "") {
  return String(value).replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
}
function avatar(user, cls = "avatar") {
  const style = user?.avatar
    ? `style="background-image:url('${esc(user.avatar)}')"`
    : "";
  const initial = esc((user?.name || "K").trim().charAt(0).toUpperCase());
  return `<div class="${cls}" ${style}>${initial}</div>`;
}
function timeAgo(date) {
  const n = Math.max(1, Math.floor((Date.now() - new Date(date)) / 60000));
  if (n < 60) return `${n}m`;
  const h = Math.floor(n / 60);
  if (h < 24) return `${h}h`;
  const d = Math.floor(h / 24);
  return d < 7
    ? `${d}d`
    : new Date(date).toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
      });
}
function authMode(mode) {
  state.mode = mode;
  const signup = mode === "register";
  $("#authTitle").textContent = signup
    ? "Let’s make a little space."
    : "Come on in.";
  $("#authEyebrow").textContent = signup
    ? "YOUR PEOPLE ARE HERE"
    : "YOUR PEOPLE ARE HERE";
  $("#authCopy").textContent = signup
    ? "Good things grow a little better together."
    : "A good day starts with good company.";
  $("#nameField").classList.toggle("hidden", !signup);
  $("#usernameField").classList.toggle("hidden", !signup);
  $("#name").required = signup;
  $("#username").required = signup;
  $("#password").autocomplete = signup ? "new-password" : "current-password";
  $("#authSubmit").textContent = signup ? "Create my account" : "Sign in";
  $("#switchText").textContent = signup
    ? "Already one of us?"
    : "New around here?";
  $("#authSwitch").textContent = signup
    ? "Come on in"
    : "Make yourself at home";
  $("#authError").textContent = "";
}
$("#authSwitch").addEventListener("click", () =>
  authMode(state.mode === "login" ? "register" : "login"),
);
$("#authForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  $("#authError").textContent = "";
  const body = { email: $("#email").value, password: $("#password").value };
  if (state.mode === "register")
    Object.assign(body, {
      name: $("#name").value,
      username: $("#username").value,
    });
  try {
    const data = await api("/auth/" + state.mode, {
      method: "POST",
      body: JSON.stringify(body),
    });
    state.token = data.token;
    state.user = data.user;
    localStorage.setItem("kindred_token", data.token);
    showApp();
  } catch (err) {
    $("#authError").textContent = err.message;
  }
});
function showAuth() {
  app.classList.add("hidden");
  authScreen.classList.remove("hidden");
}
async function boot() {
  if (!state.token) return showAuth();
  try {
    state.user = await api("/me");
    showApp();
  } catch {
    localStorage.removeItem("kindred_token");
    state.token = null;
    showAuth();
  }
}
async function showApp() {
  authScreen.classList.add("hidden");
  app.classList.remove("hidden");
  $("#greetingName").textContent = state.user.name.split(" ")[0];
  const hour = new Date().getHours();
  $("#dateLabel").textContent =
    `${hour < 12 ? "A good morning to you" : hour < 18 ? "A good afternoon to you" : "A good evening to you"}`;
  $("#composeAvatar").outerHTML = avatar(state.user, "avatar");
  $("#mobileProfile").outerHTML = avatar(state.user, "avatar avatar-small");
  $("#mobileProfile").addEventListener("click", () => switchView("profile"));
  await Promise.all([loadFeed(), loadPeople()]);
  renderProfile();
}
async function loadFeed() {
  try {
    state.posts = await api("/posts");
    renderPosts(state.posts, $("#feed"));
    $("#emptyFeed").classList.toggle("hidden", state.posts.length > 0);
  } catch (e) {
    toast(e.message);
  }
}
async function loadPeople() {
  try {
    state.people = await api("/users");
    renderPeople();
  } catch (e) {
    console.warn(e);
  }
}
function renderPosts(posts, target) {
  target.innerHTML = posts
    .map(
      (p) =>
        `<article class="post-card" data-id="${p.id}"><div class="post-head">${avatar(p.author)}<div class="author-block"><div class="author-name">${esc(p.author?.name || "Kindred friend")}</div><div class="author-handle">@${esc(p.author?.username || "friend")}</div></div><span class="post-time">${timeAgo(p.createdAt)}</span></div><p class="post-text">${esc(p.text)}</p>${p.image ? `<img class="post-image" src="${esc(p.image)}" alt="Image shared by ${esc(p.author?.name || "a friend")}" loading="lazy" onerror="this.remove()">` : ""}<div class="post-actions"><button class="action-btn ${p.liked ? "liked" : ""}" data-action="like"><span class="action-icon">${p.liked ? "♥" : "♡"}</span> ${p.likes} ${p.likes === 1 ? "kindred" : "kindreds"}</button><button class="action-btn" data-action="focus-comment"><span class="action-icon">◌</span> ${p.comments.length} ${p.comments.length === 1 ? "note" : "notes"}</button>${String(p.author?.id) === String(state.user.id) ? '<button class="action-btn delete-post" data-action="delete" style="margin-left:auto">Remove</button>' : ""}</div>${p.comments.length ? `<div class="comment-list">${p.comments.map((c) => `<div class="comment">${avatar(c.author)}<div><b>${esc(c.author?.name || "A friend")}</b>${esc(c.text)}</div></div>`).join("")}</div>` : ""}<form class="comment-form"><input name="comment" maxlength="500" placeholder="Leave a little note…" aria-label="Write a comment"><button type="submit">Send</button></form></article>`,
    )
    .join("");
  target.querySelectorAll(".post-card").forEach((card) => {
    card
      .querySelector('[data-action="like"]')
      .addEventListener("click", async () => {
        try {
          await api(`/posts/${card.dataset.id}/like`, { method: "POST" });
          await refreshPost(card.dataset.id);
        } catch (e) {
          toast(e.message);
        }
      });
    card
      .querySelector('[data-action="focus-comment"]')
      .addEventListener("click", () =>
        card.querySelector('input[name="comment"]').focus(),
      );
    card
      .querySelector('[data-action="delete"]')
      ?.addEventListener("click", async () => {
        try {
          await api(`/posts/${card.dataset.id}`, { method: "DELETE" });
          state.posts = state.posts.filter((p) => p.id !== card.dataset.id);
          renderPosts(state.posts, $("#feed"));
          toast("Moment removed.");
        } catch (e) {
          toast(e.message);
        }
      });
    card
      .querySelector(".comment-form")
      .addEventListener("submit", async (e) => {
        e.preventDefault();
        const input = $('input[name="comment"]', card);
        if (!input.value.trim()) return;
        try {
          const updated = await api(`/posts/${card.dataset.id}/comments`, {
            method: "POST",
            body: JSON.stringify({ text: input.value }),
          });
          state.posts = state.posts.map((p) =>
            p.id === updated.id ? updated : p,
          );
          renderPosts(state.posts, $("#feed"));
          if (state.view === "profile") renderProfileFeed();
        } catch (err) {
          toast(err.message);
        }
      });
  });
}
async function refreshPost(id) {
  const latest = await api("/posts");
  state.posts = latest;
  renderPosts(latest, $("#feed"));
  if (state.view === "profile") renderProfileFeed();
}
$("#sharePost").addEventListener("click", async () => {
  const text = $("#postText").value.trim();
  if (!text) return toast("Add a little something before sharing.");
  try {
    const post = await api("/posts", {
      method: "POST",
      body: JSON.stringify({ text, image: $("#postImage").value.trim() }),
    });
    state.posts.unshift(post);
    $("#postText").value = "";
    $("#postImage").value = "";
    renderPosts(state.posts, $("#feed"));
    $("#emptyFeed").classList.add("hidden");
    toast("A little moment shared.");
  } catch (e) {
    toast(e.message);
  }
});
function renderPeople() {
  const box = $("#suggestions");
  box.innerHTML = state.people.length
    ? state.people
        .slice(0, 5)
        .map(
          (u) =>
            `<div class="person-row">${avatar(u)}<div class="person-info"><b>${esc(u.name)}</b><span>@${esc(u.username)}</span></div><button class="follow-btn ${u.followed ? "following" : ""}" data-follow="${u.id}">${u.followed ? "Following" : "Follow"}</button></div>`,
        )
        .join("")
    : '<p class="people-foot">Your circle is taking shape. Invite someone to join when you’re ready.</p>';
  box.querySelectorAll("[data-follow]").forEach((btn) =>
    btn.addEventListener("click", async () => {
      try {
        const result = await api(`/users/${btn.dataset.follow}/follow`, {
          method: "POST",
        });
        const person = state.people.find((p) => p.id === btn.dataset.follow);
        person.followed = result.following;
        renderPeople();
      } catch (e) {
        toast(e.message);
      }
    }),
  );
}
function renderProfile() {
  const u = state.user;
  $("#profileName").textContent = u.name;
  $("#profileHandle").textContent = "@" + u.username;
  $("#profileBio").textContent = u.bio || "";
  $("#profileLocation").textContent = u.location ? "⌖  " + u.location : "";
  $("#profileFollowers").textContent = u.followers || 0;
  $("#profileFollowing").textContent = u.following || 0;
  $("#profileAvatar").outerHTML = avatar(u, "avatar profile-avatar");
  $("#profilePosts").textContent = state.posts.filter(
    (p) => String(p.author?.id) === String(u.id),
  ).length;
  renderProfileFeed();
}
function renderProfileFeed() {
  const own = state.posts.filter(
    (p) => String(p.author?.id) === String(state.user.id),
  );
  $("#profilePosts").textContent = own.length;
  renderPosts(own, $("#profileFeed"));
}
function switchView(view) {
  state.view = view;
  $("#homeView").classList.toggle("hidden", view !== "home");
  $("#profileView").classList.toggle("hidden", view !== "profile");
  $$("[data-view]").forEach((b) =>
    b.classList.toggle("active", b.dataset.view === view),
  );
  if (view === "profile") renderProfile();
  window.scrollTo({ top: 0, behavior: "smooth" });
}
$$("[data-view]").forEach((b) =>
  b.addEventListener("click", () => switchView(b.dataset.view)),
);
function logout() {
  localStorage.removeItem("kindred_token");
  state.token = null;
  state.user = null;
  showAuth();
  authMode("login");
}
$("#signOut").addEventListener("click", logout);
$("#mobileSignOut").addEventListener("click", logout);
$("#editProfile").addEventListener("click", () => {
  $("#editName").value = state.user.name || "";
  $("#editBio").value = state.user.bio || "";
  $("#editLocation").value = state.user.location || "";
  $("#editAvatar").value = state.user.avatar || "";
  $("#profileError").textContent = "";
  $("#modal").classList.remove("hidden");
});
$("#closeModal").addEventListener("click", () =>
  $("#modal").classList.add("hidden"),
);
$(".modal-backdrop").addEventListener("click", () =>
  $("#modal").classList.add("hidden"),
);
$("#profileForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  try {
    state.user = await api("/me", {
      method: "PATCH",
      body: JSON.stringify({
        name: $("#editName").value,
        bio: $("#editBio").value,
        location: $("#editLocation").value,
        avatar: $("#editAvatar").value,
      }),
    });
    $("#modal").classList.add("hidden");
    $("#greetingName").textContent = state.user.name.split(" ")[0];
    $("#composeAvatar").outerHTML = avatar(state.user, "avatar");
    $("#mobileProfile").outerHTML = avatar(state.user, "avatar avatar-small");
    $("#mobileProfile").addEventListener("click", () => switchView("profile"));
    renderProfile();
    toast("Your little corner is up to date.");
  } catch (err) {
    $("#profileError").textContent = err.message;
  }
});
boot();
