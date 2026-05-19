window.IBlogOnboarding = (() => {
  "use strict";

  const AUTH_API = "backend/view/components/auth/api-auth.php";

  const GENERAL_INTERESTS = [
    { id: "ai", label: "AI", emoji: "AI" },
    { id: "technology", label: "Technology", emoji: "TE" },
    { id: "science", label: "Science", emoji: "SC" },
    { id: "health", label: "Health", emoji: "HE" },
    { id: "finance", label: "Finance", emoji: "FI" },
    { id: "culture", label: "Culture", emoji: "CU" },
    { id: "education", label: "Education", emoji: "ED" },
    { id: "travel", label: "Travel", emoji: "TR" },
    { id: "sports", label: "Sports", emoji: "SP" },
    { id: "environment", label: "Environment", emoji: "EN" },
    { id: "food", label: "Food", emoji: "FO" },
    { id: "politics", label: "Politics", emoji: "PO" },
    { id: "business", label: "Business", emoji: "BU" },
    { id: "design", label: "Design", emoji: "DE" },
    { id: "history", label: "History", emoji: "HI" },
    { id: "psychology", label: "Psychology", emoji: "PS" },
    { id: "productivity", label: "Productivity", emoji: "PR" },
    { id: "philosophy", label: "Philosophy", emoji: "PH" },
    { id: "media", label: "Media", emoji: "ME" }
  ];

  const SPECIFIC_INTERESTS = [
    { id: "robotics", label: "Robotics", emoji: "RB" },
    { id: "cybersecurity", label: "Cybersecurity", emoji: "CY" },
    { id: "climate-tech", label: "Climate Tech", emoji: "CT" },
    { id: "startups", label: "Startups", emoji: "ST" },
    { id: "space", label: "Space", emoji: "SP" },
    { id: "psychology", label: "Psychology", emoji: "PS" },
    { id: "design", label: "Design", emoji: "DE" },
    { id: "music", label: "Music", emoji: "MU" },
    { id: "gaming", label: "Gaming", emoji: "GA" },
    { id: "literature", label: "Literature", emoji: "LI" },
    { id: "biotech", label: "Biotech", emoji: "BI" },
    { id: "neuroscience", label: "Neuroscience", emoji: "NE" },
    { id: "crypto", label: "Crypto", emoji: "CR" },
    { id: "architecture", label: "Architecture", emoji: "AR" },
    { id: "machine-learning", label: "Machine Learning", emoji: "ML" },
    { id: "data-science", label: "Data Science", emoji: "DS" },
    { id: "web3", label: "Web3", emoji: "W3" },
    { id: "economics", label: "Economics", emoji: "EC" },
    { id: "ux-ui", label: "UX/UI", emoji: "UX" },
    { id: "writing", label: "Writing", emoji: "WR" },
    { id: "leadership", label: "Leadership", emoji: "LD" },
    { id: "marketing", label: "Marketing", emoji: "MK" },
    { id: "geopolitics", label: "Geopolitics", emoji: "GP" }
  ];

  const TEMPLATE = `
    <div id="onboarding-overlay" class="ob-overlay" style="display:none">
      <div class="ob-shell">
        <button class="ob-close" type="button" aria-label="Close onboarding" onclick="IBlogOnboarding.cancel()">×</button>
        <div class="ob-progress"><div class="ob-progress-fill" id="ob-progress-fill"></div></div>
        <div class="ob-step-label" id="ob-step-label">Step 1 of 3</div>
        <div class="ob-step active" id="ob-step-1">
          <div class="ob-header">
            <span class="ob-kicker">Create your account</span>
            <h2 class="ob-title">Finish your IBlog profile</h2>
            <p class="ob-subtitle">Add your photo, username, and bio so other readers know who you are.</p>
          </div>
          <div class="ob-avatar-panel">
            <div class="ob-avatar-wrap">
              <div class="ob-avatar" id="ob-avatar-preview">A</div>
              <div class="ob-avatar-ring"></div>
            </div>
            <div class="ob-avatar-copy">
              <strong>Profile picture</strong>
              <p>Upload a photo from your computer or keep the letter avatar.</p>
              <label class="ob-upload-btn" for="ob-avatar-file">Choose photo</label>
              <input id="ob-avatar-file" class="ob-file-input" type="file" accept="image/*" onchange="IBlogOnboarding.handleAvatarUpload(this)" />
            </div>
          </div>
          <div class="ob-form">
            <div class="ob-field">
              <label class="ob-label">Full name</label>
              <input class="ob-input" type="text" id="ob-name" readonly />
            </div>
            <div class="ob-field">
              <label class="ob-label">Pseudo / username <span class="ob-required">*</span></label>
              <div class="ob-input-prefix-wrap">
                <span class="ob-prefix">@</span>
                <input class="ob-input ob-input-prefix" type="text" id="ob-pseudo" maxlength="24" placeholder="your_name" oninput="IBlogOnboarding.validatePseudo(this)" />
              </div>
              <span class="ob-field-hint" id="ob-pseudo-hint">Use 3 to 24 lowercase letters, numbers, or underscores.</span>
            </div>
            <div class="ob-field">
              <label class="ob-label">Short bio</label>
              <textarea class="ob-input ob-textarea" id="ob-bio" maxlength="160" rows="4" placeholder="Tell readers what you write about, study, or love exploring." oninput="IBlogOnboarding.updateBioCount(this)"></textarea>
              <span class="ob-field-hint ob-counter"><span id="ob-bio-count">0</span> / 160</span>
            </div>
          </div>
          <button class="ob-btn-primary" type="button" onclick="IBlogOnboarding.goStep(2)">Continue</button>
        </div>
        <div class="ob-step" id="ob-step-2">
          <div class="ob-header">
            <span class="ob-kicker">Recommendations start here</span>
            <h2 class="ob-title">Choose your interests and subjects</h2>
            <p class="ob-subtitle">Pick a few broad fields and some specific subjects. We will use them later in your recommendations.</p>
          </div>
          <div class="ob-interests-section">
            <div class="ob-interests-label">
              <span class="ob-interests-label-text">Fields of interest</span>
              <span class="ob-interests-count" id="ob-general-count">0 selected</span>
            </div>
            <div class="ob-chips" id="ob-general-chips"></div>
          </div>
          <div class="ob-interests-section">
            <div class="ob-interests-label">
              <span class="ob-interests-label-text">Favorite subjects</span>
              <span class="ob-interests-count" id="ob-specific-count">0 selected</span>
            </div>
            <div class="ob-chips" id="ob-specific-chips"></div>
          </div>
          <div class="ob-selection-summary" id="ob-selection-summary">Select at least 3 interests to continue.</div>
          <div class="ob-btn-row">
            <button class="ob-btn-ghost" id="ob-step2-back" type="button" onclick="IBlogOnboarding.goStep(1)">Back</button>
            <button class="ob-btn-primary" id="ob-step2-next" type="button" onclick="IBlogOnboarding.goStep(3)" disabled>Continue</button>
          </div>
        </div>
        <div class="ob-step" id="ob-step-3">
          <div class="ob-header">
            <span class="ob-kicker">Review</span>
            <h2 class="ob-title">Your profile is ready</h2>
            <p class="ob-subtitle">Check your public profile card before entering the dashboard.</p>
          </div>
          <div class="ob-profile-preview">
            <div class="ob-preview-banner"></div>
            <div class="ob-preview-body">
              <div class="ob-preview-avatar" id="ob-preview-avatar">A</div>
              <div class="ob-preview-name" id="ob-preview-name">User</div>
              <div class="ob-preview-pseudo" id="ob-preview-pseudo">@user</div>
              <div class="ob-preview-bio" id="ob-preview-bio">No bio yet.</div>
              <div class="ob-preview-block">
                <div class="ob-preview-label">Fields</div>
                <div class="ob-preview-topics" id="ob-preview-fields"></div>
              </div>
              <div class="ob-preview-block">
                <div class="ob-preview-label">Subjects</div>
                <div class="ob-preview-topics" id="ob-preview-subjects"></div>
              </div>
            </div>
          </div>
          <div class="ob-btn-row">
            <button class="ob-btn-ghost" id="ob-step3-back" type="button" onclick="IBlogOnboarding.goStep(2)">Back</button>
            <button class="ob-btn-primary" id="ob-finish-btn" type="button" onclick="IBlogOnboarding.finish()">Enter Dashboard</button>
          </div>
        </div>
      </div>
    </div>
  `;

  let currentStep = 1;
  let currentUser = null;
  let selectedIds = new Set();
  let selectedAvatar = "";
  let pseudoValid = false;
  let onComplete = null;
  let onCancel = null;
  let finishLabel = "Enter Dashboard";
  let flowMode = "full";

  function start(user, options = {}) {
    currentUser = { ...(user || {}) };
    selectedIds = new Set([...(user?.fieldIds || []), ...(user?.subjectIds || []), ...(user?.interestIds || [])]);
    selectedAvatar = user?.avatar || "";
    flowMode = options.mode === "interests" ? "interests" : "full";
    currentStep = flowMode === "interests" ? 2 : 1;
    pseudoValid = false;
    onComplete = typeof options.onComplete === "function" ? options.onComplete : null;
    onCancel = typeof options.onCancel === "function" ? options.onCancel : null;
    finishLabel = options.finishLabel || "Enter Dashboard";

    injectHTML();
    resetViewState();
    renderChips();
    prefillIdentity();
    updateSelectionUI();
    showOverlay();
    goStep(currentStep);
  }

  function injectHTML() {
    if (!document.getElementById("onboarding-overlay")) {
      const host = document.createElement("div");
      host.innerHTML = TEMPLATE.trim();
      document.body.appendChild(host.firstElementChild);
    }
    const closeButton = document.querySelector("#onboarding-overlay .ob-close");
    if (closeButton) closeButton.innerHTML = "&times;";
    document.getElementById("ob-finish-btn").textContent = finishLabel;
    updateFlowUI();
  }

  function showOverlay() {
    document.getElementById("onboarding-overlay").style.display = "flex";
  }

  function hideOverlay() {
    document.getElementById("onboarding-overlay").style.display = "none";
  }

  function resetViewState() {
    const nameInput = document.getElementById("ob-name");
    const pseudoInput = document.getElementById("ob-pseudo");
    const bioInput = document.getElementById("ob-bio");
    const bioCount = document.getElementById("ob-bio-count");
    const avatarInput = document.getElementById("ob-avatar-file");
    const pseudoHint = document.getElementById("ob-pseudo-hint");

    if (nameInput) nameInput.value = "";
    if (pseudoInput) pseudoInput.value = "";
    if (bioInput) bioInput.value = "";
    if (bioCount) bioCount.textContent = "0";
    if (avatarInput) avatarInput.value = "";
    if (pseudoHint) {
      pseudoHint.textContent = "Use 3 to 24 lowercase letters, numbers, or underscores.";
      pseudoHint.className = "ob-field-hint";
    }
  }

  function goStep(targetStep) {
    if (flowMode === "interests" && targetStep < 2) {
      targetStep = 2;
    }

    if (targetStep > currentStep) {
      if (currentStep === 1 && !validateStep1()) return;
      if (currentStep === 2 && !validateStep2()) return;
    }

    currentStep = targetStep;
    document.querySelectorAll(".ob-step").forEach(step => step.classList.remove("active"));
    document.getElementById(`ob-step-${targetStep}`).classList.add("active");
    updateProgress(targetStep);

    if (targetStep === 3) buildPreview();
  }

  function updateFlowUI() {
    const step1 = document.getElementById("ob-step-1");
    const step2Back = document.getElementById("ob-step2-back");
    const step3Back = document.getElementById("ob-step3-back");

    if (step1) step1.style.display = flowMode === "interests" ? "none" : "";
    if (step2Back) step2Back.style.display = flowMode === "interests" ? "none" : "";
    if (step3Back) step3Back.textContent = flowMode === "interests" ? "Edit interests" : "Back";
  }

  function updateProgress(targetStep) {
    const label = document.getElementById("ob-step-label");
    const fill = document.getElementById("ob-progress-fill");
    if (!label || !fill) return;

    if (flowMode === "interests") {
      const visibleStep = targetStep === 2 ? 1 : 2;
      label.textContent = `Step ${visibleStep} of 2`;
      fill.style.width = visibleStep === 1 ? "0%" : "100%";
      return;
    }

    label.textContent = `Step ${targetStep} of 3`;
    fill.style.width = `${((targetStep - 1) / 2) * 100}%`;
  }

  function prefillIdentity() {
    const name = currentUser?.name || "";
    const pseudo = currentUser?.pseudo || suggestPseudo(name);
    const bio = currentUser?.bio || "";

    document.getElementById("ob-name").value = name;
    document.getElementById("ob-pseudo").value = pseudo;
    document.getElementById("ob-bio").value = bio;
    document.getElementById("ob-bio-count").textContent = String(bio.length);

    validatePseudo(document.getElementById("ob-pseudo"));
    updateAvatar(document.getElementById("ob-avatar-preview"), selectedAvatar, name || "A");
  }

  async function cancel() {
    const fallbackUser = currentUser ? {
      ...currentUser,
      initial: (currentUser.name?.[0] || "A").toUpperCase()
    } : null;

    hideOverlay();

    if (flowMode === "full") {
      try {
        await fetch(AUTH_API, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "same-origin",
          body: JSON.stringify({ action: "cancel_onboarding" })
        });
      } catch (error) {
        console.warn("Onboarding cancel sync failed:", error);
      }
    }

    if (onCancel) {
      onCancel(fallbackUser);
    }
  }

  function suggestPseudo(name) {
    return (name || "reader")
      .toLowerCase()
      .replace(/\s+/g, "_")
      .replace(/[^a-z0-9_]/g, "")
      .slice(0, 24) || "reader";
  }

  function validatePseudo(input) {
    const value = input.value.trim();
    const hint = document.getElementById("ob-pseudo-hint");
    pseudoValid = /^[a-z0-9_]{3,24}$/.test(value);

    if (!value) {
      hint.textContent = "Use 3 to 24 lowercase letters, numbers, or underscores.";
      hint.className = "ob-field-hint";
    } else if (pseudoValid) {
      hint.textContent = `@${value} is ready for your profile.`;
      hint.className = "ob-field-hint success";
    } else {
      hint.textContent = "Only lowercase letters, numbers, and underscores are allowed.";
      hint.className = "ob-field-hint error";
    }
  }

  function updateBioCount(textarea) {
    document.getElementById("ob-bio-count").textContent = String(textarea.value.length);
  }

  function handleAvatarUpload(input) {
    const file = input.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = event => {
      selectedAvatar = String(event.target?.result || "");
      updateAvatar(document.getElementById("ob-avatar-preview"), selectedAvatar, currentUser?.name || "A");
    };
    reader.readAsDataURL(file);
  }

  function validateStep1() {
    if (pseudoValid) return true;
    document.getElementById("ob-pseudo-hint").textContent = "Please choose a valid pseudo to continue.";
    document.getElementById("ob-pseudo-hint").className = "ob-field-hint error";
    document.getElementById("ob-pseudo").focus();
    return false;
  }

  function renderChips() {
    renderChipGroup("ob-general-chips", GENERAL_INTERESTS);
    renderChipGroup("ob-specific-chips", SPECIFIC_INTERESTS);
  }

  function renderChipGroup(containerId, items) {
    const container = document.getElementById(containerId);
    container.innerHTML = items.map(item => `
      <button class="ob-chip${selectedIds.has(item.id) ? " selected" : ""}" type="button" data-id="${item.id}" onclick="IBlogOnboarding.toggleChip(this, '${item.id}')">
        <span class="ob-chip-emoji">${item.emoji}</span>${escapeHTML(item.label)}
      </button>
    `).join("");
  }

  function toggleChip(button, id) {
    if (selectedIds.has(id)) {
      selectedIds.delete(id);
      button.classList.remove("selected");
    } else {
      selectedIds.add(id);
      button.classList.add("selected");
    }
    updateSelectionUI();
  }

  function updateSelectionUI() {
    const generalCount = GENERAL_INTERESTS.filter(item => selectedIds.has(item.id)).length;
    const specificCount = SPECIFIC_INTERESTS.filter(item => selectedIds.has(item.id)).length;
    const remaining = Math.max(0, 3 - selectedIds.size);
    const summary = document.getElementById("ob-selection-summary");

    document.getElementById("ob-general-count").textContent = `${generalCount} selected`;
    document.getElementById("ob-specific-count").textContent = `${specificCount} selected`;

    if (remaining === 0) {
      summary.textContent = `Great choice. ${selectedIds.size} interests selected.`;
      summary.className = "ob-selection-summary ready";
    } else {
      summary.textContent = `Select ${remaining} more interest${remaining > 1 ? "s" : ""} to continue.`;
      summary.className = "ob-selection-summary";
    }

    document.getElementById("ob-step2-next").disabled = selectedIds.size < 3;
  }

  function validateStep2() {
    return selectedIds.size >= 3;
  }

  function buildPreview() {
    const profile = collectProfileData();
    updateAvatar(document.getElementById("ob-preview-avatar"), profile.avatar, profile.name || "A");
    document.getElementById("ob-preview-name").textContent = profile.name || "User";
    document.getElementById("ob-preview-pseudo").textContent = `@${profile.pseudo}`;
    document.getElementById("ob-preview-bio").textContent = profile.bio || "No bio yet.";
    buildTopicPills("ob-preview-fields", profile.fields);
    buildTopicPills("ob-preview-subjects", profile.subjects);
  }

  async function finish() {
    const finishButton = document.getElementById("ob-finish-btn");
    const originalLabel = finishButton?.textContent || finishLabel;
    const profile = collectProfileData();
    const fallbackUser = {
      ...currentUser,
      ...profile,
      initial: (profile.name?.[0] || "A").toUpperCase(),
      onboardingComplete: true
    };

    if (finishButton) {
      finishButton.disabled = true;
      finishButton.textContent = "Saving...";
    }

    let enrichedUser = fallbackUser;

    try {
      const response = await fetch(AUTH_API, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "update_profile",
          name: profile.name || currentUser?.name || "",
          email: currentUser?.email || "",
          bio: profile.bio || "",
          avatar: profile.avatar || currentUser?.avatar || "",
          cover: currentUser?.cover || "",
          pseudo: profile.pseudo,
          fieldIds: profile.fieldIds,
          subjectIds: profile.subjectIds,
          interestIds: profile.interestIds,
          fields: profile.fields,
          subjects: profile.subjects,
          onboardingComplete: true
        })
      });
      const text = await response.text();
      if (text.trim().startsWith("{")) {
        const data = JSON.parse(text);
        if (response.ok && data.ok && data.user) {
          enrichedUser = {
            ...fallbackUser,
            ...data.user,
            ...profile,
            onboardingComplete: true,
            initial: (profile.name?.[0] || data.user.name?.[0] || "A").toUpperCase()
          };
        }
      }
    } catch (error) {
      console.warn("Onboarding profile sync failed:", error);
    }

    if (window.IBlogSession?.setUser) {
      IBlogSession.setUser(enrichedUser);
    } else {
      sessionStorage.setItem("user", JSON.stringify(enrichedUser));
      localStorage.setItem("user", JSON.stringify(enrichedUser));
      if (window.IBlog?.state) IBlog.state.currentUser = enrichedUser;
    }

    syncCurrentUserArticles(enrichedUser);
    hideOverlay();
    refreshUserUI(enrichedUser);
    window.dispatchEvent(new CustomEvent("onboarding:complete", { detail: { user: enrichedUser } }));
    if (onComplete) onComplete(enrichedUser);

    if (finishButton) {
      finishButton.disabled = false;
      finishButton.textContent = originalLabel;
    }
  }

  function collectProfileData() {
    const pseudo = (document.getElementById("ob-pseudo").value || suggestPseudo(currentUser?.name || "reader")).trim();
    const bio = document.getElementById("ob-bio").value.trim();
    const allItems = [...GENERAL_INTERESTS, ...SPECIFIC_INTERESTS];

    return {
      name: document.getElementById("ob-name").value || currentUser?.name || "",
      pseudo,
      bio,
      avatar: selectedAvatar || currentUser?.avatar || "",
      fieldIds: GENERAL_INTERESTS.filter(item => selectedIds.has(item.id)).map(item => item.id),
      subjectIds: SPECIFIC_INTERESTS.filter(item => selectedIds.has(item.id)).map(item => item.id),
      fields: GENERAL_INTERESTS.filter(item => selectedIds.has(item.id)).map(item => item.label),
      subjects: SPECIFIC_INTERESTS.filter(item => selectedIds.has(item.id)).map(item => item.label),
      interests: [...selectedIds].map(id => allItems.find(item => item.id === id)?.label).filter(Boolean),
      interestIds: [...selectedIds]
    };
  }

  function buildTopicPills(containerId, items) {
    const container = document.getElementById(containerId);
    container.innerHTML = (items.length ? items : ["No selection"]).map(item => `<span class="ob-topic-pill">${escapeHTML(item)}</span>`).join("");
  }

  function refreshUserUI(user) {
    if (!window.IBlog) return;
    IBlog.Dashboard?.updateUserUI?.();
    IBlog.Profile?.buildProfile?.();
    IBlog.Feed?.build?.();
    IBlog.Views?.buildSaved?.();
    window.RightRail?.refreshAuthors?.();

    const pseudo = document.getElementById("profile-pseudo");
    if (pseudo) pseudo.textContent = `@${user.pseudo}`;

    const bio = document.getElementById("profile-bio-text");
    if (bio) bio.textContent = user.bio || "No bio yet.";

    const settingsBio = document.getElementById("settings-bio");
    if (settingsBio) settingsBio.value = user.bio || "";
  }

  function syncCurrentUserArticles(user) {
    const articles = window.IBlog?.state?.articles;
    if (!Array.isArray(articles) || !user) return;

    const userId = user.id ?? null;
    const userEmail = String(user.email || "").trim().toLowerCase();

    articles.forEach(article => {
      if (!article) return;
      const articleAuthorId = article.authorId ?? article.userId ?? null;
      const articleAuthorEmail = String(article.authorEmail || "").trim().toLowerCase();
      const isCurrentUsersArticle = (
        (userId !== null && articleAuthorId !== null && String(userId) === String(articleAuthorId)) ||
        (userEmail && articleAuthorEmail && userEmail === articleAuthorEmail)
      );

      if (!isCurrentUsersArticle) return;

      article.author = user.name || article.author;
      article.authorInitial = user.initial || (user.name?.[0] || article.authorInitial || "A").toUpperCase();
      article.authorAvatar = user.avatar || "";
      article.authorEmail = user.email || article.authorEmail || "";
      article.authorId = user.id ?? article.authorId ?? article.userId ?? null;
      article.userId = article.authorId ?? article.userId ?? user.id ?? null;
    });
  }

  function updateAvatar(element, imageSrc, name) {
    if (!element) return;
    const initial = (name || "A")[0].toUpperCase();
    if (imageSrc) {
      element.textContent = "";
      element.style.backgroundImage = `url("${imageSrc}")`;
      element.style.backgroundSize = "cover";
      element.style.backgroundPosition = "center";
      element.style.backgroundColor = "transparent";
    } else {
      element.textContent = initial;
      element.style.backgroundImage = "";
      element.style.backgroundSize = "";
      element.style.backgroundPosition = "";
      element.style.backgroundColor = "var(--accent)";
    }
  }

  function escapeHTML(value) {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  return {
    start,
    editInterests: (user, options = {}) => start(user, { ...options, mode: "interests", finishLabel: options.finishLabel || "Save interests" }),
    cancel,
    goStep,
    toggleChip,
    validatePseudo,
    updateBioCount,
    handleAvatarUpload,
    finish
  };
})();
