// Base URL: same-origin when served by Express; fallback to localhost when opened directly as a file.
const API_BASE = window.location.protocol === 'file:' ? 'http://localhost:5000/api' : '/api';

function getToken() {
  return localStorage.getItem('orbit_token');
}

function setToken(token) {
  if (token) localStorage.setItem('orbit_token', token);
  else localStorage.removeItem('orbit_token');
}

function getCurrentUser() {
  const raw = localStorage.getItem('orbit_user');
  return raw ? JSON.parse(raw) : null;
}

function setCurrentUser(user) {
  if (user) localStorage.setItem('orbit_user', JSON.stringify(user));
  else localStorage.removeItem('orbit_user');
}

async function apiRequest(path, { method = 'GET', body, auth = true } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  const token = getToken();
  if (auth && token) headers['Authorization'] = `Bearer ${token}`;

  let res;
  try {
    res = await fetch(`${API_BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
    });
  } catch (error) {
    throw new Error('Could not reach Orbit. Make sure the server and MongoDB are running, then try again.');
  }

  let data = {};
  try {
    data = await res.json();
  } catch (e) {
    // no JSON body
  }

  if (!res.ok) {
    throw new Error(data.message || `Request failed (${res.status})`);
  }
  return data;
}

const api = {
  register: (payload) => apiRequest('/auth/register', { method: 'POST', body: payload, auth: false }),
  login: (payload) => apiRequest('/auth/login', { method: 'POST', body: payload, auth: false }),
  me: () => apiRequest('/users/me'),
  updateMe: (payload) => apiRequest('/users/me', { method: 'PUT', body: payload }),
  searchUsers: (q) => apiRequest(`/users/search?q=${encodeURIComponent(q)}`),
  getSuggestions: () => apiRequest('/users/suggestions'),
  getUser: (id) => apiRequest(`/users/${id}`),
  getUserPosts: (id) => apiRequest(`/users/${id}/posts`),
  toggleFollow: (id) => apiRequest(`/users/${id}/follow`, { method: 'POST' }),

  getConversations: () => apiRequest('/messages/conversations'),
  getMessages: (userId) => apiRequest(`/messages/${userId}`),
  sendMessage: (userId, text) => apiRequest(`/messages/${userId}`, { method: 'POST', body: { text } }),

  getGlobalFeed: () => apiRequest('/posts'),
  getFollowingFeed: () => apiRequest('/posts/feed'),
  createPost: (payload) => apiRequest('/posts', { method: 'POST', body: payload }),
  deletePost: (id) => apiRequest(`/posts/${id}`, { method: 'DELETE' }),
  toggleLike: (id) => apiRequest(`/posts/${id}/like`, { method: 'POST' }),

  getComments: (postId) => apiRequest(`/posts/${postId}/comments`, { auth: false }),
  addComment: (postId, text) => apiRequest(`/posts/${postId}/comments`, { method: 'POST', body: { text } }),
  deleteComment: (commentId) => apiRequest(`/posts/comments/${commentId}`, { method: 'DELETE' }),
};

function showToast(message, isError = false) {
  const toast = document.getElementById('toast');
  toast.textContent = message;
  toast.className = isError ? 'toast error' : 'toast';
  toast.classList.remove('hidden');
  clearTimeout(showToast._t);
  showToast._t = setTimeout(() => toast.classList.add('hidden'), 3000);
}

function timeAgo(dateStr) {
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 2592000) return `${Math.floor(diff / 86400)}d ago`;
  return new Date(dateStr).toLocaleDateString();
}

function initials(username) {
  return (username || '?').slice(0, 2).toUpperCase();
}

function avatarHTML(user) {
  if (user && user.avatar) {
    return `<img src="${user.avatar}" alt="${user.username}" />`;
  }
  return initials(user ? user.username : '?');
}
