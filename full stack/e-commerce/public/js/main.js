
(function () {
  const grid = document.getElementById('productGrid');
  const paginationEl = document.getElementById('pagination');
  const searchInput = document.getElementById('searchInput');
  const categoryFilter = document.getElementById('categoryFilter');
  if (!grid) return; // not on the home page

  const state = { page: 1, search: '', category: 'All', loading: false };
  let productsById = new Map();
  async function loadCategories() {
    try {
      const data = await api.get('/api/products/categories');
      const current = categoryFilter.value;
      categoryFilter.innerHTML = '<option value="All">All categories</option>';
      (data.categories || []).forEach((c) => {
        const opt = document.createElement('option');
        opt.value = c;
        opt.textContent = c;
        categoryFilter.appendChild(opt);
      });
      categoryFilter.value = current || 'All';
    } catch {
      /* ignore - filter just won't have categories */
    }
  }
  async function loadProducts() {
    if (state.loading) return;
    state.loading = true;
    grid.innerHTML = '<p class="muted">Loading products...</p>';
    paginationEl.innerHTML = '';

    const params = new URLSearchParams();
    if (state.search) params.set('search', state.search);
    if (state.category && state.category !== 'All')
      params.set('category', state.category);
    params.set('page', state.page);
    params.set('limit', 12);

    try {
      const data = await api.get('/api/products?' + params.toString());
      renderProducts(data.products || []);
      renderPagination(data);
    } catch (err) {
      grid.innerHTML = `<p class="error-text">Couldn't load products: ${escapeHtml(
        err.message
      )}<br><span class="muted">Make sure the server is running and the database is seeded (npm run seed).</span></p>`;
    } finally {
      state.loading = false;
    }
  }

  function renderProducts(products) {
    productsById = new Map(products.map((product) => [String(product._id), product]));
    if (products.length === 0) {
      grid.innerHTML = `
        <div class="empty-state" style="grid-column:1/-1">
          <h3>No products found</h3>
          <p>Try a different search term or category.</p>
        </div>`;
      return;
    }
    grid.innerHTML = products.map(cardHTML).join('');
    grid.querySelectorAll('[data-add-product]').forEach((button) => {
      button.addEventListener('click', () => {
        const product = productsById.get(button.dataset.addProduct);
        if (product) quickAdd(product._id, product.name, product.price, product.image, product.countInStock);
      });
    });
  }

  function cardHTML(p) {
    const outOfStock = p.countInStock <= 0;
    const stars = p.rating ? '★ ' + Number(p.rating).toFixed(1) : '';
    return `
      <article class="product-card">
        <a href="product.html?id=${p._id}" class="img-wrap" aria-label="${escapeHtml(p.name)}">
          <img ${imgAttrs(p.image, p.name)} loading="lazy" />
          <span class="quick-view">Quick view &rarr;</span>
        </a>
        <div class="card-body">
          <div class="product-meta">
            <span class="category-tag">${escapeHtml(p.category)}</span>
            ${stars ? `<span class="rating" title="Rating: ${Number(p.rating).toFixed(1)} / 5">${stars}</span>` : ''}
          </div>
          <a href="product.html?id=${p._id}" class="name" title="${escapeHtml(p.name)}">${escapeHtml(p.name)}</a>
          <div class="card-actions">
            <span class="price">${formatPrice(p.price)}</span>
            <button class="btn btn-primary add-button" data-add-product="${escapeHtml(p._id)}" ${outOfStock ? 'disabled' : ''}>
              ${outOfStock ? 'Sold Out' : '+ Add to Cart'}
            </button>
          </div>
        </div>
      </article>`;
  }

  function renderPagination(data) {
    const { page, pages } = data;
    if (pages <= 1) {
      paginationEl.innerHTML = '';
      return;
    }
    let html = '';
    html += `<button ${page <= 1 ? 'disabled' : ''} onclick="goToPage(${page - 1})">Prev</button>`;
    for (let i = 1; i <= pages; i++) {
      html += `<button class="${i === page ? 'active' : ''}" onclick="goToPage(${i})">${i}</button>`;
    }
    html += `<button ${page >= pages ? 'disabled' : ''} onclick="goToPage(${page + 1})">Next</button>`;
    paginationEl.innerHTML = html;
  }
  window.goToPage = function (p) {
    state.page = p;
    loadProducts();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  window.quickAdd = async function (id, name, price, image, stock) {
    if (stock <= 0) return;
    addToCart({ _id: id, name, price, image }, 1);
  };
  let searchTimer;
  searchInput.addEventListener('input', (e) => {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => {
      state.search = e.target.value.trim();
      state.page = 1;
      loadProducts();
    }, 300);
  });

  categoryFilter.addEventListener('change', (e) => {
    state.category = e.target.value;
    state.page = 1;
    loadProducts();
  });

  document.querySelectorAll('[data-category]').forEach((tile) => {
    tile.addEventListener('click', () => {
      const category = tile.dataset.category;
      if ([...categoryFilter.options].some((option) => option.value === category)) {
        categoryFilter.value = category;
        categoryFilter.dispatchEvent(new Event('change'));
      }
    });
  });
  loadCategories();
  loadProducts();
})();
