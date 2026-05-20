window.IBlog = window.IBlog || {};
IBlog.state = IBlog.state || {};

window.IBlogDataSanitizer = window.IBlogDataSanitizer || {
  run() {},
};

window.IBlogMessageCenter = window.IBlogMessageCenter || {
  build() {},
};

window.IBlogSession = (() => {
  const USER_KEY = 'user';
  const PENDING_KEY = 'pendingUser';
  const ACTIVE_KEY = 'iblog_active_user';
  const AUTH_API = 'backend/view/components/auth/api-auth.php';

  function _valid(user) {
    return !!(user && typeof user === 'object' && user.name && user.email);
  }

  function _safeParse(raw) {
    if (!raw) return null;
    try {
      const parsed = JSON.parse(raw);
      return _valid(parsed) ? parsed : null;
    } catch (_) {
      return null;
    }
  }

  function _scope(user) {
    if (!_valid(user)) return '';
    if (user.id !== undefined && user.id !== null && String(user.id) !== '') {
      return `id:${String(user.id)}`;
    }
    return `email:${String(user.email || '').trim().toLowerCase()}`;
  }

  function _broadcastSessionChange(user, previousUser = null) {
    try {
      window.dispatchEvent(new CustomEvent('iblog:session-changed', {
        detail: {
          user: user || null,
          previousUser: previousUser || null,
          scope: _scope(user),
          previousScope: _scope(previousUser),
        },
      }));
    } catch (_) {}
  }

  function _resetRuntimeState(user = null) {
    IBlog.state.currentUser = user;
    IBlog.state.articles = [];
    IBlog.state.savedArticles = [];
    IBlog.state.profileView = { mode: 'self' };
    IBlog.state.joinedCommunities = new Set();
    IBlog.state.podStates = {};
    IBlog.state.podTimers = {};
    IBlog.state.podVoicePrefs = {};
  }

  function getUser() {
    const sessionUser = _safeParse(sessionStorage.getItem(USER_KEY));
    if (sessionUser) return sessionUser;

    const persistedUser = _safeParse(localStorage.getItem(USER_KEY));
    if (persistedUser) {
      sessionStorage.setItem(USER_KEY, JSON.stringify(persistedUser));
      return persistedUser;
    }

    sessionStorage.removeItem(USER_KEY);
    localStorage.removeItem(USER_KEY);
    return null;
  }

  function setUser(user) {
    if (!_valid(user)) {
      clearUser();
      return null;
    }

    const previousUser = getUser();
    const normalizedUser = {
      ...user,
      initial: user.initial || (user.name ? user.name[0].toUpperCase() : 'A'),
    };
    const nextScope = _scope(normalizedUser);
    const prevScope = localStorage.getItem(ACTIVE_KEY) || '';

    sessionStorage.removeItem(PENDING_KEY);
    localStorage.removeItem(PENDING_KEY);
    sessionStorage.setItem(USER_KEY, JSON.stringify(normalizedUser));
    localStorage.setItem(USER_KEY, JSON.stringify(normalizedUser));
    localStorage.setItem(ACTIVE_KEY, nextScope);

    if (prevScope !== nextScope) {
      _resetRuntimeState(normalizedUser);
    } else {
      IBlog.state.currentUser = normalizedUser;
    }

    _broadcastSessionChange(normalizedUser, previousUser);

    return normalizedUser;
  }

  function replaceUser(user) {
    if (!_valid(user)) {
      clearUser();
      return null;
    }

    const previousUser = getUser();
    const normalizedUser = {
      ...user,
      initial: user.initial || (user.name ? user.name[0].toUpperCase() : 'A'),
    };
    const nextScope = _scope(normalizedUser);

    sessionStorage.removeItem(PENDING_KEY);
    localStorage.removeItem(PENDING_KEY);
    sessionStorage.setItem(USER_KEY, JSON.stringify(normalizedUser));
    localStorage.setItem(USER_KEY, JSON.stringify(normalizedUser));
    localStorage.setItem(ACTIVE_KEY, nextScope);
    _resetRuntimeState(normalizedUser);
    _broadcastSessionChange(normalizedUser, previousUser);

    return normalizedUser;
  }

  function clearUser() {
    const previousUser = getUser();
    sessionStorage.removeItem(USER_KEY);
    sessionStorage.removeItem(PENDING_KEY);
    localStorage.removeItem(USER_KEY);
    localStorage.removeItem(PENDING_KEY);
    localStorage.removeItem(ACTIVE_KEY);
    _resetRuntimeState(null);
    _broadcastSessionChange(null, previousUser);
  }

  async function destroy() {
    clearUser();
    try {
      await fetch('backend/view/components/auth/logout.php', {
        method: 'POST',
        headers: { 'X-Requested-With': 'XMLHttpRequest' },
        credentials: 'same-origin',
      });
    } catch (_) {}
  }

  async function syncFromServer(options = {}) {
    const clearOnFailure = !!options.clearOnFailure;

    try {
      const response = await fetch(AUTH_API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ action: 'me' }),
      });
      const text = await response.text();
      if (!text.trim().startsWith('{')) {
        if (clearOnFailure) clearUser();
        return null;
      }

      const data = JSON.parse(text);
      if (!response.ok || !data?.ok || !data?.user) {
        if (clearOnFailure) clearUser();
        return null;
      }

      return setUser(data.user);
    } catch (_) {
      if (clearOnFailure) clearUser();
      return null;
    }
  }

  function scopedKey(baseKey, user = getUser()) {
    const scope = _scope(user);
    return scope ? `${baseKey}::${scope}` : `${baseKey}::guest`;
  }

  function switchToPersistedUser() {
    const user = getUser();
    if (user) setUser(user);
    return user;
  }

  return {
    getUser,
    setUser,
    clearUser,
    destroy,
    syncFromServer,
    scopedKey,
    switchToPersistedUser,
    replaceUser,
    isValidUser: _valid,
  };
})();

window.IBlogCommentStore = (() => {
  const KEY = 'iblog_article_comments';

  function _read() {
    try {
      const parsed = JSON.parse(localStorage.getItem(window.IBlogSession.scopedKey(KEY)) || '{}');
      return parsed && typeof parsed === 'object' ? parsed : {};
    } catch (_) {
      return {};
    }
  }

  function _write(data) {
    try {
      localStorage.setItem(window.IBlogSession.scopedKey(KEY), JSON.stringify(data));
    } catch (_) {}
  }

  function get(articleId) {
    const store = _read();
    return Array.isArray(store[String(articleId)]) ? store[String(articleId)] : [];
  }

  function set(articleId, comments) {
    const store = _read();
    store[String(articleId)] = Array.isArray(comments) ? comments : [];
    _write(store);
    return store[String(articleId)];
  }

  function add(articleId, comment) {
    const next = [...get(articleId), comment];
    set(articleId, next);
    return next;
  }

  function hydrateArticle(article) {
    if (!article || article.id === undefined || article.id === null) return article;
    article.comments = Array.isArray(article.comments) && article.comments.length
      ? article.comments
      : get(article.id);
    return article;
  }

  return { get, set, add, hydrateArticle };
})();

window.IBlogContentMeta = (() => {
  function _normalize(value) {
    return String(value || '').trim().toLowerCase();
  }

  function enrichArticle(article) {
    if (!article || typeof article !== 'object') return article;
    const current = window.IBlog?.state?.currentUser || null;
    const articleAuthorId = article.authorId ?? article.userId ?? null;
    const articleAuthorEmail = _normalize(article.authorEmail);
    const isCurrentUsersArticle = !!(
      current && (
        (articleAuthorId !== null && String(current.id ?? '') === String(articleAuthorId)) ||
        (articleAuthorEmail && _normalize(current.email) === articleAuthorEmail)
      )
    );

    article.authorInitial = String(article.authorInitial || article.author?.[0] || 'A').slice(0, 1).toUpperCase();
    if (isCurrentUsersArticle && current?.avatar) {
      article.authorAvatar = current.avatar;
    }
    article._bookmarked = !!(article._bookmarked || article.bookmarked);
    article.bookmarked = !!article._bookmarked;
    article._liked = !!(article._liked || article.liked);
    article.liked = !!article._liked;
    return article;
  }

  return { enrichArticle };
})();

window.IBlogArticleSync = (() => {
  const API = 'backend/view/components/article/api-articles.php';

  function _fallbackUser() {
    if (window.IBlog?.state?.currentUser) return window.IBlog.state.currentUser;
    try {
      return JSON.parse(sessionStorage.getItem('user') || 'null');
    } catch (_) {
      return null;
    }
  }

  function _currentUser() {
    return window.IBlogSession?.getUser?.() || _fallbackUser();
  }

  function _articleKey(article) {
    if (!article) return '';
    if (article.id !== undefined && article.id !== null && String(article.id) !== '') {
      return `id:${article.id}`;
    }
    return `slug:${String(article.title || '').trim().toLowerCase()}|${String(article.author || '').trim().toLowerCase()}`;
  }

  function _normalizeArticle(article = {}, payload = {}) {
    const normalized = { ...article };
    const fallbackCover = String(
      payload.coverImage ?? payload.cover ?? payload.img ?? normalized.cover ?? normalized.img ?? ''
    ).trim();

    if (!normalized.cover && fallbackCover) normalized.cover = fallbackCover;
    if (!normalized.img && fallbackCover) normalized.img = fallbackCover;

    window.IBlogContentMeta?.enrichArticle?.(normalized);
    window.IBlogCommentStore?.hydrateArticle?.(normalized);
    return normalized;
  }

  async function _request(action, payload = {}) {
    const currentUser = _currentUser();
    const response = await fetch(API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin',
      body: JSON.stringify({
        action,
        ...(currentUser?.email ? { authorEmail: currentUser.email } : {}),
        ...payload,
      }),
    });
    const text = await response.text();
    if (!text.trim().startsWith('{')) {
      throw new Error(text.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().substring(0, 180) || 'Server error');
    }
    const data = JSON.parse(text);
    if (!response.ok || !data.ok) {
      throw new Error(data.error || 'Request failed');
    }
    return data;
  }

  function mergeArticles(remoteArticles = [], options = {}) {
    const replace = !!options.replace;
    const baseArticles = replace
      ? []
      : (Array.isArray(IBlog.state.articles) ? [...IBlog.state.articles] : []);

    const keyed = new Map();
    baseArticles.forEach((article) => {
      const key = _articleKey(article);
      if (!key) return;
      keyed.set(key, _normalizeArticle(article));
    });
    remoteArticles.forEach((article) => {
      const key = _articleKey(article);
      if (!key) return;
      keyed.set(key, _normalizeArticle(article));
    });

    IBlog.state.articles = Array.from(keyed.values());
    return IBlog.state.articles;
  }

  function refreshUI() {
    IBlog.Feed?.build?.();
    IBlog.Views?.buildMyArticles?.();
    IBlog.Views?.buildSaved?.();
    IBlog.Views?.buildMessages?.();
    IBlog.MyArticles?.load?.();
    window.RightRail?.refreshStats?.();
    window.RightRail?.refreshAuthors?.();
    IBlog.Analytics?.init?.();
    IBlog.Activity?.init?.();
    IBlog.Profile?.renderCurrentView?.();
    try {
      window.dispatchEvent(new CustomEvent('iblog:articles-refreshed'));
    } catch (_) {}
  }

  async function load() {
    if (!_currentUser()) {
      IBlog.state.articles = [];
      refreshUI();
      return IBlog.state.articles;
    }

    const data = await _request('list', { page: 1, pageSize: 100 });
    mergeArticles(data.articles || [], { replace: true });
    refreshUI();
    return IBlog.state.articles;
  }

  async function save(article) {
    const data = await _request('save', article);
    mergeArticles([_normalizeArticle(data.article, article)], { replace: false });
    refreshUI();
    return _normalizeArticle(data.article, article);
  }

  async function update(id, article) {
    const data = await _request('update', { id, ...article });
    mergeArticles([_normalizeArticle(data.article, article)], { replace: false });
    refreshUI();
    return _normalizeArticle(data.article, article);
  }

  async function remove(id) {
    const data = await _request('delete', { id });
    IBlog.state.articles = (IBlog.state.articles || []).filter((article) => String(article.id) !== String(id));
    IBlog.state.savedArticles = (IBlog.state.savedArticles || []).filter((article) => String(article.id) !== String(id));
    refreshUI();
    return data;
  }

  return { load, save, update, remove, mergeArticles, refreshUI };
})();

window.IBlogSavedSync = (() => {
  const API = 'backend/view/components/article/api-articles.php';

  function _fallbackUser() {
    if (window.IBlog?.state?.currentUser) return window.IBlog.state.currentUser;
    try {
      return JSON.parse(sessionStorage.getItem('user') || 'null');
    } catch (_) {
      return null;
    }
  }

  function _currentUser() {
    return window.IBlogSession?.getUser?.() || _fallbackUser();
  }

  async function _request(action, payload = {}) {
    const currentUser = _currentUser();
    const response = await fetch(API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin',
      body: JSON.stringify({
        action,
        ...(currentUser?.email ? { authorEmail: currentUser.email } : {}),
        ...payload,
      }),
    });
    const text = await response.text();
    if (!text.trim().startsWith('{')) {
      throw new Error('Saved articles request failed.');
    }
    const data = JSON.parse(text);
    if (!response.ok || !data.ok) {
      throw new Error(data.error || 'Saved articles request failed.');
    }
    return data;
  }

  function applySavedState(savedArticles = []) {
    const normalized = Array.isArray(savedArticles) ? savedArticles : [];
    normalized.forEach((article) => window.IBlogContentMeta?.enrichArticle?.(article));
    const savedIds = new Set(normalized.map((article) => String(article?.id ?? '')));
    IBlog.state.savedArticles = normalized;
    (IBlog.state.articles || []).forEach((article) => {
      const isSaved = savedIds.has(String(article?.id ?? ''));
      article._bookmarked = isSaved;
      article.bookmarked = isSaved;
      window.IBlogContentMeta?.enrichArticle?.(article);
    });
    return normalized;
  }

  async function load(options = {}) {
    if (!_currentUser()) {
      applySavedState([]);
      if (!options.quiet) IBlog.Views?.buildSaved?.();
      return [];
    }

    const data = await _request('saved_list');
    applySavedState(data.articles || []);
    if (!options.quiet) {
      IBlog.Views?.buildSaved?.();
      window.RightRail?.refreshStats?.();
      IBlog.Analytics?.init?.();
      IBlog.Activity?.init?.();
    }
    return IBlog.state.savedArticles;
  }

  async function toggle(articleId, saved) {
    const data = await _request('saved_toggle', { articleId, saved });
    applySavedState(data.articles || []);
    IBlog.Views?.buildSaved?.();
    window.RightRail?.refreshStats?.();
    IBlog.Analytics?.init?.();
    IBlog.Activity?.init?.();
    return data;
  }

  return { load, toggle, applySavedState };
})();

document.addEventListener('DOMContentLoaded', async () => {
  window.IBlogDataSanitizer?.run?.();

  const cachedUser = window.IBlogSession.getUser();
  const activeUser = await window.IBlogSession.syncFromServer({
    clearOnFailure: !!cachedUser,
  });

  if (activeUser) {
    if (activeUser.onboardingComplete === false && window.IBlogOnboarding?.start) {
      document.getElementById('dashboard').style.display = 'none';
      document.getElementById('landing-page').style.display = 'block';
      IBlogOnboarding.start(activeUser, {
        onComplete: () => {
          document.getElementById('landing-page').style.display = 'none';
          document.getElementById('dashboard').style.display = 'block';
          IBlog.Dashboard.enter();
        },
      });
      return;
    }

    document.getElementById('landing-page').style.display = 'none';
    document.getElementById('dashboard').style.display = 'block';
    IBlog.Dashboard.enter();
    return;
  }

  document.getElementById('dashboard').style.display = 'none';
  document.getElementById('landing-page').style.display = 'block';

  IBlog.Dashboard.initHero();
  IBlog.Dashboard.buildTicker();
  IBlog.Dashboard.buildLandingCarousel();

  const trendList = document.getElementById('trend-list');
  if (trendList) {
    trendList.innerHTML = IBlog.TRENDS.map(t => `
      <div class="trend-row" onclick="IBlog.Views.searchTopic('${t.topic}')">
        <span class="trend-num">#${t.rank}</span>
        <div style="font-size:18px">${t.icon}</div>
        <div class="trend-info">
          <strong>${t.topic}</strong>
          <small>${t.searches} searches</small>
        </div>
        <span class="trend-spike">${t.spike}</span>
      </div>
    `).join('');
  }

  setTimeout(() => {
    const exp = document.getElementById('explore-feed');
    if (exp) IBlog.Feed.build('trending', 'explore-feed');
  }, 100);
});
