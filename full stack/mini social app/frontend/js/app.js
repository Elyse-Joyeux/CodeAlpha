document.addEventListener('DOMContentLoaded', () => {
  initAuthScreen();
  initComposer();
  initCommentModal();
  initSearch();

  document.getElementById('nav-feed').addEventListener('click', () => {
    currentView = 'feed';
    loadFollowingFeed();
  });
  document.getElementById('nav-global').addEventListener('click', () => {
    currentView = 'global';
    loadGlobalFeed();
  });
  document.getElementById('nav-profile').addEventListener('click', () => {
    const me = getCurrentUser();
    if (me) openProfile(me.id);
  });
  document.getElementById('nav-settings').addEventListener('click', () => openSettings());
  document.getElementById('nav-messages').addEventListener('click', () => openMessages());
  document.getElementById('nav-create').addEventListener('click', () => {
    currentView = 'feed';
    loadFollowingFeed();
    document.getElementById('post-content').focus();
  });
  document.getElementById('logout-btn').addEventListener('click', logout);

  // Auto-login if a token is already stored
  const token = getToken();
  if (token) {
    api
      .me()
      .then((user) => {
        setCurrentUser(user);
        enterApp();
      })
      .catch(() => {
        setToken(null);
        setCurrentUser(null);
        showAuthScreen();
      });
  } else {
    showAuthScreen();
  }
});
