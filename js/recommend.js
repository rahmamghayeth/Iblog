(function () {
  "use strict";

  const API_URL = "backend/controller/recommend_api.php";
  window.IBlogRecommendState = window.IBlogRecommendState || {
    directMatchedIds: [],
    recommendedIds: [],
    scope: ""
  };
  const INTEREST_SYNONYMS = {
    ai: ["AI", "Artificial Intelligence", "Machine Learning", "ML"],
    "artificial intelligence": ["AI", "Machine Learning", "ML"],
    ml: ["Machine Learning", "AI", "Artificial Intelligence"],
    "machine learning": ["Machine Learning", "AI", "Artificial Intelligence", "ML"],
    technology: ["Technology", "Tech", "AI", "Software"],
    design: ["Design", "UX/UI", "UX", "UI", "Product"],
    "ux ui": ["UX/UI", "UX", "UI", "Design", "Product"],
    ux: ["UX", "UX/UI", "Design", "Product"],
    ui: ["UI", "UX/UI", "Design", "Product"],
    startups: ["Startups", "Business", "Entrepreneurship", "Product"],
    business: ["Business", "Startups", "Finance", "Marketing"],
    finance: ["Finance", "Business", "Economics"],
    economics: ["Economics", "Finance", "Business"],
    science: ["Science", "Research"],
    health: ["Health", "Biotech", "Neuroscience"],
    biotech: ["Biotech", "Health", "Science"],
    neuroscience: ["Neuroscience", "Health", "Science"],
    culture: ["Culture", "Community", "Creators", "Media"],
    media: ["Media", "Culture", "Writing", "Creators"],
    writing: ["Writing", "Editorial", "Storytelling", "Media"],
    travel: ["Travel", "Culture", "Storytelling"],
    education: ["Education", "Learning"],
    sports: ["Sports"],
    environment: ["Environment", "Climate", "Climate Tech"],
    "climate tech": ["Climate Tech", "Climate", "Environment", "Science"],
    crypto: ["Crypto", "Web3", "Blockchain", "Finance"],
    web3: ["Web3", "Crypto", "Blockchain"],
    cybersecurity: ["Cybersecurity", "Technology", "Security"],
    robotics: ["Robotics", "AI", "Technology", "Machine Learning"],
    "data science": ["Data Science", "AI", "Machine Learning", "Analytics"],
    philosophy: ["Philosophy", "Culture", "Psychology"],
    psychology: ["Psychology", "Health", "Science"],
    geopolitics: ["Geopolitics", "Politics", "World"],
    politics: ["Politics", "Geopolitics", "Policy"],
    architecture: ["Architecture", "Design"],
    gaming: ["Gaming", "Technology", "Culture"],
    leadership: ["Leadership", "Business", "Productivity"],
    marketing: ["Marketing", "Business", "Media"],
    history: ["History", "Culture"],
    literature: ["Literature", "Writing", "Culture"],
    music: ["Music", "Culture"],
    food: ["Food", "Culture"],
    productivity: ["Productivity", "Business"],
    space: ["Space", "Science", "Technology"]
  };

  function canonicalWord(value) {
    return String(value || "")
      .toLowerCase()
      .trim()
      .replace(/[\s_\-/]+/g, " ")
      .trim();
  }

  function uniqueCanonicalValues(values) {
    return [...new Set(
      values
        .map((item) => canonicalWord(item))
        .filter(Boolean)
    )];
  }

  function toProfileInterestsArray(input) {
    if (Array.isArray(input)) {
      return uniqueCanonicalValues(input);
    }
    if (typeof input === "string" && input.trim()) {
      return uniqueCanonicalValues(input.split(","));
    }
    if (input && typeof input === "object") {
      const selectedProfileInterests = Array.isArray(input.interestIds) && input.interestIds.length
        ? input.interestIds
        : [
            ...(Array.isArray(input.fields) ? input.fields : []),
            ...(Array.isArray(input.subjects) ? input.subjects : [])
          ];

      return uniqueCanonicalValues(selectedProfileInterests);
    }
    return [];
  }

  function getActiveFeedTab() {
    const active = document.querySelector(".feed-tab.active");
    const key = String(active?.dataset?.feedTab || active?.textContent || "recommended").trim().toLowerCase().replace(/\s+/g, "");
    return ["recommended", "following", "latest"].includes(key) ? key : "recommended";
  }

  function renderRecommended(recommendedIds = [], directMatchedIds = []) {
    void recommendedIds;
    void directMatchedIds;
  }

  async function applyRecommendations(interestsSource) {
    try {
      const currentScope = window.IBlogSession?.scopedKey?.("reco", window.IBlogSession?.getUser?.()) || "reco::guest";
      if (window.IBlogRecommendState.scope !== currentScope) {
        window.IBlogRecommendState.directMatchedIds = [];
        window.IBlogRecommendState.recommendedIds = [];
        window.IBlogRecommendState.scope = currentScope;
      }

      const interests = toProfileInterestsArray(interestsSource);
      if (!interests.length) {
        window.IBlogRecommendState.directMatchedIds = [];
        window.IBlogRecommendState.recommendedIds = [];
        window.IBlog?.Feed?.build?.(getActiveFeedTab(), "feed-container");
        return;
      }

      const { recommendedIds, directMatchedIds } = await fetchRecommended(interests);
      const matchedIds = [...new Set([
        ...directMatchedIds,
        ...recommendedIds
      ])];

      if (!matchedIds.length) {
        window.IBlogRecommendState.directMatchedIds = [];
        window.IBlogRecommendState.recommendedIds = [];
        window.IBlog?.Feed?.build?.(getActiveFeedTab(), "feed-container");
        return;
      }

      window.IBlogRecommendState.directMatchedIds = matchedIds;
      window.IBlogRecommendState.recommendedIds = matchedIds;
      window.IBlog?.Feed?.build?.(getActiveFeedTab(), "feed-container");
    } catch (error) {
      console.warn("Recommendation flow failed:", error);
    }
  }

  async function fetchRecommended(interests) {
    const list = toProfileInterestsArray(interests);
    const params = new URLSearchParams();
    if (list.length) params.set("interests", list.join(","));

    const response = await fetch(`${API_URL}?${params.toString()}`, {
      method: "GET",
      headers: { Accept: "application/json" },
      credentials: "same-origin"
    });

    if (!response.ok) {
      throw new Error(`recommend_api failed (${response.status})`);
    }

    const data = await response.json();
    return {
      articles: Array.isArray(data?.articles) ? data.articles : [],
      recommendedIds: Array.isArray(data?.recommendedIds) ? data.recommendedIds.map(Number) : [],
      directMatchedIds: Array.isArray(data?.directMatchedIds) ? data.directMatchedIds.map(Number) : []
    };
  }

  function applyForCurrentUser() {
    const user = window.IBlogSession?.getUser?.();
    if (!user) return;
    applyRecommendations(user);
  }

  window.fetchRecommended = fetchRecommended;
  window.renderRecommended = renderRecommended;

  window.addEventListener("onboarding:complete", (event) => {
    applyRecommendations(event?.detail?.user || null);
  });

  window.addEventListener("iblog:articles-refreshed", applyForCurrentUser);

  window.addEventListener("iblog:session-changed", () => {
    window.IBlogRecommendState.directMatchedIds = [];
    window.IBlogRecommendState.recommendedIds = [];
    window.IBlogRecommendState.scope = window.IBlogSession?.scopedKey?.("reco", window.IBlogSession?.getUser?.()) || "reco::guest";
    applyForCurrentUser();
  });

  document.addEventListener("DOMContentLoaded", applyForCurrentUser);
})();
