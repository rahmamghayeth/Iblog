const IBlogAdmin = (() => {
  'use strict';

  const API = (() => {
    const tag = document.querySelector('script[src*="admin.js"]');
    if (tag) {
      const abs = tag.src.replace(/admin\.js([?#].*)?$/, 'admin_api.php');
      return abs.startsWith(location.origin) ? abs.slice(location.origin.length) : abs;
    }
    return 'backend/view/components/admin/admin_api.php';
  })();

  let users = [];
  let articles = [];
  let revenueMembers = [];
  let userFilter = 'all';

  const CATS = [
    'AI',
    'Neuroscience',
    'Space',
    'Longevity',
    'Economics',
    'Psychology',
    'Climate',
    'Geopolitics',
    'Technology',
    'Culture',
    'Science',
    'Health'
  ];

  async function api(action, postData = null) {
    const url = `${API}?action=${encodeURIComponent(action)}`;
    const opts = { method: postData ? 'POST' : 'GET' };

    if (postData) {
      opts.headers = { 'Content-Type': 'application/x-www-form-urlencoded' };
      opts.body = new URLSearchParams(postData).toString();
    }

    const res = await fetch(url, opts);
    const payload = await res.json().catch(() => ({}));
    if (!res.ok || payload.error || (Object.prototype.hasOwnProperty.call(payload, 'ok') && payload.ok === false)) {
      const message = payload.error || `HTTP ${res.status}`;
      throw new Error(message);
    }
    return payload;
  }

  function init() {
    updateClock();
    setInterval(updateClock, 1000);
    bindGlobalUi();
    loadDashboard();
  }

  function bindGlobalUi() {
    document.querySelectorAll('.admin-modal-backdrop').forEach((modal) => {
      modal.addEventListener('click', (event) => {
        if (event.target === modal) {
          modal.classList.remove('show');
        }
      });
    });

    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') {
        document.querySelectorAll('.admin-modal-backdrop.show').forEach((modal) => {
          modal.classList.remove('show');
        });
      }
    });

    const userForm = document.getElementById('admin-user-form');
    if (userForm) {
      userForm.addEventListener('submit', submitUserForm);
    }
  }

  function updateClock() {
    const el = document.getElementById('admin-time');
    if (!el) return;
    el.textContent = new Date().toLocaleString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  async function loadDashboard() {
    try {
      await Promise.all([loadStats(), loadUsers(), loadArticles(), loadRevenue()]);
      buildActivityLog();
      buildCharts();
    } catch (error) {
      console.error(error);
      toast(error.message || 'Failed to load admin data', 'danger');
    }
  }

  function navigate(view, el) {
    document.querySelectorAll('.admin-view').forEach((section) => section.classList.remove('active'));
    document.querySelectorAll('.admin-nav-item').forEach((item) => item.classList.remove('active'));

    const viewEl = document.getElementById(`view-${view}`);
    if (viewEl) viewEl.classList.add('active');
    if (el) el.classList.add('active');
  }

  async function loadStats() {
    const data = await api('get_stats');
    setText('stat-users', data.total_users ?? '-');
    setText('stat-articles', data.total_articles ?? '-');
    setText('stat-premium', data.active_subscriptions ?? data.premium_count ?? '-');
    setText('stat-revenue', data.monthly_revenue ?? '-');
  }

  async function loadUsers() {
    const data = await api('get_users');
    users = data.users ?? [];
    setText('users-badge', users.filter((user) => user.status === 'banned').length);
    buildUsersTable();
  }

  function buildUsersTable(query = '') {
    const tbody = document.getElementById('users-table');
    if (!tbody) return;

    let rows = [...users];
    if (userFilter === 'banned') rows = rows.filter((user) => user.status === 'banned');
    if (userFilter === 'premium') rows = rows.filter((user) => user.plan === 'premium' && user.status !== 'banned');
    if (userFilter === 'free') rows = rows.filter((user) => user.plan === 'free' && user.status !== 'banned');

    if (query) {
      const q = query.toLowerCase();
      rows = rows.filter((user) =>
        String(user.name || '').toLowerCase().includes(q) ||
        String(user.email || '').toLowerCase().includes(q)
      );
    }

    if (!rows.length) {
      tbody.innerHTML = '<tr><td colspan="6" class="admin-empty-row">No users found.</td></tr>';
      return;
    }

    tbody.innerHTML = rows.map((user) => {
      const joined = user.created_at || user.createdAt
        ? new Date(user.created_at || user.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
        : '-';
      const nameArg = escJs(user.name || 'User');

      return `
        <tr>
          <td>
            <div class="admin-user-cell">
              <div class="admin-tbl-avatar" style="background:${stringToColor(user.email || user.name || '')}">
                ${esc((user.name || '?')[0] || '?').toUpperCase()}
              </div>
              <div>
                <strong>${esc(user.name || '-')}</strong>
                <div class="admin-cell-sub">${esc(user.email || '-')}</div>
              </div>
            </div>
          </td>
          <td>${user.plan === 'premium' ? '<span class="abadge abadge-premium">Premium</span>' : '<span class="abadge abadge-free">Free</span>'}</td>
          <td>${Number(user.article_count || 0).toLocaleString()}</td>
          <td>${joined}</td>
          <td>${user.status === 'banned' ? '<span class="abadge abadge-banned">Banned</span>' : '<span class="abadge abadge-active">Active</span>'}</td>
          <td>
            <div class="admin-actions">
              <button class="admin-btn admin-btn-ghost" onclick="IBlogAdmin.openEditUser(${Number(user.id)}, '${nameArg}')">Edit</button>
              ${user.status === 'banned'
                ? `<button class="admin-btn admin-btn-success" onclick="IBlogAdmin.toggleBan(${Number(user.id)}, '${nameArg}')">Unban</button>`
                : `<button class="admin-btn admin-btn-warn" onclick="IBlogAdmin.toggleBan(${Number(user.id)}, '${nameArg}')">Ban</button>`}
              <button class="admin-btn admin-btn-danger" onclick="IBlogAdmin.deleteUser(${Number(user.id)}, '${nameArg}')">Delete</button>
            </div>
          </td>
        </tr>
      `;
    }).join('');
  }

  function filterUsers(query) {
    buildUsersTable(query);
  }

  function filterUsersByPlan(el, plan) {
    userFilter = plan;
    document.querySelectorAll('#view-users .admin-filter-chip').forEach((chip) => chip.classList.remove('active'));
    if (el) el.classList.add('active');
    buildUsersTable(document.getElementById('user-search')?.value || '');
  }

  function openCreateUser() {
    const form = document.getElementById('admin-user-form');
    if (!form) return;
    form.reset();
    setText('user-modal-title', 'New user');
    document.getElementById('user-form-mode').value = 'create';
    document.getElementById('user-form-id').value = '';
    document.getElementById('user-password').required = true;
    document.getElementById('admin-user-modal').classList.add('show');
  }

  function openEditUser(id) {
    const user = users.find((entry) => Number(entry.id) === Number(id));
    if (!user) return;

    setText('user-modal-title', 'Edit user');
    document.getElementById('user-form-mode').value = 'update';
    document.getElementById('user-form-id').value = user.id;
    document.getElementById('user-name').value = user.name || '';
    document.getElementById('user-email').value = user.email || '';
    document.getElementById('user-plan').value = user.plan === 'premium' ? 'premium' : 'free';
    document.getElementById('user-is-premium').checked = Number(user.isPremium || 0) === 1 || user.plan === 'premium';
    document.getElementById('user-is-admin').checked = Number(user.isAdmin || 0) === 1;
    document.getElementById('user-password').value = '';
    document.getElementById('user-password').required = false;
    document.getElementById('admin-user-modal').classList.add('show');
  }

  function closeUserModal() {
    document.getElementById('admin-user-modal')?.classList.remove('show');
  }

  async function submitUserForm(event) {
    event.preventDefault();

    const mode = document.getElementById('user-form-mode').value;
    const payload = {
      id: document.getElementById('user-form-id').value,
      name: document.getElementById('user-name').value.trim(),
      email: document.getElementById('user-email').value.trim(),
      password: document.getElementById('user-password').value,
      plan: document.getElementById('user-plan').value,
      isPremium: document.getElementById('user-is-premium').checked ? '1' : '0',
      isAdmin: document.getElementById('user-is-admin').checked ? '1' : '0'
    };

    if (!payload.name || !payload.email) {
      toast('Name and email are required', 'danger');
      return;
    }

    if (mode === 'create' && payload.password.length < 4) {
      toast('Password must be at least 4 characters', 'danger');
      return;
    }

    try {
      if (mode === 'create') {
        await api('create_user', payload);
        toast('User created', 'success');
      } else {
        await api('update_user', payload);
        toast('User updated', 'success');
      }

      closeUserModal();
      await Promise.all([loadUsers(), loadStats(), loadRevenue()]);
      buildActivityLog();
      buildCharts();
    } catch (error) {
      toast(error.message || 'Unable to save user', 'danger');
    }
  }

  async function toggleBan(id, name) {
    confirmDialog(
      'Update user status',
      `Change the access status for <strong>${esc(name)}</strong>?`,
      async () => {
        const data = await api('toggle_ban', { id });
        const target = users.find((user) => Number(user.id) === Number(id));
        if (target) target.status = data.new_status;
        buildUsersTable(document.getElementById('user-search')?.value || '');
        await loadStats();
        buildActivityLog();
        toast(data.new_status === 'banned' ? 'User banned' : 'User unbanned', data.new_status === 'banned' ? 'danger' : 'success');
      }
    );
  }

  async function deleteUser(id, name) {
    confirmDialog(
      'Delete user',
      `Permanently remove <strong>${esc(name)}</strong> and their related data?`,
      async () => {
        await api('delete_user', { id });
        users = users.filter((user) => Number(user.id) !== Number(id));
        buildUsersTable(document.getElementById('user-search')?.value || '');
        await Promise.all([loadStats(), loadRevenue(), loadArticles()]);
        buildActivityLog();
        buildCharts();
        toast('User deleted', 'success');
      }
    );
  }

  async function loadArticles() {
    const data = await api('get_articles');
    articles = data.articles ?? [];
    setText('articles-badge', articles.length);
    buildArticlesTable();
  }

  function buildArticlesTable(query = '') {
    const tbody = document.getElementById('articles-table');
    if (!tbody) return;

    let rows = [...articles];

    if (query) {
      const q = query.toLowerCase();
      rows = rows.filter((article) =>
        String(article.title || '').toLowerCase().includes(q) ||
        String(article.author || '').toLowerCase().includes(q)
      );
    }

    if (!rows.length) {
      tbody.innerHTML = '<tr><td colspan="4" class="admin-empty-row">No articles found.</td></tr>';
      return;
    }

    tbody.innerHTML = rows.map((article) => {
      const title = String(article.title || '-');
      const shortTitle = title.length > 64 ? `${title.slice(0, 64)}...` : title;
      const date = article.created_at
        ? new Date(article.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
        : '-';

      return `
        <tr>
          <td>
            <strong class="admin-article-title">${esc(shortTitle)}</strong>
            <div class="admin-cell-sub">${date}</div>
          </td>
          <td>
            <div class="admin-user-cell">
              <div class="admin-tbl-avatar admin-tbl-avatar-sm" style="background:${stringToColor(article.author || '')}">
                ${esc((article.author || '?')[0] || '?').toUpperCase()}
              </div>
              <span>${esc(article.author || '-')}</span>
            </div>
          </td>
          <td>
            <select class="admin-cat-select" onchange="IBlogAdmin.changeCat(${Number(article.id)}, this.value)">
              ${CATS.map((cat) => `<option value="${cat}"${cat === article.category ? ' selected' : ''}>${cat}</option>`).join('')}
            </select>
          </td>
          <td>${Number(article.views || 0).toLocaleString()}</td>
        </tr>
      `;
    }).join('');
  }

  function filterArticles(query) {
    buildArticlesTable(query);
  }

  async function changeCat(id, cat) {
    await api('change_cat', { id, cat });
    const target = articles.find((article) => Number(article.id) === Number(id));
    if (target) target.category = cat;
    toast(`Category updated to ${cat}`, 'success');
  }

  async function loadRevenue() {
    const data = await api('get_revenue');
    revenueMembers = data.members ?? [];
    buildRevenueTable(revenueMembers);
  }

  function buildRevenueTable(members) {
    const tbody = document.getElementById('revenue-table');
    if (!tbody) return;

    if (!members.length) {
      tbody.innerHTML = '<tr><td colspan="5" class="admin-empty-row">No premium members yet.</td></tr>';
      return;
    }

    tbody.innerHTML = members.map((member) => {
      const startDate = member.started_at
        ? new Date(member.started_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
        : '-';
      const endDate = member.expires_at
        ? new Date(member.expires_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
        : '-';
      const nameArg = escJs(member.name || 'User');

      return `
        <tr>
          <td>
            <div class="admin-user-cell">
              <div class="admin-tbl-avatar" style="background:${stringToColor(member.email || member.name || '')}">
                ${esc((member.name || '?')[0] || '?').toUpperCase()}
              </div>
              <div>
                <strong>${esc(member.name || '-')}</strong>
                <div class="admin-cell-sub">${esc(member.email || '-')}</div>
              </div>
            </div>
          </td>
          <td>${startDate}<div class="admin-cell-sub">Renews: ${endDate}</div></td>
          <td>${Number(member.amount || 9).toFixed(2)} ${esc(member.currency || 'USD')}<div class="admin-cell-sub">${esc(String(member.method || 'card').toUpperCase())}</div></td>
          <td>${String(member.status || '').toLowerCase() === 'active' ? '<span class="abadge abadge-active">Active</span>' : '<span class="abadge abadge-banned">Cancelled</span>'}</td>
          <td><button class="admin-btn admin-btn-danger" onclick="IBlogAdmin.cancelSubscription(${Number(member.userId || member.id)}, '${nameArg}')">Cancel</button></td>
        </tr>
      `;
    }).join('');
  }

  async function cancelSubscription(id, name) {
    confirmDialog(
      'Cancel subscription',
      `Downgrade <strong>${esc(name)}</strong> to the free plan?`,
      async () => {
        await api('cancel_sub', { id });
        await Promise.all([loadRevenue(), loadUsers(), loadStats()]);
        buildActivityLog();
        buildCharts();
        toast('Subscription cancelled', 'success');
      }
    );
  }

  function buildActivityLog() {
    const tbody = document.getElementById('activity-log');
    if (!tbody) return;

    const rows = [];

    users.slice(0, 5).forEach((user) => {
      const createdAt = user.created_at || user.createdAt;
      rows.push({
        event: 'New signup',
        subject: user.name || 'Unknown user',
        time: createdAt ? timeAgo(new Date(createdAt)) : 'recently',
        badge: user.plan === 'premium' ? 'premium' : 'active'
      });
    });

    articles.slice(0, 5).forEach((article) => {
      rows.push({
        event: 'Article published',
        subject: article.author || 'Unknown author',
        time: article.created_at ? timeAgo(new Date(article.created_at)) : 'recently',
        badge: article.label === 'hidden' ? 'banned' : 'active'
      });
    });

    if (!rows.length) {
      tbody.innerHTML = '<tr><td colspan="4" class="admin-empty-row">No recent activity.</td></tr>';
      return;
    }

    tbody.innerHTML = rows.slice(0, 8).map((row) => `
      <tr>
        <td><strong>${esc(row.event)}</strong></td>
        <td>${esc(row.subject)}</td>
        <td>${esc(row.time)}</td>
        <td>${row.badge === 'premium' ? '<span class="abadge abadge-premium">Premium</span>' : row.badge === 'banned' ? '<span class="abadge abadge-banned">Flagged</span>' : '<span class="abadge abadge-active">Live</span>'}</td>
      </tr>
    `).join('');
  }

  function buildCharts() {
    const signupSeries = new Array(8).fill(0);
    users.filter((user) => Number(user.isAdmin || 0) !== 1).forEach((user) => {
      const createdAt = user.created_at || user.createdAt;
      if (!createdAt) return;
      const ageInDays = Math.floor((Date.now() - new Date(createdAt).getTime()) / 86400000);
      const bucket = Math.min(7, Math.floor(ageInDays / 7));
      signupSeries[7 - bucket] += 1;
    });

    const revenueSeries = new Array(8).fill(0);
    revenueMembers.forEach((member) => {
      if (String(member.status || 'active').toLowerCase() !== 'active') return;
      const startedAt = member.started_at;
      if (!startedAt) return;
      const ageInDays = Math.floor((Date.now() - new Date(startedAt).getTime()) / 86400000);
      const bucket = Math.min(7, Math.max(0, Math.floor(ageInDays / 30)));
      revenueSeries[7 - bucket] += Number(member.amount || 0);
    });

    renderChart('chart-users', signupSeries.map((value, index) => Math.max(value, index === 0 ? 1 : signupSeries[index - 1] || 1)), 'W');
    renderChart('chart-revenue', revenueSeries.map((value) => Math.max(value, 0)), 'M');
  }

  function renderChart(id, series, prefix) {
    const chart = document.getElementById(id);
    if (!chart) return;

    const max = Math.max(...series, 1);
    chart.innerHTML = series.map((value, index) => `
      <div class="admin-bar-wrap">
        <div class="admin-bar" style="height:${Math.max(12, Math.round((value / max) * 100))}%"></div>
        <div class="admin-bar-label">${prefix}${index + 1}</div>
      </div>
    `).join('');
  }

  function confirmDialog(title, message, onConfirm) {
    setHtml('confirm-title', title);
    setHtml('confirm-msg', message);
    const modal = document.getElementById('admin-confirm');
    const ok = document.getElementById('confirm-ok-btn');
    if (!modal || !ok) return;

    ok.onclick = async () => {
      modal.classList.remove('show');
      try {
        await onConfirm();
      } catch (error) {
        console.error(error);
        toast(error.message || 'Action failed', 'danger');
      }
    };

    modal.classList.add('show');
  }

  function closeConfirm() {
    document.getElementById('admin-confirm')?.classList.remove('show');
  }

  function toast(message, type = 'success') {
    const el = document.getElementById('admin-toast');
    if (!el) return;

    el.textContent = message;
    el.className = `admin-toast show ${type}`;
    clearTimeout(el._timer);
    el._timer = setTimeout(() => {
      el.className = 'admin-toast';
    }, 3200);
  }

  function setText(id, value) {
    const el = document.getElementById(id);
    if (el) el.textContent = value;
  }

  function setHtml(id, value) {
    const el = document.getElementById(id);
    if (el) el.innerHTML = value;
  }

  function esc(value) {
    return String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function escJs(value) {
    return String(value ?? '').replace(/\\/g, '\\\\').replace(/'/g, "\\'");
  }

  function stringToColor(value) {
    let hash = 0;
    const input = String(value ?? 'user');
    for (let i = 0; i < input.length; i += 1) {
      hash = input.charCodeAt(i) + ((hash << 5) - hash);
    }
    return `hsl(${Math.abs(hash) % 360}, 62%, 48%)`;
  }

  function timeAgo(date) {
    const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
    if (seconds < 60) return 'just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)} min ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)} hr ago`;
    return `${Math.floor(seconds / 86400)} days ago`;
  }

  return {
    init,
    navigate,
    filterUsers,
    filterUsersByPlan,
    openCreateUser,
    openEditUser,
    closeUserModal,
    toggleBan,
    deleteUser,
    filterArticles,
    changeCat,
    cancelSubscription,
    closeConfirm,
    toast
  };
})();

document.addEventListener('DOMContentLoaded', () => IBlogAdmin.init());
