import { renderMarkdown, slugify } from "./shared/markdown.js";

const state = {
  currentUser: null,
  authMode: "login",
  hasUsers: true,
  categories: [],
  posts: [],
  recoveryData: null,
  recoveryToken: "",
  youtubeDefaultPlaylistId: "",
  editingCategoryId: null,
  editingPostId: null
};

const refs = {
  accountCurrentPassword: document.querySelector("[data-account-current-password]"),
  accountEmail: document.querySelector("[data-account-email]"),
  accountForm: document.querySelector("[data-account-form]"),
  accountName: document.querySelector("[data-account-name]"),
  accountNextPassword: document.querySelector("[data-account-next-password]"),
  accountPasswordForm: document.querySelector("[data-account-password-form]"),
  adminApp: document.querySelector("[data-admin-app]"),
  categoryDescription: document.querySelector("[data-category-description]"),
  categoryForm: document.querySelector("[data-category-form]"),
  categoryId: document.querySelector("[data-category-id]"),
  categoryList: document.querySelector("[data-category-list]"),
  categoryName: document.querySelector("[data-category-name]"),
  categoryReset: document.querySelector("[data-category-reset]"),
  categorySelect: document.querySelector("[data-post-category]"),
  categorySlug: document.querySelector("[data-category-slug]"),
  categorySortOrder: document.querySelector("[data-category-sort-order]"),
  headerLoginLink: document.querySelector("[data-header-login-link]"),
  imagePreview: document.querySelector("[data-image-preview]"),
  loginEmail: document.querySelector("[data-login-email]"),
  loginForm: document.querySelector("[data-login-form]"),
  loginPassword: document.querySelector("[data-login-password]"),
  logoutButton: document.querySelector("[data-logout-button]"),
  markdownPreview: document.querySelector("[data-markdown-preview]"),
  postContent: document.querySelector("[data-post-content]"),
  postDate: document.querySelector("[data-post-date]"),
  postForm: document.querySelector("[data-post-form]"),
  postId: document.querySelector("[data-post-id]"),
  postImageAlt: document.querySelector("[data-post-image-alt]"),
  postImageFile: document.querySelector("[data-post-image-file]"),
  postImageUrl: document.querySelector("[data-post-image-url]"),
  postList: document.querySelector("[data-post-list]"),
  postReset: document.querySelector("[data-post-reset]"),
  postSlug: document.querySelector("[data-post-slug]"),
  postStatus: document.querySelector("[data-post-status]"),
  postTitle: document.querySelector("[data-post-title]"),
  recoverBack: document.querySelector("[data-recover-back]"),
  recoverEmail: document.querySelector("[data-recover-email]"),
  recoverForm: document.querySelector("[data-recover-form]"),
  resetCancel: document.querySelector("[data-reset-cancel]"),
  resetCopy: document.querySelector("[data-reset-copy]"),
  resetEmail: document.querySelector("[data-reset-email]"),
  resetForm: document.querySelector("[data-reset-form]"),
  resetPassword: document.querySelector("[data-reset-password]"),
  sessionCard: document.querySelector("[data-session-card]"),
  sessionUser: document.querySelector("[data-session-user]"),
  showRecover: document.querySelector("[data-show-recover]"),
  setupEmail: document.querySelector("[data-setup-email]"),
  setupForm: document.querySelector("[data-setup-form]"),
  setupName: document.querySelector("[data-setup-name]"),
  setupPassword: document.querySelector("[data-setup-password]"),
  status: document.querySelector("[data-status]"),
  youtubeCategory: document.querySelector("[data-youtube-category]"),
  youtubeForm: document.querySelector("[data-youtube-form]"),
  youtubePlaylistId: document.querySelector("[data-youtube-playlist-id]"),
  youtubeStatus: document.querySelector("[data-youtube-status]")
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

function accessLabel(role) {
  const normalized = String(role || "").trim();
  return normalized ? normalized.charAt(0).toUpperCase() + normalized.slice(1) : "";
}

function setStatus(message, isError) {
  refs.status.textContent = message;
  refs.status.style.color = isError ? "var(--color-danger)" : "var(--color-text-soft)";
}

function renderMarkdownPreview() {
  const html = renderMarkdown(refs.postContent.value || "");
  refs.markdownPreview.innerHTML = html || "<p>Markdown preview will appear here.</p>";
}

function setImagePreview(url, alt) {
  if (!url) {
    refs.imagePreview.innerHTML = "<p>No image selected.</p>";
    return;
  }

  refs.imagePreview.innerHTML = '<img src="' + url + '" alt="' + (alt || "") + '">';
}

function bindAutoSlug(source, target) {
  target.dataset.manual = "false";

  source.addEventListener("input", function () {
    if (target.dataset.manual === "true") {
      return;
    }

    target.value = slugify(source.value);
  });

  target.addEventListener("input", function () {
    target.dataset.manual = target.value ? "true" : "false";
  });
}

function resetCategoryForm() {
  state.editingCategoryId = null;
  refs.categoryForm.reset();
  refs.categoryId.value = "";
  refs.categorySortOrder.value = "0";
}

function resetPostForm() {
  state.editingPostId = null;
  refs.postForm.reset();
  refs.postId.value = "";
  refs.postDate.value = new Date().toISOString().slice(0, 10);
  refs.postStatus.value = "visible";
  refs.postImageFile.value = "";
  populateCategorySelect();
  setImagePreview("", "");
  renderMarkdownPreview();
}

function populateCategorySelect(selectedId) {
  const nextSelectedId = selectedId !== undefined
    ? String(selectedId)
    : String(refs.categorySelect.value || "");
  const nextYoutubeSelectedId = selectedId !== undefined
    ? String(selectedId)
    : String(refs.youtubeCategory.value || "");

  refs.categorySelect.innerHTML = "";
  refs.youtubeCategory.innerHTML = "";

  if (!state.categories.length) {
    [refs.categorySelect, refs.youtubeCategory].forEach(function (select) {
      const option = document.createElement("option");
      option.value = "";
      option.textContent = "Create a category first";
      select.append(option);
    });
    return;
  }

  state.categories.forEach(function (category, index) {
    const option = document.createElement("option");
    const youtubeOption = document.createElement("option");
    option.value = String(category.id);
    option.textContent = category.name;
    youtubeOption.value = String(category.id);
    youtubeOption.textContent = category.name;

    if ((nextSelectedId && nextSelectedId === String(category.id)) || (!nextSelectedId && index === 0)) {
      option.selected = true;
    }

    if ((nextYoutubeSelectedId && nextYoutubeSelectedId === String(category.id)) || (!nextYoutubeSelectedId && index === 0)) {
      youtubeOption.selected = true;
    }

    refs.categorySelect.append(option);
    refs.youtubeCategory.append(youtubeOption);
  });
}

function renderAuthState() {
  const isResetMode = Boolean(state.recoveryData);
  const isRecoverMode = state.authMode === "recover" && !isResetMode;
  const isLoginMode = state.authMode !== "recover" && !isResetMode;

  refs.loginForm.hidden = Boolean(state.currentUser) || !state.hasUsers || !isLoginMode;
  refs.recoverForm.hidden = Boolean(state.currentUser) || !state.hasUsers || !isRecoverMode;
  refs.setupForm.hidden = Boolean(state.currentUser) || state.hasUsers || isResetMode;
  refs.resetForm.hidden = Boolean(state.currentUser) || !isResetMode;
  refs.sessionCard.hidden = !state.currentUser;
  refs.adminApp.hidden = !state.currentUser;
  refs.headerLoginLink.hidden = Boolean(state.currentUser) || !state.hasUsers;

  if (state.currentUser) {
    const pendingEmailCopy = state.currentUser.pendingEmail
      ? " · pending email " + state.currentUser.pendingEmail.email
      : "";
    refs.sessionUser.textContent = state.currentUser.name + " · " + state.currentUser.email + pendingEmailCopy + " · " + accessLabel(state.currentUser.role);
  } else {
    refs.sessionUser.textContent = "";
  }

  if (state.recoveryData) {
    refs.resetEmail.value = state.recoveryData.email;
    refs.resetCopy.textContent = "Set a new password for " + state.recoveryData.email + ". This reset link expires on " + state.recoveryData.expiresAt + ".";
  }
}

function clearRecoveryTokenFromUrl() {
  const url = new URL(window.location.href);
  url.searchParams.delete("invite");
  window.history.replaceState({}, "", url.pathname + url.search + url.hash);
}

function exitRecoveryMode() {
  state.recoveryData = null;
  state.recoveryToken = "";
  state.authMode = "login";
  refs.resetForm.reset();
  clearRecoveryTokenFromUrl();
  renderAuthState();
}

function openLoginMode() {
  if (state.recoveryData) {
    state.recoveryData = null;
    state.recoveryToken = "";
    refs.resetForm.reset();
    clearRecoveryTokenFromUrl();
  }

  state.authMode = "login";
  renderAuthState();

  if (!refs.loginForm.hidden) {
    refs.loginEmail.focus();
    refs.loginForm.scrollIntoView({ behavior: "smooth", block: "center" });
  }
}

function renderAccount() {
  if (!state.currentUser) {
    return;
  }

  refs.accountName.value = state.currentUser.name;
  refs.accountEmail.value = state.currentUser.pendingEmail
    ? state.currentUser.pendingEmail.email
    : state.currentUser.email;
}

function renderCategories() {
  refs.categoryList.innerHTML = "";

  state.categories.forEach(function (category) {
    const item = document.createElement("article");
    const editButton = document.createElement("button");
    const deleteButton = document.createElement("button");
    const actions = document.createElement("div");

    item.className = "item-card";
    item.innerHTML = [
      '<div class="item-card__head">',
      '<div>',
      '<h3 class="item-title">' + category.name + "</h3>",
      '<p class="item-meta">/' + category.slug + " · order " + category.sortOrder + "</p>",
      "</div>",
      "</div>",
      '<p class="item-copy">' + (category.description || "No description.") + "</p>"
    ].join("");

    editButton.className = "button button-secondary button-compact";
    editButton.type = "button";
    editButton.textContent = "Edit";
    editButton.addEventListener("click", function () {
      state.editingCategoryId = category.id;
      refs.categoryId.value = String(category.id);
      refs.categoryName.value = category.name;
      refs.categorySlug.value = category.slug;
      refs.categoryDescription.value = category.description || "";
      refs.categorySortOrder.value = String(category.sortOrder || 0);
    });

    deleteButton.className = "button button-secondary button-compact";
    deleteButton.type = "button";
    deleteButton.textContent = "Delete";
    deleteButton.addEventListener("click", async function () {
      if (!window.confirm('Delete category "' + category.name + '"?')) {
        return;
      }

      try {
        await api("/api/admin/categories/" + category.id, { method: "DELETE" });
        await loadBootstrap();
        resetCategoryForm();
        setStatus("Category deleted.");
      } catch (error) {
        setStatus(error.message, true);
      }
    });

    actions.className = "item-card__actions";
    actions.append(editButton, deleteButton);
    item.append(actions);
    refs.categoryList.append(item);
  });
}

function renderPosts() {
  refs.postList.innerHTML = "";

  state.posts.forEach(function (post) {
    const item = document.createElement("article");
    const editButton = document.createElement("button");
    const deleteButton = document.createElement("button");
    const actions = document.createElement("div");

    item.className = "item-card";
    item.innerHTML = [
      '<div class="item-card__head">',
      '<div>',
      '<h3 class="item-title">' + post.title + "</h3>",
      '<p class="item-meta">' + post.category.name + " · " + post.status + " · " + post.postDate + "</p>",
      "</div>",
      "</div>",
      '<p class="item-copy">' + (post.excerpt || "No excerpt available.") + "</p>"
    ].join("");

    editButton.className = "button button-secondary button-compact";
    editButton.type = "button";
    editButton.textContent = "Edit";
    editButton.addEventListener("click", function () {
      state.editingPostId = post.id;
      refs.postId.value = String(post.id);
      refs.postTitle.value = post.title;
      refs.postSlug.value = post.slug;
      refs.postDate.value = post.postDate;
      refs.postImageAlt.value = post.imageAlt || "";
      refs.postImageUrl.value = post.imageUrl || "";
      refs.postStatus.value = post.status;
      refs.postContent.value = post.contentMarkdown || "";
      populateCategorySelect(post.categoryId);
      setImagePreview(post.imageUrl, post.imageAlt || post.title);
      renderMarkdownPreview();
    });

    deleteButton.className = "button button-secondary button-compact";
    deleteButton.type = "button";
    deleteButton.textContent = "Delete";
    deleteButton.addEventListener("click", async function () {
      if (!window.confirm('Delete article "' + post.title + '"?')) {
        return;
      }

      try {
        await api("/api/admin/posts/" + post.id, { method: "DELETE" });
        await loadBootstrap();
        resetPostForm();
        setStatus("Article deleted.");
      } catch (error) {
        setStatus(error.message, true);
      }
    });

    actions.className = "item-card__actions";
    actions.append(editButton, deleteButton);
    item.append(actions);
    refs.postList.append(item);
  });
}

async function loadSession() {
  const payload = await api("/api/admin/session");
  state.currentUser = payload.user || null;
  state.hasUsers = Boolean(payload.hasUsers);
  renderAuthState();
  renderAccount();
}

async function loadRecovery() {
  const token = String(new URL(window.location.href).searchParams.get("invite") || "").trim();

  state.recoveryData = null;
  state.recoveryToken = "";

  if (!token || state.currentUser) {
    renderAuthState();
    return;
  }

  try {
    const payload = await api("/api/admin/invite?token=" + encodeURIComponent(token));
    state.recoveryToken = token;
    state.recoveryData = payload.invite;
    state.authMode = "login";
    renderAuthState();
  } catch (error) {
    clearRecoveryTokenFromUrl();
    renderAuthState();
    setStatus(error.message, true);
  }
}

async function loadBootstrap() {
  const payload = await api("/api/admin/bootstrap");
  state.currentUser = payload.currentUser;
  state.categories = payload.categories || [];
  state.posts = payload.posts || [];
  state.youtubeDefaultPlaylistId = payload.youtubeDefaults && payload.youtubeDefaults.playlistId
    ? payload.youtubeDefaults.playlistId
    : "";
  renderAuthState();
  renderAccount();
  renderCategories();
  renderPosts();
  populateCategorySelect();

  if (!refs.youtubePlaylistId.value.trim() && state.youtubeDefaultPlaylistId) {
    refs.youtubePlaylistId.value = state.youtubeDefaultPlaylistId;
  }

  if (!state.categories.length) {
    setStatus("Connected. Add a category to start publishing.");
    return;
  }

  setStatus("Connected. " + state.posts.length + " article" + (state.posts.length === 1 ? "" : "s") + " loaded.");
}

async function optimizeImage(file) {
  const sourceUrl = URL.createObjectURL(file);
  const image = await new Promise(function (resolve, reject) {
    const nextImage = new Image();
    nextImage.onload = function () {
      resolve(nextImage);
    };
    nextImage.onerror = reject;
    nextImage.src = sourceUrl;
  });
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");
  const targetWidth = 1400;
  const targetHeight = 900;
  const scale = Math.max(targetWidth / image.width, targetHeight / image.height);
  const drawWidth = image.width * scale;
  const drawHeight = image.height * scale;
  const offsetX = (targetWidth - drawWidth) / 2;
  const offsetY = (targetHeight - drawHeight) / 2;

  canvas.width = targetWidth;
  canvas.height = targetHeight;
  context.drawImage(image, offsetX, offsetY, drawWidth, drawHeight);

  const blob = await new Promise(function (resolve) {
    canvas.toBlob(resolve, "image/jpeg", 0.86);
  });

  URL.revokeObjectURL(sourceUrl);

  const arrayBuffer = await blob.arrayBuffer();
  const bytes = new Uint8Array(arrayBuffer);
  let binary = "";

  bytes.forEach(function (byte) {
    binary += String.fromCharCode(byte);
  });

  return {
    previewUrl: canvas.toDataURL("image/jpeg", 0.86),
    contentBase64: btoa(binary)
  };
}

async function uploadSelectedImage() {
  const file = refs.postImageFile.files[0];

  if (!file) {
    return refs.postImageUrl.value.trim();
  }

  setStatus("Optimizing and uploading image...");

  const optimized = await optimizeImage(file);
  setImagePreview(optimized.previewUrl, refs.postImageAlt.value || refs.postTitle.value);

  const payload = await api("/api/admin/upload-image", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      fileName: refs.postSlug.value || refs.postTitle.value || file.name,
      contentBase64: optimized.contentBase64
    })
  });

  refs.postImageUrl.value = payload.image.url;
  refs.postImageFile.value = "";

  return payload.image.url;
}

function bindEvents() {
  refs.loginForm.addEventListener("submit", async function (event) {
    event.preventDefault();

    try {
      await api("/api/admin/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          email: refs.loginEmail.value.trim(),
          password: refs.loginPassword.value
        })
      });
      refs.loginForm.reset();
      await loadBootstrap();
    } catch (error) {
      setStatus(error.message, true);
    }
  });

  refs.setupForm.addEventListener("submit", async function (event) {
    event.preventDefault();

    try {
      await api("/api/admin/setup", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name: refs.setupName.value.trim(),
          email: refs.setupEmail.value.trim(),
          password: refs.setupPassword.value
        })
      });
      refs.setupForm.reset();
      await loadBootstrap();
    } catch (error) {
      setStatus(error.message, true);
    }
  });

  refs.showRecover.addEventListener("click", function () {
    state.authMode = "recover";
    refs.recoverEmail.value = refs.loginEmail.value.trim();
    renderAuthState();
    refs.recoverEmail.focus();
  });

  refs.recoverBack.addEventListener("click", function () {
    openLoginMode();
  });

  refs.recoverForm.addEventListener("submit", async function (event) {
    event.preventDefault();

    try {
      await api("/api/admin/recover", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          email: refs.recoverEmail.value.trim()
        })
      });

      state.authMode = "login";
      renderAuthState();
      setStatus("Password reset link sent.");
    } catch (error) {
      setStatus(error.message, true);
    }
  });

  refs.resetCancel.addEventListener("click", function () {
    exitRecoveryMode();
  });

  refs.headerLoginLink.addEventListener("click", function () {
    openLoginMode();
  });

  refs.resetForm.addEventListener("submit", async function (event) {
    event.preventDefault();

    try {
      await api("/api/admin/invite/accept", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          token: state.recoveryToken,
          password: refs.resetPassword.value
        })
      });
      exitRecoveryMode();
      await loadBootstrap();
      setStatus("Password updated.");
    } catch (error) {
      setStatus(error.message, true);
    }
  });

  refs.logoutButton.addEventListener("click", async function () {
    await api("/api/admin/logout", { method: "POST" });
    state.currentUser = null;
    state.authMode = "login";
    refs.adminApp.hidden = true;
    await loadSession();
    await loadRecovery();
    setStatus(state.hasUsers ? "Logged out." : "Create the first admin account to start.");
  });

  refs.accountForm.addEventListener("submit", async function (event) {
    event.preventDefault();

    try {
      const payload = await api("/api/admin/account", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name: refs.accountName.value.trim(),
          email: refs.accountEmail.value.trim()
        })
      });

      state.currentUser = payload.user;
      renderAccount();
      renderAuthState();

      if (payload.emailChange && !payload.emailChange.delivered) {
        window.prompt("Copy the email verification link", payload.emailChange.verificationUrl);
      }

      setStatus(payload.emailChange
        ? "Account updated. Verify " + payload.emailChange.email + " to finish the email change."
        : "Account updated.");
    } catch (error) {
      setStatus(error.message, true);
    }
  });

  refs.accountPasswordForm.addEventListener("submit", async function (event) {
    event.preventDefault();

    try {
      await api("/api/admin/account/password", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          currentPassword: refs.accountCurrentPassword.value,
          nextPassword: refs.accountNextPassword.value
        })
      });
      refs.accountPasswordForm.reset();
      setStatus("Password changed.");
    } catch (error) {
      setStatus(error.message, true);
    }
  });

  refs.categoryReset.addEventListener("click", resetCategoryForm);
  refs.postReset.addEventListener("click", resetPostForm);

  refs.categoryForm.addEventListener("submit", async function (event) {
    event.preventDefault();

    try {
      const payload = {
        name: refs.categoryName.value.trim(),
        slug: refs.categorySlug.value.trim(),
        description: refs.categoryDescription.value.trim(),
        sortOrder: Number(refs.categorySortOrder.value || 0)
      };
      const endpoint = state.editingCategoryId ? "/api/admin/categories/" + state.editingCategoryId : "/api/admin/categories";
      const method = state.editingCategoryId ? "PUT" : "POST";

      await api(endpoint, {
        method,
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload)
      });

      await loadBootstrap();
      resetCategoryForm();
      setStatus("Category saved.");
    } catch (error) {
      setStatus(error.message, true);
    }
  });

  refs.youtubeForm.addEventListener("submit", async function (event) {
    event.preventDefault();

    try {
      if (!state.categories.length) {
        throw new Error("Create a category before syncing a playlist.");
      }

      const payload = await api("/api/admin/youtube/sync", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          playlistId: refs.youtubePlaylistId.value.trim(),
          categoryId: Number(refs.youtubeCategory.value),
          status: refs.youtubeStatus.value
        })
      });

      await loadBootstrap();
      setStatus(
        "YouTube sync complete. " +
        payload.summary.created + " created, " +
        payload.summary.updated + " updated, " +
        payload.summary.skipped + " skipped."
      );
    } catch (error) {
      setStatus(error.message, true);
    }
  });

  refs.postForm.addEventListener("submit", async function (event) {
    event.preventDefault();

    try {
      if (!state.categories.length) {
        throw new Error("Create a category before saving articles.");
      }

      const imageUrl = await uploadSelectedImage();
      const payload = {
        categoryId: Number(refs.categorySelect.value),
        title: refs.postTitle.value.trim(),
        slug: refs.postSlug.value.trim(),
        postDate: refs.postDate.value,
        imageAlt: refs.postImageAlt.value.trim(),
        imageUrl,
        videoUrl: null,
        likes: 0,
        contentMarkdown: refs.postContent.value,
        status: refs.postStatus.value
      };
      const endpoint = state.editingPostId ? "/api/admin/posts/" + state.editingPostId : "/api/admin/posts";
      const method = state.editingPostId ? "PUT" : "POST";

      await api(endpoint, {
        method,
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload)
      });

      await loadBootstrap();
      resetPostForm();
      setStatus("Article saved.");
    } catch (error) {
      setStatus(error.message, true);
    }
  });

  refs.postContent.addEventListener("input", renderMarkdownPreview);

  refs.postImageFile.addEventListener("change", async function () {
    const file = refs.postImageFile.files[0];

    if (!file) {
      return;
    }

    const optimized = await optimizeImage(file);
    setImagePreview(optimized.previewUrl, refs.postImageAlt.value || refs.postTitle.value);
  });

  refs.postImageUrl.addEventListener("input", function () {
    if (refs.postImageUrl.value.trim()) {
      setImagePreview(refs.postImageUrl.value.trim(), refs.postImageAlt.value || refs.postTitle.value);
      return;
    }

    setImagePreview("", "");
  });

  bindAutoSlug(refs.categoryName, refs.categorySlug);
  bindAutoSlug(refs.postTitle, refs.postSlug);
}

async function init() {
  bindEvents();
  renderMarkdownPreview();
  resetCategoryForm();
  resetPostForm();

  try {
    await loadSession();

    if (state.currentUser) {
      await loadBootstrap();
      return;
    }

    await loadRecovery();

    if (state.recoveryData) {
      setStatus("Use the reset form to choose a new password.");
      return;
    }

    setStatus(state.hasUsers ? "Log in with your admin account." : "Create the first admin account.");
  } catch (error) {
    setStatus(error.message, true);
  }
}

init();
