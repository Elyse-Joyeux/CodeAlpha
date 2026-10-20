
(function () {
  const form = document.getElementById('loginForm');
  if (!form) return;
  if (isLoggedIn()) {
    window.location.href = '/';
    return;
  }

  const errorEl = document.getElementById('loginError');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    errorEl.textContent = '';

    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;
    const btn = form.querySelector('button[type="submit"]');
    btn.disabled = true;
    btn.textContent = 'Logging in...';

    try {
      await login(email, password);
      const redirect =
        new URLSearchParams(window.location.search).get('redirect') || '/';
      window.location.href = decodeURIComponent(redirect);
    } catch (err) {
      errorEl.textContent = err.message || 'Login failed';
      btn.disabled = false;
      btn.textContent = 'Log in';
    }
  });
})();
