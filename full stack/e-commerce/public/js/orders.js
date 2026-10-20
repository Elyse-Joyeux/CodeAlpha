
(function () {
  const container = document.getElementById('ordersContent');
  if (!container) return;

  if (!requireAuth()) return;

  async function load() {
    container.innerHTML = '<p class="muted">Loading orders...</p>';
    try {
      const data = await api.get('/api/orders');
      render(data.orders || []);
    } catch (err) {
      container.innerHTML = `<p class="error-text">${escapeHtml(
        err.message
      )}</p>`;
    }
  }

  function render(orders) {
    if (orders.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <div style="font-size:3rem;margin-bottom:1rem;" aria-hidden="true">📦</div>
          <h3>No Orders Found</h3>
          <p>When you place an order, it will appear here with full status and tracking details.</p>
          <a href="/" class="btn btn-primary" style="margin-top:1.5rem">Start Shopping &rarr;</a>
        </div>`;
      return;
    }

    container.innerHTML = orders.map(orderCard).join('');
  }

  function orderCard(o) {
    const itemsHTML = o.items
      .map(
        (i) =>
          `<li><span><strong>${escapeHtml(i.name)}</strong> &times; ${i.qty}</span><span>${formatPrice(
            i.price * i.qty
          )}</span></li>`
      )
      .join('');

    return `
      <div class="order-card">
        <div class="order-head">
          <div>
            <div class="order-id">Order #${o._id.slice(-8).toUpperCase()}</div>
            <div class="muted">Placed on ${formatDate(o.createdAt)}</div>
          </div>
          <div style="display:flex;align-items:center;gap:8px">
            <span class="status-badge status-${o.status}">${o.status}</span>
            ${o.isPaid ? '<span class="status-badge status-Delivered">Paid</span>' : ''}
          </div>
        </div>
        <ul class="order-items">${itemsHTML}</ul>
        <div class="summary-row total">
          <span>Order Total</span><span>${formatPrice(o.totalPrice)}</span>
        </div>
        <div class="muted" style="font-size:0.8125rem;margin-top:0.75rem;padding-top:0.75rem;border-top:1px dashed var(--slate-200)">
          <strong>Shipping to:</strong> ${escapeHtml(o.shippingAddress.address)}, ${escapeHtml(
      o.shippingAddress.city
    )}, ${escapeHtml(o.shippingAddress.postalCode)}, ${escapeHtml(
      o.shippingAddress.country
    )} &bull; <strong>Payment Method:</strong> ${escapeHtml(o.paymentMethod)}
        </div>
      </div>`;
  }

  load();
})();
