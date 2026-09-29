let currentComposerImage = '';
let activeCommentPostId = null;

const postIcons = {
  heart: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-heart preview-icon" aria-hidden="true"><path d="M2 9.5a5.5 5.5 0 0 1 9.591-3.676.56.56 0 0 0 .818 0A5.49 5.49 0 0 1 22 9.5c0 2.29-1.5 4-3 5.5l-5.492 5.313a2 2 0 0 1-3 .019L5 15c-1.5-1.5-3-3.2-3-5.5"/></svg>',
  comment: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-message-circle preview-icon" aria-hidden="true"><path d="M2.992 16.342a2 2 0 0 1 .094 1.167l-1.065 3.29a1 1 0 0 0 1.236 1.168l3.413-.998a2 2 0 0 1 1.099.092 10 10 0 1 0-4.777-4.719"/></svg>',
  trash: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-trash preview-icon" aria-hidden="true"><path d="M10 11v6"/><path d="M14 11v6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/><path d="M3 6h18"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>'
};

function initComposer() {
  const imageInput = document.getElementById('post-image-input');
  const preview = document.getElementById('post-image-preview');

  imageInput.addEventListener('change', () => {
    const file = imageInput.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      currentComposerImage = reader.result;
      preview.src = currentComposerImage;
      preview.classList.remove('hidden');
    };
    reader.readAsDataURL(file);
  });

  document.getElementById('post-submit').addEventListener('click', async () => {
    const contentEl = document.getElementById('post-content');
    const content = contentEl.value.trim();
    if (!content) {
      showToast('Write something before posting', true);
      return;
    }
    try {
      await api.createPost({ content, image: currentComposerImage });
      contentEl.value = '';
      currentComposerImage = '';
      preview.classList.add('hidden');
      imageInput.value = '';
      showToast('Posted!');
      refreshCurrentView();
    } catch (err) {
      showToast(err.message, true);
    }
  });
}

function renderPost(post, currentUserId) {
  const isOwner = currentUserId && post.author._id === currentUserId;
  const div = document.createElement('div');
  div.className = 'card post-card';
  div.innerHTML = `
    <div class="post-header">
      <div class="avatar" data-user="${post.author._id}">${avatarHTML(post.author)}</div>
      <div class="post-meta">
        <span class="post-username" data-user="${post.author._id}">${post.author.username}</span>
        <span class="post-time">${timeAgo(post.createdAt)}</span>
      </div>
    </div>
    <div class="post-content">${escapeHTML(post.content)}</div>
    ${post.image ? `<img class="post-image" src="${post.image}" />` : ''}
    <div class="post-actions">
      <button class="action-btn like-btn ${post.liked ? 'liked' : ''}" data-post="${post._id}">
        ${postIcons.heart}<span class="like-count">${post.likesCount}</span><span class="sr-only">${post.liked ? 'Unlike' : 'Like'}</span>
      </button>
      <button class="action-btn comment-btn" data-post="${post._id}" aria-label="View comments">${postIcons.comment}</button>
      ${isOwner ? `<button class="action-btn delete-btn" data-post="${post._id}" aria-label="Delete post">${postIcons.trash}</button>` : ''}
    </div>
  `;

  div.querySelectorAll('[data-user]').forEach((el) => {
    el.addEventListener('click', () => openProfile(el.dataset.user));
  });

  div.querySelector('.like-btn').addEventListener('click', async (e) => {
    try {
      const { liked, likesCount } = await api.toggleLike(post._id);
      const btn = e.currentTarget;
      btn.classList.toggle('liked', liked);
      btn.innerHTML = `${postIcons.heart}<span class="like-count">${likesCount}</span><span class="sr-only">${liked ? 'Unlike' : 'Like'}</span>`;
    } catch (err) {
      showToast(err.message, true);
    }
  });

  div.querySelector('.comment-btn').addEventListener('click', () => openCommentModal(post));

  const deleteBtn = div.querySelector('.delete-btn');
  if (deleteBtn) {
    deleteBtn.addEventListener('click', async () => {
      if (!confirm('Delete this post?')) return;
      try {
        await api.deletePost(post._id);
        div.remove();
        showToast('Post deleted');
      } catch (err) {
        showToast(err.message, true);
      }
    });
  }

  return div;
}

function escapeHTML(str) {
  const d = document.createElement('div');
  d.textContent = str;
  return d.innerHTML;
}

async function loadFollowingFeed() {
  setActiveNav('nav-feed');
  showFeedSection();
  const feedEl = document.getElementById('feed');
  feedEl.innerHTML = '<p class="empty-state">Loading...</p>';
  try {
    const posts = await api.getFollowingFeed();
    renderFeedList(posts, "No posts yet. Follow people or create your first post!");
  } catch (err) {
    feedEl.innerHTML = `<p class="empty-state">${err.message}</p>`;
  }
}

async function loadGlobalFeed() {
  setActiveNav('nav-global');
  showFeedSection();
  const feedEl = document.getElementById('feed');
  feedEl.innerHTML = '<p class="empty-state">Loading...</p>';
  try {
    const posts = await api.getGlobalFeed();
    renderFeedList(posts, "No posts yet. Be the first to post!");
  } catch (err) {
    feedEl.innerHTML = `<p class="empty-state">${err.message}</p>`;
  }
}

function renderFeedList(posts, emptyMessage) {
  const feedEl = document.getElementById('feed');
  feedEl.innerHTML = '';
  const me = getCurrentUser();
  if (!posts.length) {
    feedEl.innerHTML = `<p class="empty-state">${emptyMessage}</p>`;
    return;
  }
  posts.forEach((post) => feedEl.appendChild(renderPost(post, me ? me.id : null)));
}

function showFeedSection() {
  if (typeof messageRefreshTimer !== 'undefined') clearInterval(messageRefreshTimer);
  document.getElementById('composer').classList.remove('hidden');
  document.getElementById('feed').classList.remove('hidden');
  document.getElementById('profile-view').classList.add('hidden');
  document.getElementById('settings-view').classList.add('hidden');
  document.getElementById('messages-view').classList.add('hidden');
}

function setActiveNav(activeId) {
  ['nav-feed', 'nav-global', 'nav-profile', 'nav-settings', 'nav-messages', 'nav-create'].forEach((id) => {
    document.getElementById(id).classList.toggle('active', id === activeId);
  });
}

let currentView = 'feed';
function refreshCurrentView() {
  if (currentView === 'feed') loadFollowingFeed();
  else if (currentView === 'global') loadGlobalFeed();
  else if (currentView === 'profile' && window._activeProfileId) openProfile(window._activeProfileId);
}

// ===== Comment Modal =====
function initCommentModal() {
  document.getElementById('modal-close').addEventListener('click', closeCommentModal);
  document.querySelector('.modal-backdrop').addEventListener('click', closeCommentModal);

  document.getElementById('comment-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const input = document.getElementById('comment-input');
    const text = input.value.trim();
    if (!text || !activeCommentPostId) return;
    try {
      await api.addComment(activeCommentPostId, text);
      input.value = '';
      loadCommentsIntoModal(activeCommentPostId);
    } catch (err) {
      showToast(err.message, true);
    }
  });
}

function openCommentModal(post) {
  activeCommentPostId = post._id;
  const modalPost = document.getElementById('modal-post');
  modalPost.innerHTML = `
    <div class="post-header">
      <div class="avatar">${avatarHTML(post.author)}</div>
      <div class="post-meta">
        <span class="post-username">${post.author.username}</span>
        <span class="post-time">${timeAgo(post.createdAt)}</span>
      </div>
    </div>
    <div class="post-content">${escapeHTML(post.content)}</div>
  `;
  document.getElementById('comment-modal').classList.remove('hidden');
  loadCommentsIntoModal(post._id);
}

function closeCommentModal() {
  document.getElementById('comment-modal').classList.add('hidden');
  activeCommentPostId = null;
}

async function loadCommentsIntoModal(postId) {
  const list = document.getElementById('modal-comments');
  list.innerHTML = '<p class="empty-state">Loading comments...</p>';
  try {
    const comments = await api.getComments(postId);
    const me = getCurrentUser();
    list.innerHTML = '';
    if (!comments.length) {
      list.innerHTML = '<p class="empty-state">No comments yet. Be the first!</p>';
      return;
    }
    comments.forEach((c) => {
      const item = document.createElement('div');
      item.className = 'comment-item';
      const canDelete = me && c.author._id === me.id;
      item.innerHTML = `
        <div class="avatar">${avatarHTML(c.author)}</div>
        <div class="comment-bubble">
          <span class="comment-author">${c.author.username}</span>${escapeHTML(c.text)}
          ${canDelete ? `<button class="action-btn delete-comment-btn" data-id="${c._id}" aria-label="Delete comment">${postIcons.trash}</button>` : ''}
        </div>
      `;
      list.appendChild(item);
    });
    list.querySelectorAll('.delete-comment-btn').forEach((btn) => {
      btn.addEventListener('click', async () => {
        try {
          await api.deleteComment(btn.dataset.id);
          loadCommentsIntoModal(postId);
        } catch (err) {
          showToast(err.message, true);
        }
      });
    });
  } catch (err) {
    list.innerHTML = `<p class="empty-state">${err.message}</p>`;
  }
}
