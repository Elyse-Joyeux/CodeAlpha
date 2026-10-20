
function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

function getUser() {
  try {
    return JSON.parse(localStorage.getItem(USER_KEY)) || null;
  } catch {
    return null;
  }
}

function setSession(token, user) {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

function clearSession() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

function isLoggedIn() {
  return !!getToken();
}

async function register(name, email, password) {
  const data = await api.post('/api/auth/register', { name, email, password });
  setSession(data.token, data.user);
  return data;
}

async function login(email, password) {
  const data = await api.post('/api/auth/login', { email, password });
  setSession(data.token, data.user);
  return data;
}

function logout() {
  clearSession();
  window.location.href = '/';
}

function requireAuth() {
  if (!isLoggedIn()) {
    const here = encodeURIComponent(window.location.pathname + window.location.search);
    window.location.href = 'login.html?redirect=' + here;
    return false;
  }
  return true;
}
