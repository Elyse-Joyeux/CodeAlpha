(function () {
  const container = document.getElementById('checkoutContent');
  if (!container) return;
  if (!requireAuth()) return;

  function render() {
    const items = getCart();

    if (items.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <div style="font-size:3rem;margin-bottom:1rem;" aria-hidden="true">🛒</div>
          <h3>Your Shopping Cart is Empty</h3>
          <p>You need items in your cart before you can proceed to checkout.</p>
          <a href="/" class="btn btn-primary" style="margin-top:1.5rem">Browse Catalog &rarr;</a>
        </div>`;
      return;
    }

    const subtotal = cartSubtotal();
    const shipping = subtotal > 100 ? 0 : 9.99;
    const tax = Math.round(subtotal * 0.1 * 100) / 100;
    const total = subtotal + shipping + tax;

    const itemsRows = items
      .map(
        (i) =>
          `<div class="summary-row"><span>${escapeHtml(i.name)} × ${i.qty}</span><span>${formatPrice(
            i.price * i.qty
          )}</span></div>`
      )
      .join('');

    container.innerHTML = `
      <div class="checkout-layout">
        <form id="checkoutForm" class="card">
          <h3 style="margin-bottom:1rem">Shipping details</h3>
          <div class="form-grid">
            <div class="form-group full">
              <label for="address">Address</label>
              <input type="text" id="address" name="address" required placeholder="123 Main Street" />
            </div>
            <div class="form-group">
              <label for="city">City</label>
              <input type="text" id="city" name="city" required />
            </div>
            <div class="form-group">
              <label for="postalCode">Postal code</label>
              <input type="text" id="postalCode" name="postalCode" required />
            </div>
            <div class="form-group full">
              <label for="country">Country</label>
              <input type="text" id="country" name="country" required placeholder="United States" />
            </div>
            <div class="form-group full">
              <label for="paymentMethod">Payment method</label>
              <select id="paymentMethod">
                <option value="Cash on Delivery">Cash on Delivery</option>
                <option value="Credit Card">Credit Card</option>
                <option value="PayPal">PayPal</option>
              </select>
              <small class="muted">Demo only - no real payment is processed.</small>
            </div>
          </div>
          <p id="checkoutError" class="error-text"></p>
          <button type="submit" class="btn btn-primary btn-block" id="placeOrderBtn">Place order</button>
        </form>

        <aside class="summary-card">
          <h3>Order Summary</h3>
          ${itemsRows}
          <div class="summary-row"><span>Subtotal</span><span>${formatPrice(subtotal)}</span></div>
          <div class="summary-row"><span>Shipping</span><span>${shipping === 0 ? 'Free' : formatPrice(shipping)}</span></div>
          <div class="summary-row"><span>Tax (10%)</span><span>${formatPrice(tax)}</span></div>
          <div class="summary-row total"><span>Total</span><span>${formatPrice(total)}</span></div>
        </aside>
      </div>`;

    document
      .getElementById('checkoutForm')
      .addEventListener('submit', handleSubmit);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const errorEl = document.getElementById('checkoutError');
    const btn = document.getElementById('placeOrderBtn');
    errorEl.textContent = '';
    btn.disabled = true;
    btn.textContent = 'Placing order...';

    const items = getCart().map((i) => ({ product: i.product, qty: i.qty }));
    const shippingAddress = {
      address: document.getElementById('address').value.trim(),
      city: document.getElementById('city').value.trim(),
      postalCode: document.getElementById('postalCode').value.trim(),
      country: document.getElementById('country').value.trim(),
    };
    const paymentMethod = document.getElementById('paymentMethod').value;

    try {
      const data = await api.post('/api/orders', {
        items,
        shippingAddress,
        paymentMethod,
      });
      clearCart();
      showSuccess(data.order);
    } catch (err) {
      errorEl.textContent = err.message || 'Could not place order';
      btn.disabled = false;
      btn.textContent = 'Place order';
    }
  }

  function showSuccess(order) {
    container.innerHTML = `
      <div class="card success-box">
        <div class="check">✓</div>
        <h2>Thank you for your order!</h2>
        <p class="muted">Your order has been placed successfully.</p>
        <p style="margin:0.75rem 0"><strong>Order ID:</strong> ${order._id}</p>
        <p><strong>Total:</strong> ${formatPrice(order.totalPrice)} &middot; <strong>Status:</strong> ${order.status}</p>
        <div style="margin-top:1.5rem;display:flex;gap:0.75rem;justify-content:center">
          <a href="orders.html" class="btn btn-primary">View my orders</a>
          <a href="/" class="btn btn-outline">Continue shopping</a>
        </div>
      </div>`;
  }

  render();
})();
