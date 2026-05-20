/* ═══════════════════════════════════════════════════════════
   RIGHT RAIL — Complete corrected JS
   ═══════════════════════════════════════════════════════════ */

const STATS_API     = 'backend/view/components/auth/api-stats.php';
const AUTH_API      = 'backend/view/components/auth/api-auth.php';
const COMMUNITY_API = 'backend/controller/CommunityController.php';
let _statsIntervalId = null;
let _topAuthors = [];

function _t(key, vars = {}) {
  return window.IBlog?.I18n?.t?.(key, vars) || key;
}

/* ── Helpers ─────────────────────────────────────────────── */

function _payload(value) {
  return encodeURIComponent(JSON.stringify(value ?? {})).replace(/'/g, '%27');
}

function _esc(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g,  '&lt;')
    .replace(/>/g,  '&gt;')
    .replace(/"/g,  '&quot;')
    .replace(/'/g,  '&#39;');
}

function _fmt(n) {
  const num = Number(n || 0);
  return num >= 1000 ? `${(num / 1000).toFixed(1)}k` : String(num);
}

function _assetUrl(path) {
  const value = String(path || '').trim();
  if (!value) return '';
  if (/^(?:data:|blob:|https?:\/\/)/i.test(value)) return value;
  try {
    return new URL(value, window.location.href).href;
  } catch (_) {
    return value;
  }
}

function _normalizeIdentity(value) {
  return String(value || '').trim().toLowerCase();
}

function _authorMatches(source = {}, author = {}) {
  const sourceId = source?.id ?? source?.userId ?? source?.authorId ?? null;
  const authorId = author?.id ?? author?.userId ?? author?.authorId ?? null;
  if (sourceId !== null && authorId !== null && String(sourceId) === String(authorId)) {
    return true;
  }
  const sourceEmail = _normalizeIdentity(source?.email || source?.authorEmail);
  const authorEmail = _normalizeIdentity(author?.email || author?.authorEmail);
  if (sourceEmail && authorEmail && sourceEmail === authorEmail) {
    return true;
  }
  const sourceName = _normalizeIdentity(source?.name || source?.author || source?.pseudo);
  const authorName = _normalizeIdentity(author?.name || author?.author || author?.pseudo);
  return !!(sourceName && authorName && sourceName === authorName);
}

function _resolveAuthorProfile(author = {}) {
  let avatar    = String(author?.avatar || '').trim();
  let cover     = String(author?.cover  || '').trim();
  let bio       = String(author?.bio    || '').trim();
  let plan      = author?.isPremium ? 'premium' : 'free';
  let isPremium = !!author?.isPremium;

  const current = window.IBlog?.state?.currentUser || null;
  if (_authorMatches(current, author)) {
    avatar    = avatar || String(current?.avatar || '').trim();
    cover     = cover  || String(current?.cover  || '').trim();
    bio       = bio    || String(current?.bio    || '').trim();
    plan      = String(current?.plan || plan || 'free');
    isPremium = isPremium || current?.plan === 'premium' || !!current?.isPremium;
  }

  const viewedProfile = window.IBlog?.state?.profileView?.mode === 'user'
    ? window.IBlog.state.profileView.user
    : null;
  if (_authorMatches(viewedProfile, author)) {
    avatar    = avatar || String(viewedProfile?.avatar || '').trim();
    cover     = cover  || String(viewedProfile?.cover || '').trim();
    bio       = bio    || String(viewedProfile?.bio || '').trim();
    plan      = String(viewedProfile?.plan || plan || 'free');
    isPremium = isPremium || viewedProfile?.plan === 'premium' || !!viewedProfile?.isPremium;
  }

  const articleMatch = (window.IBlog?.state?.articles || []).find(
    (article) => _authorMatches(article, author) && article?.authorAvatar
  );
  if (articleMatch?.authorAvatar) {
    avatar = avatar || String(articleMatch.authorAvatar).trim();
  }

  return {
    avatar: _assetUrl(avatar),
    cover: _assetUrl(cover),
    bio,
    plan,
    isPremium,
    initial: String(
      author?.initial || author?.name?.[0] || author?.author?.[0] || 'U'
    ).slice(0, 1).toUpperCase(),
  };
}

/* ── Compute real author stats from articles ─────────────── */

function _computeAuthorStats(author) {
  const allArticles = Array.isArray(window.IBlog?.state?.articles)
    ? window.IBlog.state.articles
    : [];

  const authorArticles = allArticles.filter((article) =>
    _authorMatches(article, author)
  );

  return {
    articleCount : authorArticles.length,
    totalLikes   : authorArticles.reduce(
      (sum, a) => sum + Number(a?.likesCount ?? a?.likes ?? 0), 0
    ),
    totalComments: authorArticles.reduce(
      (sum, a) => sum + Number(a?.comments?.length ?? a?.commentCount ?? 0), 0
    ),
    totalViews   : authorArticles.reduce(
      (sum, a) => sum + Number(a?.views ?? 0), 0
    ),
  };
}

/* ── API helper ──────────────────────────────────────────── */

async function _statsPost(action) {
  try {
    const currentUser = window.IBlog?.state?.currentUser || {};
    const response = await fetch(STATS_API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin',
      body: JSON.stringify({
        action,
        userId   : currentUser?.id    ?? 0,
        userEmail: currentUser?.email || '',
      }),
    });
    const text = await response.text();
    if (!text.trim().startsWith('{')) return null;
    return JSON.parse(text);
  } catch (_) {
    return null;
  }
}

async function _authPost(body) {
  const response = await fetch(AUTH_API, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'same-origin',
    body: JSON.stringify(body),
  });
  const text = await response.text();
  if (!text.trim().startsWith('{')) {
    throw new Error('Server error.');
  }
  const data = JSON.parse(text);
  if (!response.ok || !data?.ok) {
    throw new Error(data?.error || 'Request failed.');
  }
  return data;
}

function _applyViewerFollowState(viewer) {
  if (!viewer) return;
  const current = {
    ...(window.IBlog?.state?.currentUser || {}),
    ...viewer,
  };
  if (current.name && !current.initial) {
    current.initial = current.name[0].toUpperCase();
  }
  window.IBlog.state.currentUser = current;
  sessionStorage.setItem('user', JSON.stringify(current));
  localStorage.setItem('user', JSON.stringify(current));
}

/* ── HTML injection ──────────────────────────────────────── */

function injectRightRail() {
  const root = document.getElementById('right-rail-root');
  if (!root) return;

  root.innerHTML = `
    <div class="right-rail">

      <div class="search-bar">
        <input type="text" placeholder="${_esc(_t('rightRail.searchPlaceholder'))}"
          onclick="IBlog.Search?.focusAndNavigate(this.value)"
          onkeydown="if(event.key==='Enter') IBlog.Search?.focusAndNavigate(this.value);" />
      </div>

      <div class="rail-section">
        <div class="rail-title">${_t('rightRail.yourStats')}</div>
        <div class="stats-grid" id="rr-stats-grid">
          <div class="stat-box"><span class="stat-value" id="rr-articles">-</span><div class="stat-label">${_t('rightRail.articles')}</div></div>
          <div class="stat-box"><span class="stat-value" id="rr-likes">-</span><div class="stat-label">${_t('rightRail.likes')}</div></div>
          <div class="stat-box"><span class="stat-value" id="rr-comments">-</span><div class="stat-label">${_t('rightRail.comments')}</div></div>
          <div class="stat-box"><span class="stat-value" id="rr-saved">-</span><div class="stat-label">${_t('rightRail.saved')}</div></div>
        </div>
      </div>

      <div class="rail-section">
        <div class="rail-title">${_t('rightRail.trendingTopics')}</div>
        <div class="topic-chips" id="trending-chips"></div>
      </div>

      <div class="rail-section">
        <div class="rail-title">${_t('rightRail.communities')}</div>
        <div id="rail-communities"></div>
      </div>

      <div class="rail-section">
        <div class="rail-title">${_t('rightRail.topAuthors')}</div>
        <div id="top-authors">
          <div style="text-align:center;padding:16px;color:var(--text2);font-size:13px;">${_t('rightRail.loading')}</div>
        </div>
      </div>

      <div class="rail-section">
        <div class="rail-title">${_t('rightRail.weeklyDigest')}</div>
        <div class="digest-widget">
          <h4>${_t('rightRail.stayInLoop')}</h4>
          <p>${_t('rightRail.digestCopy')}</p>
          <input class="digest-email" type="email" placeholder="your@email.com" />
          <button class="digest-sub-btn" onclick="subscribeToDigest()">${_t('rightRail.subscribe')}</button>
        </div>
      </div>

      <div class="footer-links">
        <a href="#">${_t('rightRail.about')}</a><a href="#">${_t('rightRail.blog')}</a><a href="#">${_t('rightRail.privacy')}</a>
        <a href="#">${_t('rightRail.terms')}</a><a href="#">© 2026 IBlog</a>
      </div>

    </div>`;
}

/* ── Init ────────────────────────────────────────────────── */

async function initRightRail() {
  injectRightRail();
  loadTrendingTopics();
  await loadRailCommunities();
  await Promise.all([loadUserStats(), loadTopAuthors()]);
  setupStatsAutoRefresh();
}

/* ── User stats ──────────────────────────────────────────── */

async function loadUserStats() {
  const data        = await _statsPost('my_stats');
  const currentUser = window.IBlog?.state?.currentUser || {};

  // Compute fallback from local articles scoped to current user
  const scopedArticles = Array.isArray(window.IBlog?.state?.articles)
    ? window.IBlog.state.articles.filter((article) => {
        const authorId = article?.authorId ?? article?.userId ?? null;
        if (authorId !== null && authorId !== undefined && String(authorId) !== '') {
          return String(authorId) === String(currentUser?.id ?? '');
        }
        return (
          String(article?.authorEmail || '').trim().toLowerCase() ===
          String(currentUser?.email   || '').trim().toLowerCase()
        );
      })
    : [];

  const fallback = {
    articles: scopedArticles.length,
    likes   : scopedArticles.reduce((sum, a) => sum + Number(a?.likesCount ?? a?.likes ?? 0), 0),
    comments: scopedArticles.reduce((sum, a) => sum + Number(a?.comments?.length ?? a?.commentCount ?? 0), 0),
    saved   : Array.isArray(window.IBlog?.state?.savedArticles) ? window.IBlog.state.savedArticles.length : 0,
  };

  const set = (id, val) => {
    const el = document.getElementById(id);
    if (el) el.textContent = _fmt(Number(val));
  };

  set('rr-articles', data?.articles ?? fallback.articles);
  set('rr-likes',    data?.likes    ?? fallback.likes);
  set('rr-comments', data?.comments ?? fallback.comments);
  set('rr-saved',    data?.saved    ?? fallback.saved);
}

/* ── Top Authors ─────────────────────────────────────────── */

async function loadTopAuthors() {
  const container = document.getElementById('top-authors');
  if (!container) return;

  const data    = await _statsPost('top_authors');
  let   authors = data?.ok && Array.isArray(data.authors) ? data.authors : [];
  const current = window.IBlog?.state?.currentUser || null;

  if (!authors.length) {
    container.innerHTML = `<div style="font-size:13px;color:var(--text2);padding:8px 0;font-style:italic;">${_t('rightRail.noDataYet')}</div>`;
    return;
  }

  // Enrich every author with real stats from local articles
  authors = authors.map((author) => {
    const local = _computeAuthorStats(author);
    const totalInteractions = Number(author.totalInteractions || 0)
      || (local.articleCount + local.totalLikes + local.totalComments + local.totalViews);
    return {
      ...author,
      // Prefer API value if non-zero, otherwise fall back to local count
      articleCount : Number(author.articleCount  || 0) || local.articleCount,
      totalLikes   : Number(author.totalLikes    || 0) || local.totalLikes,
      totalComments: Number(author.totalComments || 0) || local.totalComments,
      totalViews   : Number(author.totalViews    || 0) || local.totalViews,
      totalInteractions,
    };
  });
  authors = authors
    .filter((author) => Number(author?.totalInteractions || 0) > 0)
    .sort((a, b) =>
      (Number(b.totalInteractions || 0) - Number(a.totalInteractions || 0))
      || (Number(b.totalLikes || 0) - Number(a.totalLikes || 0))
      || (Number(b.totalComments || 0) - Number(a.totalComments || 0))
      || (Number(b.totalViews || 0) - Number(a.totalViews || 0))
      || (Number(b.articleCount || 0) - Number(a.articleCount || 0))
      || String(a.name || '').localeCompare(String(b.name || ''))
    );

  if (!authors.length) {
    container.innerHTML = `<div style="font-size:13px;color:var(--text2);padding:8px 0;font-style:italic;">${_t('rightRail.noDataYet')}</div>`;
    return;
  }

  _topAuthors = authors;

  const colors = [
    'hsl(40,75%,48%)',
    'hsl(200,60%,46%)',
    'hsl(140,42%,42%)',
    'hsl(12,72%,56%)',
    'hsl(325,50%,48%)',
  ];

  container.innerHTML = authors.map((author, index) => {
    const color    = colors[index % colors.length];
    const resolved = _resolveAuthorProfile(author);
    const isCurrentUser = _authorMatches(current, author);

    const profilePayload = {
      id       : author.id ?? null,
      name     : author.name  || '',
      email    : author.email || '',
      plan     : resolved.plan,
      isPremium: resolved.isPremium,
      avatar   : resolved.avatar,
      cover    : resolved.cover,
      bio      : resolved.bio,
      initial  : resolved.initial,
    };

    const avatarStyle = resolved.avatar
      ? `background-image:url('${String(resolved.avatar).replace(/'/g, "&#39;")}');background-size:cover;background-position:center;`
      : `background:${color};`;

    const avatarHtml = `
      <div class="author-avatar${resolved.avatar ? ' has-image' : ''}" style="${avatarStyle}">
        ${resolved.avatar ? '' : resolved.initial}
      </div>`;

    // Meta line: likes · comments · articles
    const metaParts = [
      `${_fmt(author.totalLikes)} ${_t('rightRail.likesUnit')}`,
      `${_fmt(author.totalComments)} ${_t('rightRail.commentsUnit')}`,
      `${author.articleCount} ${_t('rightRail.articlesUnit')}`,
      `${_fmt(author.totalInteractions)} ${_t('rightRail.interactionsUnit')}`,
    ].join(' · ');

    return `
      <div class="author-item${isCurrentUser ? ' is-self' : ''}">
        <div class="author-main"
             onclick="IBlog.Profile?.openUserProfile?.(JSON.parse(decodeURIComponent('${_payload(profilePayload)}')))">
          ${avatarHtml}
          <div class="author-copy">
            <div class="author-name-row">
              <div class="author-name">${_esc(author.name)}</div>
              ${resolved.isPremium ? `<span class="author-badge">${_t('rightRail.premium')}</span>` : ''}
            </div>
            <div class="author-meta">${_esc(metaParts)}</div>
          </div>
        </div>
        ${isCurrentUser ? '' : `
          <div class="author-actions">
            <button class="follow-btn follow-btn-accent"
              onclick="event.stopPropagation(); IBlog.MessageCenter?.startConversation?.(JSON.parse(decodeURIComponent('${_payload(profilePayload)}')))">
              ${_t('rightRail.message')}
            </button>
            <button class="follow-btn${author.isFollowing ? ' following' : ''}"
              onclick="event.stopPropagation(); toggleAuthorFollow(${index}, this);">
              ${author.isFollowing ? _t('rightRail.following') : _t('rightRail.follow')}
            </button>
          </div>
        `}
      </div>`;
  }).join('');
}

async function toggleAuthorFollow(index, button) {
  const author = _topAuthors[index];
  const currentUser = window.IBlog?.state?.currentUser || null;
  if (!author?.id || !currentUser?.id) {
    IBlog.utils?.toast('You need to sign in first.', 'info');
    return;
  }

  button.disabled = true;
  button.textContent = author.isFollowing ? '...' : _t('rightRail.following');

  try {
    const data = await _authPost({
      action: author.isFollowing ? 'unfollow_user' : 'follow_user',
      targetUserId: Number(author.id),
    });

    _applyViewerFollowState(data.viewer || null);
    if (data?.target) {
      _topAuthors[index] = {
        ...author,
        ...data.target,
      };
    }

    if (
      window.IBlog?.state?.profileView?.mode === 'user' &&
      String(window.IBlog.state.profileView.user?.id ?? '') === String(author.id)
    ) {
      window.IBlog.state.profileView.user = {
        ...window.IBlog.state.profileView.user,
        ...(data.target || {}),
      };
      IBlog.Profile?.renderCurrentView?.();
    }

    loadTopAuthors();
    loadUserStats();
    const activeFeed = document.querySelector('.feed-tab.active')?.getAttribute('onclick') || '';
    if (activeFeed.includes("'following'")) {
      IBlog.Feed?.build?.('following');
    }
    IBlog.utils?.toast(
      data?.target?.isFollowing ? 'You are now following this author.' : 'You unfollowed this author.',
      'success'
    );
  } catch (error) {
    IBlog.utils?.toast(error?.message || 'Could not update follow status.', 'error');
  } finally {
    button.disabled = false;
  }
}

/* ── Trending topics ─────────────────────────────────────── */

function loadTrendingTopics() {
  const container = document.getElementById('trending-chips');
  if (!container) return;

  const trendingTopics = Array.isArray(window.IBlog?.TRENDS)
    ? window.IBlog.TRENDS
        .map((trend, index) => ({
          name  : trend?.topic    || '',
          count : trend?.searches || '',
          active: index === 0,
        }))
        .filter((topic) => topic.name)
    : [];

  if (!trendingTopics.length) {
    container.innerHTML = `<span class="topic-chip">${_t('rightRail.noTrendingTopics')}</span>`;
    return;
  }

  container.innerHTML = trendingTopics.map((topic) => `
    <span class="topic-chip${topic.active ? ' active' : ''}"
      onclick="selectTrendingTopic(JSON.parse(decodeURIComponent('${_payload(topic.name)}')))">
      ${_esc(window.IBlog?.I18n?.localizeTopic?.(topic.name) || topic.name)}
      <span style="font-size:10px;opacity:.6;margin-left:2px;">${topic.count}</span>
    </span>`).join('');
}

function selectTrendingTopic(topic) {
  document.querySelectorAll('#trending-chips .topic-chip').forEach((chip) => {
    chip.classList.toggle('active', chip.textContent.trim().startsWith(topic));
  });
  IBlog.Search?.focusAndNavigate(topic);
}

/* ── Communities ─────────────────────────────────────────── */

function _railAbbr(name) {
  if (!name) return '?';
  const words = name.replace(/[^\p{L}\p{N}\s]/gu, '').trim().split(/\s+/).filter(Boolean);
  if (!words.length) return name.slice(0, 2).toUpperCase();
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + words[1][0]).toUpperCase();
}

function _extractJsonObject(text) {
  const trimmed = String(text || '').trim();
  if (trimmed.startsWith('{') || trimmed.startsWith('[')) return trimmed;
  const jsonStart = trimmed.indexOf('{');
  if (jsonStart === -1) return '';
  return trimmed.slice(jsonStart);
}

async function _fetchJoinedCommunityIds() {
  try {
    const currentUser = window.IBlog?.state?.currentUser || {};
    const params      = new URLSearchParams({ action: 'getUserCommunities' });
    if (currentUser?.id)    params.set('userId',    String(currentUser.id));
    if (currentUser?.email) params.set('userEmail', currentUser.email);
    const response = await fetch(`${COMMUNITY_API}?${params.toString()}`, {
      credentials: 'same-origin',
    });
    const text    = await response.text();
    const payload = _extractJsonObject(text);
    if (!payload) return new Set();
    const parsed  = JSON.parse(payload);
    const rows    = Array.isArray(parsed) ? parsed : (Array.isArray(parsed?.communities) ? parsed.communities : []);
    return new Set(rows.map((item) => String(item?.id)));
  } catch (_) {
    return new Set();
  }
}

function _resolveJoinedCommunityIds() {
  const joinedIds = IBlog.state?.joinedCommunityIds;
  if (joinedIds instanceof Set && joinedIds.size) return joinedIds;

  const joinedIndexes = IBlog.state?.joinedCommunities;
  if (!(joinedIndexes instanceof Set) || !Array.isArray(window.IBlog?.COMMUNITIES)) {
    return new Set();
  }

  return new Set(
    window.IBlog.COMMUNITIES
      .map((community, idx) => ({ community, idx }))
      .filter(({ idx })      => joinedIndexes.has(idx))
      .map(({ community })   => String(community?.id))
  );
}

async function loadRailCommunities() {
  const container = document.getElementById('rail-communities');
  if (!container) return;

  if (!window.IBlog?.COMMUNITIES) {
    container.innerHTML = `<div class="rail-comm-empty">${_t('rightRail.noCommunitiesJoined')}</div>`;
    return;
  }

  let joinedIds = _resolveJoinedCommunityIds();
  if (!joinedIds.size) {
    joinedIds = await _fetchJoinedCommunityIds();
    IBlog.state.joinedCommunityIds = joinedIds;
  }

  const joinedComms = IBlog.COMMUNITIES.filter(
    (community) => joinedIds.has(String(community?.id))
  );

  if (!joinedComms.length) {
    container.innerHTML = `<div class="rail-comm-empty">${_t('rightRail.noCommunitiesJoined')}</div>`;
    return;
  }

  container.innerHTML = joinedComms.map((community) => `
    <div class="rail-comm-item">
      <div class="rail-comm-icon">${_railAbbr(community.name)}</div>
      <div class="rail-comm-info">
        <div class="rail-comm-name">${_esc(community.name)}</div>
      </div>
      <div class="rail-comm-actions">
        <button class="rail-comm-btn rail-comm-btn-open"
          onclick="IBlog.Communities?.openChat(${Number(community?.id || 0)})">${_t('rightRail.enterChat')}</button>
        <button class="rail-comm-btn rail-comm-btn-leave"
          onclick="IBlog.Communities?.leave(${Number(community?.id || 0)}); setTimeout(loadRailCommunities, 120);">${_t('rightRail.leave')}</button>
      </div>
    </div>`).join('');
}

/* ── Digest ──────────────────────────────────────────────── */

function subscribeToDigest() {
  const emailInput = document.querySelector('.digest-email');
  if (!emailInput) return;
  const email = emailInput.value.trim();
  if (!email || !email.includes('@')) {
    IBlog.utils?.toast(_t('rightRail.invalidEmail'), 'error');
    return;
  }
  emailInput.value = '';
  IBlog.utils?.toast(_t('rightRail.subscribed'), 'success');
}

/* ── Auto-refresh ────────────────────────────────────────── */

function setupStatsAutoRefresh() {
  if (_statsIntervalId) clearInterval(_statsIntervalId);

  _statsIntervalId = setInterval(() => {
    loadUserStats();
    loadTopAuthors();
  }, 5000);

  if (!window.__iblogRightRailStatsFocusBound) {
    window.addEventListener('focus', () => {
      loadUserStats();
      loadTopAuthors();
    });
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) {
        loadUserStats();
        loadTopAuthors();
      }
    });
    window.addEventListener('storage', (event) => {
      if (!event?.key) return;
      if (
        String(event.key).includes('savedarticle') ||
        String(event.key).includes('iblog_')
      ) {
        loadUserStats();
        loadTopAuthors();
      }
    });
    window.__iblogRightRailStatsFocusBound = true;
  }
}

/* ── Public API ──────────────────────────────────────────── */

window.RightRail = {
  init           : initRightRail,
  buildCommunities: loadRailCommunities,
  loadCommunities : loadRailCommunities,
  buildTopics    : loadTrendingTopics,
  buildAuthors   : loadTopAuthors,
  refreshStats   : loadUserStats,
  refreshAuthors : loadTopAuthors,
  subscribe      : subscribeToDigest,
};
