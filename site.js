const state = {
  categories: [],
  posts: [],
  activeCategory: "all",
  activePost: null,
  adminAuthMode: "login",
  query: "",
  visibleRows: 4
};

const refs = {
  adminAuthClose: document.querySelector("[data-admin-auth-close]"),
  adminAuthOverlay: document.querySelector("[data-admin-auth-overlay]"),
  adminAuthStatus: document.querySelector("[data-admin-auth-status]"),
  adminAuthViews: document.querySelectorAll("[data-admin-auth-view]"),
  adminEntries: document.querySelectorAll("[data-admin-entry]"),
  adminLoginEmail: document.querySelector("[data-admin-login-email]"),
  adminLoginForm: document.querySelector("[data-admin-login-form]"),
  adminLoginPassword: document.querySelector("[data-admin-login-password]"),
  adminRecoverBack: document.querySelector("[data-admin-recover-back]"),
  adminRecoverEmail: document.querySelector("[data-admin-recover-email]"),
  adminRecoverForm: document.querySelector("[data-admin-recover-form]"),
  adminShowRecover: document.querySelector("[data-admin-show-recover]"),
  articleBody: document.querySelector("[data-article-body]"),
  articleCategory: document.querySelector("[data-article-category]"),
  articleMedia: document.querySelector("[data-article-media]"),
  articleMeta: document.querySelector("[data-article-meta]"),
  articleSection: document.querySelector("[data-article-section]"),
  articleTitle: document.querySelector("[data-article-title]"),
  cardGrid: document.querySelector("[data-card-grid]"),
  categoryRow: document.querySelector("[data-category-row]"),
  closeArticle: document.querySelector("[data-close-article]"),
  emptyState: document.querySelector("[data-empty-state]"),
  featuredExcerpt: document.querySelector("[data-featured-excerpt]"),
  featuredMeta: document.querySelector("[data-featured-meta]"),
  featuredOpen: document.querySelector("[data-featured-open]"),
  featuredTitle: document.querySelector("[data-featured-title]"),
  moreMenu: document.querySelector("[data-more-menu]"),
  morePanel: document.querySelector("[data-more-panel]"),
  moreToggle: document.querySelector("[data-more-toggle]"),
  resultsCopy: document.querySelector("[data-results-copy]"),
  searchField: document.querySelector("[data-search-field]"),
  searchInput: document.querySelector("[data-search-input]"),
  searchToggle: document.querySelector("[data-search-toggle]"),
  seeMore: document.querySelector("[data-see-more]"),
  stickyHeader: document.querySelector("[data-sticky-header]"),
  stickyNav: document.querySelector("[data-sticky-nav]")
};

async function api(path, options) {
  const response = await fetch(path, options || {});
  const isJson = response.headers.get("content-type")?.includes("application/json");
  const payload = isJson ? await response.json() : null;

  if (!response.ok) {
    throw new Error(payload && payload.error ? payload.error : "Request failed.");
  }

  return payload;
}

function setAdminAuthStatus(message) {
  refs.adminAuthStatus.textContent = message || "";
}

function renderAdminAuth() {
  refs.adminAuthViews.forEach(function (section) {
    section.hidden = section.getAttribute("data-admin-auth-view") !== state.adminAuthMode;
  });
}

function openAdminAuth(mode) {
  state.adminAuthMode = mode || "login";
  renderAdminAuth();
  refs.adminAuthOverlay.hidden = false;

  if (state.adminAuthMode === "recover") {
    refs.adminRecoverEmail.focus();
    return;
  }

  refs.adminLoginEmail.focus();
}

function closeAdminAuth() {
  refs.adminAuthOverlay.hidden = true;
  state.adminAuthMode = "login";
  refs.adminLoginForm.reset();
  refs.adminRecoverForm.reset();
  setAdminAuthStatus("");
  renderAdminAuth();
}

async function openAdminEntry() {
  try {
    const payload = await api("/api/admin/session");

    if (payload.authenticated) {
      window.location.assign("/admin.html");
      return;
    }
  } catch (error) {
    setAdminAuthStatus(error.message);
  }

  openAdminAuth("login");
}

function formatDate(value) {
  const date = new Date(String(value).includes("T") ? value : value + "T00:00:00");

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric"
  });
}

function getColumns() {
  if (window.innerWidth <= 610) {
    return 1;
  }

  if (window.innerWidth <= 910) {
    return 2;
  }

  return 3;
}

function filteredPosts() {
  return state.posts.filter(function (post) {
    const matchesCategory = state.activeCategory === "all" || post.category.slug === state.activeCategory;
    const haystack = [post.title, post.excerpt, post.category.name, post.author.name].join(" ").toLowerCase();
    return matchesCategory && (!state.query || haystack.includes(state.query));
  });
}

function setUrlPostParam(postId) {
  const url = new URL(window.location.href);

  if (postId) {
    url.searchParams.set("post", String(postId));
  } else {
    url.searchParams.delete("post");
  }

  window.history.replaceState({}, "", url.pathname + url.search + url.hash);
}

function setHeaderVisibility(isVisible) {
  refs.stickyHeader.classList.toggle("is-visible", isVisible);
}

function closeMoreMenu() {
  refs.moreToggle.setAttribute("aria-expanded", "false");
  refs.morePanel.hidden = true;
}

function createFilterButton(category, variant) {
  const button = document.createElement("button");
  const isActive = state.activeCategory === category.slug;

  button.type = "button";
  button.textContent = category.name;
  button.className = variant === "main"
    ? "button " + (isActive ? "button-primary is-active" : "button-secondary")
    : "menu-link" + (isActive ? " is-active" : "");

  button.addEventListener("click", function () {
    state.activeCategory = category.slug;
    state.visibleRows = 4;
    renderFilters();
    renderFeatured();
    renderPosts();
    closeMoreMenu();
  });

  return button;
}

function renderFilters() {
  const categories = [{ name: "All", slug: "all" }].concat(state.categories);

  refs.categoryRow.innerHTML = "";
  refs.stickyNav.innerHTML = "";
  refs.morePanel.innerHTML = "";

  categories.forEach(function (category) {
    refs.categoryRow.append(createFilterButton(category, "main"));
    refs.stickyNav.append(createFilterButton(category, "sticky"));
    refs.morePanel.append(createFilterButton(category, "sticky"));
  });
}

function createPostCard(post) {
  const article = document.createElement("article");
  const media = document.createElement("div");
  const image = document.createElement("img");
  const body = document.createElement("div");
  const meta = document.createElement("div");
  const tag = document.createElement("p");
  const date = document.createElement("p");
  const title = document.createElement("h3");
  const author = document.createElement("p");
  const excerpt = document.createElement("p");
  const openButton = document.createElement("button");

  article.className = "card content-card";
  media.className = "content-card__media";
  body.className = "content-card__body";
  meta.className = "content-card__meta";
  tag.className = "content-card__tag";
  date.className = "content-card__date";
  author.className = "content-card__author";
  excerpt.className = "content-card__excerpt";
  openButton.className = "button button-secondary button-compact content-card__cta";

  image.src = post.imageUrl;
  image.alt = post.imageAlt || post.title;
  tag.textContent = post.category.name;
  date.textContent = formatDate(post.postDate);
  title.textContent = post.title;
  author.textContent = "By " + post.author.name;
  excerpt.textContent = post.excerpt || "No excerpt available.";
  openButton.type = "button";
  openButton.textContent = "Read article";
  openButton.addEventListener("click", function () {
    openArticle(post.id);
  });

  meta.append(tag, date);
  media.append(image);
  body.append(meta, title, author, excerpt, openButton);
  article.append(media, body);

  return article;
}

function renderFeatured() {
  const [post] = filteredPosts();

  if (!post) {
    refs.featuredTitle.textContent = "No article matches this filter yet.";
    refs.featuredMeta.textContent = "Adjust the filters or publish from admin.";
    refs.featuredExcerpt.textContent = "";
    refs.featuredOpen.hidden = true;
    return;
  }

  refs.featuredTitle.textContent = post.title;
  refs.featuredMeta.textContent = post.category.name + " · " + formatDate(post.postDate) + " · " + post.author.name;
  refs.featuredExcerpt.textContent = post.excerpt || "Open the article to read the full post.";
  refs.featuredOpen.hidden = false;
  refs.featuredOpen.onclick = function () {
    openArticle(post.id);
  };
}

function renderPosts() {
  const posts = filteredPosts();
  const visibleCount = state.visibleRows * getColumns();
  const visiblePosts = posts.slice(0, visibleCount);

  refs.cardGrid.innerHTML = "";

  visiblePosts.forEach(function (post) {
    refs.cardGrid.append(createPostCard(post));
  });

  refs.emptyState.hidden = posts.length > 0;
  refs.seeMore.hidden = visibleCount >= posts.length || !posts.length;

  refs.resultsCopy.textContent = posts.length
    ? posts.length + " article" + (posts.length === 1 ? "" : "s") + " available."
    : "No articles match the current view.";
}

function normalizeVideoUrl(url) {
  if (!url) {
    return null;
  }

  try {
    const parsed = new URL(url);
    const youtubeId = parsed.searchParams.get("v");

    if (parsed.hostname === "youtu.be") {
      return "https://www.youtube.com/embed/" + parsed.pathname.replace(/^\//, "");
    }

    if (parsed.hostname.includes("youtube.com") && parsed.pathname === "/watch" && youtubeId) {
      return "https://www.youtube.com/embed/" + youtubeId;
    }

    return parsed.toString();
  } catch (error) {
    return null;
  }
}

function renderActiveArticle() {
  if (!state.activePost) {
    refs.articleSection.hidden = true;
    refs.articleCategory.textContent = "";
    refs.articleTitle.textContent = "";
    refs.articleMeta.textContent = "";
    refs.articleBody.innerHTML = "";
    refs.articleMedia.innerHTML = "";
    return;
  }

  refs.articleSection.hidden = false;
  refs.articleCategory.textContent = state.activePost.category.name;
  refs.articleTitle.textContent = state.activePost.title;
  refs.articleMeta.textContent = formatDate(state.activePost.postDate) + " · " + state.activePost.author.name;
  refs.articleBody.innerHTML = state.activePost.contentHtml || "<p>No content available.</p>";
  refs.articleMedia.innerHTML = "";

  if (state.activePost.imageUrl) {
    const image = document.createElement("img");
    image.src = state.activePost.imageUrl;
    image.alt = state.activePost.imageAlt || state.activePost.title;
    refs.articleMedia.append(image);
  }

  const videoUrl = normalizeVideoUrl(state.activePost.videoUrl);

  if (videoUrl) {
    const video = document.createElement("div");
    const iframe = document.createElement("iframe");

    video.className = "article-video";
    iframe.src = videoUrl;
    iframe.title = state.activePost.title;
    iframe.loading = "lazy";
    iframe.allow = "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share";
    iframe.referrerPolicy = "strict-origin-when-cross-origin";
    iframe.allowFullscreen = true;

    video.append(iframe);
    refs.articleMedia.append(video);
  }
}

async function openArticle(postId) {
  const payload = await api("/api/posts/" + postId);
  state.activePost = payload.post;
  renderActiveArticle();
  setUrlPostParam(postId);
  refs.articleSection.scrollIntoView({ behavior: "smooth", block: "start" });
}

function closeArticle() {
  state.activePost = null;
  renderActiveArticle();
  setUrlPostParam(null);
}

async function loadContent() {
  const payload = await api("/api/content");
  state.categories = payload.categories || [];
  state.posts = payload.posts || [];
  renderFilters();
  renderFeatured();
  renderPosts();

  const postId = String(new URL(window.location.href).searchParams.get("post") || "").trim();

  if (postId) {
    try {
      await openArticle(postId);
    } catch (error) {
      closeArticle();
    }
  }
}

function bindEvents() {
  refs.adminEntries.forEach(function (button) {
    button.addEventListener("click", openAdminEntry);
  });

  refs.adminAuthClose.addEventListener("click", closeAdminAuth);

  refs.adminAuthOverlay.addEventListener("click", function (event) {
    if (event.target === refs.adminAuthOverlay) {
      closeAdminAuth();
    }
  });

  refs.adminShowRecover.addEventListener("click", function () {
    refs.adminRecoverEmail.value = refs.adminLoginEmail.value.trim();
    openAdminAuth("recover");
  });

  refs.adminRecoverBack.addEventListener("click", function () {
    openAdminAuth("login");
  });

  refs.adminLoginForm.addEventListener("submit", async function (event) {
    event.preventDefault();

    try {
      setAdminAuthStatus("");
      await api("/api/admin/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          email: refs.adminLoginEmail.value.trim(),
          password: refs.adminLoginPassword.value
        })
      });
      window.location.assign("/admin.html");
    } catch (error) {
      setAdminAuthStatus(error.message);
    }
  });

  refs.adminRecoverForm.addEventListener("submit", async function (event) {
    event.preventDefault();

    try {
      setAdminAuthStatus("");
      await api("/api/admin/recover", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          email: refs.adminRecoverEmail.value.trim()
        })
      });
      closeAdminAuth();
    } catch (error) {
      setAdminAuthStatus(error.message);
    }
  });

  refs.searchToggle.addEventListener("click", function () {
    const nextHidden = !refs.searchField.hidden;
    refs.searchField.hidden = nextHidden;

    if (!nextHidden) {
      refs.searchInput.focus();
      return;
    }

    refs.searchInput.value = "";
    state.query = "";
    state.visibleRows = 4;
    renderFeatured();
    renderPosts();
  });

  refs.searchInput.addEventListener("input", function () {
    state.query = refs.searchInput.value.trim().toLowerCase();
    state.visibleRows = 4;
    renderFeatured();
    renderPosts();
  });

  refs.moreToggle.addEventListener("click", function () {
    const expanded = refs.moreToggle.getAttribute("aria-expanded") === "true";
    refs.moreToggle.setAttribute("aria-expanded", String(!expanded));
    refs.morePanel.hidden = expanded;
  });

  document.addEventListener("click", function (event) {
    if (!refs.moreMenu.contains(event.target)) {
      closeMoreMenu();
    }
  });

  refs.seeMore.addEventListener("click", function () {
    state.visibleRows += 2;
    renderPosts();
  });

  refs.closeArticle.addEventListener("click", closeArticle);

  window.addEventListener("resize", function () {
    renderPosts();
    setHeaderVisibility(window.scrollY > 180);
  });

  window.addEventListener("scroll", function () {
    setHeaderVisibility(window.scrollY > 180);
  });

  window.addEventListener("keydown", function (event) {
    if (event.key === "Escape" && !refs.adminAuthOverlay.hidden) {
      closeAdminAuth();
    }
  });
}

async function init() {
  bindEvents();

  try {
    await loadContent();
  } catch (error) {
    refs.resultsCopy.textContent = error.message;
    refs.featuredTitle.textContent = "Unable to load articles.";
    refs.featuredMeta.textContent = error.message;
    refs.featuredExcerpt.textContent = "";
    refs.featuredOpen.hidden = true;
  }
}

init();
