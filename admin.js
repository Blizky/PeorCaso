import { renderMarkdown, slugify } from "./shared/markdown.js";

const state = {
  currentUser: null,
  hasUsers: true,
  categories: [],
  posts: [],
  users: [],
  editingCategoryId: null,
  editingPostId: null,
  editingUserId: null
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
  categoryPanel: document.querySelector("[data-category-panel]"),
  categoryReset: document.querySelector("[data-category-reset]"),
  categorySelect: document.querySelector("[data-post-category]"),
  categorySlug: document.querySelector("[data-category-slug]"),
  categorySortOrder: document.querySelector("[data-category-sort-order]"),
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
  postStatusCopy: document.querySelector("[data-post-status-copy]"),
  postStatusField: document.querySelector("[data-post-status-field]"),
  postTitle: document.querySelector("[data-post-title]"),
  sessionCard: document.querySelector("[data-session-card]"),
  sessionUser: document.querySelector("[data-session-user]"),
  setupEmail: document.querySelector("[data-setup-email]"),
  setupForm: document.querySelector("[data-setup-form]"),
  setupName: document.querySelector("[data-setup-name]"),
  setupPassword: document.querySelector("[data-setup-password]"),
  status: document.querySelector("[data-status]"),
  userAccessLevel: document.querySelector("[data-user-access-level]"),
  userEmail: document.querySelector("[data-user-email]"),
  userForm: document.querySelector("[data-user-form]"),
  userId: document.querySelector("[data-user-id]"),
  userList: document.querySelector("[data-user-list]"),
  userName: document.querySelector("[data-user-name]"),
  userPanel: document.querySelector("[data-user-panel]"),
  userPassword: document.querySelector("[data-user-password]"),
  userReset: document.querySelector("[data-user-reset]")
};

function accessLabel(level) {
  if (level === 1) {
    return "1 · Admin";
  }

  if (level === 2) {
    return "2 · Editor / Approver";
  }

  return "3 · Contributor";
}

function canManageUsers() {
  return state.currentUser && state.currentUser.accessLevel === 1;
}

function canManageCategories() {
  return state.currentUser && state.currentUser.accessLevel <= 2;
}

function canApprovePosts() {
  return state.currentUser && state.currentUser.accessLevel <= 2;
}

function setStatus(message, isError) {
  refs.status.textContent = message;
  refs.status.style.color = isError ? "var(--color-danger)" : "var(--color-text-soft)";
}

async function api(path, options) {
  const response = await fetch(path, options || {});
  const isJson = response.headers.get("content-type")?.includes("application/json");
  const payload = isJson ? await response.json() : null;

  if (!response.ok) {
    throw new Error(payload && payload.error ? payload.error : "Request failed.");
  }

  return payload;
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

function resetCategoryForm() {
  state.editingCategoryId = null;
  refs.categoryForm.reset();
  refs.categoryId.value = "";
  refs.categorySortOrder.value = "0";
}

function resetUserForm() {
  state.editingUserId = null;
  refs.userForm.reset();
  refs.userId.value = "";
  refs.userAccessLevel.value = "3";
}

function resetPostForm() {
  state.editingPostId = null;
  refs.postForm.reset();
  refs.postId.value = "";
  refs.postDate.value = new Date().toISOString().slice(0, 10);
  refs.postStatus.value = canApprovePosts() ? "published" : "pending";
  refs.imagePreview.innerHTML = "<p>No image selected.</p>";
  renderMarkdownPreview();
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

function populateCategorySelect() {
  refs.categorySelect.innerHTML = "";

  state.categories.forEach(function (category) {
    const option = document.createElement("option");
    option.value = String(category.id);
    option.textContent = category.name;
    refs.categorySelect.append(option);
  });
}

function renderAuthState() {
  refs.loginForm.hidden = state.currentUser || !state.hasUsers;
  refs.setupForm.hidden = state.currentUser || state.hasUsers;
  refs.sessionCard.hidden = !state.currentUser;
  refs.adminApp.hidden = !state.currentUser;

  if (state.currentUser) {
    refs.sessionUser.textContent = state.currentUser.name + " · " + state.currentUser.email + " · " + accessLabel(state.currentUser.accessLevel);
  }
}

function renderPermissions() {
  refs.userPanel.hidden = !canManageUsers();
  refs.categoryPanel.hidden = !canManageCategories();
  refs.postStatusField.hidden = !canApprovePosts();
  refs.postStatusCopy.hidden = canApprovePosts();

  if (!canApprovePosts()) {
    refs.postStatus.value = "pending";
  }
}

function renderAccount() {
  if (!state.currentUser) {
    return;
  }

  refs.accountName.value = state.currentUser.name;
  refs.accountEmail.value = state.currentUser.email;
}

function renderCategories() {
  refs.categoryList.innerHTML = "";

  state.categories.forEach(function (category) {
    const item = document.createElement("article");
    const editButton = document.createElement("button");
    const deleteButton = document.createElement("button");

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

    const actions = document.createElement("div");
    actions.className = "item-card__actions";
    actions.append(editButton, deleteButton);
    item.append(actions);
    refs.categoryList.append(item);
  });
}

function renderUsers() {
  refs.userList.innerHTML = "";

  state.users.forEach(function (user) {
    const item = document.createElement("article");
    const editButton = document.createElement("button");
    const resetPasswordButton = document.createElement("button");

    item.className = "item-card";
    item.innerHTML = [
      '<div class="item-card__head">',
      '<div>',
      '<h3 class="item-title">' + user.name + "</h3>",
      '<p class="item-meta">' + user.email + " · " + accessLabel(user.accessLevel) + "</p>",
      "</div>",
      "</div>"
    ].join("");

    editButton.className = "button button-secondary button-compact";
    editButton.type = "button";
    editButton.textContent = "Edit";
    editButton.addEventListener("click", function () {
      state.editingUserId = user.id;
      refs.userId.value = String(user.id);
      refs.userName.value = user.name;
      refs.userEmail.value = user.email;
      refs.userAccessLevel.value = String(user.accessLevel);
      refs.userPassword.value = "";
    });

    resetPasswordButton.className = "button button-secondary button-compact";
    resetPasswordButton.type = "button";
    resetPasswordButton.textContent = "Reset password";
    resetPasswordButton.addEventListener("click", async function () {
      const nextPassword = window.prompt("Enter a new password for " + user.email);

      if (!nextPassword) {
        return;
      }

      try {
        await api("/api/admin/users/" + user.id + "/password", {
          method: "PUT",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ password: nextPassword })
        });
        setStatus("Password reset for " + user.email + ".");
      } catch (error) {
        setStatus(error.message, true);
      }
    });

    const actions = document.createElement("div");
    actions.className = "item-card__actions";
    actions.append(editButton, resetPasswordButton);
    item.append(actions);
    refs.userList.append(item);
  });
}

function renderPosts() {
  refs.postList.innerHTML = "";

  state.posts.forEach(function (post) {
    const item = document.createElement("article");
    const editButton = document.createElement("button");
    const deleteButton = document.createElement("button");
    const approvedText = post.status === "published" && post.approvedBy
      ? " · approved by " + post.approvedBy.name
      : "";

    item.className = "item-card";
    item.innerHTML = [
      '<div class="item-card__head">',
      '<div>',
      '<h3 class="item-title">' + post.title + "</h3>",
      '<p class="item-meta">' + post.category.name + " · " + post.postDate + " · " + post.author.name + "</p>",
      "</div>",
      "</div>",
      '<p class="item-meta">Status: ' + post.status + approvedText + "</p>",
      '<p class="item-copy">' + (post.excerpt || "No excerpt.") + "</p>"
    ].join("");

    editButton.className = "button button-secondary button-compact";
    editButton.type = "button";
    editButton.textContent = "Edit";
    editButton.addEventListener("click", function () {
      state.editingPostId = post.id;
      refs.postId.value = String(post.id);
      refs.categorySelect.value = String(post.categoryId);
      refs.postStatus.value = post.status;
      refs.postTitle.value = post.title;
      refs.postSlug.value = post.slug;
      refs.postDate.value = post.postDate;
      refs.postImageAlt.value = post.imageAlt || "";
      refs.postImageUrl.value = post.imageUrl;
      refs.postContent.value = post.contentMarkdown;
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

    const actions = document.createElement("div");
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
}

async function loadBootstrap() {
  const payload = await api("/api/admin/bootstrap");
  state.currentUser = payload.currentUser;
  state.categories = payload.categories || [];
  state.posts = payload.posts || [];
  state.users = payload.users || [];

  renderAuthState();
  renderPermissions();
  renderAccount();
  populateCategorySelect();
  renderCategories();
  renderUsers();
  renderPosts();

  if (!state.categories.length && canManageCategories()) {
    setStatus("Connected. Create at least one category before publishing.");
  } else {
    setStatus("Connected. " + state.posts.length + " article" + (state.posts.length === 1 ? "" : "s") + " loaded.");
  }
}

async function optimizeImage(file) {
  const sourceUrl = URL.createObjectURL(file);
  const image = new Image();

  await new Promise(function (resolve, reject) {
    image.onload = resolve;
    image.onerror = reject;
    image.src = sourceUrl;
  });

  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");
  const targetWidth = 1200;
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

  refs.logoutButton.addEventListener("click", async function () {
    await api("/api/admin/logout", { method: "POST" });
    state.currentUser = null;
    refs.adminApp.hidden = true;
    await loadSession();
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
      setStatus("Account updated.");
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

  refs.userReset.addEventListener("click", resetUserForm);
  refs.categoryReset.addEventListener("click", resetCategoryForm);
  refs.postReset.addEventListener("click", resetPostForm);

  refs.userForm.addEventListener("submit", async function (event) {
    event.preventDefault();

    try {
      const payload = {
        name: refs.userName.value.trim(),
        email: refs.userEmail.value.trim(),
        accessLevel: Number(refs.userAccessLevel.value)
      };
      let endpoint = "/api/admin/users";
      let method = "POST";

      if (state.editingUserId) {
        endpoint = "/api/admin/users/" + state.editingUserId;
        method = "PUT";
      } else {
        payload.password = refs.userPassword.value;
      }

      await api(endpoint, {
        method,
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload)
      });

      await loadBootstrap();
      resetUserForm();
      setStatus("User saved.");
    } catch (error) {
      setStatus(error.message, true);
    }
  });

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

  refs.postForm.addEventListener("submit", async function (event) {
    event.preventDefault();

    try {
      const imageUrl = await uploadSelectedImage();
      const payload = {
        categoryId: Number(refs.categorySelect.value),
        title: refs.postTitle.value.trim(),
        slug: refs.postSlug.value.trim(),
        postDate: refs.postDate.value,
        imageAlt: refs.postImageAlt.value.trim(),
        imageUrl,
        contentMarkdown: refs.postContent.value,
        status: canApprovePosts() ? refs.postStatus.value : "pending"
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
    }
  });

  bindAutoSlug(refs.categoryName, refs.categorySlug);
  bindAutoSlug(refs.postTitle, refs.postSlug);
}

async function init() {
  bindEvents();
  renderMarkdownPreview();
  resetPostForm();
  resetUserForm();

  try {
    await loadSession();

    if (state.currentUser) {
      await loadBootstrap();
      return;
    }

    setStatus(state.hasUsers ? "Log in with your PeorCaso account." : "Create the first admin account.");
  } catch (error) {
    setStatus(error.message, true);
  }
}

init();
