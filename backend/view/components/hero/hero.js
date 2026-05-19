window.IBlog = window.IBlog || {};

IBlog.Hero = (() => {
  let autoTimer = null;
  let keyHandler = null;

  function getSlides() {
    const localizedSource = (Array.isArray(window.IBlog?.SEED_ARTICLES) ? window.IBlog.SEED_ARTICLES : [])
      .slice(0, 3)
      .map((article, index) => {
        const localized = window.IBlog?.I18n?.localizeArticle?.(article) || article;
        return {
          id: article.id,
          title: localized.title || article.title || 'Featured story',
          category: localized.cat || localized.category || article.cat || article.category || 'Featured',
          author: localized.author || article.author || 'IBlog',
          readTime: localized.readTime || article.readTime || '5 min',
          image: article.cover || article.img || '',
          index,
        };
      });

    if (localizedSource.length) return localizedSource;

    return [
      {
        id: 9001,
        title: 'Read, write and share real stories with your community.',
        category: 'Featured',
        author: 'IBlog',
        readTime: '5 min',
        image: 'https://images.unsplash.com/photo-1455390582262-044cdead277a?auto=format&fit=crop&w=1800&q=80',
        index: 0,
      },
    ];
  }

  function render() {
    const slidesData = getSlides();
    const root = document.getElementById('hero-root');
    if (!root) return;

    root.innerHTML = `
      <section class="hero-shell" id="hero">
        <div class="hero-prog-bar" id="heroProgBar"></div>
        <div class="hero-slides" id="heroSlides">
          ${slidesData.map((slide, index) => `
            <div class="hslide${index === 0 ? ' active' : ''}">
              <div class="slide-bg" style="background-image:url('${String(slide.image).replace(/'/g, '&#39;')}')"></div>
              <div class="slide-overlay"></div>
              <div class="slide-tint"></div>
              <div class="slide-body">
                <div class="slide-eyebrow">
                  <span class="slide-cat">${escapeHero(slide.category)}</span>
                  <span class="slide-num">- ${String(index + 1).padStart(2, '0')} / ${String(slidesData.length).padStart(2, '0')}</span>
                </div>
                <h2 class="slide-hl">${highlightTitle(slide.title)}</h2>
                <div class="slide-meta">
                  <span>${escapeHero(slide.author)}</span>
                  <span class="slide-meta-dot"></span>
                  <span>${escapeHero(slide.readTime)}</span>
                </div>
                <a href="#" class="slide-cta" data-landing-article="${slide.id}">
                  ${(window.IBlog?.I18n?.t?.('misc.readArticle')) || 'Read Article'}
                  <svg viewBox="0 0 24 24"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
                </a>
              </div>
            </div>
          `).join('')}
        </div>

        <button class="hero-arrow ha-prev" id="heroPrev" aria-label="Previous slide">
          <svg viewBox="0 0 24 24"><polyline points="15 18 9 12 15 6"/></svg>
        </button>
        <button class="hero-arrow ha-next" id="heroNext" aria-label="Next slide">
          <svg viewBox="0 0 24 24"><polyline points="9 6 15 12 9 18"/></svg>
        </button>

        <div class="hero-dots" id="heroDots">
          ${slidesData.map((_, index) => `<button class="h-dot${index === 0 ? ' active' : ''}"></button>`).join('')}
        </div>

        <div class="hero-counter"><strong id="hero-cur">1</strong> / ${slidesData.length}</div>
      </section>
    `;

    bind(slidesData.length);
  }

  function bind(total) {
    const slides = Array.from(document.querySelectorAll('.hslide'));
    const dots = Array.from(document.querySelectorAll('.h-dot'));
    const track = document.getElementById('heroSlides');
    const bar = document.getElementById('heroProgBar');
    const curEl = document.getElementById('hero-cur');
    const delay = 7200;
    const transitionMs = 850;

    let current = 0;
    let busy = false;

    function resetBar() {
      if (!bar) return;
      bar.style.transition = 'none';
      bar.style.width = '0%';
      bar.offsetWidth;
      bar.style.transition = `width ${delay}ms linear`;
      bar.style.width = '100%';
    }

    function goTo(next) {
      if (busy || next === current || !slides.length) return;
      busy = true;
      slides[current]?.classList.remove('active');
      dots[current]?.classList.remove('active');
      current = ((next % total) + total) % total;
      slides[current]?.classList.add('active');
      dots[current]?.classList.add('active');
      if (track) track.style.transform = `translateX(-${current * 100}%)`;
      if (curEl) curEl.textContent = current + 1;
      window.clearTimeout(goTo._busyTimer);
      goTo._busyTimer = window.setTimeout(() => {
        busy = false;
      }, transitionMs);
      resetBar();
    }

    function scheduleNext() {
      window.clearTimeout(autoTimer);
      autoTimer = window.setTimeout(() => {
        goTo(current + 1);
        scheduleNext();
      }, delay);
    }

    document.getElementById('heroPrev')?.addEventListener('click', () => {
      window.clearTimeout(autoTimer);
      goTo(current - 1);
      scheduleNext();
    });

    document.getElementById('heroNext')?.addEventListener('click', () => {
      window.clearTimeout(autoTimer);
      goTo(current + 1);
      scheduleNext();
    });

    dots.forEach((dot, i) => {
      dot.addEventListener('click', () => {
        window.clearTimeout(autoTimer);
        goTo(i);
        scheduleNext();
      });
    });

    document.querySelectorAll('[data-landing-article]').forEach((link) => {
      link.addEventListener('click', (event) => {
        event.preventDefault();
        const articleId = Number(link.getAttribute('data-landing-article') || 0);
        if (articleId) {
          window.openArticleFromLanding?.(articleId);
        }
      });
    });

    let touchX = 0;
    track?.addEventListener('touchstart', (event) => {
      touchX = event.touches[0].clientX;
    }, { passive: true });

    track?.addEventListener('touchend', (event) => {
      const dx = event.changedTouches[0].clientX - touchX;
      if (Math.abs(dx) > 50) {
        window.clearTimeout(autoTimer);
        goTo(dx < 0 ? current + 1 : current - 1);
        scheduleNext();
      }
    }, { passive: true });

    if (keyHandler) {
      document.removeEventListener('keydown', keyHandler);
    }
    keyHandler = (event) => {
      if (document.getElementById('landing-page')?.style.display === 'none') return;
      if (event.key === 'ArrowRight') {
        window.clearTimeout(autoTimer);
        goTo(current + 1);
        scheduleNext();
      }
      if (event.key === 'ArrowLeft') {
        window.clearTimeout(autoTimer);
        goTo(current - 1);
        scheduleNext();
      }
    };
    document.addEventListener('keydown', keyHandler);

    resetBar();
    scheduleNext();
  }

  function init() {
    window.clearTimeout(autoTimer);
    render();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  return { init };
})();

function escapeHero(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function highlightTitle(title) {
  const safe = escapeHero(title);
  const words = safe.split(' ');
  if (words.length < 4) return safe;
  const emphasisSize = words.length >= 9 ? 4 : words.length >= 6 ? 3 : 2;
  const pivot = Math.max(1, words.length - emphasisSize);
  return `${words.slice(0, pivot).join(' ')} <em>${words.slice(pivot).join(' ')}</em>`;
}
