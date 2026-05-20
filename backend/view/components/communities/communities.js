// components/communities/communities.js

IBlog.Communities = (() => {
  'use strict';

  const API = 'backend/controller/CommunityController.php';

  let _initialized = false;
  let _lastQuery   = '';
  let _communities = [];

  if (!IBlog.state.joinedCommunities) IBlog.state.joinedCommunities = new Set();

  /* ── Helpers ─────────────────────────────────────────── */
  const _cu   = () => IBlog.state.currentUser;
  const _prem = u  => u && (u.plan === 'premium' || u.isPremium === true);
  const _t    = (key, vars = {}) => IBlog.I18n?.t?.(key, vars) || key;

  function _authPayload() {
    const user = _cu() || {};
    return {
      userId: user?.id ?? 0,
      userEmail: user?.email || '',
    };
  }

  function _extractJsonObject(text) {
    const trimmed = String(text || '').trim();
    if (trimmed.startsWith('{') || trimmed.startsWith('[')) return trimmed;
    const jsonStart = trimmed.indexOf('{');
    return jsonStart >= 0 ? trimmed.slice(jsonStart) : '';
  }

  function _syncJoinedIndexesFromIds() {
    const communities = Array.isArray(window.IBlog?.COMMUNITIES) ? window.IBlog.COMMUNITIES : [];
    const joinedIds = IBlog.state.joinedCommunityIds instanceof Set
      ? IBlog.state.joinedCommunityIds
      : new Set();

    IBlog.state.joinedCommunities = new Set();
    communities.forEach((community, idx) => {
      if (joinedIds.has(String(community?.id))) {
        IBlog.state.joinedCommunities.add(idx);
      }
    });
  }

  function _commAbbr(name) {
    if (!name) return '?';
    const w = name.replace(/[^\p{L}\p{N}\s]/gu, '').trim().split(/\s+/).filter(Boolean);
    if (!w.length) return name.slice(0, 2).toUpperCase();
    return w.length === 1 ? w[0].slice(0, 2).toUpperCase() : (w[0][0] + w[1][0]).toUpperCase();
  }

  function _syncRail() {
    if (typeof window.loadRailCommunities === 'function') {
      window.loadRailCommunities();
    } else if (typeof window.RightRail?.buildCommunities === 'function') {
      window.RightRail.buildCommunities();
    }
  }

  function _ensureCommunitiesView() {
    if (document.getElementById('view-communities') && document.getElementById('comm-grid')) {
      const panel = document.getElementById('view-communities');
      panel?.querySelector('.view-header h1')?.replaceChildren(document.createTextNode(_t('communities.title')));
      const subtitle = panel?.querySelector('.view-header p');
      if (subtitle) subtitle.textContent = _t('communities.subtitle');
      const existingCreateBtn = document.getElementById('create-community-btn');
      if (existingCreateBtn) existingCreateBtn.textContent = _t('communities.create');
      const existingSearch = document.getElementById('comm-search');
      if (existingSearch) existingSearch.placeholder = _t('communities.searchPlaceholder');
      const existingClear = document.getElementById('comm-search-clear');
      if (existingClear) existingClear.setAttribute('aria-label', _t('communities.clearAria'));
      return;
    }

    const root = document.getElementById('communities-root');
    if (!root) return;

    root.innerHTML = `
      <div class="view-panel" id="view-communities">
        <div class="view-header">
          <div class="comm-header-row">
            <div>
              <h1>${_t('communities.title')}</h1>
              <p>${_t('communities.subtitle')}</p>
            </div>
            <button
              class="btn btn-primary comm-create-btn"
              id="create-community-btn"
              type="button"
            >
              ${_t('communities.create')}
            </button>
          </div>
        </div>
        <div class="comm-search-wrap">
          <span class="comm-search-icon">⌕</span>
          <input
            id="comm-search"
            class="comm-search-input"
            type="text"
            placeholder="${_t('communities.searchPlaceholder')}"
            autocomplete="off"
          />
          <button
            class="comm-search-clear"
            id="comm-search-clear"
            type="button"
            onclick="IBlog.Communities.clearSearch()"
            style="display:none"
            aria-label="${_t('communities.clearAria')}"
          >
            ×
          </button>
        </div>
        <div class="community-grid" id="comm-grid"></div>
      </div>
    `;
  }

  /* ── Fetch all communities from DB ───────────────────── */
  async function _fetchCommunities() {
    try {
      const res  = await fetch(`${API}?action=getAll`, { credentials: 'same-origin' });
      const text = await res.text();
      const payload = _extractJsonObject(text);
      if (!payload) {
        console.error('[Communities] Empty / non-JSON response:', text.slice(0, 200));
        return [];
      }
      let data;
      try { data = JSON.parse(payload); } catch(e) {
        console.error('[Communities] Non-JSON response:', text.slice(0, 200));
        return [];
      }
      const rows = Array.isArray(data)
        ? data
        : (Array.isArray(data?.communities) ? data.communities : []);
      if (!rows.length) {
        console.warn('[Communities] No communities payload found:', data);
      }

      _communities = rows;

      window.IBlog.COMMUNITIES = rows.map(c => ({
        id:          c.id,
        name:        c.name,
        icon:        c.iconLetter || _commAbbr(c.name),
        memberCount: c.memberCount,
        desc:        c.description,
        tags:        c.tags || [],
        createdBy:   c.creatorName,
        threads:     [],
        resources:   [],
        chatSeeds:   [],
      }));
      _syncJoinedIndexesFromIds();
      return rows;
    } catch (e) {
      console.error('[Communities] fetch error:', e);
      return [];
    }
  }

  /* ── Fetch joined community IDs ──────────────────────── */
  async function _fetchJoined() {
    try {
      const params = new URLSearchParams({ action: 'getUserCommunities' });
      const auth = _authPayload();
      if (auth.userId) params.set('userId', String(auth.userId));
      if (auth.userEmail) params.set('userEmail', auth.userEmail);
      const res  = await fetch(`${API}?${params.toString()}`, { credentials: 'same-origin' });
      const text = await res.text();
      let data;
      try { data = JSON.parse(text); } catch(e) {
        console.error('[Communities] Non-JSON (joined):', text.slice(0, 200));
        IBlog.state.joinedCommunityIds = new Set();
        return IBlog.state.joinedCommunityIds;
      }
      IBlog.state.joinedCommunityIds = new Set(
        Array.isArray(data) ? data.map(c => String(c.id)) : []
      );
      _syncJoinedIndexesFromIds();
      return IBlog.state.joinedCommunityIds;
    } catch (e) {
      IBlog.state.joinedCommunityIds = new Set();
      _syncJoinedIndexesFromIds();
      return IBlog.state.joinedCommunityIds;
    }
  }

  /* ── Init ────────────────────────────────────────────── */
  async function init() {
    _ensureCommunitiesView();
    _checkCreateBtn();

    const grid = document.getElementById('comm-grid');
    if (grid) grid.innerHTML = `<div class="comm-loading">${_t('communities.loading')}</div>`;

    await Promise.all([_fetchCommunities(), _fetchJoined()]);
    _buildCards();
    _bindSearch();
    _injectCreateModal();

    if (!_initialized) {
      window.addEventListener('iblog:session-changed', async () => {
        await Promise.all([_fetchCommunities(), _fetchJoined()]);
        _checkCreateBtn();
        _buildCards();
        _syncRail();
      });
      _initialized = true;
    }
  }

  /* ── Premium gate on Create button ───────────────────── */
  function _checkCreateBtn() {
    const btn = document.getElementById('create-community-btn');
    if (!btn) return;
    btn.style.display = 'flex';
    const f = btn.cloneNode(true);
    btn.parentNode.replaceChild(f, btn);
    f.onclick = () => showCreateCommunityModal();
  }

  /* ── Build community cards ───────────────────────────── */
  function _buildCards(q) {
    const grid = document.getElementById('comm-grid');
    if (!grid) return;
    q = q !== undefined ? q : _lastQuery;
    _lastQuery = q;
    const ql = q ? q.toLowerCase() : '';

    if (!_communities.length) {
      grid.innerHTML = `<div class="comm-empty"><p>${_t('communities.empty')}</p></div>`;
      return;
    }

    const joined = IBlog.state.joinedCommunityIds || new Set();

    const cards = _communities
      .filter(c => {
        if (!ql) return true;
        const hay = (c.name + ' ' + (c.description || '') + ' ' + (c.tags || []).join(' ')).toLowerCase();
        return hay.includes(ql);
      })
      .map(c => {
        const isJoined = joined.has(String(c.id));
        const abbr = c.iconLetter || _commAbbr(c.name);
        const tags  = c.tags || [];

        return `
          <div class="comm-card" id="comm-card-${c.id}">
            <div class="comm-card-hd">
              <div class="comm-abbr-box">${abbr}</div>
              <div class="comm-card-hd-text">
                <div class="comm-card-name-row">
                  <span class="comm-card-name">${_esc(c.name)}</span>
                </div>
                <div class="comm-card-stats">
                  <span id="mc-${c.id}">${c.memberCount} ${_t(c.memberCount !== 1 ? 'communities.members' : 'communities.member')}</span>
                </div>
              </div>
            </div>

            <p class="comm-card-desc">${_esc(c.description || '')}</p>

            ${tags.length
              ? `<div class="comm-tags">${tags.map(t => `<span class="comm-tag">#${_esc(t)}</span>`).join('')}</div>`
              : ''}

            <div class="comm-card-foot">
              <div class="comm-card-actions">
                ${isJoined
                  ? `<button class="comm-btn comm-btn-enter" onclick="IBlog.Communities.openChat(${c.id})">${_t('communities.openChat')}</button>
                     <button class="comm-btn comm-btn-leave" onclick="IBlog.Communities.leave(${c.id}, this)">${_t('communities.leave')}</button>`
                  : `<button class="comm-btn comm-btn-join" id="join-btn-${c.id}" onclick="IBlog.Communities.join(${c.id}, this)">${_t('communities.join')}</button>`
                }
              </div>
              ${c.creatorName ? `<span class="comm-card-creator">${_t('communities.byCreator')} <strong>${_esc(c.creatorName)}</strong></span>` : ''}
            </div>
          </div>`;
      });

    grid.innerHTML = cards.length
      ? cards.join('')
      : `<div class="comm-empty"><p>${_t('communities.emptyMatch', { query: _esc(q) })}</p></div>`;
  }

  function _esc(str) {
    if (!str) return '';
    const d = document.createElement('div');
    d.textContent = str;
    return d.innerHTML;
  }

  /* ── Search ──────────────────────────────────────────── */
  function _bindSearch() {
    const inp = document.getElementById('comm-search');
    if (!inp) return;
    inp.addEventListener('input', () => {
      _lastQuery = inp.value.trim();
      const clr = document.getElementById('comm-search-clear');
      if (clr) clr.style.display = _lastQuery ? 'flex' : 'none';
      _buildCards(_lastQuery);
    });
  }

  function clearSearch() {
    _lastQuery = '';
    const i = document.getElementById('comm-search');
    if (i) { i.value = ''; i.focus(); }
    const clr = document.getElementById('comm-search-clear');
    if (clr) clr.style.display = 'none';
    _buildCards('');
  }

  /* ── Join ────────────────────────────────────────────── */
  async function join(communityId, btnEl) {
    const u = _cu();
    if (!u) { IBlog.utils?.toast(_t('communities.signInJoin'), 'info'); return; }

    if (btnEl) { btnEl.textContent = _t('communities.joining'); btnEl.disabled = true; }

    try {
      const res  = await fetch(`${API}?action=join`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body:    JSON.stringify({ community_id: communityId, ..._authPayload() }),
      });
      const text = await res.text();
      let data;
      try { data = JSON.parse(text); } catch(e) { data = { success: false }; }

      if (data.success || data.alreadyMember) {
        IBlog.state.joinedCommunityIds = IBlog.state.joinedCommunityIds || new Set();
        IBlog.state.joinedCommunityIds.add(String(communityId));
        _syncJoinedIndexesFromIds();

        const comm = _communities.find(c => c.id == communityId);
        if (comm && !data.alreadyMember) comm.memberCount++;

        const mcEl = document.getElementById(`mc-${communityId}`);
        if (mcEl && comm) mcEl.textContent = `${comm.memberCount} ${_t(comm.memberCount !== 1 ? 'communities.members' : 'communities.member')}`;

        const ibComm = window.IBlog.COMMUNITIES?.find(c => c.id == communityId);
        if (ibComm && comm) ibComm.memberCount = comm.memberCount;

        IBlog.utils?.toast(_t('communities.joined'), 'success');
        _syncRail();
        _buildCards(_lastQuery);
        setTimeout(() => openChat(communityId), 200);
      } else {
        if (btnEl) { btnEl.textContent = _t('communities.join'); btnEl.disabled = false; }
        IBlog.utils?.toast(data.error || _t('communities.joinError'), 'error');
      }
    } catch (e) {
      console.error('[Communities] join error:', e);
      if (btnEl) { btnEl.textContent = _t('communities.join'); btnEl.disabled = false; }
      IBlog.utils?.toast(_t('communities.networkError'), 'error');
    }
  }

  /* ── Leave ───────────────────────────────────────────── */
  async function leave(communityId, btnEl) {
    if (btnEl) { btnEl.textContent = _t('communities.leaving'); btnEl.disabled = true; }

    try {
      const res  = await fetch(`${API}?action=leave`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body:    JSON.stringify({ community_id: communityId, ..._authPayload() }),
      });
      const text = await res.text();
      let data;
      try { data = JSON.parse(text); } catch(e) { data = { success: false }; }

      if (data.success) {
        IBlog.state.joinedCommunityIds?.delete(String(communityId));
        _syncJoinedIndexesFromIds();
        const comm = _communities.find(c => c.id == communityId);
        if (comm) comm.memberCount = Math.max(0, comm.memberCount - 1);
        IBlog.utils?.toast(_t('communities.left'), 'info');
        _syncRail();
        _buildCards(_lastQuery);
      } else {
        if (btnEl) { btnEl.textContent = _t('communities.leave'); btnEl.disabled = false; }
        IBlog.utils?.toast(data.error || _t('communities.leaveError'), 'error');
      }
    } catch (e) {
      console.error('[Communities] leave error:', e);
      if (btnEl) { btnEl.textContent = _t('communities.leave'); btnEl.disabled = false; }
      IBlog.utils?.toast(_t('communities.networkError'), 'error');
    }
  }

  /* ── Open Chat ───────────────────────────────────────── */
  function openChat(communityId) {
    const u = _cu();
    if (!u) { IBlog.utils?.toast(_t('communities.signInFirst'), 'info'); return; }

    const idx = window.IBlog.COMMUNITIES?.findIndex(c => c.id == communityId);
    if (idx === undefined || idx === -1) {
      console.error('[Communities] community not found in COMMUNITIES array:', communityId);
      return;
    }
    if (!IBlog.Chat?.open) { IBlog.utils?.toast(_t('communities.chatLoading'), 'info'); return; }
    IBlog.Chat.open(idx);
  }

  /* ── Create Community Modal ──────────────────────────── */
  function _injectCreateModal() {
    if (document.getElementById('modal-create-community')) return;
    const w = document.createElement('div');
    w.innerHTML = `
      <div class="modal-overlay comm-overlay" id="modal-create-community">
        <div class="modal comm-modal">
          <div class="comm-modal-hd">
            <div>
              <h2 class="modal-title">${_t('communities.modalTitle')}</h2>
              <p class="modal-subtitle">${_t('communities.modalSubtitle')}</p>
            </div>
            <button class="comm-modal-x" onclick="IBlog.Communities.closeCreateModal()">✕</button>
          </div>
          <div class="comm-modal-bd">
            <div class="form-group">
              <label class="comm-label">${_t('communities.nameLabel')} <span class="comm-req">*</span></label>
              <input type="text" id="community-name" class="comm-input"
                placeholder="${_t('communities.namePlaceholder')}" maxlength="50">
            </div>
            <div class="form-group">
              <label class="comm-label">${_t('communities.descriptionLabel')} <span class="comm-req">*</span></label>
              <textarea id="community-desc" class="comm-textarea" rows="3"
                placeholder="${_t('communities.descriptionPlaceholder')}"></textarea>
            </div>
            <div class="form-group">
              <label class="comm-label">${_t('communities.topicsLabel')} <span class="comm-hint">(${_t('communities.topicsHint')})</span></label>
              <input type="text" id="community-tags" class="comm-input"
                placeholder="${_t('communities.topicsPlaceholder')}">
            </div>
            <button class="btn btn-primary btn-full comm-submit-btn"
              id="comm-create-submit"
              onclick="IBlog.Communities.createCommunity()">
              ${_t('communities.create')}
            </button>
          </div>
        </div>
      </div>`;
    document.body.appendChild(w.firstElementChild);
    document.getElementById('modal-create-community')
      .addEventListener('click', e => {
        if (e.target.id === 'modal-create-community') closeCreateModal();
      });
  }

  function showCreateCommunityModal() {
    const u = _cu();
    if (!u) { IBlog.utils?.toast(_t('communities.signInCreate'), 'info'); return; }
    if (!_prem(u)) {
      IBlog.utils?.toast(_t('communities.premiumFeature'), 'info');
      typeof showPremium === 'function' && showPremium();
      return;
    }
    const m = document.getElementById('modal-create-community');
    if (m) {
      ['community-name', 'community-desc', 'community-tags'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.value = '';
      });
      m.classList.add('active');
    }
  }

  function closeCreateModal() {
    document.getElementById('modal-create-community')?.classList.remove('active');
  }

  async function createCommunity() {
    const name = document.getElementById('community-name')?.value.trim();
    const desc = document.getElementById('community-desc')?.value.trim();
    const tags = document.getElementById('community-tags')?.value.trim();

    if (!name) { IBlog.utils?.toast(_t('communities.nameRequired'), 'error'); return; }
    if (!desc) { IBlog.utils?.toast(_t('communities.descriptionRequired'), 'error'); return; }

    const btn = document.getElementById('comm-create-submit');
    if (btn) { btn.textContent = _t('communities.creating'); btn.disabled = true; }

    try {
      const res  = await fetch(`${API}?action=create`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body:    JSON.stringify({ name, description: desc, topics: tags, ..._authPayload() }),
      });
      const text = await res.text();
      let data;
      try { data = JSON.parse(text); } catch(e) { data = { success: false, error: 'Server error' }; }

      if (data.success) {
        closeCreateModal();
        IBlog.utils?.toast(_t('communities.created', { name }), 'success');
        await _fetchCommunities();
        await _fetchJoined();
        _buildCards();
        _syncRail();
      } else {
        IBlog.utils?.toast(data.error || _t('communities.createError'), 'error');
      }
    } catch (e) {
      console.error('[Communities] create error:', e);
      IBlog.utils?.toast(_t('communities.networkError'), 'error');
    } finally {
      if (btn) { btn.textContent = _t('communities.create'); btn.disabled = false; }
    }
  }

  /* ── Refresh (called externally) ─────────────────────── */
  async function refresh() {
    await Promise.all([_fetchCommunities(), _fetchJoined()]);
    _buildCards(_lastQuery);
  }

  /* ── Public API ──────────────────────────────────────── */
  return {
    init, refresh,
    join, leave,
    openChat,
    clearSearch,
    showCreateCommunityModal, closeCreateModal, createCommunity,
    _buildCards,
    _commAbbr,
  };
})();
