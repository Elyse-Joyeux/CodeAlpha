
const PLACEHOLDER_SVG =
  "<svg xmlns='http://www.w3.org/2000/svg' width='400' height='400'>" +
  "<rect width='100%' height='100%' fill='#eef0f4'/>" +
  "<g fill='#c7cdda'>" +
  "<rect x='150' y='130' width='100' height='78' rx='10'/>" +
  "<path d='M120 300 L165 235 L235 235 L280 300 Z'/>" +
  "<circle cx='185' cy='160' r='14' fill='#eef0f4'/>" +
  "</g>" +
  "<text x='200' y='350' font-family='sans-serif' font-size='22' fill='#9aa3b2' text-anchor='middle'>No image</text>" +
  "</svg>";
const PLACEHOLDER_IMG = 'data:image/svg+xml,' + encodeURIComponent(PLACEHOLDER_SVG);

const UNSPLASH_PRODUCTS = {
  'wireless-headphones.jpg': 'photo-1505740420928-5e560c06d30e',
  'smart-watch.jpg': 'photo-1523275335684-37898b6baf30',
  'laptop-stand.jpg': 'photo-1496181133206-80ce9b88a853',
  'running-shoes.jpg': 'photo-1637437757614-6491c8e915b5',
  'backpack.jpg': 'photo-1553062407-98eeb64c6a62',
  'coffee-mug.jpg': 'photo-1495474472287-4d71bcdd2085',
  'sunglasses.jpg': 'photo-1511499767150-a48a237f0083',
  't-shirt.jpg': 'photo-1521572163474-6864f9cf17ab',
  'desk-lamp.jpg': 'photo-1507473885765-e6ed057f782c',
  'yoga-mat.jpg': 'photo-1544367567-0f2fcb009e0b',
  'water-bottle.jpg': 'photo-1602143407151-7111542de6e8',
  'notebook.jpg': 'photo-1531346878377-a5be20888e57',
};

function imgSrc(filename) {
  if (!filename) return PLACEHOLDER_IMG;
  if (/^https?:\/\//i.test(filename)) return filename;
  const unsplashId = UNSPLASH_PRODUCTS[filename];
  if (unsplashId)
    return `https://images.unsplash.com/${unsplashId}?auto=format&fit=crop&w=900&q=82`;
  return '/images/' + filename;
}

function imgAttrs(filename, alt) {
  const src = imgSrc(filename);
  return `src="${src}" alt="${escapeHtml(alt || '')}" onerror="this.onerror=null;this.src='${PLACEHOLDER_IMG}';"`;
}

function escapeHtml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

const TOKEN_KEY = 'shopkart_token';
const USER_KEY = 'shopkart_user';

function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

function authHeaders() {
  const token = getToken();
  return token ? { Authorization: 'Bearer ' + token } : {};
}

async function apiRequest(path, { method = 'GET', body } = {}) {
  const opts = {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders(),
    },
  };
  if (body !== undefined) opts.body = JSON.stringify(body);

  let res;
  try {
    res = await fetch(path, opts);
  } catch (err) {
    throw { message: 'Network error - is the server running?' };
  }

  let data = null;
  const text = await res.text();
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = { message: text };
    }
  }

  if (!res.ok) {
    throw { message: (data && data.message) || 'Request failed', status: res.status };
  }
  return data;
}

const api = {
  get: (path) => apiRequest(path, { method: 'GET' }),
  post: (path, body) => apiRequest(path, { method: 'POST', body }),
  put: (path, body) => apiRequest(path, { method: 'PUT', body }),
  delete: (path) => apiRequest(path, { method: 'DELETE' }),
};

function showToast(message) {
  let toast = document.getElementById('toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'toast';
    toast.className = 'toast';
    document.body.appendChild(toast);
  }
  toast.innerHTML = `<span style="color:#10b981;font-weight:bold;font-size:1.1em" aria-hidden="true">✓</span> <span>${escapeHtml(message)}</span>`;
  toast.classList.add('show');
  clearTimeout(toast._timer);
  toast._timer = setTimeout(() => toast.classList.remove('show'), 2500);
}

function formatPrice(n) {
  return '$' + Number(n || 0).toFixed(2);
}

function formatDate(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}
