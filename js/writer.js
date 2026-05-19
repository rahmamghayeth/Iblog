IBlog.Writer = (() => {
  let _mode = 'edit';
  let _debounce = null;
  let _toolbar = null;
  let _imgInput = null;
  let _imgTarget = null;
  let _savedRange = null;
  let _selectionBound = false;
  let _queuedArticle = null;

  function _hiddenEditor() {
    return document.getElementById('article-editor');
  }

  function _richEditor() {
    return document.getElementById('article-editor-rich');
  }

  function _escapeHtml(value) {
    return String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function _looksLikeHtml(value) {
    return /<(p|div|br|strong|b|em|i|u|span|mark|img|figure|figcaption|blockquote|h[1-6]|ul|ol|li)\b/i.test(String(value || ''));
  }

  function _plainTextFromHtml(value) {
    const scratch = document.createElement('div');
    scratch.innerHTML = String(value || '');
    return String(scratch.textContent || scratch.innerText || '')
      .replace(/\s+\n/g, '\n')
      .replace(/\n{3,}/g, '\n\n')
      .replace(/[ \t]{2,}/g, ' ')
      .trim();
  }

  function _convertLegacyToHtml(value) {
    const blocks = String(value || '')
      .split(/\n{2,}/)
      .map((block) => block.trim())
      .filter(Boolean);

    if (!blocks.length) return '';

    return blocks.map((block) => {
      const imageMatch = block.match(/^!\[([^\]]*)\]\(([^)]+)\)$/);
      if (imageMatch) {
        return `<figure><img src="${_escapeHtml(imageMatch[2])}" alt="${_escapeHtml(imageMatch[1] || 'Article image')}">${imageMatch[1] ? `<figcaption>${_escapeHtml(imageMatch[1])}</figcaption>` : ''}</figure>`;
      }
      if (block.startsWith('## ')) return `<h2>${_escapeHtml(block.slice(3))}</h2>`;
      if (block.startsWith('# ')) return `<h1>${_escapeHtml(block.slice(2))}</h1>`;
      if (block.startsWith('> ')) return `<blockquote>${_escapeHtml(block.slice(2))}</blockquote>`;
      return `<p>${_escapeHtml(block).replace(/\n/g, '<br>')}</p>`;
    }).join('');
  }

  function _normalizeRichHtml(value) {
    const scratch = document.createElement('div');
    scratch.innerHTML = String(value || '').trim();
    scratch.querySelectorAll('div').forEach((node) => {
      const parent = node.parentElement;
      if (!parent || parent === scratch || parent.tagName === 'DIV') {
        const replacement = document.createElement('p');
        replacement.innerHTML = node.innerHTML || '<br>';
        node.replaceWith(replacement);
      }
    });
    return scratch.innerHTML.trim();
  }

  function _syncTextareaFromRich() {
    const hidden = _hiddenEditor();
    const rich = _richEditor();
    if (!hidden || !rich) return;
    hidden.value = _normalizeRichHtml(rich.innerHTML);
  }

  function _syncRichFromTextarea(force = false) {
    const hidden = _hiddenEditor();
    const rich = _richEditor();
    if (!hidden || !rich) return;
    if (!force && rich.dataset.hydrated === '1') return;
    const value = String(hidden.value || '').trim();
    rich.innerHTML = value ? (_looksLikeHtml(value) ? value : _convertLegacyToHtml(value)) : '';
    rich.dataset.hydrated = '1';
  }

  function _scheduleRender() {
    if (_mode !== 'preview') return;
    clearTimeout(_debounce);
    _debounce = setTimeout(_renderNow, 120);
  }

  function _saveSelection() {
    const rich = _richEditor();
    const selection = window.getSelection();
    if (!rich || !selection || !selection.rangeCount) return;
    const range = selection.getRangeAt(0);
    if (!rich.contains(range.commonAncestorContainer)) return;
    _savedRange = range.cloneRange();
  }

  function _restoreSelection() {
    if (!_savedRange) return false;
    const selection = window.getSelection();
    if (!selection) return false;
    selection.removeAllRanges();
    selection.addRange(_savedRange);
    return true;
  }

  function _hideToolbar() {
    if (_toolbar) _toolbar.style.display = 'none';
  }

  function _showToolbarFromRect(rect) {
    if (!_toolbar || !rect) return;
    const sy = window.scrollY;
    const sx = window.scrollX;
    const height = _toolbar.offsetHeight || 42;
    const width = _toolbar.offsetWidth || 300;
    let top = rect.top + sy - height - 12;
    let left = rect.left + sx + (rect.width / 2) - (width / 2);
    if (top < sy + 8) top = rect.bottom + sy + 10;
    if (left < sx + 8) left = sx + 8;
    if (left + width > sx + window.innerWidth - 8) left = sx + window.innerWidth - width - 8;
    _toolbar.style.top = `${top}px`;
    _toolbar.style.left = `${left}px`;
    _toolbar.style.display = 'flex';
  }

  function _updateToolbarState() {
    if (!_toolbar) return;
    ['bold', 'italic', 'underline'].forEach((cmd) => {
      _toolbar.querySelector(`[data-cmd="${cmd}"]`)
        ?.classList.toggle('active', document.queryCommandState(cmd));
    });
  }

  function _handleSelectionChange() {
    const rich = _richEditor();
    const selection = window.getSelection();
    if (!rich || !selection || !selection.rangeCount) {
      _hideToolbar();
      return;
    }

    const range = selection.getRangeAt(0);
    if (!rich.contains(range.commonAncestorContainer) || selection.isCollapsed) {
      _hideToolbar();
      return;
    }

    _showToolbarFromRect(range.getBoundingClientRect());
    _updateToolbarState();
  }

  function _patchTemplateSelector() {
    if (IBlog.Templates?._writerPatched || !IBlog.Templates) return;
    IBlog.Templates._writerPatched = true;
    const original = IBlog.Templates.selectTemplate.bind(IBlog.Templates);
    IBlog.Templates.selectTemplate = function(id, el) {
      original(id, el);
      _scheduleRender();
    };
  }

  function _ensureRichEditor() {
    const hidden = _hiddenEditor();
    const rich = _richEditor();
    if (!hidden || !rich) return;

    _syncRichFromTextarea();

    if (rich.dataset.bound === '1') return;
    rich.dataset.bound = '1';

    rich.addEventListener('input', () => {
      _syncTextareaFromRich();
      window.IBlog?.Views?.analyzeQuality?.();
      _scheduleRender();
    });
    rich.addEventListener('focus', () => {
      _saveSelection();
      _handleSelectionChange();
    });
    rich.addEventListener('mouseup', () => {
      _saveSelection();
      _handleSelectionChange();
    });
    rich.addEventListener('keyup', () => {
      _saveSelection();
      _handleSelectionChange();
    });
    rich.addEventListener('blur', () => {
      setTimeout(() => {
        if (!_toolbar?.matches(':focus-within')) _hideToolbar();
      }, 100);
    });
    rich.addEventListener('paste', (event) => {
      event.preventDefault();
      const text = event.clipboardData?.getData('text/plain') || '';
      document.execCommand('insertText', false, text);
    });

    if (!_selectionBound) {
      document.addEventListener('mousedown', (event) => {
        if (_toolbar?.contains(event.target) || rich.contains(event.target)) return;
        _hideToolbar();
      });
      document.addEventListener('selectionchange', () => {
        if (document.activeElement === rich || rich.contains(document.activeElement)) {
          _saveSelection();
          _handleSelectionChange();
        }
      });
      _selectionBound = true;
    }
  }

  function init() {
    _buildFloatingToolbar();
    _buildImageInput();
    _ensureRichEditor();
    _patchTemplateSelector();
    document.execCommand?.('defaultParagraphSeparator', false, 'p');

    window.IBlog?.Views?.refreshCoverPreview?.(
      document.getElementById('article-img')?.value?.trim() || '',
      document.getElementById('writer-cover-name')?.textContent?.trim() || ''
    );

    const title = document.getElementById('article-title');
    const category = document.getElementById('article-cat');
    if (title && title.dataset.bound !== '1') {
      title.dataset.bound = '1';
      title.addEventListener('input', _scheduleRender);
    }
    if (category && category.dataset.bound !== '1') {
      category.dataset.bound = '1';
      category.addEventListener('change', _scheduleRender);
    }

    const pending = _consumeQueuedArticle();
    if (pending) {
      loadArticle(pending);
    } else {
      _syncRichFromTextarea(true);
      if (_mode === 'preview') _renderNow();
    }
  }

  function setMode(mode) {
    _mode = mode;
    const hidden = _hiddenEditor();
    const rich = _richEditor();
    const title = document.getElementById('article-title');
    const meta = document.querySelector('.writer-meta');
    const qa = document.querySelector('.quality-analyzer');
    const pane = document.getElementById('writer-preview-pane');
    const hint = document.querySelector('.writer-editor-hint');
    const editBtn = document.getElementById('wtr-edit-btn');
    const previewBtn = document.getElementById('wtr-preview-btn');

    if (mode === 'preview') {
      _syncTextareaFromRich();
      if (rich) rich.style.display = 'none';
      if (hidden) hidden.style.display = 'none';
      if (title) title.style.display = 'none';
      if (meta) meta.style.display = 'none';
      if (qa) qa.style.display = 'none';
      if (hint) hint.style.display = 'none';
      if (pane) pane.style.display = 'block';
      editBtn?.classList.remove('active');
      previewBtn?.classList.add('active');
      _hideToolbar();
      _renderNow();
      return;
    }

    if (rich) rich.style.display = '';
    if (hidden) hidden.style.display = 'none';
    if (title) title.style.display = '';
    if (meta) meta.style.display = '';
    if (qa) qa.style.display = '';
    if (hint) hint.style.display = '';
    if (pane) pane.style.display = 'none';
    previewBtn?.classList.remove('active');
    editBtn?.classList.add('active');
    _hideToolbar();
  }

  function _renderPlainBlock(paragraph, index) {
    const trimmed = String(paragraph || '').trim();
    const imageMatch = trimmed.match(/^!\[([^\]]*)\]\(([^)]+)\)$/);
    if (imageMatch) {
      return `
        <figure class="wtr-plain-inline-image">
          <img src="${_escapeHtml(imageMatch[2])}" alt="${_escapeHtml(imageMatch[1] || 'Article image')}">
          ${imageMatch[1] ? `<figcaption>${_escapeHtml(imageMatch[1])}</figcaption>` : ''}
        </figure>`;
    }
    if (trimmed.startsWith('## ')) return `<h2 class="wtr-plain-h2">${_escapeHtml(trimmed.slice(3))}</h2>`;
    if (trimmed.startsWith('# ')) return `<h1 class="wtr-plain-h1">${_escapeHtml(trimmed.slice(2))}</h1>`;
    if (trimmed.startsWith('> ')) return `<blockquote>${_escapeHtml(trimmed.slice(2))}</blockquote>`;
    return `<p class="wtr-plain-p ${index === 0 ? 'wtr-lede' : ''}">${_escapeHtml(trimmed)}</p>`;
  }

  function _renderNow() {
    const pane = document.getElementById('writer-preview-pane');
    const rich = _richEditor();
    if (!pane || !rich) return;

    _syncTextareaFromRich();
    const title = document.getElementById('article-title')?.value?.trim() || '';
    const body = _hiddenEditor()?.value?.trim() || '';
    const cat = document.getElementById('article-cat')?.value || 'General';
    const tags = (document.getElementById('article-tags')?.value || '')
      .split(',')
      .map((tag) => tag.trim())
      .filter(Boolean);
    const imgUrl = document.getElementById('article-img')?.value?.trim() || '';
    const user = IBlog.state.currentUser || { name: 'You' };
    const plainBody = _plainTextFromHtml(body);

    if (!title && !plainBody) {
      pane.innerHTML = `
        <div class="wtr-empty">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"
               width="38" height="38">
            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
            <circle cx="12" cy="12" r="3"/>
          </svg>
          <p>Start writing to see your preview</p>
          <small>Use the inline toolbar in Edit mode to style selected text.</small>
        </div>`;
      return;
    }

    const article = {
      id: 'preview',
      title,
      body,
      excerpt: plainBody.substring(0, 200),
      author: user.name,
      cat,
      category: cat,
      img: imgUrl || null,
      cover: imgUrl || null,
      readTime: _readTime(plainBody),
      date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      tags,
      templateId: IBlog.Templates?.selectedId?.() || null,
    };

    const templateHtml = IBlog.Templates?.renderForReader?.(article);
    if (templateHtml) {
      const templateName = IBlog.Templates?.get?.(article.templateId)?.name || '';
      pane.innerHTML = `
        <div class="wtr-preview-bar">
          <span>${templateName} preview</span>
          <span class="wtr-live-dot">Live</span>
        </div>
        <div class="wtr-preview-scroll">${templateHtml}</div>`;
      return;
    }

    const bodyMarkup = _looksLikeHtml(body)
      ? `<div class="wtr-plain-rich-body">${body}</div>`
      : String(body || '')
          .split(/\n{2,}/)
          .filter((paragraph) => paragraph.trim())
          .map((paragraph, index) => _renderPlainBlock(paragraph, index))
          .join('');

    pane.innerHTML = `
      <div class="wtr-preview-bar">
        <span>Plain preview</span>
        <span class="wtr-live-dot">Live</span>
      </div>
      <div class="wtr-preview-scroll wtr-plain">
        ${imgUrl ? `<div class="wtr-plain-cover" style="background-image:url('${imgUrl}')"></div>` : ''}
        <div class="wtr-plain-cat">${_escapeHtml(cat)}</div>
        <h1 class="wtr-plain-title">${_escapeHtml(title)}</h1>
        <div class="wtr-plain-meta">By <strong>${_escapeHtml(user.name)}</strong> · ${article.readTime} · ${article.date}</div>
        <hr class="wtr-plain-rule"/>
        ${bodyMarkup}
        ${tags.length ? `<div class="wtr-plain-tags">${tags.map((tag) => `<span>${_escapeHtml(tag)}</span>`).join('')}</div>` : ''}
      </div>`;
  }

  function _buildFloatingToolbar() {
    if (document.getElementById('wtr-toolbar')) {
      _toolbar = document.getElementById('wtr-toolbar');
      return;
    }
    _toolbar = document.createElement('div');
    _toolbar.id = 'wtr-toolbar';
    _toolbar.innerHTML = `
      <button class="wtr-tb-btn" data-cmd="bold" title="Bold"
              onmousedown="event.preventDefault();IBlog.Writer._exec('bold')">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" width="13" height="13">
          <path d="M6 4h8a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6z"/>
          <path d="M6 12h9a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6z"/>
        </svg>
      </button>
      <button class="wtr-tb-btn" data-cmd="italic" title="Italic"
              onmousedown="event.preventDefault();IBlog.Writer._exec('italic')">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" width="13" height="13">
          <line x1="19" y1="4" x2="10" y2="4"/>
          <line x1="14" y1="20" x2="5" y2="20"/>
          <line x1="15" y1="4" x2="9" y2="20"/>
        </svg>
      </button>
      <button class="wtr-tb-btn" data-cmd="underline" title="Underline"
              onmousedown="event.preventDefault();IBlog.Writer._exec('underline')">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" width="13" height="13">
          <path d="M6 3v7a6 6 0 0 0 6 6 6 6 0 0 0 6-6V3"/>
          <line x1="4" y1="21" x2="20" y2="21"/>
        </svg>
      </button>
      <div class="wtr-tb-sep"></div>
      <input type="color" class="wtr-tb-color" value="#111111" title="Text color"
             onchange="IBlog.Writer._exec('foreColor',this.value)">
      <input type="color" class="wtr-tb-color" value="#fff1a8" title="Highlight"
             onchange="IBlog.Writer._exec('hiliteColor',this.value)">
      <button class="wtr-tb-btn wtr-tb-clear" title="Clear formatting"
              onmousedown="event.preventDefault();IBlog.Writer._exec('removeFormat')">Clear</button>
      <div class="wtr-tb-sep"></div>
      <button class="wtr-tb-btn wtr-tb-img" title="Insert image"
              onmousedown="event.preventDefault();IBlog.Writer._uploadInline()">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
             stroke-linecap="round" stroke-linejoin="round" width="13" height="13">
          <rect x="3" y="3" width="18" height="18" rx="2"/>
          <circle cx="8.5" cy="8.5" r="1.5"/>
          <polyline points="21 15 16 10 5 21"/>
        </svg>
        Image
      </button>
    `;
    _toolbar.style.display = 'none';
    document.body.appendChild(_toolbar);
  }

  function _exec(cmd, value = null) {
    const rich = _richEditor();
    if (!rich) return;
    rich.focus();
    _restoreSelection();
    if (cmd === 'hiliteColor' && !document.queryCommandSupported?.('hiliteColor')) {
      document.execCommand('backColor', false, value);
    } else {
      document.execCommand(cmd, false, value);
    }
    _saveSelection();
    _syncTextareaFromRich();
    window.IBlog?.Views?.analyzeQuality?.();
    _scheduleRender();
    _updateToolbarState();
  }

  function _buildImageInput() {
    if (document.getElementById('wtr-img-input')) {
      _imgInput = document.getElementById('wtr-img-input');
      return;
    }
    _imgInput = document.createElement('input');
    _imgInput.type = 'file';
    _imgInput.id = 'wtr-img-input';
    _imgInput.accept = 'image/*';
    _imgInput.style.display = 'none';
    _imgInput.addEventListener('change', _onImage);
    document.body.appendChild(_imgInput);
  }

  function _uploadInline() {
    _imgTarget = 'inline';
    _imgInput?.click();
  }

  function _onImage(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (loadEvent) => {
      const url = loadEvent.target?.result;
      if (!url) return;
      const rich = _richEditor();
      if (!rich || _imgTarget !== 'inline') return;
      rich.focus();
      _restoreSelection();
      document.execCommand('insertHTML', false, `<figure><img src="${url}" alt="Inline image"></figure><p><br></p>`);
      _syncTextareaFromRich();
      window.IBlog?.Views?.analyzeQuality?.();
      _scheduleRender();
      _imgTarget = null;
      _imgInput.value = '';
    };
    reader.readAsDataURL(file);
  }

  function insertTextAtCursor(text) {
    const rich = _richEditor();
    if (!rich) return false;
    rich.focus();
    if (!_restoreSelection()) {
      const range = document.createRange();
      range.selectNodeContents(rich);
      range.collapse(false);
      const selection = window.getSelection();
      selection?.removeAllRanges();
      selection?.addRange(range);
      _savedRange = range.cloneRange();
    }
    document.execCommand('insertText', false, text);
    _syncTextareaFromRich();
    window.IBlog?.Views?.analyzeQuality?.();
    _scheduleRender();
    return true;
  }

  function loadArticle(article) {
    if (!article) return false;
    const hidden = _hiddenEditor();
    const rich = _richEditor();
    const title = document.getElementById('article-title');
    const category = document.getElementById('article-cat');
    const tags = document.getElementById('article-tags');
    const image = document.getElementById('article-img');
    if (!hidden || !rich || !title || !category || !tags || !image) {
      _queuedArticle = article;
      requestAnimationFrame(() => init());
      return false;
    }

    title.value = article.title || '';
    hidden.value = article.body || '';
    tags.value = Array.isArray(article.tags) ? article.tags.join(', ') : String(article.tags || '');
    image.value = article.cover || article.img || '';
    hidden.dataset.editId = String(article.id ?? '');
    hidden.dataset.editStatus = String(article.status || 'published');
    _syncRichFromTextarea(true);

    const currentCategory = article.category || article.cat || 'General';
    if (Array.from(category.options || []).some((option) => option.value === currentCategory || option.textContent === currentCategory)) {
      category.value = currentCategory;
    }

    if (article.templateId && IBlog.Templates?.setSelected) {
      IBlog.Templates.setSelected(article.templateId, { silent: true });
    } else if (IBlog.Templates?.setSelected) {
      IBlog.Templates.setSelected(null, { silent: true });
    }

    window.IBlog?.Views?.refreshCoverPreview?.(image.value, image.value ? 'Cover image selected' : '');
    window.IBlog?.Views?.analyzeQuality?.();
    setMode('edit');
    sessionStorage.removeItem('iblog_edit_article');
    return true;
  }

  function queueArticleEdit(article) {
    if (!article) return;
    _queuedArticle = article;
    try {
      sessionStorage.setItem('iblog_edit_article', JSON.stringify(article));
    } catch (_) {}
  }

  function _consumeQueuedArticle() {
    if (_queuedArticle) {
      const article = _queuedArticle;
      _queuedArticle = null;
      return article;
    }
    try {
      const raw = sessionStorage.getItem('iblog_edit_article');
      if (!raw) return null;
      sessionStorage.removeItem('iblog_edit_article');
      return JSON.parse(raw);
    } catch (_) {
      return null;
    }
  }

  function clear() {
    const hidden = _hiddenEditor();
    const rich = _richEditor();
    if (hidden) {
      hidden.value = '';
      delete hidden.dataset.editId;
      delete hidden.dataset.editStatus;
    }
    if (rich) {
      rich.innerHTML = '';
      rich.dataset.hydrated = '1';
    }
    _queuedArticle = null;
    sessionStorage.removeItem('iblog_edit_article');
    _hideToolbar();
  }

  function _readTime(text) {
    const wordCount = String(text || '').trim().split(/\s+/).filter(Boolean).length;
    return `${Math.max(1, Math.ceil(Math.max(1, wordCount) / 200))} min`;
  }

  return {
    init,
    setMode,
    loadArticle,
    queueArticleEdit,
    clear,
    insertTextAtCursor,
    syncFromTextarea: () => _syncRichFromTextarea(true),
    _exec,
    _uploadInline,
    _renderNow,
    get _mode() { return _mode; },
  };
})();
