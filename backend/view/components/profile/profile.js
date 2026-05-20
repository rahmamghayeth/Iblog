/* ============================================================
   IBlog.Profile - Own profile + author profile viewer
   ============================================================ */

IBlog.Profile = (() => {
  const AUTH_API = 'backend/view/components/auth/api-auth.php';

  function _postAuth(body) {
    return fetch(AUTH_API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin',
      body: JSON.stringify(body),
    })
      .then((r) => r.text())
      .then((text) => {
        if (!text.trim().startsWith('{')) {
          throw new Error('Server error.');
        }
        const data = JSON.parse(text);
        if (!data?.ok) {
          throw new Error(data?.error || 'Request failed.');
        }
        return data;
      });
  }

  function syncFromSession() {
    return _postAuth({ action: 'me' })
      .then((data) => {
        if (data.ok && data.user) {
          const existing = IBlog.state.currentUser || {};
          const nextUser = {
            ...existing,
            ...data.user,
            initial: (data.user.name?.[0] || existing.initial || 'A').toUpperCase(),
          };
          if (window.IBlogSession?.setUser) {
            IBlogSession.setUser(nextUser);
          } else {
            IBlog.state.currentUser = nextUser;
            sessionStorage.setItem('user', JSON.stringify(nextUser));
          }
        }
        return IBlog.state.currentUser || null;
      })
      .catch(() => null);
  }

  function init() {
    const root = document.getElementById('profile-root');
    if (!root) return;

    if (!window.__iblogProfileSessionBound) {
      window.addEventListener('iblog:session-changed', () => {
        IBlog.state.profileView = { mode: 'self' };
        renderCurrentView();
      });
      window.__iblogProfileSessionBound = true;
    }

    root.innerHTML = `
      <div class="view-panel" id="view-profile">
        <input id="profile-avatar-input" type="file" accept="image/*" style="display:none"
               onchange="IBlog.Profile.handleAvatarUpload(this)" />
        <input id="profile-cover-input" type="file" accept="image/*" style="display:none"
               onchange="IBlog.Profile.handleCoverUpload(this)" />

        <div style="position:relative;margin-bottom:70px">
          <div class="profile-banner" id="profile-banner">
            <div class="profile-banner-overlay"></div>
            <button id="profile-cover-edit" class="profile-media-btn profile-cover-btn"
                    type="button" onclick="IBlog.Profile.triggerCoverPicker()">
              Change cover
            </button>
          </div>
          <div class="profile-avatar-big" id="profile-avatar-big" style="background:var(--accent)"
               onclick="IBlog.Profile.triggerAvatarPicker()">A</div>
          <button id="profile-avatar-edit" class="profile-media-btn profile-avatar-btn"
                  type="button" onclick="IBlog.Profile.triggerAvatarPicker()">
            Change photo
          </button>
        </div>

        <div class="profile-info">
          <div class="flex-between profile-heading-row">
            <div>
              <div class="profile-mode-label" id="profile-mode-label">Your profile</div>
              <h2 id="profile-name" style="font-family:'Playfair Display',serif;font-size:26px;font-weight:700;color:var(--text);margin:4px 0 0;"></h2>
            </div>
            <div id="profile-premium-badge" style="display:none" class="badge badge-premium">Premium</div>
          </div>

          <p id="profile-pseudo" style="color:var(--text3);margin:8px 0 6px"></p>
          <p id="profile-bio-text" style="color:var(--text2);margin-bottom:18px"></p>

          <div style="display:flex;gap:22px;margin-bottom:18px;flex-wrap:wrap;">
            <div><strong id="profile-article-count">0</strong> <span style="color:var(--text2);font-size:13px">Articles</span></div>
            <div><strong id="profile-follower-count">0</strong> <span style="color:var(--text2);font-size:13px">Followers</span></div>
            <div><strong id="profile-following-count">0</strong> <span style="color:var(--text2);font-size:13px">Following</span></div>
          </div>

          <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:12px;flex-wrap:wrap;">
            <div class="topic-chips" id="profile-interests"></div>
            <div id="profile-interest-action"></div>
          </div>

          <div id="profile-edit-section" style="margin-top:20px;padding:20px;background:var(--bg2,#f7f8fa);border-radius:14px;display:none;">
            <h3 style="font-size:15px;font-weight:700;margin-bottom:14px;">Edit Profile</h3>
            <div id="profile-edit-msg" style="display:none;padding:10px 14px;border-radius:8px;font-size:14px;margin-bottom:12px;"></div>
            <div class="field-float" style="margin-bottom:12px;">
              <input type="text" id="edit-profile-name" placeholder=" ">
              <label>Full Name</label>
            </div>
            <div class="field-float" style="margin-bottom:12px;">
              <input type="email" id="edit-profile-email" placeholder=" ">
              <label>Email Address</label>
            </div>
            <div class="field-float" style="margin-bottom:12px;">
              <textarea id="edit-profile-bio" placeholder=" " rows="3"
                style="width:100%;padding:12px 14px;border:1.5px solid var(--border,#e8e8f0);border-radius:10px;font-family:inherit;font-size:14px;resize:vertical;outline:none;background:var(--bg,#fff);"></textarea>
              <label>Bio</label>
            </div>
            <div style="display:flex;gap:10px;">
              <button class="btn btn-primary" style="flex:1;padding:11px;justify-content:center;"
                onclick="IBlog.Profile.saveProfile()">Save Changes</button>
              <button class="btn btn-outline" style="padding:11px 18px;"
                onclick="IBlog.Profile.toggleEdit(false)">Cancel</button>
            </div>
          </div>

          <div id="profile-actions" style="display:flex;gap:10px;margin-top:16px;flex-wrap:wrap;"></div>
        </div>

        <div id="profile-articles-list" style="margin-top:24px"></div>
      </div>`;

    syncFromSession().then(() => {
      if (!IBlog.state.profileView) {
        IBlog.state.profileView = { mode: 'self' };
      }
      renderCurrentView();
    });
  }

  function _normalizeName(value) {
    return String(value || '').trim().toLowerCase();
  }

  function _formatCompact(value) {
    const n = Number(value || 0);
    if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
    return String(n);
  }

  function _realCountLabel(value) {
    if (value === null || value === undefined || value === '') return '0';
    if (typeof value === 'number' && Number.isFinite(value)) return _formatCompact(value);
    const raw = String(value).trim();
    if (!raw) return '0';
    if (/[a-z]/i.test(raw)) return raw;
    const numeric = Number.parseFloat(raw.replace(/[^0-9.]/g, ''));
    if (Number.isFinite(numeric)) return _formatCompact(numeric);
    return raw;
  }

  function _countValue(value) {
    if (typeof value === 'number' && Number.isFinite(value)) return value;
    const raw = String(value ?? '').trim().toLowerCase();
    if (!raw) return 0;
    const compactMatch = raw.match(/^(\d+(?:\.\d+)?)\s*([km])$/);
    if (compactMatch) {
      const multiplier = compactMatch[2] === 'm' ? 1000000 : 1000;
      return Math.round(Number.parseFloat(compactMatch[1]) * multiplier);
    }
    const numeric = Number.parseFloat(raw.replace(/[^0-9.]/g, ''));
    return Number.isFinite(numeric) ? numeric : 0;
  }

  function _esc(value) {
    return String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function _payload(value) {
    return encodeURIComponent(JSON.stringify(value ?? {}));
  }

  function _decodePayload(value) {
    if (!value) return {};
    try {
      return JSON.parse(decodeURIComponent(value));
    } catch (_) {
      return {};
    }
  }

  function _cu() {
    return IBlog.state?.currentUser || null;
  }

  function _persistCurrentUserPatch(patch = {}) {
    const user = {
      ...(_cu() || {}),
      ...patch,
    };
    if (user.name && !user.initial) user.initial = user.name[0].toUpperCase();
    if (window.IBlogSession?.setUser) {
      IBlogSession.setUser(user);
    } else {
      IBlog.state.currentUser = user;
      sessionStorage.setItem('user', JSON.stringify(user));
    }
    (IBlog.state?.articles || []).forEach((article) => {
      if (!article) return;
      const sameAuthorId = article.authorId !== undefined && article.authorId !== null
        && String(article.authorId) === String(user.id ?? '');
      const sameAuthorEmail = _normalizeName(article.authorEmail) && _normalizeName(article.authorEmail) === _normalizeName(user.email);
      if (sameAuthorId || sameAuthorEmail) {
        article.author = user.name || article.author;
        article.authorInitial = user.initial || article.authorInitial;
        article.authorAvatar = user.avatar || '';
      }
    });
    if (IBlog.state?.profileView?.mode === 'self') {
      IBlog.state.profileView = { mode: 'self' };
    }
    IBlog.Dashboard?.updateUserUI?.();
    return user;
  }

  function _matchesCurrentUser(target = {}) {
    const current = _cu();
    if (!current) return false;
    const targetId = target.id ?? target.userId ?? target.entity_id ?? null;
    const targetEmail = _normalizeName(target.email || target.authorEmail);
    return (
      (targetId !== null && targetId !== undefined && String(current.id ?? '') === String(targetId)) ||
      (targetEmail && _normalizeName(current.email) === targetEmail)
    );
  }

  function _publishedArticlesFor(user = null) {
    if (!user) return [];
    const userName = _normalizeName(user.name);
    const userEmail = _normalizeName(user.email);
    const userId = user.id ?? user.userId ?? null;

    return (IBlog.state?.articles || []).filter((article) => {
      if (!article || (article.status || 'published') === 'draft') return false;
      const articleAuthorId = article.authorId ?? article.userId ?? null;
      const articleAuthorEmail = _normalizeName(article.authorEmail);
      if (userId !== null && userId !== undefined && articleAuthorId !== null && articleAuthorId !== undefined) {
        return String(articleAuthorId) === String(userId);
      }
      if (userEmail && articleAuthorEmail && articleAuthorEmail === userEmail) return true;
      return false;
    });
  }

  function _repostedArticlesFor(user = null, isOwn = false) {
    if (!user || !isOwn) return [];
    const reposted = IBlog.ArticleCard?.getRepostedArticles?.(user.id) || [];
    return reposted.filter((article) => article && (article.status || 'published') !== 'draft');
  }

  function _resolveProfileUser(target = {}) {
    const current = _cu();
    if (!target || target.mode === 'self' || _matchesCurrentUser(target)) {
      return current;
    }

    const name = target.name || target.author || 'Unknown User';
    const initial = String(target.initial || name[0] || 'U').toUpperCase();
    const articles = _publishedArticlesFor({ ...target, name, initial });
    const derivedTags = Array.from(new Set(
      articles.flatMap((article) => Array.isArray(article.tags) ? article.tags : [])
    )).slice(0, 6);

    return {
      id: target.id ?? target.userId ?? null,
      name,
      email: target.email || '',
      pseudo: target.pseudo || name.split(' ')[0].toLowerCase(),
      plan: target.plan || (target.isPremium ? 'premium' : 'free'),
      isPremium: !!target.isPremium || target.plan === 'premium',
      avatar: target.avatar || '',
      cover: target.cover || '',
      bio: target.bio || (articles.length ? `Author on IBlog. Published ${articles.length} article${articles.length === 1 ? '' : 's'}.` : 'Author on IBlog.'),
      fields: target.fields || derivedTags,
      subjects: target.subjects || [],
      followers: _countValue(target.followers),
      following: _countValue(target.following),
      isFollowing: !!target.isFollowing,
      initial,
    };
  }

  function _mergeViewedUser(nextUser = {}) {
    const view = _currentView();
    if (view?.mode !== 'user') return;
    const currentUser = view.user || {};
    const merged = _resolveProfileUser({ ...currentUser, ...nextUser });
    IBlog.state.profileView = {
      ...view,
      user: merged,
    };
  }

  function _applyFollowResponse(data) {
    if (data?.viewer) {
      const nextViewer = {
        ...(_cu() || {}),
        ...data.viewer,
      };
      if (nextViewer.name && !nextViewer.initial) {
        nextViewer.initial = nextViewer.name[0].toUpperCase();
      }
      IBlog.state.currentUser = nextViewer;
      sessionStorage.setItem('user', JSON.stringify(nextViewer));
      localStorage.setItem('user', JSON.stringify(nextViewer));
    }

    if (data?.target) {
      _mergeViewedUser(data.target);
    }

    if (window.RightRail?.refreshAuthors) {
      window.RightRail.refreshAuthors();
    }
    if (window.RightRail?.refreshStats) {
      window.RightRail.refreshStats();
    }
    if (_currentView()?.mode === 'user') {
      renderCurrentView();
    }
  }

  function _followLabel(user) {
    return user?.isFollowing ? 'Following' : 'Follow';
  }

  function _fetchPublicUser(target = {}) {
    const targetUserId = Number(target.id ?? target.userId ?? 0);
    const targetEmail = String(target.email || target.authorEmail || '').trim();
    if (!targetUserId && !targetEmail) {
      return Promise.resolve(null);
    }

    return _postAuth({
      action: 'get_public_user',
      targetUserId,
      targetEmail,
    })
      .then((data) => data.user || null)
      .catch(() => null);
  }

  function toggleFollow() {
    const view = _currentView();
    const target = view?.user;
    const current = _cu();
    if (!target?.id || !current?.id) {
      IBlog.utils?.toast('You need to sign in first.', 'info');
      return;
    }
    if (String(target.id) === String(current.id)) {
      IBlog.utils?.toast('You cannot follow your own account.', 'error');
      return;
    }

    const btn = document.getElementById('profile-follow-btn');
    if (btn) {
      btn.disabled = true;
      btn.textContent = target.isFollowing ? 'Updating...' : 'Following...';
    }

    _postAuth({
      action: target.isFollowing ? 'unfollow_user' : 'follow_user',
      targetUserId: Number(target.id),
    })
      .then((data) => {
        _applyFollowResponse(data);
        IBlog.utils?.toast(
          data?.target?.isFollowing ? 'You are now following this author.' : 'You unfollowed this author.',
          'success'
        );
      })
      .catch((error) => {
        IBlog.utils?.toast(error?.message || 'Could not update follow status.', 'error');
      })
      .finally(() => {
        if (btn) btn.disabled = false;
        renderCurrentView();
      });
  }

  function _currentView() {
    if (!IBlog.state.profileView) {
      IBlog.state.profileView = { mode: 'self' };
    }
    return IBlog.state.profileView;
  }

  function renderCurrentView() {
    const current = _cu();
    const view = _currentView();
    const isOwn = !view || view.mode !== 'user';
    const user = isOwn ? current : _resolveProfileUser(view.user || view);
    if (!user) return;

    const articles = _publishedArticlesFor(user);
    const repostedArticles = _repostedArticlesFor(user, isOwn);
    const articleTotal = isOwn ? articles.length + repostedArticles.length : articles.length;
    const initial = user.initial || (user.name?.[0] || 'A').toUpperCase();

    _applyBanner(document.getElementById('profile-banner'), user.cover);
    _applyAvatar(document.getElementById('profile-avatar-big'), user.avatar, initial);
    _setText('profile-mode-label', isOwn ? 'Your profile' : 'Author profile');
    _setText('profile-name', user.name || 'Unknown');
    _setText('profile-pseudo', `@${user.pseudo || (user.name ? user.name.split(' ')[0].toLowerCase() : 'user')}`);
    _setText('profile-bio-text', user.bio || (isOwn ? 'No bio yet. Click Edit Profile to add one.' : 'No bio yet.'));
    _setText('profile-article-count', articleTotal);
    _setText('profile-follower-count', _realCountLabel(user.followers));
    _setText('profile-following-count', _realCountLabel(user.following));

    const badge = document.getElementById('profile-premium-badge');
    if (badge) badge.style.display = user.plan === 'premium' || user.isPremium ? 'inline-flex' : 'none';

    const coverBtn = document.getElementById('profile-cover-edit');
    const avatarBtn = document.getElementById('profile-avatar-edit');
    const avatarEl = document.getElementById('profile-avatar-big');
    if (coverBtn) coverBtn.style.display = isOwn ? 'inline-flex' : 'none';
    if (avatarBtn) avatarBtn.style.display = isOwn ? 'inline-flex' : 'none';
    if (avatarEl) avatarEl.classList.toggle('is-editable', isOwn);

    if (!isOwn) {
      toggleEdit(false);
    }

    _buildTopicChips(user, articles);
    _buildInterestAction(user, isOwn);
    _buildActionRow(user, isOwn);
    _buildArticleList(user, articles, repostedArticles, isOwn);
  }

  function buildProfile() {
    renderCurrentView();
  }

  function showOwnProfile(navigate = true) {
    IBlog.state.profileView = { mode: 'self' };
    if (navigate) {
      IBlog.Dashboard?.navigateTo?.('profile');
      return;
    }
    renderCurrentView();
  }

  function openUserProfile(target = {}) {
    if (!target) return;
    if (_matchesCurrentUser(target)) {
      showOwnProfile(true);
      return;
    }

    const localTarget = _resolveProfileUser(target);
    IBlog.state.profileView = {
      mode: 'user',
      user: localTarget,
    };
    window.RightRail?.refreshAuthors?.();
    IBlog.Dashboard?.navigateTo?.('profile');

    _fetchPublicUser(target).then((fetchedUser) => {
      if (!fetchedUser) return;
      const activeView = _currentView();
      if (activeView?.mode !== 'user') return;
      const activeId = activeView.user?.id ?? activeView.id ?? null;
      if (activeId !== null && String(activeId) !== String(fetchedUser.id ?? '')) return;
      _mergeViewedUser(fetchedUser);
      window.RightRail?.refreshAuthors?.();
      renderCurrentView();
    });
  }

  function openUserProfileFromElement(element) {
    if (!element?.dataset?.profile) return;
    openUserProfile(_decodePayload(element.dataset.profile));
  }

  function _setText(id, value) {
    const el = document.getElementById(id);
    if (el) el.textContent = value;
  }

  function _buildTopicChips(user, articles) {
    const container = document.getElementById('profile-interests');
    if (!container) return;
    const profileTags = [...(user.fields || []), ...(user.subjects || [])].filter(Boolean);
    if (profileTags.length) {
      container.innerHTML = profileTags.slice(0, 6).map((tag) => `<span class="topic-chip active">${_esc(tag)}</span>`).join('');
      return;
    }
    const tagSet = new Set();
    articles.forEach((article) => (article.tags || []).forEach((tag) => tagSet.add(tag)));
    const tags = tagSet.size > 0 ? [...tagSet].slice(0, 6) : ['Writing', 'Knowledge', 'Ideas'];
    container.innerHTML = tags.map((tag) => `<span class="topic-chip active">${_esc(tag)}</span>`).join('');
  }

  function _buildInterestAction(user, isOwn) {
    const container = document.getElementById('profile-interest-action');
    if (!container) return;
    if (!isOwn || user.plan !== 'premium') {
      container.innerHTML = '';
      return;
    }
    container.innerHTML = `<button class="ob-edit-interests-btn" onclick="IBlog.Profile.editInterests()">Edit interests</button>`;
  }

  function _buildActionRow(user, isOwn) {
    const container = document.getElementById('profile-actions');
    if (!container) return;

    if (isOwn) {
      container.innerHTML = `
        <button class="btn btn-outline" style="padding:9px 18px;font-size:13px;"
          onclick="IBlog.Profile.toggleEdit(true)">Edit Profile</button>
        <button class="btn btn-outline" style="padding:9px 18px;font-size:13px;"
          onclick="IBlog.Profile.triggerAvatarPicker()">Profile Picture</button>
        <button class="btn btn-outline" style="padding:9px 18px;font-size:13px;"
          onclick="IBlog.Profile.triggerCoverPicker()">Cover Photo</button>
        <button class="btn btn-outline" style="padding:9px 18px;font-size:13px;color:var(--danger,#e74c3c);"
          onclick="IBlog.Profile.logout()">Sign Out</button>`;
      return;
    }

    const messagePayload = _payload({
      id: user.id ?? null,
      name: user.name || 'Unknown',
      avatar: user.avatar || '',
      cover: user.cover || '',
      bio: user.bio || '',
      initial: user.initial || (user.name || 'U').slice(0, 1).toUpperCase(),
      plan: user.plan || (user.isPremium ? 'premium' : 'free'),
      isPremium: !!user.isPremium,
    });

    container.innerHTML = `
      <button class="btn btn-primary" style="padding:9px 18px;font-size:13px;"
        onclick='IBlog.MessageCenter?.startConversation?.(JSON.parse(decodeURIComponent("${messagePayload}")))'>Message</button>
      <button class="btn btn-primary" id="profile-follow-btn" style="padding:9px 18px;font-size:13px;"
        onclick="IBlog.Profile.toggleFollow()">${_followLabel(user)}</button>
      <button class="btn btn-outline" style="padding:9px 18px;font-size:13px;"
        onclick="IBlog.Profile.showOwnProfile(true)">Back to My Profile</button>`;
  }

  function _renderArticleSection(title, articles, emptyText, options = {}) {
    if (!articles.length) {
      return `
        <div class="section-card" style="text-align:center;padding:26px 20px;color:var(--text2);margin-bottom:16px;">
          <p style="font-size:14px">${_esc(emptyText)}</p>
        </div>`;
    }

    return `
      <div style="font-size:13px;font-weight:600;color:var(--text2);text-transform:uppercase;letter-spacing:.08em;margin-bottom:14px;">
        ${_esc(title)}
      </div>
      <div class="section-card" style="padding:10px 22px;margin-bottom:18px;">
        ${articles.map((article) => _articleRow(article, options)).join('')}
      </div>`;
  }

  function _buildArticleList(user, articles, repostedArticles, isOwn) {
    const listEl = document.getElementById('profile-articles-list');
    if (!listEl) return;
    const heading = isOwn ? 'Published Articles' : `${_esc(user.name || 'Author')} Articles`;

    if (!articles.length && !repostedArticles.length) {
      listEl.innerHTML = `
        <div class="section-card" style="text-align:center;padding:40px 20px;color:var(--text2);">
          <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.3" opacity=".35"
            style="margin-bottom:12px;display:block;margin-left:auto;margin-right:auto">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
            <polyline points="14 2 14 8 20 8"/>
          </svg>
          <p style="font-size:14px">${isOwn ? 'No articles published yet.' : 'No published articles yet.'}</p>
          ${isOwn ? `<button class="btn btn-primary" style="margin-top:14px;padding:10px 24px;font-size:13px"
            onclick="IBlog.Dashboard.navigateTo('write')">Write your first article</button>` : ''}
        </div>`;
      return;
    }

    listEl.innerHTML = `
      ${_renderArticleSection(heading, articles, isOwn ? 'No published articles yet.' : 'No published articles yet.')}
      ${isOwn ? _renderArticleSection('Reposted Articles', repostedArticles, 'Articles you repost will appear here.', { isRepost: true }) : ''}`;
  }

  function _articleRow(article, options = {}) {
    const likes = IBlog.utils?.formatNumber?.(article.likes || 0) || article.likes || 0;
    const reposts = IBlog.utils?.formatNumber?.(article.reposts || 0) || article.reposts || 0;
    const cover = article.cover || article.img || '';
    const openId = JSON.stringify(article.id);
    return `
      <div style="display:flex;gap:14px;align-items:flex-start;padding:14px 0;border-bottom:1px solid var(--border);cursor:pointer;"
        onclick="IBlog.Feed?.openReader(${openId})">
        ${cover ? `<img src="${_esc(cover)}" alt="" style="width:72px;height:54px;object-fit:cover;border-radius:8px;flex-shrink:0;"/>` : ''}
        <div style="flex:1;min-width:0;">
          <div style="font-size:15px;font-weight:600;color:var(--text);margin-bottom:4px;line-height:1.35;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">
            ${_esc(article.title)}
          </div>
          <div style="font-size:12px;color:var(--text2);display:flex;gap:14px;flex-wrap:wrap;">
            <span>${_esc(article.readTime || '-')}</span>
            <span>${likes} likes</span>
            <span>${reposts} reposts</span>
            <span>${_esc(article.date || '')}</span>
            ${options.isRepost ? '<span style="background:rgba(42,157,92,.12);color:var(--green);border-radius:999px;padding:1px 8px;font-size:11px;font-weight:600;">Reposted</span>' : ''}
            <span style="background:var(--bg3);border-radius:4px;padding:1px 7px;font-size:11px;">${_esc(article.cat || article.category || '')}</span>
          </div>
        </div>
      </div>`;
  }

  function toggleEdit(show) {
    if (_currentView()?.mode === 'user') return;
    const section = document.getElementById('profile-edit-section');
    if (!section) return;
    section.style.display = show ? 'block' : 'none';
    if (!show) return;

    const user = _cu();
    if (!user) return;
    const nameEl = document.getElementById('edit-profile-name');
    const emailEl = document.getElementById('edit-profile-email');
    const bioEl = document.getElementById('edit-profile-bio');
    if (nameEl) nameEl.value = user.name || '';
    if (emailEl) emailEl.value = user.email || '';
    if (bioEl) bioEl.value = user.bio || '';
  }

  function saveProfile() {
    const name = document.getElementById('edit-profile-name')?.value.trim();
    const email = document.getElementById('edit-profile-email')?.value.trim();
    const bio = document.getElementById('edit-profile-bio')?.value.trim();

    if (!name || name.length < 2) {
      _showEditMsg('Name must be at least 2 characters.', 'error');
      return;
    }
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      _showEditMsg('Please enter a valid email.', 'error');
      return;
    }

    const btn = document.querySelector('#profile-edit-section .btn-primary');
    if (btn) {
      btn.textContent = 'Saving...';
      btn.disabled = true;
    }

    fetch(AUTH_API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin',
      body: JSON.stringify({ action: 'update_profile', name, email, bio }),
    })
      .then((r) => r.text())
      .then((text) => {
        if (btn) {
          btn.textContent = 'Save Changes';
          btn.disabled = false;
        }
        if (!text.trim().startsWith('{')) {
          _showEditMsg('Server error. Check console.', 'error');
          console.error('Profile update PHP error:', text.substring(0, 300));
          return;
        }
        const data = JSON.parse(text);
        if (!data.ok) {
          _showEditMsg(data.error || 'Update failed.', 'error');
          return;
        }

        const updatedUser = data.user || {
          name,
          email,
          bio,
          initial: name[0].toUpperCase(),
          pseudo: name.split(' ')[0].toLowerCase(),
        };

        _persistCurrentUserPatch(updatedUser);

        _showEditMsg('Profile updated successfully!', 'success');
        setTimeout(() => toggleEdit(false), 1000);
        renderCurrentView();
      })
      .catch((error) => {
        if (btn) {
          btn.textContent = 'Save Changes';
          btn.disabled = false;
        }
        _showEditMsg('Connection error.', 'error');
        console.error(error);
      });
  }

  function _showEditMsg(message, type) {
    const el = document.getElementById('profile-edit-msg');
    if (!el) return;
    el.style.display = 'block';
    el.textContent = message;
    el.style.background = type === 'success' ? '#eafbf0' : '#fff0f0';
    el.style.color = type === 'success' ? '#27ae60' : '#c0392b';
    el.style.border = `1px solid ${type === 'success' ? '#9be7af' : '#ffb3b3'}`;
  }

  function logout() {
    IBlog.state.profileView = { mode: 'self' };
    IBlog.Dashboard?.signout?.();
  }

  function triggerAvatarPicker() {
    if (_currentView()?.mode === 'user') return;
    document.getElementById('profile-avatar-input')?.click();
  }

  function triggerCoverPicker() {
    if (_currentView()?.mode === 'user') return;
    document.getElementById('profile-cover-input')?.click();
  }

  function handleAvatarUpload(input) {
    const file = input?.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const avatar = String(reader.result || '');
      _saveProfileMedia({ avatar }, 'Profile picture updated.', input);
    };
    reader.readAsDataURL(file);
  }

  function handleCoverUpload(input) {
    const file = input?.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const cover = String(reader.result || '');
      _saveProfileMedia({ cover }, 'Cover image updated.', input);
    };
    reader.readAsDataURL(file);
  }

  function _saveProfileMedia(patch, successMessage, input) {
    const current = _cu();
    if (!current) return;

    fetch(AUTH_API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin',
      body: JSON.stringify({
        action: 'update_profile',
        name: current.name || '',
        email: current.email || '',
        bio: current.bio || '',
        avatar: patch.avatar ?? current.avatar ?? '',
        cover: patch.cover ?? current.cover ?? '',
      }),
    })
      .then((r) => r.text())
      .then((text) => {
        if (!text.trim().startsWith('{')) {
          throw new Error('Server error');
        }
        const data = JSON.parse(text);
        if (!data.ok) {
          throw new Error(data.error || 'Update failed.');
        }

        _persistCurrentUserPatch(data.user || patch);
        renderCurrentView();
        IBlog.utils?.toast(successMessage, 'success');
        if (input) input.value = '';
      })
      .catch((error) => {
        console.error(error);
        IBlog.utils?.toast(error?.message || 'Could not update image.', 'error');
        if (input) input.value = '';
      });
  }

  function _applyAvatar(el, image, fallback) {
    if (!el) return;
    if (image) {
      el.textContent = '';
      el.style.backgroundImage = `url("${image}")`;
      el.style.backgroundSize = 'cover';
      el.style.backgroundPosition = 'center';
      el.style.backgroundColor = 'transparent';
    } else {
      el.textContent = fallback || 'A';
      el.style.backgroundImage = '';
      el.style.backgroundSize = '';
      el.style.backgroundPosition = '';
      el.style.backgroundColor = 'var(--accent)';
    }
  }

  function _applyBanner(el, image) {
    if (!el) return;
    if (image) {
      el.style.backgroundImage = `linear-gradient(180deg, rgba(15,18,28,.18), rgba(15,18,28,.32)), url("${image}")`;
      el.style.backgroundSize = 'cover';
      el.style.backgroundPosition = 'center';
    } else {
      el.style.backgroundImage = 'linear-gradient(135deg,var(--accent),var(--accent2))';
      el.style.backgroundSize = '';
      el.style.backgroundPosition = '';
    }
  }

  function editInterests() {
    const user = _cu();
    if (!user) return;
    if (user.plan !== 'premium') {
      window.showPremium?.();
      return;
    }

    if (window.IBlogOnboarding?.editInterests) {
      window.IBlogOnboarding.editInterests(user, {
        finishLabel: 'Save interests',
        onComplete: (updatedUser) => {
          _persistCurrentUserPatch(updatedUser || {});
          renderCurrentView();
          IBlog.utils?.toast('Your interests were updated.', 'success');
        },
      });
      return;
    }

    IBlog.utils?.toast('Interest editor is not available right now.', 'error');
  }

  return {
    init,
    buildProfile,
    build: buildProfile,
    renderCurrentView,
    showOwnProfile,
    openUserProfile,
    openUserProfileFromElement,
    decodeProfilePayload: _decodePayload,
    toggleFollow,
    toggleEdit,
    saveProfile,
    logout,
    syncFromSession,
    editInterests,
    triggerAvatarPicker,
    triggerCoverPicker,
    handleAvatarUpload,
    handleCoverUpload,
  };
})();
