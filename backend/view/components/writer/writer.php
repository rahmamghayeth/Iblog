<!-- ══ WRITER VIEW — replace the entire view-write div ════ -->
<div class="view-panel writer-view" id="view-write">

  <div class="view-header flex-between">
    <div>
      <h1>✏️ Write an Article</h1>
      <p>Share your knowledge with the IBlog community</p>
    </div>
    <!-- Preview toggle -->
    <div id="writer-toggle-bar" class="wtr-toggle-bar" style="margin:0">
      <div class="wtr-pills">
        <button class="wtr-pill active" id="wtr-edit-btn"
                onclick="IBlog.Writer.setMode('edit')">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
               stroke-width="2" stroke-linecap="round" width="13" height="13">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
          </svg>
          Edit
        </button>
        <button class="wtr-pill" id="wtr-preview-btn"
                onclick="IBlog.Writer.setMode('preview')">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
               stroke-width="2" stroke-linecap="round" width="13" height="13">
            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
            <circle cx="12" cy="12" r="3"/>
          </svg>
          Preview & Edit
        </button>
      </div>
      <div class="wtr-tpl-badge" id="wtr-tpl-badge" style="display:none">
        <span class="wtr-tpl-dot"></span>
        <span id="wtr-tpl-name">No template</span>
      </div>
    </div>
  </div>

  <!-- Template selector (premium) -->
  <div style="margin-bottom:22px">
    <div class="flex-between" style="margin-bottom:14px">
      <div>
        <strong style="font-size:15px">Article Templates</strong>
        <span class="badge badge-premium" style="margin-left:8px">⭐ Premium</span>
      </div>
      <span style="font-size:12px;color:var(--text2)" id="template-subtitle">
        Upgrade to access 8 professional templates
      </span>
    </div>
    <div class="premium-gate" style="min-height:160px">
      <div class="template-grid" id="template-grid"
           style="pointer-events:none;opacity:.35"></div>
      <div class="premium-overlay" id="template-overlay">
        <div style="font-size:40px">✍️🔒</div>
        <h3 style="font-family:'Playfair Display',serif;font-size:20px;color:var(--text)">
          Premium Templates
        </h3>
        <p style="font-size:13px;color:var(--text2);text-align:center;max-width:280px">
          8 professional article layouts — Newspaper, Magazine, Academic, Thread and more.
        </p>
        <button class="premium-upgrade-btn" onclick="showPremium()">
          ⭐ Upgrade to Unlock
        </button>
      </div>
    </div>
  </div>

  <!-- ── EDIT MODE ─────────────────────────────────── -->
  <div id="writer-edit-zone">
    <input class="writer-title-input" id="article-title"
           placeholder="Your article title…"
           oninput="IBlog.Views.analyzeQuality()"/>
    <div class="writer-toolbar">
      <button class="tb-btn" onclick="document.execCommand('bold')"><b>B</b></button>
      <button class="tb-btn" onclick="document.execCommand('italic')"><i>I</i></button>
      <button class="tb-btn" onclick="IBlog.Views.injectSection('# ')">H1</button>
      <button class="tb-btn" onclick="IBlog.Views.injectSection('## ')">H2</button>
      <button class="tb-btn" onclick="IBlog.Views.injectSection('> ')">""</button>
      <button class="tb-btn" onclick="IBlog.Views.injectSection('```\n\n```')">Code</button>
      <button class="tb-btn" onclick="IBlog.Views.insertLink()">Link</button>
      <button class="tb-btn" onclick="document.getElementById('writer-img-upload').click()">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
             width="13" height="13" stroke-linecap="round" stroke-linejoin="round">
          <rect x="3" y="3" width="18" height="18" rx="2"/>
          <circle cx="8.5" cy="8.5" r="1.5"/>
          <polyline points="21 15 16 10 5 21"/>
        </svg>
      </button>
      <input type="file" id="writer-img-upload" accept="image/*"
             style="display:none" onchange="IBlog.Views.handleImgUpload(this)"/>
    </div>
    <textarea class="writer-editor writer-editor-hidden" id="article-editor"
              placeholder="Start writing your article…"
              oninput="IBlog.Views.analyzeQuality()"></textarea>
    <div class="writer-editor-rich" id="article-editor-rich"
         contenteditable="true"
         data-placeholder="Start writing your article…"></div>
    <div class="writer-editor-hint">
      Select text to make it bold, change its color, or highlight it.
    </div>

    <div id="writer-preview-pane" class="wtr-preview-pane" style="display:none"></div>

    <div class="writer-meta">
      <select id="article-cat"><option>Select Category</option></select>
      <input type="text" id="article-tags" placeholder="Tags: AI, machine learning…"/>
      <input type="text" id="article-img" class="full-width"
             placeholder="Cover image URL (optional)"/>
    </div>

    <!-- Article Quality -->
    <div class="quality-analyzer">
      <div class="flex-between" style="margin-bottom:14px">
        <strong>📊 Article Quality</strong>
        <div class="ai-pill"><span class="ai-dot"></span>Live AI</div>
      </div>

      <!-- Overall score bar -->
      <div class="quality-overall" id="quality-overall" style="margin-bottom:16px;display:none">
        <div class="flex-between" style="margin-bottom:6px">
          <span style="font-size:13px;font-weight:600;color:var(--text)" id="quality-grade">—</span>
          <span style="font-size:13px;color:var(--text2)" id="quality-pct">0%</span>
        </div>
        <div style="height:8px;background:var(--bg3);border-radius:99px;overflow:hidden">
          <div id="quality-bar-overall"
               style="height:100%;width:0%;border-radius:99px;background:var(--accent);transition:width .4s ease"></div>
        </div>
      </div>

      <div class="quality-scores">
        <div class="quality-score">
          <div class="q-val" id="q-read">—</div>
          <div class="q-lbl">Readability</div>
          <div class="score-bar"><div class="score-fill" id="qb-read" style="width:0%"></div></div>
        </div>
        <div class="quality-score">
          <div class="q-val" id="q-depth">—</div>
          <div class="q-lbl">Depth</div>
          <div class="score-bar"><div class="score-fill" id="qb-depth" style="width:0%"></div></div>
        </div>
        <div class="quality-score">
          <div class="q-val" id="q-struct">—</div>
          <div class="q-lbl">Structure</div>
          <div class="score-bar"><div class="score-fill" id="qb-struct" style="width:0%"></div></div>
        </div>
        <div class="quality-score">
          <div class="q-val" id="q-eng">—</div>
          <div class="q-lbl">Engagement</div>
          <div class="score-bar"><div class="score-fill" id="qb-eng" style="width:0%"></div></div>
        </div>
      </div>

      <!-- Specific feedback tips -->
      <div id="quality-tips" style="margin-top:12px;display:flex;flex-direction:column;gap:6px"></div>
    </div>

    <div style="display:flex;gap:11px;margin-top:18px">
      <button class="btn btn-ghost"
              style="flex:1;padding:13px;justify-content:center"
              onclick="IBlog.Views.saveDraftArticle()">
        Save Draft
      </button>
      <button class="btn btn-primary"
              style="flex:2;padding:13px;justify-content:center"
              onclick="IBlog.Views.publishArticle()">
        Publish Article 🚀
      </button>
    </div>
  </div>

</div>
