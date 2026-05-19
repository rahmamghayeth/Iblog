<!-- MY ARTICLES VIEW -->
<div class="view-panel" id="view-articles">

  <div class="view-header flex-between">
    <div>
      <h1>My Articles</h1>
      <p class="view-subtitle">Manage and edit your published content and drafts.</p>
    </div>
    <button class="btn btn-primary"
            onclick="IBlog.Dashboard.navigateTo('write')">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
           stroke="currentColor" stroke-width="2.5"
           stroke-linecap="round" stroke-linejoin="round">
        <line x1="12" y1="5" x2="12" y2="19"/>
        <line x1="5" y1="12" x2="19" y2="12"/>
      </svg>
      New Article
    </button>
  </div>

  <div id="my-articles-list"></div>

</div>

<!-- SETTINGS VIEW -->
<div class="view-panel" id="view-settings">

  <div class="view-header">
    <h1 data-i18n="settings.title">Settings</h1>
    <p class="view-subtitle" data-i18n="settings.subtitle">Manage your account and preferences</p>
  </div>

  <div class="section-card">
    <h3 data-i18n="settings.account">Account</h3>
    <div class="form-group">
      <label data-i18n="settings.displayName">Display Name</label>
      <input type="text" id="settings-name" placeholder="Your name" data-i18n-placeholder="settings.namePlaceholder">
    </div>
    <div class="form-group">
      <label data-i18n="settings.emailAddress">Email</label>
      <input type="email" id="settings-email" placeholder="you@example.com" data-i18n-placeholder="settings.emailPlaceholder">
    </div>
    <div class="form-group">
      <label data-i18n="settings.bio">Bio</label>
      <textarea id="settings-bio" style="resize:vertical" rows="3"
                placeholder="Tell your story…" data-i18n-placeholder="settings.bioPlaceholder"></textarea>
    </div>
    <button class="btn btn-primary"
            onclick="IBlog.utils.toast('Settings saved.', 'success')">
      <span data-i18n="settings.saveChanges">Save Changes</span>
    </button>
  </div>

  <div class="section-card">
    <div class="flex-between">
      <div>
        <h3 data-i18n="settings.premiumPlan">Premium Plan</h3>
        <p id="premium-status-text"
           style="font-size:13px;color:var(--text2);margin-top:4px">
          You are on the Free plan.
        </p>
      </div>
      <button class="btn btn-premium"
              id="premium-settings-btn"
              onclick="IBlog.Auth.demoLogin('premium')">
        Upgrade
      </button>
    </div>
  </div>

  <div class="section-card">
    <h3 id="settings-language-title" data-i18n="settings.languageTitle">Display Language</h3>
    <p id="settings-language-body" style="font-size:14px;color:var(--text2);margin:10px 0 16px" data-i18n="settings.languageBody">
      Choose one language and apply it across the main interface, landing page, feed cards, and seeded content.
    </p>
    <select id="settings-language-select" class="iblog-language-select" aria-label="Display Language" style="width:100%;margin-bottom:24px"></select>

    <h3 style="margin-bottom:14px" data-i18n="settings.notifications">Notifications</h3>
    <div style="display:flex;flex-direction:column;gap:13px">

      <div class="flex-between">
        <span style="font-size:14px" data-i18n="settings.newFollowers">New followers</span>
        <label class="toggle-switch">
          <input type="checkbox" checked>
          <div class="toggle-track"></div>
        </label>
      </div>

      <div class="flex-between">
        <span style="font-size:14px" data-i18n="settings.articleLikes">Article likes</span>
        <label class="toggle-switch">
          <input type="checkbox" checked>
          <div class="toggle-track"></div>
        </label>
      </div>

      <div class="flex-between">
        <span style="font-size:14px" data-i18n="settings.weeklyDigest">Weekly digest</span>
        <label class="toggle-switch">
          <input type="checkbox" checked>
          <div class="toggle-track"></div>
        </label>
      </div>

    </div>
  </div>

</div>
