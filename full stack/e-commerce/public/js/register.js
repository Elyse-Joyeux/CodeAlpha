
(function () {
  const form = document.getElementById('registerForm');
  if (!form) return;

  if (isLoggedIn()) {
    window.location.href = '/';
    return;
  }

  const errorEl = document.getElementById('registerError');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    errorEl.textContent = '';

    const name = document.getElementById('name').value.trim();
    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;
    const btn = form.querySelector('button[type="submit"]');
    btn.disabled = true;
    btn.textContent = 'Creating account...';

    try {
      await register(name, email, password);
      showToast('Account created - welcome to ShopKart!');
      window.location.href = '/';
    } catch (err) {
      errorEl.textContent = err.message || 'Registration failed';
      btn.disabled = false;
      btn.textContent = 'Register';
    }
  });
})();
