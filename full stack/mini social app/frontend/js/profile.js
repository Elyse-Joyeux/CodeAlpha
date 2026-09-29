window._activeProfileId = null;

async function openProfile(userId) {
  if (typeof messageRefreshTimer !== 'undefined') clearInterval(messageRefreshTimer);
  currentView = 'profile';
  window._activeProfileId = userId;
  const me = getCurrentUser();
  ['nav-feed', 'nav-global', 'nav-profile', 'nav-settings', 'nav-messages', 'nav-create'].forEach((id) => {
    document.getElementById(id).classList.toggle('active', id === 'nav-profile' && !!me && userId === me.id);
  });

  document.getElementById('composer').classList.add('hidden');
  document.getElementById('feed').classList.add('hidden');
  document.getElementById('settings-view').classList.add('hidden');
  document.getElementById('messages-view').classList.add('hidden');
  const profileView = document.getElementById('profile-view');
  profileView.classList.remove('hidden');
  profileView.innerHTML = '<p class="empty-state">Loading profile...</p>';

  try {
    const [user, posts] = await Promise.all([api.getUser(userId), api.getUserPosts(userId)]);
    renderProfile(user, posts);
  } catch (err) {
    profileView.innerHTML = `<p class="empty-state">${err.message}</p>`;
  }
}

function renderProfile(user, posts) {
  const profileView = document.getElementById('profile-view');
  const me = getCurrentUser();
  const isSelf = me && user.id === me.id;

  profileView.innerHTML = `
    <div class="card">
      <div class="profile-header">
        ${isSelf ? `<button type="button" class="avatar profile-avatar" aria-label="Edit profile photo">${avatarHTML(user)}</button>` : `<div class="avatar profile-avatar">${avatarHTML(user)}</div>`}
        <div class="profile-info">
          <h2>${user.username}</h2>
          <p class="profile-bio" id="bio-display">${user.bio ? escapeHTML(user.bio) : 'No bio yet.'}</p>
          <div class="profile-stats">
            <span><b>${user.followersCount}</b> Followers</span>
            <span><b>${user.followingCount}</b> Following</span>
            <span><b>${posts.length}</b> Posts</span>
          </div>
        </div>
      </div>
      <div class="profile-actions">
        ${
          isSelf
            ? `<button id="edit-bio-btn" class="btn-outline">Edit profile</button>`
            : `<button id="follow-btn" class="btn-outline ${user.isFollowing ? 'following' : ''}">
                 ${user.isFollowing ? 'Following' : 'Follow'}
               </button>`
        }
      </div>
      <div id="bio-edit-wrap"></div>
    </div>
    <div class="profile-posts-heading">Posts</div>
    <div class="feed" id="profile-posts"></div>
  `;

  if (isSelf) {
    document.getElementById('edit-bio-btn').addEventListener('click', () => openSettings());
    profileView.querySelector('.profile-avatar').addEventListener('click', () => openSettings(true));
  } else {
    document.getElementById('follow-btn').addEventListener('click', async (e) => {
      try {
        const { following, followersCount } = await api.toggleFollow(user.id);
        e.currentTarget.classList.toggle('following', following);
        e.currentTarget.textContent = following ? 'Following' : 'Follow';
        profileView.querySelector('.profile-stats span b').textContent = followersCount;
      } catch (err) {
        showToast(err.message, true);
      }
    });
  }

  const postsWrap = document.getElementById('profile-posts');
  if (!posts.length) {
    postsWrap.innerHTML = '<p class="empty-state">No posts yet.</p>';
  } else {
    posts.forEach((post) => postsWrap.appendChild(renderPost(post, me ? me.id : null)));
  }
}

function renderAccountSummary() {
  const user = getCurrentUser();
  const summary = document.getElementById('account-summary');
  if (!user || !summary) return;
  summary.innerHTML = `
    <div class="avatar" data-summary-profile="true">${avatarHTML(user)}</div>
    <div class="account-summary-meta">
      <span class="account-summary-name" data-summary-profile="true">${escapeHTML(user.username)}</span>
      <span class="account-summary-bio">${escapeHTML(user.bio || 'Welcome to Orbit')}</span>
    </div>
  `;
  summary.querySelectorAll('[data-summary-profile]').forEach((item) => item.addEventListener('click', () => openProfile(user.id)));
  loadPeopleSuggestions();
}

async function loadPeopleSuggestions() {
  const section = document.getElementById('people-suggestions');
  if (!section) return;
  try {
    const users = await api.getSuggestions();
    if (!section.isConnected) return;
    section.innerHTML = '<h2>People to follow</h2>';
    if (!users.length) {
      section.innerHTML += '<p class="suggestion-loading">You’re all caught up. Explore the community to find more people.</p>';
      return;
    }
    users.forEach((user) => {
      const row = document.createElement('div');
      row.className = 'suggestion-row';
      row.innerHTML = `<button type="button" class="avatar suggestion-avatar" aria-label="View ${escapeHTML(user.username)}">${avatarHTML(user)}</button><button type="button" class="suggestion-user">${escapeHTML(user.username)}</button><button type="button" class="suggestion-follow">Follow</button>`;
      row.querySelector('.suggestion-avatar').addEventListener('click', () => openProfile(user.id));
      row.querySelector('.suggestion-user').addEventListener('click', () => openProfile(user.id));
      row.querySelector('.suggestion-follow').addEventListener('click', async () => {
        try {
          await api.toggleFollow(user.id);
          row.remove();
          if (!section.querySelector('.suggestion-row')) section.innerHTML = '<h2>People to follow</h2><p class="suggestion-loading">You’re all caught up.</p>';
        } catch (err) {
          showToast(err.message, true);
        }
      });
      section.appendChild(row);
    });
  } catch (err) {
    section.innerHTML = '<h2>People to follow</h2><p class="suggestion-loading">Suggestions are unavailable right now.</p>';
  }
}

function openSettings(focusPhoto = false) {
  if (typeof messageRefreshTimer !== 'undefined') clearInterval(messageRefreshTimer);
  const user = getCurrentUser();
  if (!user) return;
  currentView = 'settings';
  ['nav-feed', 'nav-global', 'nav-profile', 'nav-settings', 'nav-messages', 'nav-create'].forEach((id) => {
    document.getElementById(id).classList.toggle('active', id === 'nav-settings');
  });
  document.getElementById('composer').classList.add('hidden');
  document.getElementById('feed').classList.add('hidden');
  document.getElementById('profile-view').classList.add('hidden');
  document.getElementById('messages-view').classList.add('hidden');
  const view = document.getElementById('settings-view');
  view.classList.remove('hidden');
  view.innerHTML = `
    <section class="card settings-card">
      <header class="settings-title"><h2>Edit profile</h2><p>Make your Orbit profile feel like you.</p></header>
      <form id="settings-form" class="settings-form">
        <div class="settings-section-label">Profile information</div>
        <div class="settings-avatar-wrap">
          <div class="photo-control">
            <button type="button" id="settings-avatar" class="avatar photo-trigger" aria-label="Profile photo actions">${avatarHTML(user)}</button>
            <div id="avatar-actions" class="avatar-popover hidden">
              <button type="button" id="change-avatar-btn">Change photo</button>
              <button type="button" id="remove-avatar-btn" class="remove-photo-btn">Remove photo</button>
            </div>
            <input id="settings-avatar-input" class="sr-only" type="file" accept="image/*" aria-label="Choose a profile photo" />
          </div>
          <span class="settings-hint photo-hint">Click your photo to change or remove it</span>
        </div>
        <div class="settings-fields">
          <label for="settings-username">Username</label>
          <input id="settings-username" value="${escapeHTML(user.username)}" readonly />
          <span class="settings-hint">Your username identifies you across Orbit.</span>
          <label for="settings-bio">Bio</label>
          <textarea id="settings-bio" maxlength="200" placeholder="Tell people a little about yourself">${escapeHTML(user.bio || '')}</textarea>
          <span class="settings-hint">Your photo appears beside your posts and messages.</span>
        </div>
        <div class="settings-actions"><button type="submit" class="btn-primary">Save changes</button><button type="button" id="settings-cancel" class="btn-outline">Cancel</button></div>
      </form>
    </section>
  `;

  let avatarData = user.avatar || '';
  const avatarInput = document.getElementById('settings-avatar-input');
  const avatarActions = document.getElementById('avatar-actions');
  const updateAvatarPreview = () => {
    document.getElementById('settings-avatar').innerHTML = avatarData
      ? `<img src="${avatarData}" alt="Profile photo preview" />`
      : initials(user.username);
  };
  document.getElementById('settings-avatar').addEventListener('click', () => avatarActions.classList.toggle('hidden'));
  document.getElementById('change-avatar-btn').addEventListener('click', () => avatarInput.click());
  document.getElementById('remove-avatar-btn').addEventListener('click', () => {
    avatarData = '';
    avatarInput.value = '';
    updateAvatarPreview();
    avatarActions.classList.add('hidden');
  });
  avatarInput.addEventListener('change', () => {
    const file = avatarInput.files && avatarInput.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      avatarData = reader.result;
      updateAvatarPreview();
      avatarActions.classList.add('hidden');
    };
    reader.readAsDataURL(file);
  });
  if (focusPhoto) avatarActions.classList.remove('hidden');
  document.getElementById('settings-cancel').addEventListener('click', () => openProfile(user.id));
  document.getElementById('settings-form').addEventListener('submit', async (event) => {
    event.preventDefault();
    try {
      const updated = await api.updateMe({ bio: document.getElementById('settings-bio').value.trim(), avatar: avatarData });
      setCurrentUser({ ...user, ...updated });
      renderAccountSummary();
      showToast('Profile updated');
      openProfile(user.id);
    } catch (err) {
      showToast(err.message, true);
    }
  });
}

function showBioEditor(user) {
  const wrap = document.getElementById('bio-edit-wrap');
  wrap.innerHTML = `
    <div class="bio-edit">
      <textarea id="bio-textarea" maxlength="200">${escapeHTML(user.bio || '')}</textarea>
      <button id="save-bio-btn" class="btn-primary small" style="margin-top:8px;">Save</button>
    </div>
  `;
  document.getElementById('save-bio-btn').addEventListener('click', async () => {
    const bio = document.getElementById('bio-textarea').value.trim();
    try {
      const updated = await api.updateMe({ bio });
      setCurrentUser({ ...getCurrentUser(), bio: updated.bio });
      showToast('Bio updated');
      openProfile(user.id);
    } catch (err) {
      showToast(err.message, true);
    }
  });
}

// ===== Search =====
function initSearch() {
  const input = document.getElementById('search-input');
  const resultsEl = document.getElementById('search-results');
  let debounceTimer;

  input.addEventListener('input', () => {
    clearTimeout(debounceTimer);
    const q = input.value.trim();
    if (!q) {
      resultsEl.classList.add('hidden');
      return;
    }
    debounceTimer = setTimeout(async () => {
      try {
        const users = await api.searchUsers(q);
        renderSearchResults(users);
      } catch (err) {
        // silent fail on search
      }
    }, 250);
  });

  document.addEventListener('click', (e) => {
    if (!e.target.closest('.search-wrap')) resultsEl.classList.add('hidden');
  });

  function renderSearchResults(users) {
    if (!users.length) {
      resultsEl.innerHTML = '<div class="search-result-item">No users found</div>';
      resultsEl.classList.remove('hidden');
      return;
    }
    resultsEl.innerHTML = '';
    users.forEach((u) => {
      const item = document.createElement('div');
      item.className = 'search-result-item';
      item.innerHTML = `<div class="avatar" style="width:28px;height:28px;font-size:11px;">${avatarHTML(u)}</div> ${u.username}`;
      item.addEventListener('click', () => {
        input.value = '';
        resultsEl.classList.add('hidden');
        openProfile(u.id);
      });
      resultsEl.appendChild(item);
    });
    resultsEl.classList.remove('hidden');
  }
}
