
(function () {
  const container = document.getElementById('productDetail');
  if (!container) return;

  const id = new URLSearchParams(window.location.search).get('id');
  if (!id) {
    container.innerHTML = '<p class="error-text">No product specified.</p>';
    return;
  }

  let qty = 1;

  async function load() {
    container.innerHTML = '<p class="muted">Loading product...</p>';
    try {
      const data = await api.get('/api/products/' + id);
      render(data.product);
    } catch (err) {
      container.innerHTML = `<p class="error-text">${escapeHtml(
        err.message || 'Product not found'
      )}</p>`;
    }
  }

  function render(p) {
    const outOfStock = p.countInStock <= 0;
    container.innerHTML = `
      <div class="product-detail">
        <div class="img-wrap">
          <img ${imgAttrs(p.image, p.name)} />
        </div>
        <div class="product-info">
          <div>
            <span class="category-tag">${escapeHtml(p.category)}</span>
          </div>
          <h1>${escapeHtml(p.name)}</h1>
          ${p.rating ? `<div class="rating">★ ${Number(p.rating).toFixed(1)} <span class="muted">(${p.numReviews} customer reviews)</span></div>` : ''}
          <div class="price">${formatPrice(p.price)}</div>
          <p class="description">${escapeHtml(p.description)}</p>
          <div class="stock ${outOfStock ? 'out' : 'in'}">
            ${outOfStock ? '✕ Out of Stock' : `✓ In Stock (${p.countInStock} available)`}
          </div>
          <div class="qty-row">
            <label for="qty">Quantity:</label>
            <div class="qty-control">
              <button id="decQty" aria-label="Decrease quantity">−</button>
              <input id="qty" type="number" min="1" value="1" readonly aria-label="Quantity" />
              <button id="incQty" aria-label="Increase quantity">+</button>
            </div>
          </div>
          <div class="detail-actions">
            <button class="btn btn-primary" id="addBtn" style="padding:12px 24px;font-size:0.9375rem" ${outOfStock ? 'disabled' : ''}>
              ${outOfStock ? 'Sold Out' : '+ Add to Shopping Cart'}
            </button>
            <a href="/" class="btn btn-outline" style="padding:12px 20px">Continue Shopping</a>
          </div>
        </div>
      </div>`;

    if (outOfStock) return;

    const qtyInput = document.getElementById('qty');
    const clamp = (v) => Math.min(Math.max(1, v), p.countInStock);

    document.getElementById('decQty').addEventListener('click', () => {
      qtyInput.value = clamp(parseInt(qtyInput.value || 1, 10) - 1);
    });
    document.getElementById('incQty').addEventListener('click', () => {
      qtyInput.value = clamp(parseInt(qtyInput.value || 1, 10) + 1);
    });
    qtyInput.addEventListener('change', () => {
      qtyInput.value = clamp(parseInt(qtyInput.value || 1, 10));
    });

    document.getElementById('addBtn').addEventListener('click', () => {
      qty = clamp(parseInt(qtyInput.value || 1, 10));
      addToCart(p, qty);
    });
  }

  load();
})();
