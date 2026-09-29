let activeMessageUser = null;
let messageRefreshTimer = null;

function openMessages() {
  currentView = 'messages';
  ['nav-feed', 'nav-global', 'nav-profile', 'nav-settings', 'nav-messages', 'nav-create'].forEach((id) => {
    document.getElementById(id).classList.toggle('active', id === 'nav-messages');
  });
  ['composer', 'feed', 'profile-view', 'settings-view'].forEach((id) => document.getElementById(id).classList.add('hidden'));
  const view = document.getElementById('messages-view');
  view.classList.remove('hidden');
  view.querySelector('.messages-shell')?.classList.remove('thread-open');
  view.innerHTML = `
    <section class="messages-shell">
      <aside class="conversation-sidebar">
        <header class="messages-heading"><h2>Messages</h2><span>Private conversations</span></header>
        <div class="message-search-wrap">
          <input id="message-search" type="search" placeholder="Find someone to message" autocomplete="off" aria-label="Find someone to message" />
          <div id="message-search-results" class="message-search-results hidden"></div>
        </div>
        <div id="conversation-list" class="conversation-list"><p class="message-empty">Loading conversations…</p></div>
      </aside>
      <section id="message-thread" class="message-thread">
        <div class="thread-placeholder"><span class="thread-placeholder-title">Your messages</span><p>Choose a conversation or find someone to start a new one.</p></div>
      </section>
    </section>
  `;
  activeMessageUser = null;
  clearInterval(messageRefreshTimer);
  initMessageSearch();
  loadConversations();
}

async function loadConversations() {
  const list = document.getElementById('conversation-list');
  if (!list) return;
  try {
    const conversations = await api.getConversations();
    if (!list.isConnected) return;
    if (!conversations.length) {
      list.innerHTML = '<p class="message-empty">No conversations yet. Search for someone above to say hello.</p>';
      return;
    }
    list.innerHTML = '';
    conversations.forEach((conversation) => {
      const user = conversation.user;
      const row = document.createElement('button');
      row.type = 'button';
      row.className = `conversation-row${activeMessageUser && activeMessageUser.id === user.id ? ' active' : ''}`;
      row.innerHTML = `
        <span class="avatar">${avatarHTML(user)}</span>
        <span class="conversation-preview"><span class="conversation-username">${escapeHTML(user.username)}</span><span class="conversation-last">${escapeHTML(conversation.latestMessage.text)}</span></span>
        <span class="conversation-time">${timeAgo(conversation.latestMessage.createdAt)}</span>
      `;
      row.addEventListener('click', () => openMessageThread(user));
      list.appendChild(row);
    });
  } catch (err) {
    list.innerHTML = `<p class="message-empty">${escapeHTML(err.message)}</p>`;
  }
}

function initMessageSearch() {
  const input = document.getElementById('message-search');
  const results = document.getElementById('message-search-results');
  let timer;
  input.addEventListener('input', () => {
    clearTimeout(timer);
    const query = input.value.trim();
    if (!query) {
      results.classList.add('hidden');
      return;
    }
    timer = setTimeout(async () => {
      try {
        const users = await api.searchUsers(query);
        const me = getCurrentUser();
        const matches = users.filter((user) => user.id !== me.id);
        results.innerHTML = '';
        if (!matches.length) results.innerHTML = '<div class="message-search-empty">No people found</div>';
        matches.forEach((user) => {
          const result = document.createElement('button');
          result.type = 'button';
          result.className = 'message-search-result';
          result.innerHTML = `<span class="avatar">${avatarHTML(user)}</span><span>${escapeHTML(user.username)}</span>`;
          result.addEventListener('click', () => {
            input.value = '';
            results.classList.add('hidden');
            openMessageThread(user);
          });
          results.appendChild(result);
        });
        results.classList.remove('hidden');
      } catch (err) {
        results.innerHTML = '<div class="message-search-empty">Search is unavailable right now.</div>';
        results.classList.remove('hidden');
      }
    }, 250);
  });
}

async function openMessageThread(user) {
  activeMessageUser = user;
  document.querySelector('.messages-shell')?.classList.add('thread-open');
  const thread = document.getElementById('message-thread');
  if (!thread) return;
  thread.innerHTML = `
    <header class="thread-header"><button type="button" class="thread-back" aria-label="Back to conversations">Back</button><div class="avatar">${avatarHTML(user)}</div><div><strong>${escapeHTML(user.username)}</strong><span>Orbit member</span></div></header>
    <div id="thread-messages" class="thread-messages"><p class="message-empty">Loading messages…</p></div>
    <form id="message-compose" class="message-compose"><input id="message-text" maxlength="2000" placeholder="Write a message…" autocomplete="off" aria-label="Write a message" /><button type="submit" class="btn-primary">Send</button></form>
  `;
  thread.querySelector('.thread-back').addEventListener('click', () => {
    document.querySelector('.messages-shell')?.classList.remove('thread-open');
  });
  loadThreadMessages(user);
  document.getElementById('message-compose').addEventListener('submit', async (event) => {
    event.preventDefault();
    const input = document.getElementById('message-text');
    const text = input.value.trim();
    if (!text) return;
    input.disabled = true;
    try {
      await api.sendMessage(user.id, text);
      input.value = '';
      await loadThreadMessages(user);
      await loadConversations();
    } catch (err) {
      showToast(err.message, true);
    } finally {
      input.disabled = false;
      input.focus();
    }
  });
  clearInterval(messageRefreshTimer);
  messageRefreshTimer = setInterval(() => {
    if (activeMessageUser && activeMessageUser.id === user.id) loadThreadMessages(user, true);
  }, 8000);
  loadConversations();
}

async function loadThreadMessages(user, silent = false) {
  const container = document.getElementById('thread-messages');
  if (!container) return;
  try {
    const messages = await api.getMessages(user.id);
    if (!container.isConnected) return;
    if (!messages.length) {
      container.innerHTML = '<p class="thread-start-note">This is the beginning of your conversation. Say hello.</p>';
      return;
    }
    const me = getCurrentUser();
    const lastId = container.lastElementChild && container.lastElementChild.dataset.messageId;
    container.innerHTML = messages.map((message) => `
      <div class="message-bubble ${message.from === me.id ? 'sent' : 'received'}" data-message-id="${message.id}">
        <span>${escapeHTML(message.text)}</span><time>${new Date(message.createdAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}</time>
      </div>
    `).join('');
    if (!silent || !lastId || lastId !== messages[messages.length - 1].id) container.scrollTop = container.scrollHeight;
  } catch (err) {
    container.innerHTML = `<p class="message-empty">${escapeHTML(err.message)}</p>`;
  }
}
