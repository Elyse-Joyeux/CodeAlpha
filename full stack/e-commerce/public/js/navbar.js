
function buildNavbar() {
  const user = getUser();
  const authArea = user
    ? `
      <div class="nav-user-chip">
        <span class="nav-user-avatar">${escapeHtml(user.name.charAt(0).toUpperCase())}</span>
        <span>${escapeHtml(user.name.split(' ')[0])}</span>
      </div>
      <button class="btn btn-outline" style="padding:7px 12px;font-size:0.8125rem" onclick="logout()">Sign out</button>`
    : `
      <a href="login.html" class="btn btn-outline" style="padding:7px 14px;font-size:0.8125rem">Sign in</a>
      <a href="register.html" class="btn btn-primary" style="padding:7px 14px;font-size:0.8125rem">Register</a>`;

  return `
    <div class="announcement">
      <span>Free shipping on orders over $100</span>
      <span>30-day money-back guarantee</span>
      <span>24/7 customer support</span>
    </div>
    <header class="navbar">
      <div class="navbar-inner">
        <a href="/" class="logo" aria-label="ShopKart Homepage">
          <div class="logo-badge" aria-hidden="true">
            <svg viewBox="0 0 24 24">
              <path d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
            </svg>
          </div>
          <div class="logo-text">
            <span>ShopKart</span>
            <span>Online Store</span>
          </div>
        </a>

        <nav class="nav-menu">
          <a href="/" class="nav-link">Home</a>
          <a href="/#categories" class="nav-link">Categories</a>
          <a href="/#shop" class="nav-link">Products</a>
          <a href="orders.html" class="nav-link">My Orders</a>
        </nav>

        <div class="nav-actions">
          <a href="cart.html" class="cart-button" aria-label="Shopping Cart">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <circle cx="9" cy="21" r="1"></circle>
              <circle cx="20" cy="21" r="1"></circle>
              <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path>
            </svg>
            <span>Cart</span>
            <span class="cart-badge" id="cartBadge">0</span>
          </a>
          ${authArea}
        </div>
      </div>
    </header>`;
}

function buildFooter() {
  const year = new Date().getFullYear();
  return `
    <footer class="footer">
      <div class="footer-inner">
        <div class="footer-top">
          <div class="footer-brand-col">
            <a href="/" class="footer-brand">ShopKart.</a>
            <p class="footer-desc">
              Your trusted destination for premium electronics, fashion, and home goods. Designed for reliability, convenience, and modern living.
            </p>
          </div>
          <div class="footer-col">
            <h4>Shop</h4>
            <ul>
              <li><a href="/#shop">All Products</a></li>
              <li><a href="/#categories">Categories</a></li>
              <li><a href="/#shop">Featured Deals</a></li>
              <li><a href="/#shop">New Arrivals</a></li>
            </ul>
          </div>
          <div class="footer-col">
            <h4>Account</h4>
            <ul>
              <li><a href="cart.html">Shopping Cart</a></li>
              <li><a href="orders.html">Order History</a></li>
              <li><a href="login.html">Sign In</a></li>
              <li><a href="register.html">Create Account</a></li>
            </ul>
          </div>
          <div class="footer-col">
            <h4>Customer Care</h4>
            <ul>
              <li><a href="/#">Shipping & Delivery</a></li>
              <li><a href="/#">30-Day Returns</a></li>
              <li><a href="/#">Terms & Conditions</a></li>
              <li><a href="/#">Privacy Policy</a></li>
            </ul>
          </div>
        </div>
        <div class="footer-bottom">
          <span>&copy; ${year} ShopKart Inc. All rights reserved.</span>
          <span>Fast delivery &bull; 100% Secure Checkout &bull; Top Quality Guaranteed</span>
        </div>
      </div>
    </footer>`;
}

document.addEventListener('DOMContentLoaded', () => {
  const navEl = document.getElementById('navbar');
  const footerEl = document.getElementById('footer');
  if (navEl) navEl.innerHTML = buildNavbar();
  if (footerEl) footerEl.innerHTML = buildFooter();
  renderCartCount();
});
