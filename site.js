const state = {
  categories: [],
  posts: [],
  activeCategory: "all",
  query: "",
  visibleRows: 4
};

const refs = {
  buttonRow: document.querySelector(".button-row"),
  cardGrid: document.querySelector("[data-card-grid]"),
  emptyState: document.querySelector("[data-empty-state]"),
  hero: document.querySelector(".hero"),
  moreMenu: document.querySelector("[data-more-menu]"),
  morePanel: document.querySelector("[data-more-panel]"),
  moreToggle: document.querySelector("[data-more-toggle]"),
  resultsCopy: document.querySelector("[data-results-copy]"),
  searchField: document.querySelector("[data-search-field]"),
  searchInput: document.querySelector("[data-search-input]"),
  searchShell: document.querySelector("[data-search-shell]"),
  searchToggle: document.querySelector("[data-search-toggle]"),
  seeMore: document.querySelector("[data-see-more]"),
  stickyHeader: document.querySelector("[data-sticky-header]"),
  stickyNav: document.querySelector("[data-sticky-nav]"),
  categoryRow: document.querySelector("[data-category-row]")
};

function getColumns() {
  if (window.innerWidth <= 610) {
    return 1;
  }

  if (window.innerWidth <= 910) {
    return 2;
  }

  return 3;
}

function formatDate(value) {
  const date = new Date(value + "T00:00:00");

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric"
  });
}

function closeMoreMenu() {
  if (!refs.moreToggle || !refs.morePanel) {
    return;
  }

  refs.moreToggle.setAttribute("aria-expanded", "false");
  refs.morePanel.hidden = true;
}

function setHeaderVisibility(isVisible) {
  refs.stickyHeader.classList.toggle("is-visible", isVisible);

  if (refs.hero) {
    refs.hero.classList.toggle("is-hidden", isVisible && window.innerWidth <= 910);
  }
}

function filteredPosts() {
  return state.posts.filter(function (post) {
    const matchesCategory = state.activeCategory === "all" || post.category.slug === state.activeCategory;
    const haystack = [
      post.title,
      post.excerpt,
      post.category.name,
      post.author.name
    ].join(" ").toLowerCase();
    const matchesQuery = !state.query || haystack.includes(state.query);

    return matchesCategory && matchesQuery;
  });
}

function createFilterButton(category, variant) {
  const button = document.createElement("button");
  const isActive = state.activeCategory === category.slug;

  button.type = "button";
  button.textContent = category.name;
  button.dataset.category = category.slug;
  button.addEventListener("click", function () {
    state.activeCategory = category.slug;
    state.visibleRows = 4;
    renderFilters();
    renderPosts();
    closeMoreMenu();
  });

  if (variant === "main") {
    button.className = "button " + (isActive ? "button-primary is-active" : "button-secondary");
  } else {
    button.className = "menu-link" + (isActive ? " is-active" : "");
  }

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
  const excerpt = post.excerpt || "No excerpt available.";

  article.className = "card content-card";
  article.innerHTML = [
    '<div class="content-card__media">',
    '<img src="' + post.imageUrl + '" alt="' + post.imageAlt + '">',
    "</div>",
    '<div class="content-card__body">',
    '<div class="content-card__meta">',
    '<p class="content-card__tag">' + post.category.name + "</p>",
    '<p class="content-card__date">' + formatDate(post.postDate) + "</p>",
    "</div>",
    "<h3>" + post.title + "</h3>",
    '<p class="content-card__author">By ' + post.author.name + "</p>",
    '<p class="content-card__excerpt">' + excerpt + "</p>",
    "</div>"
  ].join("");

  return article;
}

function renderPosts() {
  const posts = filteredPosts();
  const visibleCount = state.visibleRows * getColumns();

  refs.cardGrid.innerHTML = "";

  posts.forEach(function (post, index) {
    const card = createPostCard(post);
    card.hidden = index >= visibleCount;
    refs.cardGrid.append(card);
  });

  refs.emptyState.hidden = posts.length !== 0;
  refs.seeMore.hidden = posts.length <= visibleCount;
  refs.resultsCopy.textContent = posts.length
    ? "Showing " + posts.length + " published article" + (posts.length === 1 ? "" : "s") + "."
    : "No published articles match the current filters.";
}

function bindSearch() {
  refs.searchToggle.addEventListener("click", function () {
    const willShow = refs.searchField.hidden;

    refs.searchField.hidden = !willShow;

    if (willShow) {
      refs.searchInput.focus();
      return;
    }

    if (!refs.searchInput.value.trim()) {
      state.query = "";
      renderPosts();
    }
  });

  refs.searchInput.addEventListener("input", function (event) {
    state.query = event.target.value.trim().toLowerCase();
    state.visibleRows = 4;
    renderPosts();
  });

  document.addEventListener("click", function (event) {
    if (refs.searchShell && !refs.searchShell.contains(event.target) && !refs.searchField.hidden && !refs.searchInput.value.trim()) {
      refs.searchField.hidden = true;
    }
  });
}

function bindSeeMore() {
  refs.seeMore.addEventListener("click", function () {
    state.visibleRows += 2;
    renderPosts();
  });
}

function bindStickyBehavior() {
  if ("IntersectionObserver" in window) {
    const observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        setHeaderVisibility(!entry.isIntersecting);
      });
    }, { threshold: 0 });

    observer.observe(refs.buttonRow);
  } else {
    function updateStickyFallback() {
      setHeaderVisibility(refs.buttonRow.getBoundingClientRect().bottom <= 56);
    }

    window.addEventListener("scroll", updateStickyFallback, { passive: true });
    updateStickyFallback();
  }
}

function bindMoreMenu() {
  refs.moreToggle.addEventListener("click", function () {
    const isExpanded = refs.moreToggle.getAttribute("aria-expanded") === "true";
    refs.moreToggle.setAttribute("aria-expanded", String(!isExpanded));
    refs.morePanel.hidden = isExpanded;
  });

  document.addEventListener("click", function (event) {
    if (refs.moreMenu && !refs.moreMenu.contains(event.target)) {
      closeMoreMenu();
    }
  });
}

async function loadContent() {
  const payload = await fetch("/api/content").then(function (response) {
    return response.json().then(function (json) {
      if (!response.ok) {
        throw new Error(json.error || "Failed to load content.");
      }

      return json;
    });
  });

  state.categories = payload.categories || [];
  state.posts = payload.posts || [];
}

async function init() {
  bindSearch();
  bindSeeMore();
  bindStickyBehavior();
  bindMoreMenu();

  try {
    await loadContent();
    renderFilters();
    renderPosts();
  } catch (error) {
    refs.resultsCopy.textContent = "Database content is not available yet.";
    refs.emptyState.hidden = false;
    refs.emptyState.innerHTML = "<h3>Content unavailable</h3><p>" + error.message + "</p>";
  }

  window.addEventListener("resize", function () {
    closeMoreMenu();
    renderPosts();
    setHeaderVisibility(refs.stickyHeader.classList.contains("is-visible"));
  });
}

init();
