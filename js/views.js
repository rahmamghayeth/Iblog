IBlog.Views = (() => {
  let _mapInstance = null;
  const _coverFrameDefaults = Object.freeze({ scale: 1, offsetX: 50, offsetY: 50 });
  const _coverOutputSize = Object.freeze({ width: 1600, height: 900 });
  let _coverEditorBound = false;
  let _coverPreviewBound = false;
  let _coverImageState = _createCoverImageState();
  let _coverLoadToken = 0;
  let _coverDragState = null;

  function _createCoverImageState() {
    return {
      sourceUrl: '',
      outputUrl: '',
      fileName: '',
      mimeType: 'image/jpeg',
      image: null,
      scale: _coverFrameDefaults.scale,
      offsetX: _coverFrameDefaults.offsetX,
      offsetY: _coverFrameDefaults.offsetY,
    };
  }

  /* ── Map ─────────────────────────────────────────────── */
  function initMap() {
    const isPrem = IBlog.state.currentUser?.plan === 'premium';
    const overlay = document.getElementById('map-premium-overlay');
    if (overlay) overlay.style.display = isPrem ? 'none' : 'flex';
    if (!isPrem) return;
    if (_mapInstance) {
      document.getElementById('country-feed').style.display = 'block';
      _buildCountryFeed('World');
      return;
    }
    _ensureLeaflet(_buildLeafletMap);
  }

  function _ensureLeaflet(cb) {
    if (typeof L !== 'undefined') { cb(); return; }
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
    document.head.appendChild(link);
    const s = document.createElement('script');
    s.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
    s.onload = () => cb();
    s.onerror = () => {
      document.getElementById('world-map').innerHTML = '<div style="height:100%;display:flex;align-items:center;justify-content:center;flex-direction:column;gap:14px;color:var(--text2);text-align:center;padding:20px;"><div style="font-size:48px;">🌍</div><div><strong>Map requires internet connection</strong></div><div style="font-size:13px;">Leaflet.js could not be loaded.</div></div>';
      document.getElementById('country-feed').style.display = 'block';
      _buildCountryFeed('World');
    };
    document.head.appendChild(s);
  }

  function _buildLeafletMap() {
    setTimeout(() => {
      try {
        const mapEl = document.getElementById('world-map');
        if (!mapEl || _mapInstance) return;
        mapEl.innerHTML = '';
        const isDark = document.body.classList.contains('dark');
        _mapInstance = L.map('world-map', { center: [20, 10], zoom: 2, zoomControl: true, minZoom: 2 });
        L.tileLayer(
          isDark
            ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
            : 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
          { attribution: '© IBlog Maps | © OpenStreetMap' }
        ).addTo(_mapInstance);

        Object.entries(IBlog.COUNTRY_DATA).forEach(([name, data]) => {
          if (!data.coords) return;
          const accent = getComputedStyle(document.documentElement).getPropertyValue('--accent').trim() || '#b8960c';
          const safeCountry = String(name).replace(/'/g, "\\'");
          const safeFlag = String(data.flag || '🌐');
          const marker = L.circleMarker(data.coords, {
            radius: 10, fillColor: accent, color: '#fff', weight: 2,
            opacity: 1, fillOpacity: 0.85,
          }).addTo(_mapInstance);

          marker.bindPopup(`
<div class="map-popup">
  <div class="map-popup__eyebrow">${safeFlag} ${name}</div>
  <div class="map-popup__title">${data.articles.length} trending articles</div>
  <div class="map-popup__meta">Open the country feed to see the most relevant stories, authors, and topics right now.</div>
  <button class="map-popup__button" onclick="IBlog.Views.selectCountry('${safeCountry}')">View Feed →</button>
</div>`, { maxWidth: 260, className: 'map-popup-shell' });
          marker.bindTooltip(name, { permanent: false, direction: 'top' });
          marker.on('click', () => selectCountry(name));
        });

        document.getElementById('country-feed').style.display = 'block';
        _buildCountryFeed('World');
      } catch (e) { console.error('Map error:', e); }
    }, 300);
  }

  function selectCountry(name) {
    _buildCountryFeed(name);
    const feed = document.getElementById('country-feed');
    if (feed) feed.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function openArticleFromLanding(index) {
    const runtimeSource = Array.isArray(IBlog.state?.articles) ? IBlog.state.articles : [];
    const seedSource = Array.isArray(IBlog.SEED_ARTICLES) ? IBlog.SEED_ARTICLES : [];
    const runtimeArticle = runtimeSource.find(item => String(item?.id) === String(index))
      || runtimeSource[index]
      || null;
    const seedArticle = seedSource.find(item => String(item?.id) === String(index))
      || seedSource[index]
      || null;
    const article = runtimeArticle || (seedArticle ? { ...seedArticle, _landingPreview: true } : null) || runtimeSource[0] || seedSource[0];

    if (!article) return;

    if (!window.IBlogSession?.getUser?.()) {
      window.setPendingArticle?.(article.id);
      if (typeof showSignin === 'function') showSignin();
      return;
    }

    document.getElementById('landing-page')?.style.setProperty('display', 'none');
    document.getElementById('dashboard')?.style.setProperty('display', 'block');
    if (!document.getElementById('view-home')?.classList.contains('active')) {
      IBlog.Dashboard?.enter?.();
    }
    setTimeout(() => IBlog.Feed?.openReader?.(article), 180);
  }

  function _resolveMapArticleImage(country, article, existing, index, topics = []) {
    const directImage = article?.cover || article?.img || existing?.cover || existing?.img;
    if (directImage) return directImage;

    const topic = String(topics[index % (topics.length || 1)] || '').toLowerCase();
    const countryKey = String(country || '').toLowerCase();
    const countryImages = {
      world: [
        'https://images.unsplash.com/photo-1521295121783-8a321d551ad2?auto=format&fit=crop&w=1200&q=80',
        'https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&w=1200&q=80',
        'https://images.unsplash.com/photo-1504384308090-c894fdcc538d?auto=format&fit=crop&w=1200&q=80',
      ],
      usa: [
        'https://images.unsplash.com/photo-1498050108023-c5249f4df085?auto=format&fit=crop&w=1200&q=80',
        'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?auto=format&fit=crop&w=1200&q=80',
      ],
      tunisia: [
        'https://images.unsplash.com/photo-1539650116574-75c0c6d73f0e?auto=format&fit=crop&w=1200&q=80',
        'https://images.unsplash.com/photo-1524499982521-1ffd58dd89ea?auto=format&fit=crop&w=1200&q=80',
      ],
      japan: [
        'https://images.unsplash.com/photo-1542051841857-5f90071e7989?auto=format&fit=crop&w=1200&q=80',
        'https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?auto=format&fit=crop&w=1200&q=80',
      ],
      uae: [
        'https://images.unsplash.com/photo-1512453979798-5ea266f8880c?auto=format&fit=crop&w=1200&q=80',
        'https://images.unsplash.com/photo-1518684079-3c830dcef090?auto=format&fit=crop&w=1200&q=80',
      ],
    };
    const topicImages = {
      ai: [
        'https://images.unsplash.com/photo-1677442136019-21780ecad995?auto=format&fit=crop&w=1200&q=80',
        'https://images.unsplash.com/photo-1620712943543-bcc4688e7485?auto=format&fit=crop&w=1200&q=80',
      ],
      startups: [
        'https://images.unsplash.com/photo-1552664730-d307ca884978?auto=format&fit=crop&w=1200&q=80',
        'https://images.unsplash.com/photo-1521737604893-d14cc237f11d?auto=format&fit=crop&w=1200&q=80',
      ],
      design: [
        'https://images.unsplash.com/photo-1498050108023-c5249f4df085?auto=format&fit=crop&w=1200&q=80',
        'https://images.unsplash.com/photo-1516321497487-e288fb19713f?auto=format&fit=crop&w=1200&q=80',
      ],
      travel: [
        'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1200&q=80',
        'https://images.unsplash.com/photo-1488085061387-422e29b40080?auto=format&fit=crop&w=1200&q=80',
      ],
      culture: [
        'https://images.unsplash.com/photo-1518998053901-5348d3961a04?auto=format&fit=crop&w=1200&q=80',
        'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=1200&q=80',
      ],
      finance: [
        'https://images.unsplash.com/photo-1520607162513-77705c0f0d4a?auto=format&fit=crop&w=1200&q=80',
        'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?auto=format&fit=crop&w=1200&q=80',
      ],
      science: [
        'https://images.unsplash.com/photo-1532187863486-abf9dbad1b69?auto=format&fit=crop&w=1200&q=80',
        'https://images.unsplash.com/photo-1507413245164-6160d8298b31?auto=format&fit=crop&w=1200&q=80',
      ],
      education: [
        'https://images.unsplash.com/photo-1503676260728-1c00da094a0b?auto=format&fit=crop&w=1200&q=80',
        'https://images.unsplash.com/photo-1524995997946-a1c2e315a42f?auto=format&fit=crop&w=1200&q=80',
      ],
      default: [
        'https://images.unsplash.com/photo-1497366754035-f200968a6e72?auto=format&fit=crop&w=1200&q=80',
        'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=1200&q=80',
        'https://images.unsplash.com/photo-1504384308090-c894fdcc538d?auto=format&fit=crop&w=1200&q=80',
      ],
    };

    const countrySet = countryImages[countryKey];
    if (countrySet?.length) return countrySet[index % countrySet.length];

    const topicSet = topicImages[topic] || topicImages.default;
    return topicSet[index % topicSet.length];
  }

  function _buildCountryFeed(country) {
    const data = IBlog.COUNTRY_DATA[country] || IBlog.COUNTRY_DATA['World'];
    const title = document.getElementById('country-title');
    if (title) title.innerHTML = `${data.flag} <em>${country}</em> — Trending Now`;

    const topicsHTML = data.topics.map(t =>
      `<span class="topic-chip" onclick="IBlog.Views.searchTopic('${t}')">${t}</span>`
    ).join('');

    const articlesHTML = data.articles.map((a, i) => {
      const existing = IBlog.state.articles.find(x =>
        x.title === a.title || x.title.startsWith(a.title.substring(0, 40))
      );

      if (existing) {
        return `
<div class="country-article-card" onclick="IBlog.Feed.openReader(${existing.id})">
  <div class="country-article-img" style="${a.img ? `background-image:url('${a.img}')` : `background:hsl(${i*80%360},35%,${document.body.classList.contains('dark')?'18%':'85%'})`}"></div>
  <div class="country-article-info">
    <div class="country-article-rank">#${i + 1} Trending</div>
    <div class="country-article-title">${a.title}</div>
    <div class="country-article-meta">✍️ ${a.author} &nbsp;·&nbsp; ⏱ ${a.readTime}</div>
  </div>
</div>`;
      } else {
        const tempId = 'map_' + i + '_' + country.replace(/\s/g, '_');
        const safeTitle = a.title.replace(/'/g, "\\'");
        const safeAuthor = a.author.replace(/'/g, "\\'");
        return `
<div class="country-article-card" onclick="IBlog.Views.openMapArticle('${tempId}', '${safeTitle}', '${safeAuthor}', '${a.readTime}', '${a.img || ''}', '${country}')">
  <div class="country-article-img" style="${a.img ? `background-image:url('${a.img}')` : `background:hsl(${i*80%360},35%,${document.body.classList.contains('dark')?'18%':'85%'})`}"></div>
  <div class="country-article-info">
    <div class="country-article-rank">#${i + 1} Trending</div>
    <div class="country-article-title">${a.title}</div>
    <div class="country-article-meta">✍️ ${a.author} &nbsp;·&nbsp; ⏱ ${a.readTime}</div>
  </div>
</div>`;
      }
    }).join('');

    const el = document.getElementById('country-articles');
    if (el) el.innerHTML = `
<div class="country-topic-chips">${topicsHTML}</div>
<div class="country-articles">${articlesHTML}</div>`;
  }

  function _buildCountryFeed(country) {
    const data = IBlog.COUNTRY_DATA[country] || IBlog.COUNTRY_DATA.World;
    const title = document.getElementById('country-title');
    if (title) {
      title.innerHTML = `<span class="country-title-flag">${data.flag}</span><em>${country}</em><span class="country-title-copy">Trending Now</span>`;
    }

    const topicsHTML = data.topics
      .map((topic) => `<span class="topic-chip" onclick="IBlog.Views.searchTopic('${topic}')">${topic}</span>`)
      .join('');

    const renderArticleCard = (article, index) => {
      const existing = IBlog.state.articles.find((item) =>
        item.title === article.title || item.title.startsWith(article.title.substring(0, 40))
      );
      const tones = ['#f0c8c2', '#d9e3b1', '#b8ddd3', '#cfd8f8', '#edd3a7'];
      const imageUrl = _resolveMapArticleImage(country, article, existing, index, data.topics);
      const imageStyle = imageUrl
        ? `background-image:url('${imageUrl}')`
        : `--card-tint:${tones[index % tones.length]}`;
      const safeCountry = country.replace(/\s/g, '_');
      const cardClass = 'country-article-card is-horizontal';
      const articleCopy = article.excerpt || `A focused read from the ${country} feed.`;
      const content = `
  <div class="country-article-img" style="${imageStyle}"></div>
  <div class="country-article-info">
    <div class="country-article-rank">#${index + 1} Trending</div>
    <div class="country-article-title">${article.title}</div>
    <div class="country-article-excerpt">${articleCopy}</div>
    <div class="country-article-meta">
      <span>By ${article.author}</span>
      <span class="country-article-meta-sep"></span>
      <span>${article.readTime}</span>
    </div>
  </div>`;

      if (existing) {
        return `
<div class="${cardClass}" onclick="IBlog.Feed.openReader(${existing.id})">
  ${content}
</div>`;
      }

      const tempId = `map_${index}_${safeCountry}`;
      return `
<div class="${cardClass}" onclick="IBlog.Views.openMapArticle('${tempId}', '${country}', ${index})">
  ${content}
</div>`;
    };

    const articlesHTML = data.articles
      .map((article, index) => renderArticleCard(article, index))
      .join('');
    const articleCount = data.articles.length;

    const el = document.getElementById('country-articles');
    if (!el) return;

    el.innerHTML = `
<div class="country-feed-summary">
  <div class="country-feed-summary-copy">
    <strong>${data.summary}</strong>
    <span>${articleCount} curated stor${articleCount > 1 ? 'ies' : 'y'} for ${country}.</span>
  </div>
  <div class="country-feed-summary-badge">Live global feed</div>
</div>
<div class="country-topic-chips">${topicsHTML}</div>
<div class="country-articles">${articlesHTML}</div>`;
  }

  function openMapArticle(id, title, author, readTime, img, country) {
    let sourceArticle = null;
    if (arguments.length <= 3 || country === undefined) {
      const sourceCountry = title;
      const sourceIndex = Number(author);
      const data = IBlog.COUNTRY_DATA[sourceCountry] || IBlog.COUNTRY_DATA.World;
      sourceArticle = data?.articles?.[sourceIndex] || null;
      country = sourceCountry;
      title = sourceArticle?.title || 'Untitled';
      author = sourceArticle?.author || 'IBlog Editorial';
      readTime = sourceArticle?.readTime || '5 min';
      img = sourceArticle?.img || sourceArticle?.cover || '';
    }
    const tempArticle = {
      id: id,
      title: title,
      author: author,
      authorInitial: author ? author[0].toUpperCase() : '?',
      authorColor: 'var(--accent)',
      cat: sourceArticle?.category || country,
      category: sourceArticle?.category || country,
      img: img || null,
      cover: img || null,
      readTime: readTime,
      excerpt: `A trending article from ${country} — one of the most-read pieces in this region right now.`,
      body: `This is a trending article from ${country}.\n\n"${title}" by ${author} is currently one of the most-read pieces in the region. This article has been identified as a top trend through IBlog's global reading pattern analysis.\n\nExplore more content from ${country} by clicking the topic chips above, or navigate to the Smart Search to find related articles in our full library.`,
      likes: Math.floor(Math.random() * 300 + 50),
      excerpt: sourceArticle?.excerpt || `A trending article from ${country}.`,
      body: sourceArticle?.body || `This is a trending article from ${country}.\n\n"${title}" by ${author} is currently one of the most-read pieces in the region.`,
      comments: [],
      reposts: Math.floor(Math.random() * 60 + 10),
      bookmarked: false,
      liked: false,
      quality: 'high',
      isPremiumAuthor: false,
      tags: Array.isArray(sourceArticle?.tags) && sourceArticle.tags.length ? sourceArticle.tags : [country, 'Trending', 'Global'],
      date: 'Trending now',
    };

    const existing = IBlog.state.articles.find(x => x.id === id);
    if (!existing) IBlog.state.articles.push(tempArticle);

    IBlog.Feed.openReader(id);
  }

  /* ── Activity ────────────────────────────────────────── */
  function buildActivity() {
    const grid = document.getElementById('activity-grid');
    if (!grid) return;
    grid.innerHTML = Array.from({ length: 364 }, (_, i) => {
      const r = Math.random();
      const lvl = r > .82 ? 'l4' : r > .62 ? 'l3' : r > .42 ? 'l2' : r > .22 ? 'l1' : '';
      return `<div class="activity-cell ${lvl}" title="${lvl ? Math.floor(Math.random()*4+1) + ' activities' : 'No activity'}" onclick="IBlog.utils.toast(this.title)"></div>`;
    }).join('');
  }

  /* ── Analytics ───────────────────────────────────────── */
  
  /* ── Trends ──────────────────────────────────────────── */
  function buildTrends() {
    const list = document.getElementById('trend-list');
    if (list) {
      list.innerHTML = IBlog.TRENDS.map(t => `
<div class="trend-row" onclick="searchTopic('${t.topic}')">
  <span class="trend-num">#${t.rank}</span>
  <span style="font-size:18px;">${t.icon}</span>
  <div class="trend-info">
    <strong>${t.topic}</strong>
    <small>${t.searches} searches today</small>
  </div>
  <span class="trend-spike">${t.spike}</span>
</div>`).join('');
    }
    const cats = document.getElementById('trend-cats');
    if (cats) {
      const icons = ['🤖','🧬','💻','🎭','🚀','⚕️','🧠','💰','🌱','📐','🎮','🔬'];
      cats.innerHTML = IBlog.CATEGORIES.slice(0, 12).map((c, i) => `
<div class="trend-cat-card" onclick="searchTopic('${c}')">
  <div style="font-size:22px;margin-bottom:6px;">${icons[i % icons.length]}</div>
  <strong style="font-size:13px;">${c}</strong>
  <div style="font-size:11px;color:var(--text2);margin-top:3px;">+${Math.floor(Math.random()*180+40)}% this week</div>
</div>`).join('');
    }
  }

  /* ── Smart Search ────────────────────────────────────── */
  

  /* ── Writer ──────────────────────────────────────────── */
  function buildTemplates() {
    if (IBlog.Templates?.buildWriterSelector) {
      IBlog.Templates.buildWriterSelector();
    }
  }

  function selectTemplate(id) {
    const el = document.querySelector(`.tpl-card[data-tpl="${id}"]`);
    IBlog.Templates?.selectTemplate(id, el);
  }

  function injectSection(prefix) {
    if (IBlog.Writer?.insertTextAtCursor?.(prefix)) {
      analyzeQuality();
      return;
    }
    const ed = document.getElementById('article-editor');
    if (!ed) return;
    const val = ed.value;
    const pos = ed.selectionStart;
    ed.value = val.slice(0, pos) + prefix + val.slice(pos);
    ed.selectionStart = ed.selectionEnd = pos + prefix.length;
    ed.focus();
    analyzeQuality();
  }

  function insertLink() {
    const url = prompt('Enter URL:');
    if (!url) return;
    const text = prompt('Link text:', url);
    injectSection(`[${text || url}](${url})`);
  }

  function _coverEditorElements() {
    return {
      editor: document.getElementById('writer-cover-editor'),
      scale: document.getElementById('writer-cover-scale'),
      scaleValue: document.getElementById('writer-cover-scale-value'),
      offsetX: document.getElementById('writer-cover-offset-x'),
      offsetXValue: document.getElementById('writer-cover-offset-x-value'),
      offsetY: document.getElementById('writer-cover-offset-y'),
      offsetYValue: document.getElementById('writer-cover-offset-y-value'),
    };
  }

  function _coverPreviewElements() {
    return {
      preview: document.getElementById('writer-cover-preview'),
      toolbar: document.getElementById('writer-cover-preview-toolbar'),
      input: document.getElementById('writer-img-file'),
    };
  }

  function _toggleCoverPreviewToolbar(show) {
    const { toolbar } = _coverPreviewElements();
    if (!toolbar) return;
    toolbar.hidden = !show;
  }

  function _coverFrameMetrics(width = _coverOutputSize.width, height = _coverOutputSize.height) {
    const image = _coverImageState.image;
    if (!image) return null;

    const baseScale = Math.max(width / image.naturalWidth, height / image.naturalHeight);
    const drawWidth = image.naturalWidth * baseScale * _coverImageState.scale;
    const drawHeight = image.naturalHeight * baseScale * _coverImageState.scale;

    return {
      drawWidth,
      drawHeight,
      extraX: Math.max(0, drawWidth - width),
      extraY: Math.max(0, drawHeight - height),
    };
  }

  function _clampCoverFrame() {
    const metrics = _coverFrameMetrics();
    if (!metrics) return;

    _coverImageState.offsetX = metrics.extraX > 0 ? Math.min(100, Math.max(0, _coverImageState.offsetX)) : 50;
    _coverImageState.offsetY = metrics.extraY > 0 ? Math.min(100, Math.max(0, _coverImageState.offsetY)) : 50;
  }

  function _ensureCoverPreviewBindings() {
    if (_coverPreviewBound) return;

    const { preview, input } = _coverPreviewElements();
    if (!preview) return;

    preview.addEventListener('click', () => {
      if (preview.classList.contains('is-empty')) {
        input?.click();
      }
    });

    preview.addEventListener('pointerdown', (event) => {
      if (!_coverImageState.image || preview.classList.contains('is-empty')) return;
      const metrics = _coverFrameMetrics(preview.clientWidth || _coverOutputSize.width, preview.clientHeight || _coverOutputSize.height);
      if (!metrics) return;

      _coverDragState = {
        pointerId: event.pointerId,
        startX: event.clientX,
        startY: event.clientY,
        startOffsetX: _coverImageState.offsetX,
        startOffsetY: _coverImageState.offsetY,
        metrics,
      };

      preview.classList.add('is-dragging');
      preview.setPointerCapture?.(event.pointerId);
      event.preventDefault();
    });

    preview.addEventListener('pointermove', (event) => {
      if (!_coverDragState || _coverDragState.pointerId !== event.pointerId) return;

      const dx = event.clientX - _coverDragState.startX;
      const dy = event.clientY - _coverDragState.startY;
      const { extraX, extraY } = _coverDragState.metrics;

      _coverImageState.offsetX = extraX > 0
        ? _coverDragState.startOffsetX - ((dx / extraX) * 100)
        : 50;
      _coverImageState.offsetY = extraY > 0
        ? _coverDragState.startOffsetY - ((dy / extraY) * 100)
        : 50;

      _clampCoverFrame();
      _applyCoverAdjustments();
    });

    const finishDrag = (event) => {
      if (_coverDragState && event?.pointerId !== undefined && _coverDragState.pointerId !== event.pointerId) return;
      _coverDragState = null;
      preview.classList.remove('is-dragging');
    };

    preview.addEventListener('pointerup', finishDrag);
    preview.addEventListener('pointercancel', finishDrag);

    preview.addEventListener('wheel', (event) => {
      if (!_coverImageState.image || preview.classList.contains('is-empty')) return;
      event.preventDefault();

      const direction = event.deltaY < 0 ? 1 : -1;
      _coverImageState.scale = Math.min(2.8, Math.max(1, _coverImageState.scale + (direction * 0.08)));
      _clampCoverFrame();
      _applyCoverAdjustments();
    }, { passive: false });

    _coverPreviewBound = true;
  }

  function _normalizeCoverMimeType(url = '') {
    if (/^data:image\/png/i.test(url)) return 'image/png';
    if (/^data:image\/webp/i.test(url)) return 'image/webp';
    return 'image/jpeg';
  }

  function _ensureCoverEditorBindings() {
    if (_coverEditorBound) return;

    const { scale, offsetX, offsetY } = _coverEditorElements();
    [scale, offsetX, offsetY].forEach((control) => {
      control?.addEventListener('input', () => {
        _updateCoverFrameFromControls();
        _applyCoverAdjustments();
      });
    });

    _coverEditorBound = true;
  }

  function _toggleCoverEditor(show) {
    const { editor } = _coverEditorElements();
    if (!editor) return;
    editor.hidden = !show;
  }

  function _syncCoverEditorControls() {
    const { scale, scaleValue, offsetX, offsetXValue, offsetY, offsetYValue } = _coverEditorElements();

    if (scale) scale.value = String(_coverImageState.scale);
    if (offsetX) offsetX.value = String(_coverImageState.offsetX);
    if (offsetY) offsetY.value = String(_coverImageState.offsetY);

    if (scaleValue) scaleValue.textContent = `${Math.round(_coverImageState.scale * 100)}%`;
    if (offsetXValue) offsetXValue.textContent = `${Math.round(_coverImageState.offsetX)}%`;
    if (offsetYValue) offsetYValue.textContent = `${Math.round(_coverImageState.offsetY)}%`;
  }

  function _updateCoverFrameFromControls() {
    const { scale, offsetX, offsetY } = _coverEditorElements();
    _coverImageState.scale = Number.parseFloat(scale?.value || String(_coverFrameDefaults.scale)) || _coverFrameDefaults.scale;
    _coverImageState.offsetX = Number.parseFloat(offsetX?.value || String(_coverFrameDefaults.offsetX)) || _coverFrameDefaults.offsetX;
    _coverImageState.offsetY = Number.parseFloat(offsetY?.value || String(_coverFrameDefaults.offsetY)) || _coverFrameDefaults.offsetY;
    _syncCoverEditorControls();
  }

  function _renderCoverPreview(url = '', fileName = '') {
    const preview = document.getElementById('writer-cover-preview');
    const nameEl = document.getElementById('writer-cover-name');
    const removeBtn = document.getElementById('writer-cover-remove');
    const hiddenField = document.getElementById('article-img');

    if (hiddenField) hiddenField.value = url || '';

    if (nameEl) {
      nameEl.textContent = fileName || (url ? 'Cover image selected' : 'No cover image selected');
    }

    if (!preview) return;

    if (url) {
      preview.classList.remove('is-empty');
      preview.classList.add('has-image');
      preview.style.backgroundImage = `url("${url}")`;
      preview.style.backgroundPosition = 'center';
      preview.style.backgroundSize = 'cover';
      _toggleCoverPreviewToolbar(true);
    } else {
      preview.classList.add('is-empty');
      preview.classList.remove('has-image');
      preview.classList.remove('is-dragging');
      preview.style.backgroundImage = '';
      preview.style.backgroundPosition = '';
      preview.style.backgroundSize = '';
      _toggleCoverPreviewToolbar(false);
    }

    if (removeBtn) {
      removeBtn.style.display = url ? 'inline-flex' : 'none';
    }
  }

  function _applyCoverAdjustments() {
    const { image, sourceUrl, fileName, mimeType } = _coverImageState;
    if (!image || !sourceUrl) return;

    const canvas = document.createElement('canvas');
    canvas.width = _coverOutputSize.width;
    canvas.height = _coverOutputSize.height;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    _clampCoverFrame();
    const metrics = _coverFrameMetrics(canvas.width, canvas.height);
    if (!metrics) return;
    const { drawWidth, drawHeight, extraX, extraY } = metrics;
    const drawX = -(extraX * (_coverImageState.offsetX / 100));
    const drawY = -(extraY * (_coverImageState.offsetY / 100));

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(image, drawX, drawY, drawWidth, drawHeight);

    let outputUrl = sourceUrl;
    try {
      outputUrl = mimeType === 'image/jpeg'
        ? canvas.toDataURL(mimeType, 0.92)
        : canvas.toDataURL(mimeType);
    } catch (error) {
      console.warn('Cover export failed, falling back to original image.', error);
    }

    _coverImageState.outputUrl = outputUrl;
    _renderCoverPreview(outputUrl, fileName || 'Cover image selected');
    IBlog.Writer?._renderNow?.();
  }

  function _loadCoverForEditing(url = '', fileName = '') {
    if (!url) {
      _coverLoadToken += 1;
      _coverImageState = _createCoverImageState();
      _syncCoverEditorControls();
      _toggleCoverEditor(false);
      _renderCoverPreview('', '');
      return;
    }

    _ensureCoverPreviewBindings();
    _ensureCoverEditorBindings();
    _coverImageState = {
      ..._createCoverImageState(),
      sourceUrl: url,
      fileName: fileName || 'Cover image selected',
      mimeType: _normalizeCoverMimeType(url),
    };

    _syncCoverEditorControls();
    _toggleCoverEditor(true);
    _renderCoverPreview(url, _coverImageState.fileName);

    const loadToken = ++_coverLoadToken;
    const image = new Image();
    image.decoding = 'async';
    image.onload = () => {
      if (loadToken !== _coverLoadToken || _coverImageState.sourceUrl !== url) return;
      _coverImageState.image = image;
      _applyCoverAdjustments();
    };
    image.onerror = () => {
      if (loadToken !== _coverLoadToken) return;
      _toggleCoverEditor(false);
      console.warn('Cover image could not be loaded for resizing.');
    };
    image.src = url;
  }

  function _syncCoverPreview(url = '', fileName = '') {
    _loadCoverForEditing(url, fileName);
  }

  function _insertBodyImage(url, altText = 'Uploaded image') {
    if (IBlog.Writer?.insertTextAtCursor?.(`\n\n![${altText}](${url})\n\n`)) {
      analyzeQuality();
      return;
    }
    const editor = document.getElementById('article-editor');
    if (!editor) return;

    const snippet = `\n\n![${altText}](${url})\n\n`;
    const start = Number(editor.selectionStart ?? editor.value.length);
    const end = Number(editor.selectionEnd ?? editor.value.length);
    const value = editor.value || '';

    editor.value = value.slice(0, start) + snippet + value.slice(end);
    editor.selectionStart = editor.selectionEnd = start + snippet.length;
    editor.focus();

    analyzeQuality();
    IBlog.Writer?._renderNow?.();
  }

  function handleImgUpload(input) {
    const file = input?.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const imageUrl = String(e?.target?.result || '');
      const inputId = String(input?.id || '');

      if (inputId === 'writer-img-upload') {
        _insertBodyImage(imageUrl, file.name.replace(/\.[^.]+$/, '') || 'Uploaded image');
        IBlog.utils.toast('Image inserted into the draft.', 'success');
      } else {
        _loadCoverForEditing(imageUrl, file.name || 'Cover image selected');
        IBlog.utils.toast('Image added as cover!', 'success');
      }

      input.value = '';
    };
    reader.readAsDataURL(file);
  }

  function removeCoverImage() {
    _coverImageState = _createCoverImageState();
    _syncCoverEditorControls();
    _toggleCoverEditor(false);
    _renderCoverPreview('', '');
    IBlog.Writer?._renderNow?.();
  }

  function resetCoverImageAdjustments() {
    if (!_coverImageState.sourceUrl) return;
    _coverImageState.scale = _coverFrameDefaults.scale;
    _coverImageState.offsetX = _coverFrameDefaults.offsetX;
    _coverImageState.offsetY = _coverFrameDefaults.offsetY;
    _syncCoverEditorControls();
    _applyCoverAdjustments();
  }
  function _writerPlainText(value) {
    const scratch = document.createElement('div');
    scratch.innerHTML = String(value || '');
    return String(scratch.textContent || scratch.innerText || '')
      .replace(/\s+\n/g, '\n')
      .replace(/\n{3,}/g, '\n\n')
      .replace(/[ \t]{2,}/g, ' ')
      .trim();
  }
function analyzeQuality() {
    const text  = _writerPlainText(document.getElementById('article-editor')?.value || '');
    const title = document.getElementById('article-title')?.value  || '';
 
    if (text.length < 20) {
      /* Reset all */
      ['read','depth','struct','eng'].forEach(k => {
        const v = document.getElementById('q-' + k);
        const b = document.getElementById('qb-' + k);
        if (v) v.textContent = '—';
        if (b) b.style.width = '0%';
      });
      document.getElementById('quality-overall')?.style.setProperty('display','none');
      document.getElementById('quality-tips').innerHTML = '';
      return;
    }
 
    const words      = text.trim().split(/\s+/).filter(Boolean);
    const wordCount  = words.length;
    const sentences  = text.split(/[.!?]+/).filter(s => s.trim().length > 3).length || 1;
    const paragraphs = text.split(/\n\n+/).filter(p => p.trim()).length;
    const hasHeaders = /^#{1,3} /m.test(text);
    const hasLists   = /^[-*] /m.test(text) || /^\d+\. /m.test(text);
    const hasQuotes  = /^> /m.test(text);
    const titleWords = title.trim().split(/\s+/).filter(Boolean).length;
    const uniqueWords = new Set(words.map(w => w.toLowerCase().replace(/[^a-z]/g,''))).size;
    const avgSentLen = wordCount / sentences;
 
    /* ── READABILITY ─────────────────────────────────────
       Based on average sentence length.
       Ideal: 15-20 words/sentence. Too long = hard to read.
       Too short = choppy. */
    let readScore = 100;
    if (avgSentLen > 30)      readScore -= 40;
    else if (avgSentLen > 25) readScore -= 25;
    else if (avgSentLen > 20) readScore -= 10;
    else if (avgSentLen < 8)  readScore -= 15;
    /* Vocabulary diversity: unique/total ratio */
    const diversity = uniqueWords / wordCount;
    if (diversity > 0.7)      readScore += 10;
    else if (diversity < 0.4) readScore -= 15;
    /* Penalize very short articles */
    if (wordCount < 50)  readScore -= 30;
    if (wordCount < 150) readScore -= 15;
    readScore = Math.max(5, Math.min(100, readScore));
 
    /* ── DEPTH ───────────────────────────────────────────
       Word count is the main signal. Also rewards long words
       (technical vocabulary). */
    let depthScore = 0;
    if (wordCount >= 800)      depthScore = 100;
    else if (wordCount >= 500) depthScore = 80 + Math.round((wordCount - 500) / 15);
    else if (wordCount >= 300) depthScore = 55 + Math.round((wordCount - 300) / 10);
    else if (wordCount >= 150) depthScore = 30 + Math.round((wordCount - 150) / 6);
    else if (wordCount >= 50)  depthScore = 10 + Math.round((wordCount - 50) / 5);
    else                        depthScore = Math.round(wordCount / 5);
    /* Reward long/technical words */
    const longWords = words.filter(w => w.length > 8).length;
    const longRatio = longWords / wordCount;
    if (longRatio > 0.2) depthScore += 8;
    depthScore = Math.max(5, Math.min(100, depthScore));
 
    /* ── STRUCTURE ───────────────────────────────────────
       Rewards: good title, headers, lists, quotes, paragraphs */
    let structScore = 20; /* base */
    /* Title quality */
    if (titleWords >= 5 && titleWords <= 12) structScore += 20;
    else if (titleWords >= 3)                structScore += 10;
    /* Headers */
    if (hasHeaders)  structScore += 20;
    /* Lists */
    if (hasLists)    structScore += 15;
    /* Quotes */
    if (hasQuotes)   structScore += 10;
    /* Multiple paragraphs */
    if (paragraphs >= 5) structScore += 20;
    else if (paragraphs >= 3) structScore += 10;
    else if (paragraphs >= 2) structScore += 5;
    structScore = Math.max(5, Math.min(100, structScore));
 
    /* ── ENGAGEMENT ──────────────────────────────────────
       Rewards: questions, exclamations, numbers/stats, 
       strong openers, varied paragraph lengths */
    let engScore = 20;
    /* Questions engage readers */
    const questions = (text.match(/\?/g) || []).length;
    engScore += Math.min(20, questions * 5);
    /* Numbers/stats add credibility */
    const numbers = (text.match(/\b\d+[\d,.]*\s*[%kKmMbB]?\b/g) || []).length;
    engScore += Math.min(20, numbers * 3);
    /* Strong opener (first 100 chars not generic) */
    const opener = text.trim().substring(0, 100).toLowerCase();
    const weakOpeners = ['the ', 'this ', 'in this', 'today ', 'i will', 'i want'];
    const isWeakOpener = weakOpeners.some(w => opener.startsWith(w));
    if (!isWeakOpener && text.length > 50) engScore += 15;
    /* Varied paragraph lengths (not all same size) */
    const paraLengths = text.split(/\n\n+/).filter(p=>p.trim()).map(p=>p.split(/\s+/).length);
    const avgLen = paraLengths.reduce((a,b)=>a+b,0) / (paraLengths.length||1);
    const variance = paraLengths.reduce((s,l)=>s+Math.abs(l-avgLen),0) / (paraLengths.length||1);
    if (variance > 20) engScore += 15;
    engScore = Math.max(5, Math.min(100, engScore));
 
    /* ── Overall ─────────────────────────────────────── */
    const overall = Math.round((readScore * 0.25) + (depthScore * 0.35) + (structScore * 0.25) + (engScore * 0.15));
 
    /* ── Update DOM ──────────────────────────────────── */
    const scores = [['read',readScore],['depth',depthScore],['struct',structScore],['eng',engScore]];
    scores.forEach(([k, v]) => {
      const valEl = document.getElementById('q-' + k);
      const barEl = document.getElementById('qb-' + k);
      if (valEl) valEl.textContent = v + '%';
      if (barEl) barEl.style.width = v + '%';
    });
 
    /* Overall bar */
    const overallEl = document.getElementById('quality-overall');
    const gradeEl   = document.getElementById('quality-grade');
    const pctEl     = document.getElementById('quality-pct');
    const barEl     = document.getElementById('quality-bar-overall');
    if (overallEl) overallEl.style.display = 'block';
    if (pctEl)     pctEl.textContent = overall + '%';
    if (barEl) {
      barEl.style.width = overall + '%';
      barEl.style.background = overall >= 75 ? 'var(--green)' : overall >= 50 ? 'var(--accent)' : 'var(--red)';
    }
    if (gradeEl) {
      if (overall >= 85) gradeEl.textContent = '🏆 Excellent';
      else if (overall >= 70) gradeEl.textContent = '✅ Good';
      else if (overall >= 50) gradeEl.textContent = '💡 Developing';
      else gradeEl.textContent = '📝 Early draft';
    }
 
    /* ── Specific actionable tips ───────────────────── */
    const tips = [];
    if (wordCount < 300)
      tips.push({ type:'warn', text: `Only ${wordCount} words — aim for 300+ for a complete article` });
    if (avgSentLen > 25)
      tips.push({ type:'warn', text: `Average sentence is ${Math.round(avgSentLen)} words — try breaking long sentences` });
    if (!hasHeaders && wordCount > 200)
      tips.push({ type:'tip', text: 'Add ## headers to break your article into sections' });
    if (!hasLists && wordCount > 150)
      tips.push({ type:'tip', text: 'Use - bullet points or 1. numbered lists to improve scannability' });
    if (titleWords < 5)
      tips.push({ type:'warn', text: 'Title is too short — aim for 5–12 words for better engagement' });
    if (titleWords > 15)
      tips.push({ type:'warn', text: 'Title is too long — trim it to under 15 words' });
    if (questions === 0 && wordCount > 100)
      tips.push({ type:'tip', text: 'Add a question to engage your readers' });
    if (numbers < 2 && wordCount > 200)
      tips.push({ type:'tip', text: 'Add statistics or numbers to add credibility' });
    if (overall >= 75 && tips.length === 0)
      tips.push({ type:'good', text: 'Great quality! Your article is ready to publish.' });
 
    const tipsEl = document.getElementById('quality-tips');
    if (tipsEl) {
      tipsEl.innerHTML = tips.slice(0,4).map(t => `
        <div class="quality-tip quality-tip-${t.type}">
          ${t.type === 'warn' ? '⚠️' : t.type === 'good' ? '✅' : '💡'}
          <span>${t.text}</span>
        </div>`).join('');
    }
  }
function legacyPublishArticle() {
    const title   = document.getElementById('article-title')?.value.trim();
    const text    = document.getElementById('article-editor')?.value.trim();
    const plainText = _writerPlainText(text);
    const cat     = document.getElementById('article-cat')?.value;
    const imgUrl  = document.getElementById('article-img')?.value.trim() || '';
    const tagsVal = document.getElementById('article-tags')?.value || '';
    const editId  = document.getElementById('article-editor')?.dataset?.editId;
 
    if (!title || !plainText) { IBlog.utils.toast('Add a title and content first!', 'error'); return; }
    const isPrem = IBlog.state.currentUser?.plan === 'premium';
    const tags   = tagsVal.split(',').map(t => t.trim()).filter(Boolean);
    const readTime = Math.max(1, Math.ceil(Math.max(1, plainText.split(/\s+/).filter(Boolean).length) / 200)) + ' min';
    const excerpt = plainText.substring(0,160) + (plainText.length>160?'...':'');
 
    if (editId) {
      const existing = IBlog.state.articles.find(x => x.id === parseInt(editId));
      if (existing) {
        Object.assign(existing, {
          title, body: text,
          excerpt: text.substring(0,160) + (text.length>160?'…':''),
          cat: cat !== 'Select Category' ? cat : existing.cat,
          img: imgUrl || existing.img,
          readTime: Math.max(1, Math.ceil(text.split(' ').length/200)) + ' min',
          tags,
          excerpt,
          readTime,
        });
        delete document.getElementById('article-editor').dataset.editId;
        _clearWriter();
        IBlog.Feed.build();
        buildMyArticles();
        IBlog.Dashboard.navigateTo('home');
        IBlog.utils.toast('Article updated!', 'success');
        return;
      }
    }
 
    const a = {
      id: Date.now(),
      author:        IBlog.state.currentUser?.name || 'Amara',
      authorInitial: IBlog.state.currentUser?.initial || 'A',
      authorColor:   'var(--accent)',
      cat:           cat !== 'Select Category' ? cat : 'General',
      img:           imgUrl || null,
      title,
      excerpt:       text.substring(0,160) + (text.length>160?'…':''),
      body:          text,
      templateId:    IBlog.Templates?.selectedId() || null,
      readTime:      Math.max(1, Math.ceil(text.split(' ').length/200)) + ' min',
      likes: 0, comments: [], reposts: 0,
      bookmarked: false, liked: false,
      quality: text.length > 300 ? 'high' : 'med',
      excerpt,
      readTime,
      quality: plainText.length > 300 ? 'high' : 'med',
      isPremiumAuthor: isPrem,
      tags,
      date: 'Just now',
    };
    IBlog.state.articles.unshift(a);
    _clearWriter();
    IBlog.Feed.build();
    buildMyArticles();
    IBlog.Dashboard.navigateTo('home');
    IBlog.utils.toast(isPrem ? '⭐ Premium article published!' : '🚀 Article published!', 'success');
  }

  async function _saveWriterArticle(nextStatus) {
    const title   = document.getElementById('article-title')?.value.trim();
    const text    = document.getElementById('article-editor')?.value.trim();
    const plainText = _writerPlainText(text);
    const cat     = document.getElementById('article-cat')?.value;
    const imgUrl  = document.getElementById('article-img')?.value.trim() || '';
    const tagsVal = document.getElementById('article-tags')?.value || '';
    const editor  = document.getElementById('article-editor');
    const editId  = editor?.dataset?.editId;
    const normalizedStatus = nextStatus === 'draft' ? 'draft' : 'published';
    const hasContent = !!title || !!plainText;
    if (normalizedStatus === 'published' && (!title || !plainText)) {
      IBlog.utils.toast('Add a title and content first!', 'error');
      return false;
    }
    if (normalizedStatus === 'draft' && !hasContent) {
      IBlog.utils.toast('Add a title or some content before saving a draft.', 'error');
      return false;
    }
    const isPrem = IBlog.state.currentUser?.plan === 'premium';
    const tags   = tagsVal.split(',').map(t => t.trim()).filter(Boolean);
    const category = cat !== 'Select Category' ? cat : 'General';
    const existing = editId
      ? (IBlog.state.articles || []).find(x => String(x?.id) === String(editId))
      : null;
    const previousStatus = editor?.dataset?.editStatus || existing?.status || 'published';
    const payload = {
      title,
      body: text,
      category,
      tags: tags.join(', '),
      status: normalizedStatus,
      coverImage: imgUrl,
      readingTime: Math.max(1, Math.ceil(Math.max(1, text.split(/\s+/).filter(Boolean).length) / 200)) + ' min',
      label: IBlog.Templates?.selectedId?.() || 'none',
    };
    const excerpt = plainText.substring(0,160) + (plainText.length>160?'...':'');
    payload.readingTime = Math.max(1, Math.ceil(Math.max(1, plainText.split(/\s+/).filter(Boolean).length) / 200)) + ' min';

    try {
      if (editId && /^\d+$/.test(String(editId)) && window.IBlogArticleSync?.update) {
        await window.IBlogArticleSync.update(Number(editId), payload);
        _clearWriter();
        IBlog.Dashboard.navigateTo(normalizedStatus === 'draft' ? 'articles' : 'home');
        if (normalizedStatus === 'draft') IBlog.utils.toast('Draft saved!', 'success');
        else if (previousStatus === 'draft') IBlog.utils.toast('Draft published!', 'success');
        else IBlog.utils.toast('Article updated!', 'success');
        return true;
      }

      if (!editId && window.IBlogArticleSync?.save) {
        await window.IBlogArticleSync.save(payload);
        _clearWriter();
        IBlog.Dashboard.navigateTo(normalizedStatus === 'draft' ? 'articles' : 'home');
        if (normalizedStatus === 'draft') IBlog.utils.toast('Draft saved!', 'success');
        else IBlog.utils.toast(isPrem ? 'Premium article published!' : 'Article published!', 'success');
        return true;
      }
    } catch (error) {
      console.error('Writer save failed:', error);
      IBlog.utils.toast(error?.message || 'Could not save this article.', 'error');
      return false;
    }

    if (editId && existing) {
      Object.assign(existing, {
        title,
        body: text,
        excerpt: text.substring(0,160) + (text.length>160?'...':''),
        cat: category,
        category,
        img: imgUrl || existing.img || null,
        cover: imgUrl || existing.cover || existing.img || null,
        readTime: payload.readingTime,
        tags,
        templateId: IBlog.Templates?.selectedId?.() || existing.templateId || null,
        status: normalizedStatus,
        excerpt,
        quality: plainText.length > 300 ? 'high' : 'med',
      });
      _clearWriter();
      IBlog.Feed.build();
      buildMyArticles();
      IBlog.Dashboard.navigateTo(normalizedStatus === 'draft' ? 'articles' : 'home');
      if (normalizedStatus === 'draft') IBlog.utils.toast('Draft saved!', 'success');
      else if (previousStatus === 'draft') IBlog.utils.toast('Draft published!', 'success');
      else IBlog.utils.toast('Article updated!', 'success');
      return true;
    }

    const a = {
      id: Date.now(),
      author:        IBlog.state.currentUser?.name || 'Amara',
      authorInitial: IBlog.state.currentUser?.initial || 'A',
      authorColor:   'var(--accent)',
      cat:           category,
      category,
      img:           imgUrl || null,
      cover:         imgUrl || null,
      title,
      excerpt:       text.substring(0,160) + (text.length>160?'...':''),
      body:          text,
      templateId:    IBlog.Templates?.selectedId() || null,
      readTime:      payload.readingTime,
      likes: 0, comments: [], reposts: 0,
      bookmarked: false, liked: false,
      quality: text.length > 300 ? 'high' : 'med',
      isPremiumAuthor: isPrem,
      tags,
      date: 'Just now',
      status: normalizedStatus,
      excerpt,
      quality: plainText.length > 300 ? 'high' : 'med',
    };
    IBlog.state.articles.unshift(a);
    _clearWriter();
    IBlog.Feed.build();
    buildMyArticles();
    IBlog.Dashboard.navigateTo(normalizedStatus === 'draft' ? 'articles' : 'home');
    if (normalizedStatus === 'draft') IBlog.utils.toast('Draft saved!', 'success');
    else IBlog.utils.toast(isPrem ? 'Premium article published!' : 'Article published!', 'success');
    return true;
  }

  function publishArticle() {
    return _saveWriterArticle('published');
  }

  function saveDraftArticle() {
    return _saveWriterArticle('draft');
  }

  function _clearWriter() {
    ['article-title','article-editor','article-img','article-tags'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.value = '';
    });
    const catEl = document.getElementById('article-cat');
    if (catEl) catEl.value = 'Select Category';
    const editor = document.getElementById('article-editor');
    if (editor) {
      delete editor.dataset.editId;
      delete editor.dataset.editStatus;
    }
    document.querySelectorAll('.tpl-card').forEach(c => c.classList.remove('selected'));
    const badge = document.getElementById('wtr-tpl-badge');
    if (badge) badge.style.display = 'none';
    /* Reset quality */
    ['read','depth','struct','eng'].forEach(k => {
      const v = document.getElementById('q-'+k);
      const b = document.getElementById('qb-'+k);
      if (v) v.textContent = '—';
      if (b) b.style.width = '0%';
    });
    document.getElementById('quality-overall')?.style.setProperty('display','none');
    document.getElementById('quality-tips').innerHTML = '';
    removeCoverImage();
    IBlog.Writer?.clear?.();
  }
 


  /* ── My Articles ─────────────────────────────────────── */
  function buildMyArticles() {
    IBlog.MyArticles?.load?.();
  }

  function buildMessages() {
    return IBlog.MessageCenter?.build?.();
  }

  /* ── Saved ───────────────────────────────────────────── */
  function buildSaved() {
    const el = document.getElementById('saved-list');
    if (!el) return;
    if (!IBlog.state.savedArticles.length) {
      el.innerHTML = '<div class="empty-state"><div class="emoji">🔖</div><p>No saved articles. Bookmark from the feed.</p></div>';
      return;
    }
    el.innerHTML = '';
    IBlog.state.savedArticles.forEach((article, index) => {
      const card = IBlog.ArticleCard?.render?.(article, index);
      if (card) {
        el.appendChild(card);
      }
    });
  }

  /* ── Notifications ───────────────────────────────────── */
  function buildNotifications() {
    const el = document.getElementById('notif-list');
    if (!el) return;
    const notifs = [
      { text: '<strong>Léa Moreau</strong> liked your article on Quantum AI', time: '5 min ago', unread: true },
      { text: '<strong>3 new followers</strong> this week — keep publishing!', time: '1 hour ago', unread: true },
      { text: 'Your article is <strong>trending</strong> in the AI community 🔥', time: '3 hours ago', unread: true },
      { text: '<strong>Weekly Digest</strong> is ready — 5 curated picks for you', time: 'Yesterday', unread: false },
      { text: '<strong>Karim Osei</strong> commented on your post', time: '2 days ago', unread: false },
    ];
    el.innerHTML = notifs.map(n => `
<div class="notif-item">
  <div class="notif-dot ${n.unread ? '' : 'read'}"></div>
  <div>
    <div class="notif-text">${n.text}</div>
    <div class="notif-time">${n.time}</div>
  </div>
</div>`).join('');
  }

  /* ── Right Rail ──────────────────────────────────────── */
  
  /* ── Accent Picker ───────────────────────────────────── */
  function buildAccentPicker() {
    const el = document.getElementById('accent-dots');
    if (!el) return;
    el.innerHTML = IBlog.ACCENTS.map(ac => `
<div class="accent-dot${ac.key === IBlog.state.accentKey ? ' active' : ''}"
  style="background:${ac.hex};" data-key="${ac.key}"
  title="${ac.name}"
  onclick="IBlog.utils.applyAccent('${ac.key}')"></div>`
    ).join('');
  }

  /* ── Category Select ─────────────────────────────────── */
  function buildCategorySelect() {
    const sel = document.getElementById('article-cat');
    if (!sel) return;
    const label = IBlog.I18n?.t?.('writer.selectCategory') || 'Select Category';
    sel.innerHTML = `<option>${label}</option>` +
      IBlog.CATEGORIES.map(c => `<option>${IBlog.I18n?.localizeCategory?.(c) || c}</option>`).join('');
  }

  /* ── Public API ──────────────────────────────────────── */
  return {
    initMap, selectCountry, openMapArticle,
    openArticleFromLanding,
    buildActivity,
    buildTrends,
    buildTemplates, selectTemplate, injectSection, analyzeQuality, publishArticle, saveDraftArticle,
    handleImgUpload, removeCoverImage, resetCoverImageAdjustments, refreshCoverPreview: _syncCoverPreview,
    buildMyArticles, buildSaved, buildNotifications, buildMessages,
     buildAccentPicker, buildCategorySelect,
  };
})();

window.openArticleFromLanding = function (index) {
  return IBlog.Views.openArticleFromLanding(index);
};
