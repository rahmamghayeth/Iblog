/* ══════════════════════════════════════════════════════════
   IBlog — Feed  v3
   Place in: js/feed.js
   ══════════════════════════════════════════════════════════ */

IBlog.Feed = (() => {

  const I = {
    heart:     `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>`,
    heartFill: `<svg viewBox="0 0 24 24" fill="currentColor" stroke="none"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>`,
    save:      `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>`,
    saveFill:  `<svg viewBox="0 0 24 24" fill="currentColor" stroke="none"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>`,
    love:      `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>`,
    insight:   `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18h6"/><path d="M10 22h4"/><path d="M12 2a7 7 0 0 1 7 7c0 2.38-1.19 4.47-3 5.74V17a2 2 0 0 1-2 2h-4a2 2 0 0 1-2-2v-2.26C6.19 13.47 5 11.38 5 9a7 7 0 0 1 7-7z"/></svg>`,
    helpful:   `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3H14z"/><path d="M7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"/></svg>`,
    share:     `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>`,
    eye:       `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>`,
    play:      `<svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18"><polygon points="5 3 19 12 5 21 5 3"/></svg>`,
    send:      `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>`,
    close:     `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`,
  };

  function iconHeart() { return I.heart; }
  function iconHeartFill() { return I.heartFill; }
  function _t(key, vars = {}) { return IBlog.I18n?.t?.(key, vars) || key; }

  function _escapeHtml(value) {
    return String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function _looksLikeRichHtml(value) {
    return /<(p|div|br|strong|b|em|i|u|span|mark|img|figure|figcaption|blockquote|h[1-6]|ul|ol|li)\b/i.test(String(value || ''));
  }

  function _safeStyle(styleText = '') {
    const safe = [];
    styleText.split(';').forEach((entry) => {
      const [rawProp, rawValue] = entry.split(':');
      const prop = String(rawProp || '').trim().toLowerCase();
      const value = String(rawValue || '').trim();
      if (!value) return;
      if (prop === 'color' || prop === 'background-color') {
        safe.push(`${prop}:${value}`);
      }
    });
    return safe.join(';');
  }

  function _sanitizeRichNode(node) {
    if (node.nodeType === Node.TEXT_NODE) {
      return _escapeHtml(node.textContent || '');
    }
    if (node.nodeType !== Node.ELEMENT_NODE) return '';

    const tag = node.tagName.toLowerCase();
    const allowed = new Set(['p', 'br', 'strong', 'b', 'em', 'i', 'u', 'span', 'mark', 'img', 'figure', 'figcaption', 'blockquote', 'h1', 'h2', 'h3', 'h4', 'ul', 'ol', 'li']);
    const children = Array.from(node.childNodes).map(_sanitizeRichNode).join('');

    if (!allowed.has(tag)) return children;
    if (tag === 'br') return '<br>';
    if (tag === 'img') {
      const src = String(node.getAttribute('src') || '').trim();
      if (!src || !/^(data:image\/|https?:\/\/|\/)/i.test(src)) return '';
      return `<img src="${_escapeHtml(src)}" alt="${_escapeHtml(node.getAttribute('alt') || 'Article image')}">`;
    }

    let attrs = '';
    if (tag === 'span' || tag === 'mark') {
      const style = _safeStyle(node.getAttribute('style') || '');
      if (style) attrs = ` style="${_escapeHtml(style)}"`;
    }

    return `<${tag}${attrs}>${children}</${tag}>`;
  }

  function _renderRichReaderBody(value) {
    const scratch = document.createElement('div');
    scratch.innerHTML = String(value || '');
    return Array.from(scratch.childNodes).map(_sanitizeRichNode).join('');
  }

  function _renderReaderBodyBlock(paragraph) {
    const trimmed = String(paragraph || '').trim();
    const imageMatch = trimmed.match(/^!\[([^\]]*)\]\(([^)]+)\)$/);

    if (imageMatch) {
      return `
        <figure class="reader-inline-image">
          <img src="${_escapeHtml(imageMatch[2])}" alt="${_escapeHtml(imageMatch[1] || 'Article image')}">
          ${imageMatch[1] ? `<figcaption>${_escapeHtml(imageMatch[1])}</figcaption>` : ''}
        </figure>`;
    }

    return `<p>${_escapeHtml(trimmed)}</p>`;
  }

  function _renderReaderBody(body) {
    const value = String(body || '').trim();
    if (!value) return '';
    if (_looksLikeRichHtml(value)) {
      return `<div class="reader-rich-body">${_renderRichReaderBody(value)}</div>`;
    }
    return value.split('\n\n').filter((paragraph) => paragraph.trim()).map(_renderReaderBodyBlock).join('');
  }

  const VIEWED_KEY = 'iblog_reader_viewed';
  const VIEW_COOLDOWN_MS = 30000;
  const FEED_BATCH_SIZE = 6;
  const _feedState = {
    currentTab: 'recommended',
    currentContainerId: 'feed-container',
    visibleCount: {
      recommended: FEED_BATCH_SIZE,
      latest: FEED_BATCH_SIZE,
      following: FEED_BATCH_SIZE,
    },
  };

  /* ── Filter ──────────────────────────────────────────── */
  function _sortByLatest(articles) {
    return [...articles].sort((a, b) => (Number(b?.id) || 0) - (Number(a?.id) || 0));
  }

  function _sortRecommended(articles) {
    const directMatchedIds = Array.isArray(window.IBlogRecommendState?.directMatchedIds)
      ? window.IBlogRecommendState.directMatchedIds.map((value) => String(value))
      : [];
    const recommendedIds = Array.isArray(window.IBlogRecommendState?.recommendedIds)
      ? window.IBlogRecommendState.recommendedIds.map((value) => String(value))
      : [];

    if (!directMatchedIds.length && !recommendedIds.length) {
      return _sortByLatest(articles);
    }

    const directRank = new Map(directMatchedIds.map((id, index) => [id, index]));
    const relatedRank = new Map(recommendedIds.map((id, index) => [id, index]));

    return [...articles].sort((a, b) => {
      const aId = String(a?.id ?? '');
      const bId = String(b?.id ?? '');
      const aDirect = directRank.has(aId);
      const bDirect = directRank.has(bId);

      if (aDirect !== bDirect) return aDirect ? -1 : 1;
      if (aDirect && bDirect) return directRank.get(aId) - directRank.get(bId);

      const aRelated = relatedRank.has(aId) ? relatedRank.get(aId) : Number.MAX_SAFE_INTEGER;
      const bRelated = relatedRank.has(bId) ? relatedRank.get(bId) : Number.MAX_SAFE_INTEGER;
      if (aRelated !== bRelated) return aRelated - bRelated;

      return (Number(b?.id) || 0) - (Number(a?.id) || 0);
    });
  }

  function _filterRecommendedArticles(articles) {
    const recommendedIds = Array.isArray(window.IBlogRecommendState?.recommendedIds)
      ? window.IBlogRecommendState.recommendedIds.map((value) => String(value))
      : [];

    if (!recommendedIds.length) {
      return [];
    }

    const recommendedSet = new Set(recommendedIds);
    return _sortRecommended(articles.filter((article) => recommendedSet.has(String(article?.id ?? ''))));
  }

  function _normalizeTab(tab = 'recommended') {
    const key = String(tab || 'recommended').trim().toLowerCase();
    if (key === 'foryou' || key === 'trending') return 'recommended';
    if (key === 'recommended' || key === 'latest' || key === 'following') return key;
    return 'recommended';
  }

  function _filter(tab) {
    tab = _normalizeTab(tab);
    const all = (IBlog.state.articles || []).filter(article => (article?.status || 'published') !== 'draft');
    if (tab === 'following') {
      const followingIds = Array.isArray(IBlog.state?.currentUser?.followingIds)
        ? IBlog.state.currentUser.followingIds.map((value) => String(value))
        : [];
      if (!followingIds.length) return [];
      return _sortByLatest(all.filter((article) => {
        const authorId = article?.authorId ?? article?.userId ?? null;
        return authorId !== null && followingIds.includes(String(authorId));
      }));
    }
    if (tab === 'latest') {
      return _sortByLatest(all);
    }
    return _filterRecommendedArticles(all);
  }

  function _currentVisibleCount(tab) {
    const normalizedTab = _normalizeTab(tab);
    return Math.max(FEED_BATCH_SIZE, Number(_feedState.visibleCount[normalizedTab] || FEED_BATCH_SIZE));
  }

  function _setVisibleCount(tab, count) {
    const normalizedTab = _normalizeTab(tab);
    _feedState.visibleCount[normalizedTab] = Math.max(FEED_BATCH_SIZE, Number(count || FEED_BATCH_SIZE));
  }

  function _updateLoadMoreButton(totalItems, shownItems, containerId = 'feed-container') {
    const button = document.getElementById('feed-load-more-btn');
    if (!button) return;

    if (containerId !== 'feed-container') {
      button.hidden = true;
      button.disabled = true;
      return;
    }

    const hasMore = shownItems < totalItems;
    button.hidden = !hasMore;
    button.disabled = !hasMore;
  }

  function _viewStorageKey() {
    return window.IBlogSession?.scopedKey?.(VIEWED_KEY) || VIEWED_KEY;
  }

  function _readViewedState() {
    try {
      const parsed = JSON.parse(sessionStorage.getItem(_viewStorageKey()) || '{}');
      if (Array.isArray(parsed)) {
        return parsed.reduce((acc, value) => {
          acc[String(value)] = 0;
          return acc;
        }, {});
      }
      return parsed && typeof parsed === 'object' ? parsed : {};
    } catch (_) {
      return {};
    }
  }

  function _writeViewedState(state) {
    try {
      sessionStorage.setItem(_viewStorageKey(), JSON.stringify(state && typeof state === 'object' ? state : {}));
    } catch (_) {}
  }

  function _applyViewsCount(id, views) {
    const article = (IBlog.state.articles || []).find((item) => String(item.id) === String(id));
    if (article) article.views = Number(views || 0);

    const formattedViews = IBlog.I18n?.formatNumber?.(views || 0) || String(views || 0);
    const localizedViews = _t('feed.views', { count: formattedViews });

    const cardViewsText = document.getElementById(`view-count-${id}`);
    if (cardViewsText) {
      const span = cardViewsText.querySelector('span');
      if (span) span.textContent = localizedViews;
    }

    const readerViewsText = document.getElementById(`reader-view-count-${id}`);
    if (readerViewsText) readerViewsText.textContent = localizedViews;

    const readerMetaViews = document.getElementById(`reader-meta-views-${id}`);
    if (readerMetaViews) readerMetaViews.textContent = localizedViews;

    const readerCoverViews = document.getElementById(`reader-cover-views-${id}`);
    if (readerCoverViews) readerCoverViews.textContent = localizedViews;

    IBlog.MyArticles?.load?.();
    window.RightRail?.refreshStats?.();
    IBlog.Analytics?.init?.();
  }

  function _registerView(id) {
    if (!/^\d+$/.test(String(id))) return;
    const articleId = String(id);
    const now = Date.now();
    const viewedState = _readViewedState();
    const lastViewedAt = Number(viewedState[articleId] || 0);
    if ((now - lastViewedAt) < VIEW_COOLDOWN_MS) return;

    viewedState[articleId] = now;
    _writeViewedState(viewedState);

    fetch('backend/view/components/article/api-articles.php', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin',
      body: JSON.stringify({ action: 'view_increment', articleId: Number(id) }),
    })
      .then((response) => response.json())
      .then((payload) => {
        if (!payload?.ok) return;
        _applyViewsCount(id, Number(payload.views || 0));
      })
      .catch(() => {
        const nextState = _readViewedState();
        delete nextState[articleId];
        _writeViewedState(nextState);
      });
  }

  /* ══════════════════════════════════════════════════════
     build
     ══════════════════════════════════════════════════════ */
  function build(tab = _feedState.currentTab, containerId = 'feed-container') {
    const normalizedTab = _normalizeTab(tab);
    const container = document.getElementById(containerId);
    if(!container) return;
    _feedState.currentTab = normalizedTab;
    _feedState.currentContainerId = containerId;
    container.innerHTML = '';
    const articles = _filter(normalizedTab);
    if (!articles.length) {
      container.innerHTML = `
        <div class="empty-state">
          <div class="emoji">📝</div>
          <p>${_t('feed.empty')}</p>
        </div>`;
      _updateLoadMoreButton(0, 0, containerId);
      return;
    }

    const visibleCount = Math.min(_currentVisibleCount(normalizedTab), articles.length);
    const visibleArticles = articles.slice(0, visibleCount);

    const fallbackText = (value) => String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');

    visibleArticles.forEach((article,i) => {
      try {
        container.appendChild(IBlog.ArticleCard.render(article,i));
      } catch (err) {
        console.error('Feed card render failed:', article?.id, err);
        const AC = IBlog.ArticleCard || {};
        const icons = AC.SVG || {};
        const fallback = document.createElement('div');
        fallback.className = 'article-card';
        fallback.dataset.id = article?.id || `fallback-${i}`;
        AC.hydrateSocialState?.(article);
        const coverImage = article?.cover || article?.img || '';
        const safeOpenReaderId = JSON.stringify(article?.id);
        const authorProfilePayload = encodeURIComponent(JSON.stringify({
          id: article?.authorId ?? null,
          name: article?.author || 'Anonymous',
          email: article?.authorEmail || '',
          avatar: article?.authorAvatar || '',
          initial: (article?.author || 'A').slice(0, 1).toUpperCase(),
        }));
        const commentCount = Array.isArray(article?.comments) ? article.comments.length : 0;
        const repostCount = Number(article?.reposts || 0);
        const bookmarkLabel = article?._bookmarked ? 'Saved' : 'Save';
        fallback.innerHTML = `
          ${coverImage ? `
            <div class="card-cover" style="background-image:url('${fallbackText(coverImage)}')"
                 onclick="IBlog.Feed.openReader(${safeOpenReaderId})">
              <div class="card-cover-overlay"></div>
            </div>` : ''}
          <div class="card-body">
            <div class="card-header">
              <div class="card-avatar" style="background:${IBlog.ArticleCard?.avatarColor?.(i) || 'var(--accent)'}">
                ${fallbackText((article?.author || 'A').slice(0, 1).toUpperCase())}
              </div>
              <div style="cursor:pointer"
                   data-profile="${fallbackText(authorProfilePayload)}"
                   onclick="IBlog.Profile?.openUserProfileFromElement?.(this)">
                <div class="card-author">${fallbackText(article?.author || 'Anonymous')}</div>
                <div class="card-date">${fallbackText(article?.date || '')}</div>
              </div>
              <span class="card-cat">${fallbackText(article?.cat || article?.category || 'General')}</span>
            </div>
            <div class="card-story-grid">
              <div class="card-story-main">
                <div class="card-title" onclick="IBlog.Feed.openReader(${safeOpenReaderId})">${fallbackText(article?.title || 'Untitled article')}</div>
                <div class="card-excerpt">${fallbackText(article?.excerpt || '')}</div>
              </div>
            </div>
            <div class="card-meta">
              <span class="read-time">${fallbackText(article?.readTime || '3 min')}</span>
            </div>

            <button class="pod-toggle-btn" onclick="IBlog.ArticleCard?.togglePodcast?.(${safeOpenReaderId},this)">
              <span class="pod-icon">${icons.mic || ''}</span>
              <span id="pod-label-${article?.id}">${_t('feed.listenPodcast')}</span>
            </button>
            <div class="podcast-player-inline" id="pod-${article?.id}" style="display:none;margin-bottom:12px"></div>

            <div class="interact-bar">
              <button class="interact-btn ${article?._bookmarked ? 'bookmarked' : ''}"
                      id="bookmark-btn-${article?.id}"
                      onclick="IBlog.ArticleCard?.toggleBookmark?.(${safeOpenReaderId})">
                ${article?._bookmarked ? (icons.saveFill || icons.save || '🔖') : (icons.save || '🔖')}
                <span id="bookmark-label-${article?.id}">${bookmarkLabel}</span>
              </button>
              <div class="interact-btn interact-stat" id="view-count-${article?.id}">
                ${icons.eye || '👁'}
                <span>${fallbackText(_t('feed.views', { count: IBlog.I18n?.formatNumber?.(article?.views || 0) || String(article?.views || 0) }))}</span>
              </div>
              <button class="interact-btn" onclick="IBlog.ArticleCard?.toggleComments?.(${safeOpenReaderId})">
                ${icons.comment || '💬'}
                <span id="comment-count-${article?.id}">${commentCount}</span>
              </button>
              <button class="interact-btn ${article?._reposted ? 'reposted' : ''}"
                      id="repost-btn-${article?.id}"
                      onclick="IBlog.ArticleCard?.toggleRepost?.(${safeOpenReaderId})">
                ${icons.repost || '↻'}
                <span id="repost-count-${article?.id}">${repostCount}</span>
              </button>
              <div class="share-wrapper">
                <button class="interact-btn" onclick="IBlog.ArticleCard?.toggleShareMenu?.(${safeOpenReaderId})">
                  ${icons.share || '↗'} ${_t('actions.share')}
                </button>
                <div class="share-menu" id="share-menu-${article?.id}">
                  <button onclick="IBlog.ArticleCard?.shareTo?.('twitter',${safeOpenReaderId})">X / Twitter</button>
                  <button onclick="IBlog.ArticleCard?.shareTo?.('linkedin',${safeOpenReaderId})">LinkedIn</button>
                  <button onclick="IBlog.ArticleCard?.shareTo?.('copy',${safeOpenReaderId})">${_t('actions.share')} link</button>
                </div>
              </div>
            </div>
          </div>`;
        container.appendChild(fallback);
      }
    });

    _updateLoadMoreButton(articles.length, visibleArticles.length, containerId);
  }

  function loadMore() {
    const nextCount = _currentVisibleCount(_feedState.currentTab) + FEED_BATCH_SIZE;
    _setVisibleCount(_feedState.currentTab, nextCount);
    build(_feedState.currentTab, _feedState.currentContainerId);
  }

  /* ══════════════════════════════════════════════════════
     openReader
     ══════════════════════════════════════════════════════ */
  function openReader(id) {
    const article = (IBlog.state.articles||[]).find(a => a.id === id || String(a.id) === String(id));
    if(!article) return;
    _registerView(id);
    const displayArticle = IBlog.I18n?.localizeArticle?.(article) || article;
    const overlay = document.getElementById('article-reader-overlay');
    const content = document.getElementById('article-reader-content');
    if(!overlay||!content) return;

    const AC      = IBlog.ArticleCard;
    const idx     = IBlog.state.articles.indexOf(article);
    const color   = AC ? AC.avatarColor(idx) : '#b8960c';
    AC?.hydrateSocialState?.(article);
    const initial = (displayArticle.author || article.author || 'A')[0].toUpperCase();
    const authorProfilePayload = encodeURIComponent(JSON.stringify({
      id: article.authorId ?? null,
      name: article.author || 'Anonymous',
      email: article.authorEmail || '',
      avatar: article.authorAvatar || '',
      initial,
    }));
    const readerAvatarStyle = article.authorAvatar
      ? `background-image:url('${String(article.authorAvatar).replace(/'/g, '&#39;')}');background-size:cover;background-position:center;background-color:transparent;cursor:pointer`
      : `background:${color};cursor:pointer`;
    const hasCover = !!(article.cover||article.img);
    const comments = article.comments||[];

    const localizedViews = _t('feed.views', {
      count: IBlog.I18n?.formatNumber?.(article.views || 0) || String(article.views || 0),
    });

    content.innerHTML = `
      <div class="article-reader">
        <div class="reader-progress-bar">
          <div class="reader-progress-fill" id="reader-progress-fill"></div>
        </div>
        <button class="reader-close" onclick="IBlog.Feed.closeReader()">${I.close}</button>

        ${hasCover ? `
        <div class="reader-cover" style="background-image:url('${article.cover||article.img}')">
          <div class="reader-cover-overlay"></div>
          <div class="reader-cover-meta">
            <div class="reader-cat-badge">${displayArticle.cat||displayArticle.category||article.cat||article.category||'General'}</div>
            <div class="reader-cover-title">${displayArticle.title || article.title}</div>
            <div class="reader-cover-byline">
              <span>${displayArticle.author||article.author||''}</span><span>·</span>
              <span>${displayArticle.date||article.date||''}</span><span>·</span>
              <span>${displayArticle.readTime||article.readTime||_t('misc.read', { count: 5 })}</span><span>·</span>
              <span id="reader-cover-views-${id}">${localizedViews}</span>
            </div>
          </div>
        </div>` : `
        <div class="reader-header-no-cover">
          <div class="reader-cat-badge">${displayArticle.cat||displayArticle.category||article.cat||article.category||'General'}</div>
          <div class="reader-cover-title">${displayArticle.title || article.title}</div>
        </div>`}

        <div class="reader-body">

          <!-- Author + actions -->
          <div class="reader-author-row">
            <div class="reader-author-avatar" style="${readerAvatarStyle}"
                 data-profile="${authorProfilePayload.replace(/"/g, '&quot;')}"
                 onclick="IBlog.Profile?.openUserProfileFromElement?.(this)">${article.authorAvatar ? '' : initial}</div>
            <div class="reader-author-info" style="cursor:pointer"
                 data-profile="${authorProfilePayload.replace(/"/g, '&quot;')}"
                 onclick="IBlog.Profile?.openUserProfileFromElement?.(this)">
              <strong>${displayArticle.author||article.author||'Anonymous'}</strong>
              <small>${displayArticle.date||article.date||''} · ${displayArticle.readTime||article.readTime||_t('misc.read', { count: 5 })} · <span id="reader-meta-views-${id}">${localizedViews}</span></small>
            </div>
            <div class="reader-actions">
              <button class="reader-action-btn ${article._liked?'active-like':''}"
                      id="reader-like-btn-${id}"
                      onclick="IBlog.Feed.readerLike(${id})">
                ${article._liked?I.heartFill:I.heart}
                <span id="reader-like-count-${id}">${article.likes||0}</span>
              </button>
              <button class="reader-action-btn ${article._bookmarked?'active-save':''}"
                      id="reader-save-btn-${id}"
                      onclick="IBlog.ArticleCard.toggleBookmark(${id})">
                ${article._bookmarked?I.saveFill:I.save}
                <span>${article._bookmarked ? _t('actions.saved') : _t('actions.save')}</span>
              </button>
              <div class="reader-action-btn reader-action-stat">
                ${I.eye}
                <span id="reader-view-count-${id}">${localizedViews}</span>
              </div>
              <button class="reader-action-btn" onclick="IBlog.Feed.readerShare(${id})">
                ${I.share} ${_t('actions.share')}
              </button>
            </div>
          </div>

          <!-- Podcast player -->
          <div class="reader-podcast">
            <button class="podcast-icon-btn" id="reader-play-btn-${id}"
                    onclick="IBlog.Podcast.toggle(${id})">
              ${I.play}
            </button>
            <div class="podcast-info">
              <strong>${displayArticle.title || article.title}</strong>
              <small>Web Speech API · ${displayArticle.readTime||article.readTime||_t('misc.read', { count: 5 })}</small>
            </div>
            <div class="podcast-voice-btns">
              <button class="voice-btn active" onclick="IBlog.Podcast.setVoice('female',this)">Female</button>
              <button class="voice-btn" onclick="IBlog.Podcast.setVoice('male',this)">Male</button>
            </div>
          </div>

          ${(() => {
            const tplHTML = IBlog.Templates.renderForReader(article);
            if (tplHTML) return `<div class="reader-tpl-wrap">${tplHTML}</div>`;
            return `<div class="reader-text">${_renderReaderBody(displayArticle.body||displayArticle.excerpt||article.body||article.excerpt||'')}</div>`;
          })()}

          <!-- Tags -->
          ${(displayArticle.tags||article.tags||[]).length ? `
          <div class="reader-tags">
            ${(displayArticle.tags||article.tags||[]).map(t=>`<span class="reader-tag" onclick="IBlog.Views.searchTopic('${t}')">${t}</span>`).join('')}
          </div>` : ''}

          <!-- Comments -->
          <div class="reader-comments">
            <div class="reader-comments-title">
              ${_t('actions.comment')} <span id="reader-comment-count-${id}">(${comments.length})</span>
            </div>
            <div class="reader-comment-input-row">
              <textarea class="reader-comment-input"
                        id="reader-comment-input-${id}"
                        placeholder="${_t('comments.add')}" rows="2"
                        onkeydown="if(event.key==='Enter'&&!event.shiftKey){event.preventDefault();IBlog.Feed.postReaderComment(${id});}">
              </textarea>
              <button class="reader-comment-send" onclick="IBlog.Feed.postReaderComment(${id})">${I.send}</button>
            </div>
            <div class="reader-comment-list" id="reader-comment-list-${id}">
              ${comments.map(c=>_readerCommentHTML(c)).join('')}
            </div>
          </div>

        </div>
      </div>`;

    overlay.classList.add('open');
    document.body.style.overflow = 'hidden';

    overlay.onscroll = () => {
      const max = overlay.scrollHeight - overlay.clientHeight;
      const pct = max > 0 ? (overlay.scrollTop/max)*100 : 0;
      const bar = document.getElementById('reader-progress-fill');
      if(bar) bar.style.width = pct+'%';
    };
  }

  /* ── Close ───────────────────────────────────────────── */
  function closeReader() {
    const overlay = document.getElementById('article-reader-overlay');
    if(overlay){overlay.classList.remove('open');overlay.onscroll=null;}
    document.body.style.overflow = '';
    IBlog.Podcast.stop();
  }

  /* ── Reader like (separate from reaction, classic like) ─ */
  async function readerLike(id) {
    const article=(IBlog.state.articles||[]).find(a=>a.id===id || String(a.id)===String(id));
    if(!article) return;

    const applyState = (liked, likesCount) => {
      article._liked = !!liked;
      article.liked = !!liked;
      article.likes = Math.max(0, Number(likesCount || 0));
      const btn=document.getElementById(`reader-like-btn-${id}`);
      if(btn){btn.className=`reader-action-btn ${article._liked?'active-like':''}`;btn.innerHTML=(article._liked?I.heartFill:I.heart)+`<span id="reader-like-count-${id}">${article.likes}</span>`;}
      const cardBtn=document.getElementById(`like-btn-${id}`);
      if(cardBtn){cardBtn.className=`interact-btn ${article._liked?'active-like':''}`;cardBtn.innerHTML=(article._liked?I.heartFill:I.heart)+`<span id="like-count-${id}">${article.likes}</span>`;}
      const fc=document.getElementById(`like-count-${id}`);
      if(fc) fc.textContent=article.likes;
    };

    if(/^\d+$/.test(String(id))){
      try{
        const response = await fetch('backend/view/components/article/api-articles.php', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'like_toggle',
            articleId: Number(id),
            liked: !article._liked,
            authorEmail: IBlog.state.currentUser?.email || '',
          }),
        });
        const payload = await response.json();
        if(!response.ok || !payload.ok) throw new Error(payload.error || 'Could not update like.');
        applyState(payload.liked, payload.likesCount);
        window.RightRail?.refreshStats?.();
        window.RightRail?.refreshAuthors?.();
        IBlog.Analytics?.init?.();
        if (payload.liked) {
          IBlog.Notifications?.push?.({
            messageKey: 'notifications.likedArticle',
            messageVars: { title: String(article.title || 'this article') },
          }, 'like');
        }
        IBlog.utils.toast(payload.liked?'Liked!':'Like removed');
        return;
      }catch(error){
        IBlog.utils.toast(error?.message || 'Could not update like.', 'error');
        return;
      }
    }

    applyState(!article._liked, Math.max(0,(article.likes||0)+(!article._liked?1:-1)));
    if (article._liked) {
      IBlog.Notifications?.push?.({
        messageKey: 'notifications.likedArticle',
        messageVars: { title: String(article.title || 'this article') },
      }, 'like');
    }
    IBlog.utils.toast(article._liked?'Liked!':'Like removed');
  }

  function readerShare(id) {
    const a=(IBlog.state.articles||[]).find(x=>x.id===id);
    const title=a?a.title:'IBlog Article';
    if(navigator.share) navigator.share({title,url:window.location.href});
    else navigator.clipboard.writeText(window.location.href).then(()=>IBlog.utils.toast('Link copied!','success'));
  }

  /* ── Reader comments ─────────────────────────────────── */
  async function postReaderComment(id) {
    const input=document.getElementById(`reader-comment-input-${id}`);
    const list=document.getElementById(`reader-comment-list-${id}`);
    const counter=document.getElementById(`reader-comment-count-${id}`);
    if(!input||!list) return;
    const text=input.value.trim();
    if(!text) return;
    const user=IBlog.state.currentUser||{name:'You'};
    const comment={author:user.name,text,createdAt:new Date().toISOString()};
    const article=(IBlog.state.articles||[]).find(a=>String(a.id)===String(id));
    if(!article) return;

    let finalComment = comment;
    if(/^\d+$/.test(String(id))){
      try{
        const response = await fetch('backend/view/components/article/api-articles.php', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'comment_add',
            articleId: Number(id),
            body: text,
            authorEmail: user.email || '',
          }),
        });
        const payload = await response.json();
        if(!response.ok || !payload.ok) throw new Error(payload.error || 'Could not post comment.');
        finalComment = payload.comment || comment;
        article.comments = [...(article.comments || []), finalComment];
        window.IBlogCommentStore?.set?.(id, article.comments);
      }catch(error){
        IBlog.utils.toast(error?.message || 'Could not post comment.', 'error');
        return;
      }
    } else {
      article.comments=window.IBlogCommentStore?.add?.(id, comment) || [...(article.comments||[]), comment];
    }

    if(counter) counter.textContent=`(${article.comments.length})`;
    const fc=document.getElementById(`comment-count-${id}`);
    if(fc) fc.textContent=article.comments.length;
    const fl=document.getElementById(`comment-list-${id}`);
    if(fl){fl.insertAdjacentHTML('beforeend',IBlog.ArticleCard._commentHTML(finalComment));fl.scrollTop=fl.scrollHeight;}
    list.insertAdjacentHTML('beforeend',_readerCommentHTML(finalComment));
    list.scrollTop=list.scrollHeight;
    input.value='';
    window.RightRail?.refreshStats?.();
    IBlog.Analytics?.init?.();
    IBlog.Activity?.init?.();
    IBlog.Notifications?.push?.({
      messageKey: 'notifications.commentedArticle',
      messageVars: { title: String(article.title || 'your article') },
    }, 'comment');
    IBlog.utils.toast('Comment posted!','success');
  }

  function _readerCommentHTML(c) {
    const esc = (value) => String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
    return `<div class="reader-comment-item"><div class="reader-comment-avatar">${esc((c.author||'U')[0].toUpperCase())}</div><div class="reader-comment-bubble"><strong>${esc(c.author||'User')}</strong><p>${esc(c.text)}</p></div></div>`;
  }

  /* ── Compose ─────────────────────────────────────────── */
  function expandCompose() {
    const tools=document.getElementById('composeTools');
    if(tools) tools.style.display='flex';
  }

  function publishPost() {
    const input=document.getElementById('composeInput');
    if(!input) return;
    const text=input.value.trim();
    if(!text){IBlog.utils.toast('Write something first!');return;}
    const user=IBlog.state.currentUser||{name:'You'};
    IBlog.state.articles.unshift({
      id:Date.now(),author:user.name,authorInitial:(user.initial||user.name?.[0]||'Y').toUpperCase(),
      authorAvatar:user.avatar||'',authorEmail:user.email||'',authorId:user.id??null,userId:user.id??null,cat:'General',
      title:text.length>80?text.slice(0,80)+'…':text,
      excerpt:text,body:text,readTime:'1 min',
      likes:0,comments:[],quality:50,tags:[],
      date:new Date().toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'}),
    });
    input.value='';
    const tools=document.getElementById('composeTools');
    if(tools) tools.style.display='none';
    const activeTab = String(document.querySelector('.feed-tab.active')?.dataset?.feedTab || 'recommended');
    build(activeTab);
    IBlog.utils.toast('Post published!','success');
  }

  return {
    build, openReader, closeReader,
    readerLike, readerShare, postReaderComment,
    expandCompose, publishPost, loadMore,
    iconHeart, iconHeartFill,
  };

})();
