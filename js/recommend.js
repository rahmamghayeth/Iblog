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

  function expandInterestValues(values) {
    const expanded = new Map();

    values.forEach((value) => {
      const key = canonicalWord(value);
      if (!key) return;
      expanded.set(key, String(value).trim());

      const aliases = INTEREST_SYNONYMS[key] || [];
      aliases.forEach((alias) => {
        const aliasKey = canonicalWord(alias);
        if (aliasKey && !expanded.has(aliasKey)) {
          expanded.set(aliasKey, alias);
        }
      });
    });

    return [...expanded.values()];
  }

  function toInterestsArray(input) {
    if (Array.isArray(input)) {
      return expandInterestValues(input.map((item) => String(item || "").trim()).filter(Boolean));
    }
    if (typeof input === "string" && input.trim()) {
      return expandInterestValues(input.split(",").map((item) => item.trim()).filter(Boolean));
    }
    if (input && typeof input === "object") {
      return expandInterestValues([
        ...(Array.isArray(input.interests) ? input.interests : []),
        ...(Array.isArray(input.fields) ? input.fields : []),
        ...(Array.isArray(input.subjects) ? input.subjects : []),
        ...(Array.isArray(input.fieldIds) ? input.fieldIds : []),
        ...(Array.isArray(input.subjectIds) ? input.subjectIds : []),
        ...(Array.isArray(input.interestIds) ? input.interestIds : [])
      ].map((item) => String(item || "").trim()).filter(Boolean));
    }
    return [];
  }

  function getActiveFeedTab() {
    const active = document.querySelector(".feed-tab.active");
    const key = String(active?.dataset?.feedTab || active?.textContent || "recommended").trim().toLowerCase().replace(/\s+/g, "");
    return ["recommended", "following", "latest"].includes(key) ? key : "recommended";
  }

  function interestAliases(interest) {
    const key = canonicalWord(interest);
    const aliases = [key];
    if (INTEREST_SYNONYMS[key]) aliases.push(...INTEREST_SYNONYMS[key]);
    return [...new Set(aliases.map(canonicalWord).filter(Boolean))];
  }

  function articleMatchesInterests(article, interests) {
    return articleInterestScore(article, interests) > 0;
  }

  function aliasMatchesToken(token, alias) {
    if (!token || !alias) return false;
    return token === alias || token.includes(alias) || alias.includes(token);
  }

  function articleInterestScore(article, interests) {
    const categoryTokens = [
      canonicalWord(article?.category || ""),
      canonicalWord(article?.cat || "")
    ].filter(Boolean);
    const tagTokens = [
      ...String(Array.isArray(article?.tags) ? article.tags.join(",") : article?.tags || "")
        .split(",")
        .map(canonicalWord)
        .filter(Boolean)
    ];
    const titleText = canonicalWord(article?.title || "");
    const summaryText = canonicalWord([
      article?.excerpt || "",
      article?.body || ""
    ].join(" "));
    let score = 0;

    interests.forEach((interest) => {
      interestAliases(interest).forEach((alias) => {
        if (!alias) return;
        if (categoryTokens.some((token) => aliasMatchesToken(token, alias))) {
          score += 8;
          return;
        }
        if (tagTokens.some((token) => aliasMatchesToken(token, alias))) {
          score += 6;
          return;
        }
        if (titleText && titleText.includes(alias)) {
          score += 3;
          return;
        }
        if (summaryText && summaryText.includes(alias)) {
          score += 1;
        }
      });
    });

    return score;
  }

  function scoreLocalArticles(interests) {
    return (window.IBlog?.state?.articles || [])
      .map((article) => ({
        id: Number(article?.id),
        score: articleInterestScore(article, interests)
      }))
      .filter((entry) => Number.isFinite(entry.id) && entry.score > 0)
      .sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score;
        return b.id - a.id;
      });
  }

  function reorderMainFeedByIds(recommendedIds, directMatchedIds, localScoreMap = new Map()) {
    if (!Array.isArray(window.IBlog?.state?.articles)) return;

    const source = window.IBlog.state.articles;
    const directRank = new Map(directMatchedIds.map((id, index) => [String(id), index]));
    const relatedRank = new Map(recommendedIds.map((id, index) => [String(id), index]));

    source.sort((a, b) => {
      const aId = String(a?.id ?? "");
      const bId = String(b?.id ?? "");
      const aScore = Number(localScoreMap.get(aId) || 0);
      const bScore = Number(localScoreMap.get(bId) || 0);

      if (aScore !== bScore) return bScore - aScore;

      const aDirect = directRank.has(aId);
      const bDirect = directRank.has(bId);

      if (aDirect !== bDirect) return aDirect ? -1 : 1;
      if (aDirect && bDirect) return directRank.get(aId) - directRank.get(bId);

      const aRelated = relatedRank.has(aId) ? relatedRank.get(aId) : Number.MAX_SAFE_INTEGER;
      const bRelated = relatedRank.has(bId) ? relatedRank.get(bId) : Number.MAX_SAFE_INTEGER;
      if (aRelated !== bRelated) return aRelated - bRelated;

      return (Number(b?.id) || 0) - (Number(a?.id) || 0);
    });
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

      const interests = [...new Set(toInterestsArray(interestsSource))];
      if (!interests.length) {
        window.IBlogRecommendState.directMatchedIds = [];
        window.IBlogRecommendState.recommendedIds = [];
        window.IBlog?.Feed?.build?.(getActiveFeedTab(), "feed-container");
        return;
      }

      const { recommendedIds, directMatchedIds } = await fetchRecommended(interests);
      const scoredLocalArticles = scoreLocalArticles(interests);
      const localScoreMap = new Map(scoredLocalArticles.map((entry) => [String(entry.id), entry.score]));
      const localDirectIds = scoredLocalArticles.map((entry) => entry.id);
      const mergedDirect = [...new Set([...localDirectIds, ...directMatchedIds])];
      const mergedRecommended = [...new Set([
        ...mergedDirect,
        ...recommendedIds,
        ...scoredLocalArticles.map((entry) => entry.id)
      ])];

      if (!mergedRecommended.length) {
        window.IBlogRecommendState.directMatchedIds = [];
        window.IBlogRecommendState.recommendedIds = [];
        window.IBlog?.Feed?.build?.(getActiveFeedTab(), "feed-container");
        return;
      }

      window.IBlogRecommendState.directMatchedIds = mergedDirect;
      window.IBlogRecommendState.recommendedIds = mergedRecommended;
      reorderMainFeedByIds(mergedRecommended, mergedDirect, localScoreMap);
      window.IBlog?.Feed?.build?.(getActiveFeedTab(), "feed-container");
    } catch (error) {
      console.warn("Recommendation flow failed:", error);
    }
  }

  async function fetchRecommended(interests) {
    const list = [...new Set(toInterestsArray(interests))];
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
