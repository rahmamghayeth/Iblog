(function () {
  let resizeHandler = null;
  let loadHandler = null;
  let activeFrame = 0;
  let resizeObserver = null;
  let mutationObserver = null;
  let enterHandler = null;
  let leaveHandler = null;
  let activeTrack = null;

  function esc(value) {
    return String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function init() {
    _teardownMotion();

    const root = document.getElementById('carousel-root');
    if (!root) return;

    root.innerHTML = `
      <section class="carousel-section" id="trending">
        <div class="carousel-header reveal">
          <span class="section-eyebrow">${IBlog.I18n?.t?.('misc.featured') || 'Featured'}</span>
          <h2>${IBlog.I18n?.t?.('misc.trendingWeek') || 'Trending this week'}</h2>
        </div>
        <div class="carousel-wrapper" id="carousel-wrapper" style="position:relative;overflow:hidden;cursor:grab;user-select:none;padding-inline:8px;">
          <div class="carousel-track" id="carousel-track" style="display:flex;gap:0;padding:6px 26px 14px;width:max-content;align-items:stretch;will-change:transform;transform:translate3d(0,0,0);"></div>
        </div>
      </section>
    `;

    const track = document.getElementById('carousel-track');
    const source = Array.isArray(window.IBlog?.SEED_ARTICLES) ? window.IBlog.SEED_ARTICLES : [];
    if (!track || !source.length) return;

    const wrapper = document.getElementById('carousel-wrapper');
    if (!wrapper) return;

    const localized = source.map((article) => IBlog.I18n?.localizeArticle?.(article) || article);
    const minCards = Math.max(
      localized.length,
      Math.ceil((wrapper.clientWidth || window.innerWidth || 1200) / 194) + 2
    );
    const tickerCards = [];
    while (tickerCards.length < minCards) {
      tickerCards.push(...localized);
    }
    const cards = tickerCards.slice(0, minCards);

    const groupMarkup = cards.map((article) => `
      <div class="c-card" onclick="openArticleFromLanding(${Number(article.id)})">
        <div class="c-img">
          <img src="${esc(article.img || article.cover || '')}" alt="${esc(article.title || 'Article')}" loading="lazy"
               onerror="this.parentNode.style.background='#1a2d63'; this.remove();">
          <div class="c-img-overlay"></div>
          <button class="c-read-btn" onclick="event.stopPropagation(); openArticleFromLanding(${Number(article.id)})">
            ${IBlog.I18n?.t?.('misc.readArticle') || 'Read Article'} →
          </button>
        </div>
        <div class="c-body">
          <div class="c-cat">${esc(article.cat || article.category || 'Featured')}</div>
          <div class="c-title">${esc(article.title || '')}</div>
          <div class="c-meta">
            <span>${esc(article.author || '')}</span>
            <span class="c-meta-dot"></span>
            <span>${esc(article.date || '')}</span>
            <span class="c-read-badge">${esc(article.readTime || '')}</span>
          </div>
        </div>
      </div>
    `).join('');

    track.innerHTML = `
      <div class="carousel-group" style="display:flex;gap:16px;align-items:stretch;flex-shrink:0;min-width:max-content;">${groupMarkup}</div>
      <div class="carousel-group" aria-hidden="true" style="display:flex;gap:16px;align-items:stretch;flex-shrink:0;min-width:max-content;">${groupMarkup}</div>
    `;

    _startTranslateLoop(track, wrapper);
  }

  function _teardownMotion() {
    if (activeFrame) {
      cancelAnimationFrame(activeFrame);
      activeFrame = 0;
    }
    if (resizeHandler) {
      window.removeEventListener('resize', resizeHandler);
      resizeHandler = null;
    }
    if (loadHandler) {
      window.removeEventListener('load', loadHandler);
      loadHandler = null;
    }
    if (resizeObserver) {
      resizeObserver.disconnect();
      resizeObserver = null;
    }
    if (mutationObserver) {
      mutationObserver.disconnect();
      mutationObserver = null;
    }
    if (activeTrack && enterHandler) {
      activeTrack.removeEventListener('mouseenter', enterHandler);
    }
    if (activeTrack && leaveHandler) {
      activeTrack.removeEventListener('mouseleave', leaveHandler);
    }
    activeTrack = null;
    enterHandler = null;
    leaveHandler = null;
  }

  function _startTranslateLoop(track, wrapper) {
    const primaryGroup = track.querySelector('.carousel-group');
    if (!primaryGroup) return;
    const landingPage = document.getElementById('landing-page');
    let paused = false;
    let lastTime = 0;
    let offset = 0;
    let loopDistance = 0;
    const speed = 34;

    const isVisible = () => {
      const rect = wrapper.getBoundingClientRect();
      return rect.width > 32 && rect.height > 32 && wrapper.offsetParent !== null;
    };

    const measure = () => {
      const measuredWidth = primaryGroup.getBoundingClientRect().width || primaryGroup.scrollWidth || 0;
      if (!Number.isFinite(measuredWidth) || measuredWidth <= 0) {
        loopDistance = 0;
        track.style.setProperty('--carousel-loop-distance', `${wrapper.clientWidth || 1}px`);
        return false;
      }
      loopDistance = measuredWidth;
      track.style.setProperty('--carousel-loop-distance', `${loopDistance}px`);
      return true;
    };

    const animate = (now) => {
      if (!lastTime) lastTime = now;
      const delta = now - lastTime;
      lastTime = now;

      if (!paused && isVisible()) {
        if (!loopDistance) measure();
        if (loopDistance > 0) {
          offset += (delta / 1000) * speed;
          if (offset >= loopDistance) offset -= loopDistance;
          track.style.transform = `translate3d(${-offset}px, 0, 0)`;
        }
      }

      activeFrame = requestAnimationFrame(animate);
    };

    resizeHandler = () => measure();
    window.addEventListener('resize', resizeHandler, { passive: true });

    loadHandler = () => measure();
    window.addEventListener('load', loadHandler, { once: true });

    enterHandler = () => { paused = true; };
    leaveHandler = () => { paused = false; };
    activeTrack = track;
    track.addEventListener('mouseenter', enterHandler);
    track.addEventListener('mouseleave', leaveHandler);

    if ('ResizeObserver' in window) {
      resizeObserver = new ResizeObserver(() => {
        const hadDistance = loopDistance > 0;
        const ok = measure();
        if (!hadDistance && ok) {
          track.style.transform = 'translate3d(0, 0, 0)';
          offset = 0;
        }
      });
      resizeObserver.observe(wrapper);
      resizeObserver.observe(primaryGroup);
    }

    if (landingPage && 'MutationObserver' in window) {
      mutationObserver = new MutationObserver(() => {
        if (isVisible()) measure();
      });
      mutationObserver.observe(landingPage, {
        attributes: true,
        attributeFilter: ['style', 'class'],
      });
    }

    track.querySelectorAll('img').forEach((img) => {
      if (!img.complete) {
        img.addEventListener('load', measure, { once: true });
        img.addEventListener('error', measure, { once: true });
      }
    });

    measure();
    activeFrame = requestAnimationFrame(animate);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  IBlog.Carousel = { init };
})();
