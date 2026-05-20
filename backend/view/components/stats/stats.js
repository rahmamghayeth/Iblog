IBlog.Analytics = (() => {
  'use strict';

  const STATS_API = 'backend/view/components/auth/api-stats.php';
  const _t = (key, vars = {}) => IBlog.I18n?.t?.(key, vars) || key;

  async function _post(action) {
    const response = await fetch(STATS_API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action }),
    });
    const text = await response.text();
    if (!text.trim().startsWith('{')) throw new Error('Analytics request failed.');
    return JSON.parse(text);
  }

  async function init() {
    _injectHTML();
    await Promise.all([_loadKPIs(), _loadChart(), _loadTopArticles(), _loadActivity()]);
  }

  function _injectHTML() {
    const centerFeed = document.getElementById('center-feed');
    if (!centerFeed) return;

    let panel = document.getElementById('view-analytics');
    if (!panel) {
      panel = document.createElement('div');
      panel.className = 'view-panel';
      panel.id = 'view-analytics';
      centerFeed.appendChild(panel);
    }

    panel.innerHTML = `
      <div class="view-header an-header">
        <div>
          <h1>${_t('analytics.title')}</h1>
          <p>${_t('analytics.subtitle')}</p>
        </div>
        <div class="an-date-badge">${_t('analytics.last12Weeks')}</div>
      </div>

      <div class="an-kpi-grid" id="an-kpi-grid">
        ${_kpi('an-articles', _t('analytics.articlesPublished'), 'AR')}
        ${_kpi('an-views', _t('analytics.totalViews'), 'VW')}
        ${_kpi('an-likes', _t('analytics.totalLikes'), 'LK')}
        ${_kpi('an-comments', _t('analytics.commentsReceived'), 'CM')}
        ${_kpi('an-saved', _t('analytics.savedArticles'), 'SV')}
      </div>

      <div class="an-insights-grid">
        <section class="an-section-card">
          <div class="an-card-header">
            <div>
              <strong>${_t('analytics.audienceMomentum')}</strong>
              <div class="an-card-sub">${_t('analytics.audienceMomentumSub')}</div>
            </div>
            <span class="an-card-chip">${_t('analytics.weekly')}</span>
          </div>
          <div id="an-chart-bars" class="an-chart-shell">
            <div class="an-empty">${_t('analytics.loadingChart')}</div>
          </div>
        </section>

        <section class="an-section-card">
          <div class="an-card-header">
            <div>
              <strong>${_t('analytics.activityPulse')}</strong>
              <div class="an-card-sub">${_t('analytics.activityPulseSub')}</div>
            </div>
            <span class="an-card-chip" id="an-activity-total">0 ${_t('analytics.total')}</span>
          </div>
          <div id="an-activity-heatmap">
            <div class="an-empty">${_t('analytics.loadingActivity')}</div>
          </div>
          <div class="an-activity-legend">
            <span>${_t('analytics.less')}</span>
            <span class="an-legend-swatch is-0"></span>
            <span class="an-legend-swatch is-1"></span>
            <span class="an-legend-swatch is-2"></span>
            <span class="an-legend-swatch is-3"></span>
            <span class="an-legend-swatch is-4"></span>
            <span>${_t('analytics.more')}</span>
          </div>
          <div id="an-activity-months" class="an-activity-months"></div>
          <div id="an-activity-recent" class="an-recent-list"></div>
        </section>
      </div>

      <section class="an-section-card">
        <div class="an-card-header">
          <div>
            <strong>${_t('analytics.topPerforming')}</strong>
            <div class="an-card-sub">${_t('analytics.topPerformingSub')}</div>
          </div>
        </div>
        <div id="an-top-articles">
          <div class="an-empty">${_t('analytics.loadingArticles')}</div>
        </div>
      </section>`;
  }

  function _kpi(id, label, iconText) {
    return `
      <div class="an-kpi">
        <div class="an-kpi-icon">${_escapeHTML(iconText)}</div>
        <div>
          <div class="an-kpi-val" id="${id}">0</div>
          <div class="an-kpi-label">${_escapeHTML(label)}</div>
        </div>
      </div>`;
  }

  async function _loadKPIs() {
    try {
      const data = await _post('my_stats');
      if (!data.ok) return;
      _counter('an-articles', Number(data.articles || 0));
      _counter('an-views', Number(data.views || 0));
      _counter('an-likes', Number(data.likes || 0));
      _counter('an-comments', Number(data.comments || 0));
      _counter('an-saved', Number(data.saved || 0));
    } catch (error) {
      console.warn('Analytics KPI error:', error.message);
    }
  }

  function _counter(id, target) {
    const el = document.getElementById(id);
    if (!el) return;
    const start = performance.now();
    const duration = 900;

    function step(now) {
      const progress = Math.min((now - start) / duration, 1);
      el.textContent = _formatNumber(Math.round((1 - Math.pow(1 - progress, 3)) * target));
      if (progress < 1) requestAnimationFrame(step);
    }

    requestAnimationFrame(step);
  }

  async function _loadChart() {
    const container = document.getElementById('an-chart-bars');
    if (!container) return;

    let weeks = [];
    try {
      const data = await _post('chart');
      weeks = data.ok && Array.isArray(data.weeks) ? data.weeks : [];
    } catch (_) {}

    if (!weeks.length) {
      container.innerHTML = `<div class="an-empty">${_t('analytics.noChartData')}</div>`;
      return;
    }

    const maxValue = Math.max(
      1,
      ...weeks.map((week) => Math.max(Number(week.views || 0), Number(week.likes || 0)))
    );
    const chartMax = _resolveChartMax(maxValue);
    const guideValues = [chartMax, chartMax * (2 / 3), chartMax * (1 / 3), 0];

    container.innerHTML = `
      <div class="an-chart-grid">
        <div class="an-chart-guides">
          ${guideValues.map((value) => `<span>${_formatAxisValue(value)}</span>`).join('')}
        </div>
        <div class="an-chart-bars-wrap">
          ${guideValues.slice(0, 3).map(() => '<div class="an-chart-line"></div>').join('')}
          <div class="an-chart-columns">
            ${weeks.map((week) => {
              const views = Number(week.views || 0);
              const likes = Number(week.likes || 0);
              const viewsHeight = Math.max(6, Math.round((views / chartMax) * 150));
              const likesHeight = Math.max(likes > 0 ? 6 : 0, Math.round((likes / chartMax) * 120));
              return `
                <div class="an-chart-col" title="${_escapeHTML(week.label || '')}: ${views} ${_t('analytics.views')}, ${likes} ${_t('analytics.likes')}">
                  <div class="an-chart-bars-stack">
                    <div class="an-chart-bar an-chart-bar-views" style="height:${viewsHeight}px"></div>
                    <div class="an-chart-bar an-chart-bar-likes" style="height:${likesHeight}px"></div>
                  </div>
                  <div class="an-chart-label">${_escapeHTML(week.label || '')}</div>
                </div>`;
            }).join('')}
          </div>
        </div>
      </div>
      <div class="an-chart-legend">
        <span><i class="an-chart-dot views"></i>${_t('analytics.views')}</span>
        <span><i class="an-chart-dot likes"></i>${_t('analytics.likes')}</span>
      </div>`;
  }

  function _resolveChartMax(maxValue) {
    const safeMax = Math.max(1, Number(maxValue || 0));
    if (safeMax <= 1) return 1;
    return Math.ceil(safeMax / 3) * 3;
  }

  function _formatAxisValue(value) {
    const numeric = Math.max(0, Number(value || 0));
    const locale = IBlog.I18n?.meta?.().locale || 'en-US';
    return new Intl.NumberFormat(locale, {
      minimumFractionDigits: numeric > 0 && numeric < 10 && !Number.isInteger(numeric) ? 1 : 0,
      maximumFractionDigits: numeric > 0 && numeric < 10 && !Number.isInteger(numeric) ? 1 : 0,
    }).format(numeric);
  }

  async function _loadTopArticles() {
    const el = document.getElementById('an-top-articles');
    if (!el) return;

    let topArticles = [];
    try {
      const data = await _post('my_stats');
      topArticles = data.ok && Array.isArray(data.topArticles) ? data.topArticles : [];
    } catch (_) {}

    if (!topArticles.length) {
      el.innerHTML = `<div class="an-empty">${_t('analytics.noPublishedArticles')}</div>`;
      return;
    }

    const medals = ['1', '2', '3', '4', '5'];
    const maxViews = Math.max(1, ...topArticles.map((article) => Number(article.views || 0)));

    el.innerHTML = topArticles.map((article, index) => {
      const views = Number(article.views || 0);
      const likes = Number(article.likesCount || 0);
      return `
        <article class="an-article-row"
                 onclick="IBlog.Feed?.openReader?.(${Number(article.id || 0)})">
          <div class="an-rank">${medals[index]}</div>
          <div class="an-article-info">
            <div class="an-article-title">${_escapeHTML(article.title || _t('analytics.untitledArticle'))}</div>
            <div class="an-article-bar-wrap">
              <div class="an-article-bar" style="width:${Math.max(8, Math.round((views / maxViews) * 100))}%"></div>
            </div>
            <div class="an-article-meta">
              <span>${_formatNumber(views)} ${_t('analytics.views')}</span>
              <span>${_formatNumber(likes)} ${_t('analytics.likes')}</span>
              <span>${_escapeHTML(IBlog.I18n?.localizeReadTime?.(article.readingTime || '5 min') || article.readingTime || '5 min')}</span>
              <span>${_escapeHTML(article.category || _t('analytics.general'))}</span>
            </div>
          </div>
        </article>`;
    }).join('');
  }

  async function _loadActivity() {
    try {
      const data = await _post('activity');
      if (data.ok) {
        _renderActivity(Array.isArray(data.days) ? data.days : [], Array.isArray(data.recent) ? data.recent : []);
        return;
      }
    } catch (_) {}

    _renderActivity([], []);
  }

  function _renderActivity(days, recent) {
    const container = document.getElementById('an-activity-heatmap');
    const monthsEl = document.getElementById('an-activity-months');
    const totalEl = document.getElementById('an-activity-total');
    const recentEl = document.getElementById('an-activity-recent');

    if (!container || !Array.isArray(days) || !days.length) {
      if (container) container.innerHTML = `<div class="an-empty">${_t('analytics.noActivityData')}</div>`;
      if (monthsEl) monthsEl.innerHTML = '';
      if (totalEl) totalEl.textContent = `0 ${_t('analytics.total')}`;
      if (recentEl) recentEl.innerHTML = `<div class="an-empty">${_t('analytics.noRecentActivity')}</div>`;
      return;
    }

    const total = days.reduce((sum, day) => sum + Number(day.count || 0), 0);
    if (totalEl) totalEl.textContent = `${_formatNumber(total)} ${_t('analytics.total')}`;

    const locale = IBlog.I18n?.meta?.().locale || 'en-US';
    const weekdayFormatter = new Intl.DateTimeFormat(locale, { weekday: 'short' });
    const monthFormatter = new Intl.DateTimeFormat(locale, { month: 'short' });
    const parseDate = (value) => {
      const date = new Date(value);
      date.setHours(0, 0, 0, 0);
      return date;
    };
    const formatKey = (date) => {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };
    const addDays = (date, amount) => {
      const next = new Date(date);
      next.setDate(next.getDate() + amount);
      return next;
    };
    const dayMap = new Map(days.map((day) => [String(day.date), day]));
    const sortedDays = [...days].sort((a, b) => parseDate(a.date) - parseDate(b.date));
    const today = parseDate(new Date());
    const lastActivityDate = parseDate(sortedDays[sortedDays.length - 1].date);
    const displayEnd = lastActivityDate > today ? lastActivityDate : today;
    const displayStart = addDays(displayEnd, -364);
    const startOffset = (displayStart.getDay() + 6) % 7;
    const rangeStart = addDays(displayStart, -startOffset);
    const endOffset = 6 - ((displayEnd.getDay() + 6) % 7);
    const rangeEnd = addDays(displayEnd, endOffset);
    const orderedWeeks = [];

    for (let cursor = new Date(rangeStart); cursor <= rangeEnd; cursor = addDays(cursor, 7)) {
      const week = [];
      for (let offset = 0; offset < 7; offset += 1) {
        const currentDate = addDays(cursor, offset);
        const key = formatKey(currentDate);
        const existingDay = dayMap.get(key);
        week.push(existingDay || { date: key, count: 0, _isPadding: currentDate < displayStart || currentDate > displayEnd });
      }
      orderedWeeks.push(week);
    }

    container.innerHTML = `
      <div class="an-heatmap-wrap">
        <div class="an-heatmap-axis">
          ${['', 1, '', 3, '', 5, ''].map((label) => {
            if (label === '') return '<span></span>';
            const date = new Date(Date.UTC(2026, 0, 4 + Number(label)));
            return `<span>${weekdayFormatter.format(date)}</span>`;
          }).join('')}
        </div>
        <div class="an-heatmap-grid">
          ${orderedWeeks.map((week) => `
            <div class="an-heatmap-week">
              ${week.map((day) => {
                const count = Number(day.count || 0);
                const level = count === 0 ? 0 : count === 1 ? 1 : count <= 3 ? 2 : count <= 6 ? 3 : 4;
                const label = new Date(day.date).toLocaleDateString(locale, { month: 'short', day: 'numeric' });
                return `<div class="an-heatmap-cell is-${level}${day._isPadding ? ' is-padding' : ''}" title="${_escapeHTML(_t('analytics.activityCount', { date: label, count: _formatNumber(count) }))}"></div>`;
              }).join('')}
            </div>`).join('')}
        </div>
      </div>`;

    const monthEntries = new Map();
    orderedWeeks.forEach((week, index) => {
      week.forEach((day) => {
        if (day._isPadding) return;
        const date = parseDate(day.date);
        const key = `${date.getFullYear()}-${date.getMonth()}`;
        if (!monthEntries.has(key)) {
          monthEntries.set(key, { weekIdx: index, label: monthFormatter.format(date), date });
        }
      });
    });
    const months = Array.from(monthEntries.values()).sort((a, b) => a.date - b.date);

    if (monthsEl) {
      monthsEl.innerHTML = months.map((month, index) => {
        const nextIdx = months[index + 1]?.weekIdx ?? orderedWeeks.length;
        return `<span style="min-width:${Math.max(24, (nextIdx - month.weekIdx) * 15)}px">${month.label}</span>`;
      }).join('');
    }

      if (recentEl) {
      if (!recent.length) {
        recentEl.innerHTML = `<div class="an-empty">${_t('analytics.noRecentActivity')}</div>`;
      } else {
        recentEl.innerHTML = `
          <div class="an-recent-title">${_t('analytics.recentHighlights')}</div>
          ${recent.slice(0, 5).map((item) => `
            <div class="an-recent-item">
              <div class="an-recent-type">${_escapeHTML(item.label || _t('analytics.activity'))}</div>
              <div class="an-recent-copy">
                <strong>${_escapeHTML(item.title || _t('analytics.untitledArticle'))}</strong>
                <span>${_formatDateTime(item.at)}</span>
              </div>
            </div>`).join('')}`;
      }
    }
  }

  function _formatNumber(value) {
    const n = Number(value || 0);
    const locale = IBlog.I18n?.meta?.().locale || 'en-US';
    return new Intl.NumberFormat(locale, {
      notation: n >= 1000 ? 'compact' : 'standard',
      maximumFractionDigits: 1,
    }).format(n);
  }

  function _formatDateTime(value) {
    const date = value ? new Date(value) : null;
    if (!date || Number.isNaN(date.getTime())) return _t('analytics.justNow');
    return IBlog.I18n?.formatDate?.(date.toISOString()) || date.toLocaleDateString('en', { month: 'short', day: 'numeric', year: 'numeric' });
  }

  function _escapeHTML(value) {
    return String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  return { init };
})();
