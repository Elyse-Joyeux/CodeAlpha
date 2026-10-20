
const CART_KEY = 'shopkart_cart';

function getCart() {
  try {
    return JSON.parse(localStorage.getItem(CART_KEY)) || [];
  } catch {
    return [];
  }
}

function saveCart(items) {
  localStorage.setItem(CART_KEY, JSON.stringify(items));
  renderCartCount();
}

function addToCart(product, qty = 1) {
  const items = getCart();
  const existing = items.find((i) => i.product === product._id);
  if (existing) {
    existing.qty += qty;
  } else {
    items.push({
      product: product._id,
      name: product.name,
      price: product.price,
      image: product.image,
      qty,
    });
  }
  saveCart(items);
  showToast(`Added "${product.name}" to cart`);
}

function removeFromCart(productId) {
  saveCart(getCart().filter((i) => i.product !== productId));
}

function changeQty(productId, qty) {
  const items = getCart();
  const item = items.find((i) => i.product === productId);
  if (!item) return;
  item.qty = Math.max(1, qty);
  saveCart(items);
}

function clearCart() {
  localStorage.removeItem(CART_KEY);
  renderCartCount();
}

function cartCount() {
  return getCart().reduce((sum, i) => sum + i.qty, 0);
}

function cartSubtotal() {
  return getCart().reduce((sum, i) => sum + i.price * i.qty, 0);
}

function renderCartCount() {
  const badge = document.getElementById('cartBadge');
  if (badge) badge.textContent = cartCount();
}

function renderCartPage() {
  const container = document.getElementById('cartContent');
  if (!container) return; // not on the cart page

  const items = getCart();

  if (items.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <div style="font-size:3rem;margin-bottom:1rem;" aria-hidden="true">🛒</div>
        <h3>Your Shopping Cart is Empty</h3>
        <p>Explore our wide selection of quality products and find something you love.</p>
        <a href="/" class="btn btn-primary" style="margin-top:1.5rem">Start Shopping &rarr;</a>
      </div>`;
    return;
  }

  const rows = items
    .map(
      (item) => `
      <tr>
        <td>
          <div class="cart-thumb">
            <span class="img-box">${item.image ? '' : 'No img'}</span>
            <img ${item.image ? imgAttrs(item.image, item.name) : `src="${PLACEHOLDER_IMG}" alt="${escapeHtml(item.name)}"`}
                 style="display:none"
                 onload="this.style.display='';this.previousElementSibling.style.display='none'"
                 onerror="this.style.display='none'"/>
            <a href="product.html?id=${item.product}" class="name">${escapeHtml(item.name)}</a>
          </div>
        </td>
        <td><strong>${formatPrice(item.price)}</strong></td>
        <td>
          <div class="qty-control">
            <button onclick="handleQtyChange('${item.product}', -1)" aria-label="Decrease quantity">−</button>
            <input type="number" min="1" value="${item.qty}" readonly aria-label="Quantity" />
            <button onclick="handleQtyChange('${item.product}', 1)" aria-label="Increase quantity">+</button>
          </div>
        </td>
        <td><strong>${formatPrice(item.price * item.qty)}</strong></td>
        <td style="text-align:right">
          <button class="btn btn-danger" style="padding:6px 12px;font-size:0.8125rem" onclick="handleRemove('${item.product}')">Remove</button>
        </td>
      </tr>`
    )
    .join('');

  const subtotal = cartSubtotal();
  const shipping = subtotal > 100 ? 0 : 9.99;
  const tax = Math.round(subtotal * 0.1 * 100) / 100;
  const total = subtotal + shipping + tax;
  const freeShippingDiff = 100 - subtotal;

  container.innerHTML = `
    <div class="cart-layout">
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Product</th>
              <th>Price</th>
              <th>Quantity</th>
              <th>Subtotal</th>
              <th style="text-align:right">Action</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
      <aside class="summary-card">
        <h3>Order Summary</h3>
        <div class="summary-row"><span>Items Subtotal</span><span>${formatPrice(subtotal)}</span></div>
        <div class="summary-row"><span>Shipping Estimate</span><span>${shipping === 0 ? '<strong style="color:var(--success)">FREE</strong>' : formatPrice(shipping)}</span></div>
        <div class="summary-row"><span>Estimated Sales Tax (10%)</span><span>${formatPrice(tax)}</span></div>
        <div class="summary-row total"><span>Order Total</span><span>${formatPrice(total)}</span></div>
        ${
          freeShippingDiff > 0
            ? `<p class="muted" style="margin-top:12px;font-size:0.8125rem;background:var(--warning-bg);color:var(--warning);padding:8px 12px;border-radius:6px;border:1px solid var(--warning-border);">
                Add <strong>${formatPrice(freeShippingDiff)}</strong> more to unlock <strong>FREE Shipping</strong>!
               </p>`
            : `<p class="muted" style="margin-top:12px;font-size:0.8125rem;background:var(--success-bg);color:var(--success);padding:8px 12px;border-radius:6px;border:1px solid var(--success-border);">
                🎉 You qualified for <strong>FREE Shipping</strong>!
               </p>`
        }
        <a href="checkout.html" class="btn btn-primary btn-block" style="margin-top:1.25rem;padding:12px">Proceed to Checkout &rarr;</a>
        <button class="btn btn-outline btn-block" style="margin-top:0.625rem" onclick="handleClearCart()">Clear Shopping Cart</button>
      </aside>
    </div>`;
}

function handleQtyChange(productId, delta) {
  const items = getCart();
  const item = items.find((i) => i.product === productId);
  if (!item) return;
  changeQty(productId, item.qty + delta);
  renderCartPage();
}
function handleRemove(productId) {
  removeFromCart(productId);
  renderCartPage();
}
function handleClearCart() {
  if (confirm('Remove all items from your cart?')) {
    clearCart();
    renderCartPage();
  }
}

document.addEventListener('DOMContentLoaded', renderCartPage);
