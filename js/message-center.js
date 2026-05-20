(function () {
  'use strict';

  const API = 'backend/view/components/auth/api-auth.php';
  let _activePartner = null;
  let _usersCache = [];
  let _threadsCache = [];
  let _searchTimer = null;
  let _conversationPartnerIds = new Set();
  const _t = (key, vars = {}) => IBlog.I18n?.t?.(key, vars) || key;

  function _resetRuntime() {
    _activePartner = null;
    _usersCache = [];
    _threadsCache = [];
    _conversationPartnerIds = new Set();
    if (_searchTimer) {
      clearTimeout(_searchTimer);
      _searchTimer = null;
    }
  }

  function _currentUser() {
    return IBlog.state?.currentUser || null;
  }

  function _escapeHtml(value) {
    return String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function _linkify(value) {
    const escaped = _escapeHtml(value);
    return escaped.replace(
      /((?:https?:\/\/|www\.)[^\s<]+)/gi,
      (match) => {
        const href = match.toLowerCase().startsWith('http') ? match : `https://${match}`;
        return `<a href="${href}" target="_blank" rel="noopener noreferrer">${match}</a>`;
      }
    );
  }

  function _payload(value) {
    return encodeURIComponent(JSON.stringify(value ?? {})).replace(/'/g, '%27');
  }

  function _friendlyError(error, surface = 'messages') {
    const raw = String(error?.message || error || '').trim();
    const lower = raw.toLowerCase();

    if (lower.includes('not authenticated')) {
      return surface === 'people'
        ? _t('messages.browsePeopleFirst')
        : _t('messages.openInboxFirst');
    }

    if (
      lower.includes('database connection failed')
      || lower.includes('sqlstate')
      || lower.includes('unknown database')
    ) {
      return surface === 'people'
        ? _t('messages.dbWaitingPeople')
        : surface === 'threads'
          ? _t('messages.dbWaitingInbox')
          : _t('messages.dbWaitingMessages');
    }

    return raw || _t('messages.genericError');
  }

  function _formatThreadDate(value) {
    if (!value) return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';

    const now = new Date();
    const sameDay = date.toDateString() === now.toDateString();
    if (sameDay) {
      return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
    }

    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  }

  async function _request(action, payload = {}) {
    const response = await fetch(API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin',
      body: JSON.stringify({
        action,
        ...payload,
      }),
    });

    const text = await response.text();
    if (!text.trim().startsWith('{')) {
      throw new Error(_t('messages.invalidServerResponse'));
    }

    const data = JSON.parse(text);
    if (!response.ok || !data.ok) {
      throw new Error(data.error || _t('messages.requestFailed'));
    }

    return data;
  }

  function _avatarMarkup(user, size = 44) {
    const initial = String(user?.initial || user?.name || 'U').slice(0, 1).toUpperCase();
    if (user?.avatar) {
      return `<div class="dm-avatar" style="width:${size}px;height:${size}px;background-image:url('${_escapeHtml(user.avatar)}');background-size:cover;background-position:center;background-color:transparent;"></div>`;
    }
    return `<div class="dm-avatar" style="width:${size}px;height:${size}px;">${_escapeHtml(initial)}</div>`;
  }

  function _shellMarkup() {
    return `
      <div class="dm-shell">
        <div class="dm-sidebar">
          <div class="dm-sidebar-head">
            <div>
              <div class="dm-kicker">${_t('messages.privateMessaging')}</div>
              <h2>${_t('messages.inbox')}</h2>
              <p class="dm-sidebar-copy">${_t('messages.sidebarCopy')}</p>
            </div>
            <span class="dm-badge" id="dm-thread-count">0</span>
          </div>

          <div class="dm-search">
            <input id="dm-user-search" type="text" placeholder="${_t('messages.searchPlaceholder')}" autocomplete="off" />
          </div>

          <div class="dm-section dm-section-card">
            <div class="dm-section-title">${_t('messages.conversations')}</div>
            <div id="dm-thread-list" class="dm-list"></div>
          </div>

          <div class="dm-section dm-section-card">
            <div class="dm-section-title">${_t('messages.conversationPeople')}</div>
            <div id="dm-user-list" class="dm-list"></div>
          </div>
        </div>

        <div class="dm-panel">
          <div class="dm-panel-header" id="dm-panel-header">
            <div>
              <strong>${_t('messages.selectConversation')}</strong>
              <span>${_t('messages.selectConversationBody')}</span>
            </div>
          </div>

          <div class="dm-messages" id="dm-messages">
            <div class="dm-empty">
              <div class="dm-empty-icon">DM</div>
              <strong>${_t('messages.startDirectMessage')}</strong>
              <p>${_t('messages.startDirectMessageBody')}</p>
            </div>
          </div>

          <div class="dm-compose">
            <div class="dm-compose-field">
              <textarea id="dm-compose-input" placeholder="${_t('messages.pickConversationPlaceholder')}" rows="2"></textarea>
              <small>${_t('messages.sendShortcut')}</small>
            </div>
            <button class="btn btn-primary dm-send-btn" id="dm-send-btn" type="button" onclick="IBlog.MessageCenter.sendMessage()" disabled>${_t('messages.send')}</button>
          </div>
        </div>
      </div>`;
  }

  function _threadCard(thread) {
    const partner = thread.partner || {};
    const last = String(thread.lastMessage || '').trim();
    const snippet = last.length > 88 ? `${last.slice(0, 85)}...` : last || _t('messages.noMessagesSnippet');
    return `
      <button class="dm-thread${_activePartner?.id === partner.id ? ' active' : ''}" type="button"
        onclick="IBlog.MessageCenter.openConversation(JSON.parse(decodeURIComponent('${_payload(partner)}')))">
        ${_avatarMarkup(partner, 42)}
        <div class="dm-thread-copy">
          <strong>${_escapeHtml(partner.name || _t('messages.unknown'))}</strong>
          <span>${_escapeHtml(snippet)}</span>
        </div>
        <div class="dm-thread-meta">
          <small>${_formatThreadDate(thread.lastAt)}</small>
          ${thread.unreadCount ? `<span class="dm-unread">${thread.unreadCount}</span>` : ''}
        </div>
      </button>`;
  }

  function _userCard(user) {
    const detail = user?.bio || (user.plan === 'premium' || user.isPremium ? _t('messages.premiumMember') : _t('messages.freeMember'));
    return `
      <button class="dm-user" type="button" onclick="IBlog.MessageCenter.startConversation(JSON.parse(decodeURIComponent('${_payload(user)}')))">
        ${_avatarMarkup(user, 40)}
        <div class="dm-user-copy">
          <strong>${_escapeHtml(user.name || _t('messages.unknown'))}</strong>
          <span>${_escapeHtml(detail)}</span>
        </div>
        <span class="dm-start">${_t('messages.message')}</span>
      </button>`;
  }

  function _messageCard(message) {
    const mine = !!message.isMine;
    return `
      <div class="dm-message${mine ? ' mine' : ''}">
        <div class="dm-message-bubble">
          <p>${_linkify(message.body || '')}</p>
          <small>${message.createdAt ? new Date(message.createdAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }) : ''}</small>
        </div>
      </div>`;
  }

  function _toggleComposerState(active) {
    const input = document.getElementById('dm-compose-input');
    const button = document.getElementById('dm-send-btn');
    if (input) {
      input.disabled = !active;
      input.placeholder = active ? _t('messages.writeMessagePlaceholder') : _t('messages.pickConversationPlaceholder');
    }
    if (button) {
      button.disabled = !active;
    }
  }

  async function _loadThreads() {
    return _renderThreads('');
  }

  async function _renderThreads(query = '') {
    const list = document.getElementById('dm-thread-list');
    const count = document.getElementById('dm-thread-count');
    if (!list) return [];

    try {
      if (!_threadsCache.length) {
        const data = await _request('dm_threads');
        _threadsCache = Array.isArray(data.threads) ? data.threads : [];
      }
      const threads = _threadsCache;
      _conversationPartnerIds = new Set(
        threads
          .map((thread) => String(thread?.partner?.id ?? ''))
          .filter((id) => id !== '')
      );
      if (_activePartner?.id) {
        _conversationPartnerIds.add(String(_activePartner.id));
      }
      const loweredQuery = String(query || '').trim().toLowerCase();
      const filtered = loweredQuery
        ? threads.filter((thread) => {
            const partner = thread?.partner || {};
            return String(partner?.name || '').toLowerCase().includes(loweredQuery)
              || String(partner?.email || '').toLowerCase().includes(loweredQuery)
              || String(partner?.bio || '').toLowerCase().includes(loweredQuery)
              || String(thread?.lastMessage || '').toLowerCase().includes(loweredQuery);
          })
        : threads;

      if (count) count.textContent = String(threads.length);
      if (!filtered.length) {
        list.innerHTML = loweredQuery
          ? `<div class="dm-empty-inline">${_t('messages.noMatchingConversations')}</div>`
          : `<div class="dm-empty-inline">${_t('messages.noPrivateConversations')}</div>`;
        return threads;
      }
      if (!threads.length) {
        list.innerHTML = `<div class="dm-empty-inline">${_t('messages.noPrivateConversations')}</div>`;
        return [];
      }
      list.innerHTML = filtered.map(_threadCard).join('');
      return threads;
    } catch (error) {
      list.innerHTML = `<div class="dm-empty-inline">${_escapeHtml(_friendlyError(error, 'threads'))}</div>`;
      if (count) count.textContent = '0';
      return [];
    }
  }

  async function _loadUsers(query = '') {
    const list = document.getElementById('dm-user-list');
    if (!list) return;

    try {
      const data = await _request('list_users', { q: query, limit: 20 });
      const allUsers = Array.isArray(data.users) ? data.users : [];
      _usersCache = allUsers;
      const conversationUsers = allUsers.filter((user) => {
        const id = String(user?.id ?? '');
        return id !== '' && _conversationPartnerIds.has(id);
      });
      const loweredQuery = query.trim().toLowerCase();
      const filtered = loweredQuery ? allUsers : conversationUsers;
      list.innerHTML = filtered.length
        ? filtered.map(_userCard).join('')
        : loweredQuery
          ? `<div class="dm-empty-inline">${_t('messages.noMatchingPeople')}</div>`
          : `<div class="dm-empty-inline">${_t('messages.noConversationPeople')}</div>`;
    } catch (error) {
      list.innerHTML = `<div class="dm-empty-inline">${_escapeHtml(_friendlyError(error, 'people'))}</div>`;
    }
  }

  function _renderHeader(user) {
    const header = document.getElementById('dm-panel-header');
    if (!header) return;

    header.innerHTML = `
      <div class="dm-header-user">
        ${_avatarMarkup(user, 48)}
        <div>
          <strong>${_escapeHtml(user?.name || _t('messages.unknown'))}</strong>
          <span>${_escapeHtml(user?.bio || user?.email || _t('messages.privateConversation'))}</span>
        </div>
      </div>
      <div class="dm-panel-actions">
        <button class="dm-open-profile" type="button" onclick="IBlog.Profile?.openUserProfile?.(JSON.parse(decodeURIComponent('${_payload(user)}')))">${_t('messages.viewProfile')}</button>
        <button class="dm-open-profile dm-delete-thread" type="button" onclick="IBlog.MessageCenter.deleteConversation()">${_t('messages.deleteConversation')}</button>
      </div>`;
  }

  async function _loadConversation(partner) {
    if (!partner?.id) return;
    _activePartner = partner;
    _renderHeader(partner);
    _toggleComposerState(true);

    const list = document.getElementById('dm-messages');
    if (!list) return;
    list.innerHTML = `<div class="dm-loading">${_t('messages.loadingMessages')}</div>`;

    try {
      const data = await _request('dm_messages', { partnerId: Number(partner.id) });
      const partnerRecord = data.partner || partner;
      _activePartner = partnerRecord;
      _renderHeader(partnerRecord);
      const messages = Array.isArray(data.messages) ? data.messages : [];
      if (!messages.length) {
        list.innerHTML = `
          <div class="dm-empty">
            <div class="dm-empty-icon">DM</div>
            <strong>${_t('messages.noMessagesYet')}</strong>
            <p>${_t('messages.noMessagesBody')}</p>
          </div>`;
        return;
      }

      list.innerHTML = messages.map(_messageCard).join('');
      list.scrollTop = list.scrollHeight;
    } catch (error) {
      _toggleComposerState(false);
      list.innerHTML = `<div class="dm-empty-inline">${_escapeHtml(_friendlyError(error, 'messages'))}</div>`;
    }
  }

  function _bindSearch() {
    const input = document.getElementById('dm-user-search');
    const compose = document.getElementById('dm-compose-input');
    if (!input) return;

    input.addEventListener('input', () => {
      const query = input.value.trim();
      clearTimeout(_searchTimer);
      _searchTimer = setTimeout(async () => {
        await _renderThreads(query);
        await _loadUsers(query);
      }, 180);
    });

    if (compose) {
      compose.addEventListener('keydown', (event) => {
        if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) {
          event.preventDefault();
          sendMessage();
        }
      });
    }
  }

  async function build() {
    const root = document.getElementById('messages-list');
    if (!root) return;

    root.innerHTML = _shellMarkup();
    _bindSearch();
    _toggleComposerState(!!_activePartner?.id);

    const current = _currentUser();
    if (!current) {
      const threadList = document.getElementById('dm-thread-list');
      const userList = document.getElementById('dm-user-list');
      if (threadList) threadList.innerHTML = `<div class="dm-empty-inline">${_t('messages.signInInbox')}</div>`;
      if (userList) userList.innerHTML = `<div class="dm-empty-inline">${_t('messages.signInPeople')}</div>`;
      return;
    }

    const threads = await _loadThreads();
    await _loadUsers('');
    if (!_activePartner?.id && Array.isArray(threads) && threads.length) {
      await _loadConversation(threads[0].partner || {});
    } else if (_activePartner?.id) {
      await _loadConversation(_activePartner);
    }
  }

  async function openConversation(user = {}) {
    if (!user || !user.id) return;
    IBlog.Dashboard?.navigateTo?.('messages');
    _activePartner = user;
    _conversationPartnerIds.add(String(user.id));
    _threadsCache = [];
    await build();
  }

  async function startConversation(user = {}) {
    if (!user || !user.id) return;
    await openConversation(user);
  }

  async function sendMessage() {
    const input = document.getElementById('dm-compose-input');
    const text = input?.value.trim();
    if (!text) return;
    if (!_activePartner?.id) {
      IBlog.utils?.toast(_t('messages.pickPersonFirst'), 'info');
      return;
    }

    try {
      const data = await _request('dm_send', {
        recipientId: Number(_activePartner.id),
        message: text,
      });

      const message = data.message || { body: text, createdAt: new Date().toISOString(), isMine: true };
      const list = document.getElementById('dm-messages');
      if (list) {
        list.insertAdjacentHTML('beforeend', _messageCard({
          ...message,
          isMine: true,
        }));
        list.scrollTop = list.scrollHeight;
      }

      if (input) input.value = '';
      _threadsCache = [];
      await _loadThreads();
      await _loadConversation(_activePartner);
      IBlog.Notifications?.push?.({
        messageKey: 'notifications.privateMessageSent',
        messageVars: { name: _activePartner.name || 'member' },
      }, 'message');
    } catch (error) {
      IBlog.utils?.toast(error?.message || _t('messages.sendMessageError'), 'error');
    }
  }

  async function deleteConversation() {
    if (!_activePartner?.id) {
      IBlog.utils?.toast(_t('messages.selectConversation'), 'info');
      return;
    }

    if (!window.confirm(_t('messages.deleteConversationConfirm'))) {
      return;
    }

    try {
      await _request('dm_delete_thread', {
        partnerId: Number(_activePartner.id),
      });

      _activePartner = null;
      _threadsCache = [];
      _conversationPartnerIds = new Set();
      await build();
      IBlog.utils?.toast(_t('messages.conversationDeleted'), 'success');
    } catch (error) {
      IBlog.utils?.toast(error?.message || _t('messages.deleteConversationError'), 'error');
    }
  }

  window.IBlogMessageCenter = {
    build,
    openConversation,
    startConversation,
    sendMessage,
    deleteConversation,
    refresh: build,
    getUsers: () => _usersCache,
  };

  window.IBlog = window.IBlog || {};
  window.IBlog.MessageCenter = window.IBlogMessageCenter;

  if (!window.__iblogDmSessionBound) {
    window.addEventListener('iblog:session-changed', () => {
      _resetRuntime();
      if (document.getElementById('messages-list')) {
        build();
      }
    });
    window.__iblogDmSessionBound = true;
  }

  if (!window.__iblogDmLocaleBound) {
    window.addEventListener('iblog:locale-changed', () => {
      if (document.getElementById('messages-list')) {
        build();
      }
    });
    window.__iblogDmLocaleBound = true;
  }
})();
