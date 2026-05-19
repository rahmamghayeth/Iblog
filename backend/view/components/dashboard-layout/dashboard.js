IBlog.Dashboard = (() => {
  function _runInitStep(label, fn) {
    try {
      return fn?.();
    } catch (error) {
      console.error(`${label} failed:`, error);
      return null;
    }
  }

  function _currentFeedTab() {
    const active = document.querySelector('.feed-tab.active');
    const key = String(active?.dataset?.feedTab || active?.textContent || 'recommended').trim().toLowerCase().replace(/\s+/g, '');
    return ['recommended', 'following', 'latest'].includes(key) ? key : 'recommended';
  }

  function _bindSessionRefresh() {
    if (window.__iblogDashboardSessionBound) return;
    window.addEventListener('iblog:session-changed', () => {
      if (document.getElementById('dashboard')?.style.display === 'none') return;
      _runInitStep('Left rail session refresh', () => IBlog.LeftRail?.init?.());
      _runInitStep('Right rail session refresh', () => typeof initRightRail === 'function' && initRightRail());
      _runInitStep('Dashboard session refresh', () => updateUserUI());
      _runInitStep('Gate refresh', () => refreshGates());
      _runInitStep('Communities refresh', () => IBlog.Communities?.refresh?.());
      _runInitStep('Messages refresh', () => IBlog.Views?.buildMessages?.());
      _runInitStep('Saved refresh', () => window.IBlogSavedSync?.load?.({ quiet: true }));
      IBlogArticleSync?.load?.().catch((error) => {
        console.warn('Article sync refresh failed:', error?.message || error);
      });
    });
    window.__iblogDashboardSessionBound = true;
  }

  function enter() {
    _bindSessionRefresh();
    _runInitStep('Right rail init', () => typeof initRightRail === 'function' && initRightRail());
    _runInitStep('Left rail init', () => IBlog.LeftRail?.init?.());
    _runInitStep('Profile init', () => IBlog.Profile?.init?.());
    _runInitStep('Search init', () => IBlog.Search?.init?.());
    const landing = document.getElementById('landing-page');
    const dash = document.getElementById('dashboard');
    if (landing) landing.style.display = 'none';
    if (dash) dash.style.display = 'block';
    _runInitStep('User UI update', () => updateUserUI());
    _runInitStep('Accent picker', () => IBlog.Views?.buildAccentPicker?.());
    _runInitStep('Category select', () => IBlog.Views?.buildCategorySelect?.());
    _runInitStep('Feed build', () => IBlog.Feed?.build?.(_currentFeedTab()));
    _runInitStep('Communities init', () => IBlog.Communities?.init?.());
    _runInitStep('Trends init', () => IBlog.Trends?.init?.());
    _runInitStep('Notifications build', () => IBlog.Notifications?.init?.());
    _runInitStep('Messages build', () => IBlog.Views?.buildMessages?.());
    _runInitStep('My Articles build', () => IBlog.Views?.buildMyArticles?.());
    _runInitStep('Saved build', () => IBlog.Views?.buildSaved?.());
    _runInitStep('Saved sync load', () => window.IBlogSavedSync?.load?.({ quiet: true }));
    _runInitStep('Templates build', () => IBlog.Views?.buildTemplates?.());
    _runInitStep('Refresh gates', () => refreshGates());
    IBlogArticleSync?.load?.().catch(error => {
      console.warn('Article sync failed:', error.message || error);
    });
    navigateTo('home');
  }

  function _ensureAnalyticsView() {
    if (document.getElementById('view-analytics')) return;
    const cf = document.getElementById('center-feed');
    if (!cf) return;
    const div = document.createElement('div');
    div.className = 'view-panel';
    div.id = 'view-analytics';
    div.innerHTML = `
      <div class="view-header flex-between">
        <div><h1>Analytics</h1><p>Your real content performance</p></div>
      </div>
      <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:14px;margin-bottom:18px;">
        <div class="section-card" style="text-align:center;padding:22px 16px;"><div style="font-size:26px;margin-bottom:6px;">Articles</div><div class="stat-value" id="an-articles">-</div><div class="stat-label">Articles</div></div>
        <div class="section-card" style="text-align:center;padding:22px 16px;"><div style="font-size:26px;margin-bottom:6px;">Views</div><div class="stat-value" id="an-views">-</div><div class="stat-label">Views</div></div>
        <div class="section-card" style="text-align:center;padding:22px 16px;"><div style="font-size:26px;margin-bottom:6px;">Likes</div><div class="stat-value" id="an-likes">-</div><div class="stat-label">Likes</div></div>
        <div class="section-card" style="text-align:center;padding:22px 16px;"><div style="font-size:26px;margin-bottom:6px;">Comments</div><div class="stat-value" id="an-comments">-</div><div class="stat-label">Comments</div></div>
      </div>
      <div class="section-card"><div class="flex-between" style="margin-bottom:16px;"><strong>Views Over Time</strong><span style="color:var(--text2);font-size:12px;">Last 12 weeks</span></div><div id="an-chart-bars" style="display:flex;align-items:flex-end;gap:6px;height:120px;"></div></div>
      <div class="section-card" style="margin-top:16px;"><h3 style="margin-bottom:14px;">Top Articles</h3><div id="an-top-articles"><div style="color:var(--text2);padding:16px;">Loading...</div></div></div>`;
    cf.appendChild(div);
  }

  function _ensureActivityView() {
    if (document.getElementById('view-activity')) return;
    const cf = document.getElementById('center-feed');
    if (!cf) return;
    const div = document.createElement('div');
    div.className = 'view-panel';
    div.id = 'view-activity';
    div.innerHTML = `
      <div class="view-header"><h1>Activity Tracker</h1><p>Your contributions over time</p></div>
      <div class="section-card" style="margin-bottom:18px;">
        <div class="flex-between" style="margin-bottom:14px;">
          <div><strong>2025-2026 Contributions</strong><br><small style="color:var(--text2)">Articles · Comments · Saves</small></div>
          <div class="ai-pill"><span class="ai-dot"></span><span id="act-total">- total</span></div>
        </div>
        <div id="act-heatmap" style="overflow-x:auto;"></div>
        <div style="display:flex;gap:7px;align-items:center;margin-top:10px;font-size:11px;color:var(--text2);">
          Less
          <div style="width:11px;height:11px;border-radius:2px;background:var(--bg3);border:1px solid var(--border);"></div>
          <div style="width:11px;height:11px;border-radius:2px;background:rgba(184,150,12,.2);"></div>
          <div style="width:11px;height:11px;border-radius:2px;background:rgba(184,150,12,.45);"></div>
          <div style="width:11px;height:11px;border-radius:2px;background:rgba(184,150,12,.7);"></div>
          <div style="width:11px;height:11px;border-radius:2px;background:var(--accent);"></div>
          More
        </div>
      </div>
      <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:14px;">
        <div class="stat-box"><span class="stat-value" id="act-streak">-</span><div class="stat-label">Streak</div></div>
        <div class="stat-box"><span class="stat-value" id="act-posts">-</span><div class="stat-label">Articles</div></div>
        <div class="stat-box"><span class="stat-value" id="act-comments-stat">-</span><div class="stat-label">Comments</div></div>
        <div class="stat-box"><span class="stat-value" id="act-saves">-</span><div class="stat-label">Saved</div></div>
      </div>`;
    cf.appendChild(div);
  }

  function updateUserUI() {
    let u = IBlog.state?.currentUser;
    if (!u || !u.name) {
      const raw = sessionStorage.getItem('user');
      if (raw) {
        try {
          u = JSON.parse(raw);
        } catch (_) {}
      }
    }
    if (!u) return;
    IBlog.state = IBlog.state || {};
    IBlog.state.currentUser = u;
    const isPrem = u.plan === 'premium' || u.isPremium === true;
    const initial = u.initial || (u.name ? u.name[0].toUpperCase() : 'A');
    const avatar = document.getElementById('dash-avatar');
    if (avatar) {
      _applyAvatar(avatar, u.avatar, initial);
      avatar.className = 'dash-avatar' + (isPrem ? ' premium' : '');
    }
    const nameEl = document.getElementById('dash-name');
    if (nameEl) nameEl.textContent = u.name || '';
    const planEl = document.getElementById('dash-plan-label');
    if (planEl) {
      const t = IBlog.I18n?.t?.bind(IBlog.I18n);
      planEl.textContent = isPrem
        ? (t ? t('leftRail.premiumMember') : 'Premium Member')
        : (t ? t('leftRail.freeMember') : 'Free Member');
    }
    const ca = document.getElementById('compose-avatar');
    if (ca) _applyAvatar(ca, u.avatar, initial);
    const upgBtn = document.getElementById('upgrade-nav-btn');
    if (upgBtn) upgBtn.style.display = isPrem ? 'none' : 'flex';
    const mapLock = document.getElementById('map-lock');
    if (mapLock) mapLock.style.display = isPrem ? 'none' : 'inline';
    const sName = document.getElementById('settings-name');
    const sEmail = document.getElementById('settings-email');
    const sBio = document.getElementById('settings-bio');
    if (sName) sName.value = u.name || '';
    if (sEmail) sEmail.value = u.email || '';
    if (sBio) sBio.value = u.bio || '';
    const sBtn = document.getElementById('premium-settings-btn');
    const sTxt = document.getElementById('premium-status-text');
    if (sBtn) {
      const t = IBlog.I18n?.t?.bind(IBlog.I18n);
      sBtn.textContent = isPrem
        ? (t ? t('actions.active') : 'Active')
        : (t ? t('actions.upgrade') : 'Upgrade');
      sBtn.onclick = isPrem
        ? () => IBlog.utils?.toast('You already have Premium!', 'success')
        : () => showPremium();
    }
    if (sTxt) {
      const t = IBlog.I18n?.t?.bind(IBlog.I18n);
      sTxt.textContent = isPrem
        ? (t ? t('settings.premiumPlanActive') : 'You are on the Premium plan.')
        : (t ? t('settings.freePlan') : 'You are on the Free plan.');
    }
    if (IBlog.Profile?.buildProfile) IBlog.Profile.buildProfile();
  }

  function refreshGates() {
    let u = IBlog.state?.currentUser;
    if (!u) {
      const raw = sessionStorage.getItem('user');
      if (raw) {
        try {
          u = JSON.parse(raw);
        } catch (_) {}
      }
    }
    const isPrem = u?.plan === 'premium' || u?.isPremium === true;
    const tOver = document.getElementById('template-overlay');
    const tGrid = document.getElementById('template-grid');
    if (tOver) tOver.style.display = isPrem ? 'none' : 'flex';
    if (tGrid) {
      tGrid.style.pointerEvents = isPrem ? 'auto' : 'none';
      tGrid.style.opacity = isPrem ? '1' : '0.35';
    }
    const mOver = document.getElementById('map-premium-overlay');
    if (mOver) mOver.style.display = isPrem ? 'none' : 'flex';
    const sub = document.getElementById('template-subtitle');
    if (sub) {
      sub.textContent = isPrem
        ? 'Select a template to auto-fill your editor'
        : 'Upgrade to access 9 professional templates';
    }
  }

  function navigateTo(view) {
    if (view === 'home') _runInitStep('Home feed rebuild', () => IBlog.Feed?.build?.(_currentFeedTab()));
    if (view === 'analytics') IBlog.Analytics?.init();
    if (view === 'activity') IBlog.Activity?.init();
    if (view === 'communities') IBlog.Communities?.init();
    if (view === 'map') IBlog.Views?.initMap();
    if (view === 'profile') IBlog.Profile?.renderCurrentView?.();
    if (view === 'saved') _buildSavedView();
    if (view === 'messages') IBlog.Views?.buildMessages?.();
    if (view === 'articles') IBlog.Views?.buildMyArticles();
    if (view === 'trends') IBlog.Trends?.init();
    if (view === 'write') IBlog.Writer?.init();
    document.querySelectorAll('.view-panel').forEach(v => v.classList.remove('active'));
    const el = document.getElementById('view-' + view);
    if (el) el.classList.add('active');
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
    IBlog.LeftRail?.resetScroll?.();
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    const nav = document.querySelector(`.nav-item[data-view="${view}"]`);
    if (nav) nav.classList.add('active');
    if (view === 'articles') requestAnimationFrame(() => IBlog.MyArticles?.load?.());
    if (view === 'analytics') requestAnimationFrame(() => IBlog.Analytics?.init?.());
  }

  function gateMap() {
    let u = IBlog.state?.currentUser;
    if (u?.plan === 'premium') navigateTo('map');
    else showPremium();
  }

  function _buildSavedView() {
    IBlog.Views?.buildSaved?.();
  }

  function toggleDark() {
    if (window._dashToggleDark) window._dashToggleDark();
  }

  function signout() {
    window.IBlogSession?.destroy?.();
    const dash = document.getElementById('dashboard');
    const land = document.getElementById('landing-page');
    if (dash) dash.style.display = 'none';
    if (land) land.style.display = 'block';
    IBlog.Dashboard.initHero?.();
    IBlog.Dashboard.buildTicker?.();
    IBlog.Dashboard.buildLandingCarousel?.();
    IBlog.utils?.toast('Signed out.');
  }

  function switchFeedTab(el, tab) {
    document.querySelectorAll('.feed-tab').forEach(t => t.classList.remove('active'));
    el.classList.add('active');
    IBlog.Feed?.build(tab);
  }

  function _setTextContent(id, text) {
    const el = document.getElementById(id);
    if (el) el.textContent = text;
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

  const HERO_SLIDES = [
    {
      cat: 'Welcome',
      title: '<em>Write, publish and grow</em> with your real content.',
      author: 'IBlog',
      date: '',
      readTime: '',
      bg: 'linear-gradient(135deg,#1a1a2e,#0f3460,#533483)',
      thumb: 'linear-gradient(135deg,#1a1a2e,#533483)',
    },
    {
      cat: 'Your Workspace',
      title: 'Your dashboard now reflects <em>real accounts and live data</em> only.',
      author: 'IBlog',
      date: '',
      readTime: '',
      bg: 'linear-gradient(135deg,#0d0d0d,#2d1b00,#4a2800)',
      thumb: 'linear-gradient(135deg,#2d1b00,#b8960c)',
    },
    {
      cat: 'Get Started',
      title: 'Publish an article or join a community to <em>populate your feed</em>.',
      author: 'IBlog',
      date: '',
      readTime: '',
      bg: 'linear-gradient(135deg,#0a0a1a,#001233,#001f3f)',
      thumb: 'linear-gradient(135deg,#001233,#0f3460)',
    },
  ];

  let _heroIdx = 0;
  let _heroTimer = null;

  function initHero() {
    _buildHeroThumbs();
    _buildHeroDots();
    _updateHero(0);
    _startHeroAuto();
    const nav = document.getElementById('landing-nav');
    window.addEventListener('scroll', () => {
      if (!nav) return;
      nav.classList.toggle('light-nav', window.scrollY > 80);
    }, { passive: true });
    const wEl = document.getElementById('nav-weather');
    if (wEl) wEl.textContent = '18° Tunis';
  }

  function _buildHeroThumbs() {
    const el = document.getElementById('hero-thumbs');
    if (!el) return;
    el.innerHTML = HERO_SLIDES
      .map((s, i) => `<div class="hero-thumb${i === 0 ? ' active' : ''}" style="background:${s.thumb};" onclick="IBlog.Dashboard.heroGo(${i})"></div>`)
      .join('');
  }

  function _buildHeroDots() {
    const el = document.getElementById('hero-dots');
    if (!el) return;
    el.innerHTML = HERO_SLIDES
      .map((_, i) => `<div class="hero-dot${i === 0 ? ' active' : ''}" onclick="IBlog.Dashboard.heroGo(${i})"></div>`)
      .join('');
  }

  function _updateHero(idx) {
    const s = HERO_SLIDES[idx];
    const n = HERO_SLIDES.length;
    document.querySelectorAll('.hero-slide').forEach((sl, i) => {
      sl.classList.toggle('active', i === idx);
      if (i === idx) sl.style.background = s.bg;
    });
    document.querySelectorAll('.hero-thumb').forEach((t, i) => t.classList.toggle('active', i === idx));
    document.querySelectorAll('.hero-dot').forEach((d, i) => d.classList.toggle('active', i === idx));
    _setTextContent('hero-cat', s.cat);
    _setTextContent('hero-counter', `- ${String(idx + 1).padStart(2, '0')} / ${String(n).padStart(2, '0')}`);
    _setTextContent('hero-counter-br', `${idx + 1} / ${n}`);
    const titleEl = document.getElementById('hero-title');
    if (titleEl) titleEl.innerHTML = s.title;
    const byEl = document.getElementById('hero-byline');
    if (byEl) {
      const meta = [s.author, s.date, s.readTime ? `${s.readTime} read` : ''].filter(Boolean);
      byEl.innerHTML = meta.length
        ? meta.map((part, i) => `${i ? '<span style="opacity:.4">·</span>' : ''}<span>${part}</span>`).join('')
        : '<span>Real content only</span>';
    }
  }

  function heroGo(idx) {
    _heroIdx = idx;
    _updateHero(idx);
    _startHeroAuto();
  }

  function heroPrev() {
    heroGo((_heroIdx - 1 + HERO_SLIDES.length) % HERO_SLIDES.length);
  }

  function heroNext() {
    heroGo((_heroIdx + 1) % HERO_SLIDES.length);
  }

  function _startHeroAuto() {
    clearInterval(_heroTimer);
    _heroTimer = setInterval(() => {
      _heroIdx = (_heroIdx + 1) % HERO_SLIDES.length;
      _updateHero(_heroIdx);
    }, 5500);
  }

  function buildTicker() {
    const el = document.getElementById('ticker-inner');
    if (!el) return;
    const topics = Array.isArray(IBlog.TOPICS)
      ? IBlog.TOPICS.filter(Boolean).map(topic => IBlog.I18n?.localizeTopic?.(topic) || topic)
      : [];
    if (!topics.length) {
      el.innerHTML = '<div class="ticker-item"><span class="ticker-dot"></span>Live topics will appear here once content is published.</div>';
      return;
    }
    const items = [...topics, ...topics];
    el.innerHTML = items.map(t => `<div class="ticker-item"><span class="ticker-dot"></span>${t}</div>`).join('');
    el.innerHTML += el.innerHTML;
  }

  function buildLandingCarousel() {
    const track = document.getElementById('landing-carousel');
    if (!track) return;
    const source = Array.isArray(IBlog.SEED_ARTICLES) ? IBlog.SEED_ARTICLES.filter(Boolean) : [];
    if (!source.length) {
      track.innerHTML = `
        <div class="c-card" style="min-width:min(420px,100%);cursor:default;">
          <div class="c-body">
            <div class="c-cat">Featured</div>
            <div class="c-title">Featured articles will appear here once real content is available.</div>
            <div class="c-meta"><span>Publish your first article to populate this area.</span></div>
          </div>
        </div>`;
      return;
    }
    const cards = [...source, ...source.slice(0, 6)];
    track.innerHTML = cards.concat(cards).map((a, gi) => `
      <div class="c-card">
        <div class="c-img" style="${a.img ? `background-image:url('${a.img}')` : `background:linear-gradient(135deg,hsl(${gi * 44 % 360},45%,88%),hsl(${gi * 80 % 360},50%,82%))`}"></div>
        <div class="c-body">
          <div class="c-cat">${a.cat || ''}</div>
          <div class="c-title">${a.title || ''}</div>
          <div class="c-meta"><span>${a.author || 'Unknown author'}</span><span>${a.readTime || ''}</span><span>${a.likes ?? 0} likes</span></div>
        </div>
      </div>`).join('');
  }

  function toggleLandingDark() {
    if (typeof window.toggleDark === 'function') {
      window.toggleDark();
      return;
    }
    document.documentElement.classList.toggle('dark');
    document.body.classList.toggle('dark');
  }

  return {
    enter,
    updateUserUI,
    refreshGates,
    navigateTo,
    gateMap,
    toggleDark,
    signout,
    switchFeedTab,
    initHero,
    heroPrev,
    heroNext,
    heroGo,
    buildTicker,
    buildLandingCarousel,
    toggleLandingDark,
    get _heroIdx() {
      return _heroIdx;
    },
  };
})();
