IBlog.Notifications = {
  STORAGE_KEY: 'iblog_notifications',

  data: [
    { id: 1, read: false, type: 'info', messageKey: 'notifications.welcomeBack', timeKey: 'notifications.justNow' },
  ],

  _t(key, vars = {}) {
    return IBlog.I18n?.t?.(key, vars) || key;
  },

  _escapeHtml(value) {
    return String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  },

  _normalize(notification = {}) {
    if (!notification || typeof notification !== 'object') return null;
    return {
      id: notification.id || Date.now(),
      read: !!notification.read,
      type: notification.type || 'info',
      text: notification.text || '',
      time: notification.time || '',
      messageKey: notification.messageKey || '',
      messageVars: notification.messageVars && typeof notification.messageVars === 'object' ? notification.messageVars : {},
      timeKey: notification.timeKey || '',
    };
  },

  _renderMessage(notification) {
    if (notification.messageKey) {
      const safeVars = Object.fromEntries(
        Object.entries(notification.messageVars || {}).map(([key, value]) => [key, this._escapeHtml(value)])
      );
      return this._t(notification.messageKey, safeVars);
    }
    return notification.text || '';
  },

  _renderTime(notification) {
    if (notification.timeKey) return this._t(notification.timeKey);
    return notification.time || this._t('notifications.justNow');
  },

  init() {
    this.load();
    this.render();
    this.updateBadge();
  },

  load() {
    try {
      const saved = JSON.parse(localStorage.getItem(this.STORAGE_KEY) || '[]');
      if (Array.isArray(saved) && saved.length) {
        this.data = saved.map((notification) => this._normalize(notification)).filter(Boolean);
      }
    } catch (_) {}
  },

  save() {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.data));
    } catch (_) {}
  },

  render() {
    const list = document.getElementById('notif-list');
    if (!list) return;

    if (this.data.length === 0) {
      list.innerHTML = `
        <div style="text-align:center;padding:40px;color:var(--text2)">
          <div style="font-size:36px;margin-bottom:12px">Bell</div>
          <p>${this._t('notifications.empty')}</p>
        </div>`;
      return;
    }

    list.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px">
        <strong style="font-size:14px">${this._t('notifications.unread', { count: this.unreadCount() })}</strong>
        <button onclick="IBlog.Notifications.markAllRead()"
                style="font-size:12px;color:var(--accent);background:none;border:none;cursor:pointer;font-family:'DM Sans',sans-serif">
          ${this._t('notifications.markAllRead')}
        </button>
      </div>
      ${this.data.map((notification) => `
        <div class="notif-item ${notification.read ? '' : 'unread'}"
             onclick="IBlog.Notifications.markRead(${notification.id})"
             style="cursor:pointer">
          <div class="notif-dot ${notification.read ? 'read' : ''}"></div>
          <div style="flex:1">
            <div class="notif-text">${this._renderMessage(notification)}</div>
            <div class="notif-time">${this._renderTime(notification)}</div>
          </div>
          ${!notification.read ? '<div style="width:8px;height:8px;border-radius:50%;background:var(--accent);flex-shrink:0"></div>' : ''}
        </div>
      `).join('')}
    `;

    this.save();
  },

  unreadCount() {
    return this.data.filter((notification) => !notification.read).length;
  },

  updateBadge() {
    const badge = document.querySelector('[data-view="notifications"] .nav-badge');
    if (!badge) return;
    const count = this.unreadCount();
    badge.textContent = count;
    badge.style.display = count > 0 ? 'inline-flex' : 'none';
  },

  markRead(id) {
    const notification = this.data.find((item) => item.id === id);
    if (!notification || notification.read) return;
    notification.read = true;
    this.render();
    this.updateBadge();
  },

  markAllRead() {
    this.data.forEach((notification) => {
      notification.read = true;
    });
    this.render();
    this.updateBadge();
    IBlog.utils?.toast?.(this._t('notifications.allReadToast'), 'success');
  },

  push(payload, type = 'info') {
    const normalized = typeof payload === 'string'
      ? this._normalize({ id: Date.now(), read: false, type, text: payload, timeKey: 'notifications.justNow' })
      : this._normalize({
          id: Date.now(),
          read: false,
          type,
          ...payload,
          timeKey: payload?.timeKey || 'notifications.justNow',
        });
    if (!normalized) return;
    this.data.unshift(normalized);
    this.render();
    this.updateBadge();
  },
};
