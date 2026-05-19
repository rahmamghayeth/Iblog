/* ══════════════════════════════════════════════════════════
   IBlog — Article Templates  v3
   5 templates: Newspaper · Magazine · Academic · Thread · Recipe
   Place in: js/templates.js
   ══════════════════════════════════════════════════════════ */

IBlog.Templates = (() => {

  const TEMPLATES = [

    /* ─── 1. NEWSPAPER ──────────────────────────────────── */
    {
      id: 'newspaper',
      name: 'Newspaper',
      desc: 'Classic broadsheet with columns',
      icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="3" width="20" height="18" rx="1"/><line x1="2" y1="9" x2="22" y2="9"/><line x1="12" y1="9" x2="12" y2="21"/></svg>`,
      render(article) {
        const paras = _paras(article.body || article.excerpt || '');
        const half  = Math.ceil(paras.length / 2);
        const date  = article.date || new Date().toLocaleDateString('en-US', {weekday:'long',year:'numeric',month:'long',day:'numeric'});
        return `
          <div class="tpl tpl-newspaper">
            <div class="np-masthead">
              <div class="np-rule-top"></div>
              <div class="np-name" data-field="masthead">THE IBLOG TIMES</div>
              <div class="np-meta">
                <span data-field="date">${date}</span>
                <span class="np-motto">"All the Knowledge That's Fit to Share"</span>
                <span>${article.cat || 'General'} · ${article.readTime || '5 min'} read</span>
              </div>
              <div class="np-rule-bot"></div>
            </div>
            <div class="np-headline" data-field="headline">${article.title}</div>
            <div class="np-byline">By <strong data-field="author">${article.author || 'Staff Writer'}</strong> · <span data-field="cat">${article.cat || 'General'}</span></div>
            <div class="np-layout">
              <div class="np-col-main">
                ${paras.slice(0, half).map((p,i) => `<p data-field="p${i}" ${i===0?'class="np-dropcap-p"':''}>${p}</p>`).join('')}
              </div>
              <div class="np-divider"></div>
              <div class="np-col-side">
                ${paras.slice(half).map((p,i) => `<p data-field="ps${i}">${p}</p>`).join('')}
                ${(article.tags||[]).length ? `<div class="np-tags"><strong>Topics:</strong> <span data-field="tags">${article.tags.join(', ')}</span></div>` : ''}
              </div>
            </div>
          </div>`;
      }
    },

    /* ─── 2. MAGAZINE ───────────────────────────────────── */
    {
      id: 'magazine',
      name: 'Magazine',
      desc: 'Bold editorial, Vogue/Wired style',
      icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="2" width="18" height="20" rx="1"/><line x1="3" y1="8" x2="21" y2="8"/><line x1="3" y1="14" x2="21" y2="14"/></svg>`,
      render(article) {
        const paras = _paras(article.body || article.excerpt || '');
        return `
          <div class="tpl tpl-magazine">
            <div class="mag-cover" style="${article.img ? `background-image:url('${article.img}')` : 'background:linear-gradient(160deg,#0a0a1a,#1a0a2e)'}">
              <div class="mag-cover-overlay"></div>
              <div class="mag-cover-content">
                <div class="mag-logo" data-field="logo">IBLOG</div>
                <div class="mag-tag" data-field="tag">${(article.cat || 'Feature').toUpperCase()}</div>
                <h1 class="mag-title" data-field="title">${article.title}</h1>
                <div class="mag-byline">By <span data-field="author">${article.author || 'Staff'}</span> · <span data-field="readtime">${article.readTime || '5 min'}</span></div>
              </div>
            </div>
            <div class="mag-body">
              <p class="mag-lede" data-field="lede">${paras[0] || ''}</p>
              ${paras.slice(1).map((p,i) => `<p class="mag-p" data-field="mp${i}">${p}</p>`).join('')}
              ${(article.tags||[]).length ? `<div class="mag-tags">${article.tags.map(t=>`<span data-field="tag-${t}">${t}</span>`).join('')}</div>` : ''}
            </div>
          </div>`;
      }
    },

    /* ─── 3. ACADEMIC PAPER ─────────────────────────────── */
    {
      id: 'academic',
      name: 'Academic Paper',
      desc: 'Research journal format',
      icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>`,
      render(article) {
        const paras    = _paras(article.body || article.excerpt || '');
        const abstract = paras[0] || '';
        const body     = paras.slice(1);
        const date     = article.date || new Date().toLocaleDateString('en-US',{year:'numeric',month:'long',day:'numeric'});
        return `
          <div class="tpl tpl-academic">
            <div class="ac-journal">
              <span data-field="journal">IBlog Research · ${article.cat || 'Interdisciplinary'}</span>
              <span data-field="received">Received: ${date}</span>
            </div>
            <h1 class="ac-title" data-field="title">${article.title}</h1>
            <div class="ac-authors">
              <strong data-field="author">${article.author || 'Anonymous'}</strong>
            </div>
            ${(article.tags||[]).length ? `<div class="ac-keywords"><strong>Keywords:</strong> <span data-field="keywords">${article.tags.join('; ')}</span></div>` : ''}
            <div class="ac-divider"></div>
            <div class="ac-section-label">Abstract</div>
            <p class="ac-abstract" data-field="abstract">${abstract}</p>
            <div class="ac-divider"></div>
            <div class="ac-two-col">
              ${body.map((p,i) => {
                if (p.startsWith('##')) return `<div class="ac-section-label ac-break" data-field="h${i}">${p.replace(/^#+\s*/,'')}</div>`;
                return `<p class="ac-body" data-field="b${i}">${p}</p>`;
              }).join('')}
            </div>
          </div>`;
      }
    },

    /* ─── 4. THREAD ─────────────────────────────────────── */
    {
      id: 'thread',
      name: 'Thread',
      desc: 'Twitter/X numbered thread style',
      icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>`,
      render(article) {
        const paras   = _paras(article.body || article.excerpt || '');
        const initial = (article.author || 'A')[0].toUpperCase();
        const handle  = '@' + (article.author || 'ibloguser').toLowerCase().replace(/\s+/g,'');
        const likes   = article.likes || 1200;
        const reposts = article.reposts || 340;
        return `
          <div class="tpl tpl-thread">
            <div class="th-header">
              <div class="th-avatar">${initial}</div>
              <div class="th-info">
                <div class="th-name" data-field="name">${article.author || 'IBlog User'} <span class="th-verified">✓</span></div>
                <div class="th-handle" data-field="handle">${handle}</div>
              </div>
            </div>
            <div class="th-intro" data-field="intro">${article.title}</div>
            <div class="th-meta-top" data-field="date">${article.date || 'Just now'} · IBlog Web</div>
            <div class="th-stats">
              <span><strong data-field="reposts">${reposts.toLocaleString()}</strong> Reposts</span>
              <span><strong data-field="likes">${likes.toLocaleString()}</strong> Likes</span>
            </div>
            <div class="th-divider"></div>
            ${paras.map((p,i) => `
              <div class="th-tweet">
                <div class="th-tweet-avatar">${initial}</div>
                <div class="th-tweet-body">
                  <div class="th-tweet-header">
                    <span class="th-tweet-name">${article.author||'IBlog User'}</span>
                    <span class="th-tweet-handle">${handle}</span>
                  </div>
                  <div class="th-tweet-text" data-field="tweet${i}">${i===0?'🧵 ':i+1+'/ '}${p}</div>
                  <div class="th-tweet-actions">
                    <span>↩ Reply</span><span>↺ Repost</span><span>♡ Like</span>
                  </div>
                </div>
              </div>
              ${i < paras.length-1 ? '<div class="th-thread-line"></div>' : ''}`
            ).join('')}
            ${(article.tags||[]).length ? `<div class="th-hashtags">${article.tags.map(t=>`<span data-field="ht-${t}">#${t.replace(/\s+/g,'')}</span>`).join(' ')}</div>` : ''}
          </div>`;
      }
    },

    /* ─── 5. RECIPE CARD ────────────────────────────────── */
    {
      id: 'recipe',
      name: 'Recipe Card',
      desc: 'Professional culinary format',
      icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 8h1a4 4 0 0 1 0 8h-1"/><path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z"/><line x1="6" y1="1" x2="6" y2="4"/><line x1="10" y1="1" x2="10" y2="4"/><line x1="14" y1="1" x2="14" y2="4"/></svg>`,
      render(article) {
        const paras = _paras(article.body || article.excerpt || '');
        let ingredients = [], steps = [], desc = '', currentSection = null;
        paras.forEach(p => {
          if (/^##\s*ingredient/i.test(p))                              { currentSection = 'ing'; return; }
          if (/^##\s*(instruction|method|step|direction)/i.test(p))    { currentSection = 'steps'; return; }
          if (!desc && currentSection === null)                         { desc = p; return; }
          if (currentSection === 'ing')   ingredients.push(p);
          else if (currentSection === 'steps') steps.push(p);
          else if (!desc) desc = p;
        });
        if (!ingredients.length) ingredients = paras.slice(1, Math.ceil(paras.length/2));
        if (!steps.length)       steps       = paras.slice(Math.ceil(paras.length/2));
        return `
          <div class="tpl tpl-recipe">
            ${article.img ? `<div class="rc-hero" style="background-image:url('${article.img}')"><div class="rc-hero-overlay"></div></div>` : ''}
            <div class="rc-header">
              <h1 class="rc-title" data-field="title">${article.title}</h1>
              <p class="rc-desc" data-field="desc">${desc}</p>
              <div class="rc-stats">
                <div class="rc-stat">
                  <span class="rc-stat-val" data-field="prep" contenteditable="false">45</span>
                  <span class="rc-stat-lbl">Prep (min)</span>
                </div>
                <div class="rc-stat-divider"></div>
                <div class="rc-stat">
                  <span class="rc-stat-val" data-field="cook" contenteditable="false">90</span>
                  <span class="rc-stat-lbl">Cook (min)</span>
                </div>
                <div class="rc-stat-divider"></div>
                <div class="rc-stat">
                  <span class="rc-stat-val" data-field="serves" contenteditable="false">4</span>
                  <span class="rc-stat-lbl">Servings</span>
                </div>
                <div class="rc-stat-divider"></div>
                <div class="rc-stat">
                  <span class="rc-stat-val" data-field="rating" contenteditable="false">★ 4.9</span>
                  <span class="rc-stat-lbl">Rating</span>
                </div>
              </div>
            </div>
            <div class="rc-body">
              <div class="rc-col-ing">
                <div class="rc-section-title">Ingredients</div>
                <ul class="rc-ing-list">
                  ${ingredients.map((ing,i) => `<li data-field="ing${i}">${ing.replace(/^[-·•]\s*/,'')}</li>`).join('')}
                </ul>
              </div>
              <div class="rc-col-steps">
                <div class="rc-section-title">Instructions</div>
                <ol class="rc-steps">
                  ${steps.map((s,i) => `<li><span class="rc-step-text" data-field="step${i}">${s.replace(/^\d+[.)]\s*/,'')}</span></li>`).join('')}
                </ol>
              </div>
            </div>
            ${(article.tags||[]).length ? `<div class="rc-tags"><strong>Tags:</strong> <span data-field="tags">${article.tags.join(', ')}</span></div>` : ''}
          </div>`;
      }
    },

  ];

  /* ── Helper ──────────────────────────────────────────── */
  function _paras(text) {
    const value = String(text || '').trim();
    if (!value) return [];
    if (!/<(p|div|br|strong|b|em|i|u|span|mark|img|figure|figcaption|blockquote|h[1-6]|ul|ol|li)\b/i.test(value)) {
      return value.split('\n\n').map(p=>p.trim()).filter(Boolean);
    }

    const scratch = document.createElement('div');
    scratch.innerHTML = value;
    const blocks = Array.from(scratch.querySelectorAll('h1,h2,h3,h4,h5,h6,p,blockquote,li,figcaption'))
      .map((node) => String(node.textContent || '').trim())
      .filter(Boolean);

    if (blocks.length) return blocks;
    return String(scratch.textContent || '').split('\n\n').map(p=>p.trim()).filter(Boolean);
  }

  function get(id)  { return TEMPLATES.find(t=>t.id===id)||null; }
  function all()    { return TEMPLATES; }

  /* ── Build writer selector grid ──────────────────────── */
  function buildWriterSelector() {
    const grid = document.getElementById('template-grid');
    if (!grid) return;
    grid.innerHTML = TEMPLATES.map(t => `
      <div class="tpl-card" data-tpl="${t.id}"
           onclick="IBlog.Templates.selectTemplate('${t.id}',this)">
        <div class="tpl-card-icon">${t.icon}</div>
        <div class="tpl-card-name">${t.name}</div>
        <div class="tpl-card-desc">${t.desc}</div>
      </div>`).join('');
  }

  let _selected = null;

  function setSelected(id, options = {}) {
    _selected = id || null;
    document.querySelectorAll('.tpl-card').forEach(c => {
      c.classList.toggle('selected', !!id && c.dataset.tpl === id);
    });

    const badge  = document.getElementById('wtr-tpl-badge');
    const nameEl = document.getElementById('wtr-tpl-name');
    const tpl    = get(id);
    if (badge)  badge.style.display = tpl ? 'flex' : 'none';
    if (nameEl) nameEl.textContent  = tpl ? tpl.name : 'No template';

    const sub = document.getElementById('template-subtitle');
    if (sub) sub.textContent = tpl ? `${tpl.name} selected` : '';

    if (!options.silent && tpl) {
      IBlog.utils.toast(`${tpl.name} template selected`, 'success');
    }
  }

  function selectTemplate(id, el) {
    const isPrem = IBlog.state.currentUser?.plan === 'premium';
    if (!isPrem) { IBlog.Auth?.showPremium?.(); return; }
    setSelected(id, { silent: false });
    /* Trigger preview refresh if in preview mode */
    if (IBlog.Writer?._mode === 'preview') IBlog.Writer._renderNow?.();
  }

  function selectedId()  { return _selected; }

  function renderForReader(article) {
    const tpl = article.templateId ? get(article.templateId) : null;
    return tpl ? tpl.render(article) : null;
  }

  return { all, get, buildWriterSelector, selectTemplate, selectedId, setSelected, renderForReader };

})();
