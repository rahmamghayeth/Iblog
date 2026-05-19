// ============================================================
// MY-ARTICLES COMPONENT - IBlog
// Handles listing, editing, and deleting the current user's articles.
// ============================================================

window.IBlog = window.IBlog || {};

IBlog.MyArticles = (() => {
  function _storageKey() {
    const user = _getUser();
    return user ? `iblog_articles_${user.email}` : null;
  }

  function _getUser() {
    if (window.IBlog?.state?.currentUser) return window.IBlog.state.currentUser;
    try { return JSON.parse(sessionStorage.getItem('user')); }
    catch { return null; }
  }

  function _currentInitial(user) {
    return user?.initial || (user?.name ? user.name[0].toUpperCase() : 'A');
  }

  function _normalizeAuthor(value) {
    return String(value || '').trim().toLowerCase();
  }

  function _plainText(value) {
    return String(value || '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function _loadArticleIntoWriter(article) {
    if (!article) return false;

    window.IBlog?.Views?.buildCategorySelect?.();
    window.IBlog?.Writer?.init?.();

    if (window.IBlog?.Writer?.loadArticle?.(article)) {
      return true;
    }

    const title = document.getElementById('article-title');
    const editor = document.getElementById('article-editor');
    const rich = document.getElementById('article-editor-rich');
    const category = document.getElementById('article-cat');
    const tags = document.getElementById('article-tags');
    const image = document.getElementById('article-img');

    if (!title || !editor || !category || !tags || !image) return false;

    title.value = article.title || '';
    editor.value = article.body || '';
    editor.dataset.editId = String(article.id ?? '');
    editor.dataset.editStatus = String(article.status || 'published');
    tags.value = Array.isArray(article.tags) ? article.tags.join(', ') : String(article.tags || '');
    image.value = article.cover || article.img || '';

    const currentCategory = article.category || article.cat || 'General';
    if (Array.from(category.options || []).some((option) => option.value === currentCategory || option.textContent === currentCategory)) {
      category.value = currentCategory;
    }

    if (window.IBlog?.Templates?.setSelected) {
      window.IBlog.Templates.setSelected(article.templateId || null, { silent: true });
    }

    if (rich && window.IBlog?.Writer?.syncFromTextarea) {
      window.IBlog.Writer.syncFromTextarea();
    }

    window.IBlog?.Writer?.setMode?.('edit');
    window.IBlog?.Views?.refreshCoverPreview?.(image.value, image.value ? 'Cover image selected' : '');
    window.IBlog?.Views?.analyzeQuality?.();
    return true;
  }

  function _matchesCurrentUser(article, user = _getUser()) {
    if (!article || !user) return false;
    const userId = user.id ?? user.userId ?? null;
    const articleAuthorId = article.authorId ?? article.userId ?? null;
    const userEmail = _normalizeAuthor(user.email);
    const articleAuthorEmail = _normalizeAuthor(article.authorEmail);
    if (userId !== null && userId !== undefined && articleAuthorId !== null && articleAuthorId !== undefined) {
      return String(userId) === String(articleAuthorId);
    }
    if (userEmail && articleAuthorEmail && userEmail === articleAuthorEmail) return true;
    return false;
  }

  function _articlesFromState() {
    const user = _getUser();
    const list = window.IBlog?.state?.articles;
    if (!user || !Array.isArray(list)) return [];

    return list
      .filter(article => _matchesCurrentUser(article, user))
      .map(article => ({
        id: String(article.id ?? ''),
        title: article.title || 'Untitled',
        excerpt: article.excerpt || _plainText(article.body || '').substring(0, 120),
        body: article.body || '',
        category: article.category || article.cat || 'General',
        tags: article.tags || [],
        date: article.date || '',
        author: article.author || user.name || 'You',
        authorInitial: article.authorInitial || _currentInitial(user),
        cover: article.cover || article.img || '',
        readTime: article.readTime || '1 min',
        quality: article.quality || 'med',
        views: Number(article.views || 0),
        likes: Number(article.likes || 0),
        status: article.status || 'published',
      }));
  }

  function _readArticles() {
    const stateArticles = _articlesFromState();
    if (stateArticles.length) {
      _writeArticles(stateArticles);
      return stateArticles;
    }

    const key = _storageKey();
    if (!key) return [];

    try {
      const stored = sessionStorage.getItem(key);
      if (stored) {
        const parsed = JSON.parse(stored);
        const user = _getUser();
        const cleaned = Array.isArray(parsed)
          ? parsed.filter((article) => _matchesCurrentUser(article, user))
          : [];
        if (cleaned.length !== (Array.isArray(parsed) ? parsed.length : 0)) {
          _writeArticles(cleaned);
        }
        return cleaned;
      }
    } catch {}

    return [];
  }

  function _writeArticles(articles) {
    const key = _storageKey();
    if (!key) return;
    sessionStorage.setItem(key, JSON.stringify(articles));
  }

  function _esc(str) {
    if (!str) return '';
    const d = document.createElement('div');
    d.textContent = str;
    return d.innerHTML;
  }

  function _categoryIcon(cat = '') {
    const icons = {
      AI: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2a2 2 0 0 1 2 2c0 .74-.4 1.39-1 1.73V7h1a7 7 0 0 1 7 7h1a1 1 0 0 1 1 1v3a1 1 0 0 1-1 1h-1v1a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-1H2a1 1 0 0 1-1-1v-3a1 1 0 0 1 1-1h1a7 7 0 0 1 7-7h1V5.73A2 2 0 0 1 10 4a2 2 0 0 1 2-2z"/><circle cx="9" cy="14" r="1" fill="currentColor" stroke="none"/><circle cx="15" cy="14" r="1" fill="currentColor" stroke="none"/></svg>`,
      Technology: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>`,
      Science: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M9 3H5a2 2 0 0 0-2 2v4m6-6h10a2 2 0 0 1 2 2v4M9 3v18m0 0h10a2 2 0 0 0 2-2V9M9 21H5a2 2 0 0 1-2-2V9m0 0h18"/></svg>`,
      default: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>`,
    };
    return icons[cat] || icons.default;
  }

  function _statusMeta(article) {
    const isDraft = String(article?.status || 'published').toLowerCase() === 'draft';
    return {
      isDraft,
      label: isDraft ? 'Draft' : 'Published',
      className: isDraft ? 'is-draft' : 'is-live',
      actionLabel: isDraft ? 'Continue Draft' : 'Edit',
    };
  }

  function load() {
    const container = document.getElementById('my-articles-list');
    if (!container) return;
    _render(container, _readArticles());
  }

  function _updateStats(articles) {
    const totalViews = articles.reduce((sum, article) => sum + (article.views ?? 0), 0);
    const totalLikes = articles.reduce((sum, article) => sum + (article.likes ?? 0), 0);
    const fmt = (value) => value >= 1000 ? (value / 1000).toFixed(1) + 'k' : String(value);
    const el = (id) => document.getElementById(id);
    if (el('ma-count')) el('ma-count').textContent = articles.length;
    if (el('ma-views')) el('ma-views').textContent = fmt(totalViews);
    if (el('ma-likes')) el('ma-likes').textContent = fmt(totalLikes);
  }

  function _renderRows(articles) {
    return articles.map((article) => {
      const status = _statusMeta(article);
      return `
        <div class="my-article-row" data-id="${_esc(article.id)}">
          <div class="my-article-thumb" data-cat="${_esc(article.category ?? '')}">
            ${_categoryIcon(article.category)}
          </div>

          <div class="my-article-info">
            <div class="my-article-title-row">
              <div class="my-article-title">${_esc(article.title)}</div>
              <span class="my-article-status ${status.className}">${status.label}</span>
            </div>
            <div class="my-article-excerpt">${_esc(article.excerpt || 'No preview text yet.')}</div>
            <div class="my-article-meta">
              <span class="meta-item">
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                ${_esc(article.date ?? '')}
              </span>
              <span class="meta-item">
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                ${article.views ?? 0}
              </span>
              <span class="meta-item">
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
                ${article.likes ?? 0}
              </span>
              ${article.category ? `<span class="my-article-cat">${_esc(article.category)}</span>` : ''}
            </div>
          </div>

          <div class="my-article-actions">
            <button type="button" class="edit-btn-small" data-action="edit-article" data-article-id="${_esc(article.id)}">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
              ${status.actionLabel}
            </button>
            <button type="button" class="delete-btn-small" data-action="delete-article" data-article-id="${_esc(article.id)}">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
              Delete
            </button>
          </div>
        </div>`;
    }).join('');
  }

  function _renderSection(title, subtitle, articles) {
    return `
      <section class="my-article-section">
        <div class="my-article-section-head">
          <div>
            <h3>${title}</h3>
            <p>${subtitle}</p>
          </div>
          <span class="my-article-section-count">${articles.length}</span>
        </div>
        ${articles.length
          ? _renderRows(articles)
          : `<div class="my-article-section-empty">No ${title.toLowerCase()} yet.</div>`}
      </section>
    `;
  }

  function _render(container, articles) {
    _updateStats(articles);
    if (!articles.length) {
      container.innerHTML = `
        <div class="empty-articles">
          <div class="empty-articles__icon">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
          </div>
          <h3>No articles yet</h3>
          <p>Start writing and share your knowledge with the world.</p>
          <button class="btn btn-primary" onclick="IBlog.Dashboard.navigateTo('write')">
            Write your first article
          </button>
        </div>`;
      return;
    }

    const published = articles.filter((article) => String(article?.status || 'published').toLowerCase() !== 'draft');
    const drafts = articles.filter((article) => String(article?.status || 'published').toLowerCase() === 'draft');

    container.innerHTML = `
      <div class="my-articles-groups">
        ${_renderSection('Published', 'Stories that are visible in the feed and profile views.', published)}
        ${_renderSection('Drafts', 'Private work in progress saved from the writer.', drafts)}
      </div>`;
  }

  async function deleteArticle(id) {
    if (window.IBlog?.ArticleCard?.deleteArticle) {
      await window.IBlog.ArticleCard.deleteArticle(/^\d+$/.test(String(id)) ? Number(id) : id);
      return;
    }

    if (!confirm('Delete this article? This action cannot be undone.')) return;

    try {
      if (/^\d+$/.test(String(id)) && window.IBlogArticleSync?.remove) {
        await window.IBlogArticleSync.remove(Number(id));
        IBlog.utils?.toast?.('Article deleted.', 'info');
        return;
      }

      if (Array.isArray(window.IBlog?.state?.articles)) {
        const normalizedId = /^\d+$/.test(String(id)) ? Number(id) : id;
        window.IBlog.state.articles = window.IBlog.state.articles.filter(
          (article) => article.id !== normalizedId && String(article.id) !== String(id)
        );
        window.IBlog?.Feed?.build?.();
        window.IBlog?.Views?.buildMyArticles?.();
      }

      const articles = _readArticles().filter((article) => article.id !== id);
      _writeArticles(articles);

      const container = document.getElementById('my-articles-list');
      if (container) _render(container, articles);
      window.IBlog?.Analytics?.init?.();

      IBlog.utils?.toast?.('Article deleted.', 'info');
    } catch (error) {
      IBlog.utils?.toast?.(error?.message || 'Could not delete this article.', 'error');
    }
  }

  function editArticle(id) {
    if (window.IBlog?.ArticleCard?.editArticle) {
      window.IBlog.ArticleCard.editArticle(/^\d+$/.test(String(id)) ? Number(id) : id);
      return;
    }

    const article = _readArticles().find((item) => item.id === id);
    if (!article) return;

    if (window.IBlog?.Writer?.queueArticleEdit) {
      window.IBlog.Writer.queueArticleEdit(article);
    } else {
      sessionStorage.setItem('iblog_edit_article', JSON.stringify(article));
    }
    _loadArticleIntoWriter(article);
    IBlog.utils?.toast?.('Loading article for editing...', 'info');
    IBlog.Dashboard?.navigateTo('write');
    requestAnimationFrame(() => {
      _loadArticleIntoWriter(article);
      setTimeout(() => _loadArticleIntoWriter(article), 80);
    });
  }

  function publish(data) {
    const user = _getUser();
    if (!user) {
      IBlog.Auth?.toast('Please sign in to publish.', 'error');
      return false;
    }

    const article = {
      id: Date.now().toString(),
      title: data.title || 'Untitled',
      excerpt: _plainText(data.body || '').substring(0, 120) + '...',
      body: data.body || '',
      category: data.category || 'General',
      tags: data.tags || '',
      date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      views: 0,
      likes: 0,
      status: data.status || 'published',
    };

    const articles = [article, ..._readArticles()];
    _writeArticles(articles);
    window.IBlog?.Views?.buildMyArticles?.();
    load();
    window.IBlog?.Analytics?.init?.();
    IBlog.Auth?.toast(article.status === 'draft' ? 'Draft saved.' : 'Article published.', 'success');
    return true;
  }

  function saveEdit(id, updated) {
    const articles = _readArticles().map((article) =>
      article.id === id ? { ...article, ...updated } : article
    );
    _writeArticles(articles);
    window.IBlog?.Views?.buildMyArticles?.();
    load();
    window.IBlog?.Analytics?.init?.();
    IBlog.Auth?.toast('Article updated.', 'success');
    return true;
  }

  document.addEventListener('DOMContentLoaded', () => {
    const panel = document.getElementById('view-articles');
    if (panel && (!panel.classList.contains('view-panel') || panel.classList.contains('active'))) {
      load();
    }

    const observer = new MutationObserver(() => {
      const currentPanel = document.getElementById('view-articles');
      if (currentPanel && currentPanel.classList.contains('active')) load();
    });
    observer.observe(document.body, { attributes: true, subtree: true, attributeFilter: ['class', 'style'] });
  });

  document.addEventListener('click', (event) => {
    const actionButton = event.target.closest?.('[data-action][data-article-id]');
    if (!actionButton) return;

    const articleId = String(actionButton.dataset.articleId || '');
    if (!articleId) return;

    if (actionButton.dataset.action === 'edit-article') {
      editArticle(articleId);
      return;
    }

    if (actionButton.dataset.action === 'delete-article') {
      deleteArticle(articleId);
    }
  });

  return { load, delete: deleteArticle, edit: editArticle, publish, saveEdit };
})();

window.MyArticles = IBlog.MyArticles;
