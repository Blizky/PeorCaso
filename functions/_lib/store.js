import { HttpError } from "./http.js";
import { renderMarkdown, slugify, stripMarkdown } from "../../shared/markdown.js";

const POST_STATUSES = new Set(["pending", "published"]);
const ACCESS_LEVELS = new Set([1, 2, 3]);
const OPEN_INVITE_FILTER = "used_at IS NULL AND expires_at > ?1";

function excerptFromMarkdown(markdown) {
  const plain = stripMarkdown(markdown);

  if (plain.length <= 180) {
    return plain;
  }

  return plain.slice(0, 177).trimEnd() + "...";
}

function validatePeorCasoEmail(value) {
  const email = String(value || "").trim().toLowerCase();

  if (!email) {
    throw new HttpError(400, "Email is required.");
  }

  if (!/^[^@\s]+@peorcaso\.com$/i.test(email)) {
    throw new HttpError(400, "Email must use the @peorcaso.com domain.");
  }

  return email;
}

function validateAccessLevel(value) {
  const accessLevel = Number(value);

  if (!ACCESS_LEVELS.has(accessLevel)) {
    throw new HttpError(400, "Access level must be 1, 2, or 3.");
  }

  return accessLevel;
}

function validatePostStatus(value, defaultStatus) {
  const status = String(value || defaultStatus || "pending").trim().toLowerCase();

  if (!POST_STATUSES.has(status)) {
    throw new HttpError(400, "Post status must be pending or published.");
  }

  return status;
}

export function getDb(env) {
  if (!env.DB) {
    throw new HttpError(500, "Missing DB binding.");
  }

  return env.DB;
}

export function sanitizeUser(record) {
  return {
    id: record.id,
    email: record.email,
    name: record.name,
    accessLevel: Number(record.access_level),
    isActive: Boolean(record.is_active),
    updatedAt: record.updated_at,
    pendingInvite: record.pending_invite_purpose ? {
      purpose: record.pending_invite_purpose,
      expiresAt: record.pending_invite_expires_at
    } : null
  };
}

export async function tableExists(db, tableName) {
  const record = await db.prepare(
    "SELECT name FROM sqlite_master WHERE type = 'table' AND name = ?1"
  ).bind(tableName).first();

  return Boolean(record);
}

export async function requireInvitesTable(db) {
  if (!await tableExists(db, "user_invites")) {
    throw new HttpError(500, "Missing user_invites table. Run the invite migration.");
  }
}

export function validateCategoryInput(body) {
  const name = String(body && body.name ? body.name : "").trim();
  const slug = slugify(body && body.slug ? body.slug : name);
  const description = String(body && body.description ? body.description : "").trim();
  const sortOrder = Number(body && body.sortOrder !== undefined ? body.sortOrder : 0);

  if (!name) {
    throw new HttpError(400, "Category name is required.");
  }

  if (!slug) {
    throw new HttpError(400, "Category slug is required.");
  }

  return {
    name,
    slug,
    description,
    sortOrder: Number.isFinite(sortOrder) ? sortOrder : 0
  };
}

export function validatePostInput(body) {
  const categoryId = Number(body && body.categoryId);
  const title = String(body && body.title ? body.title : "").trim();
  const slug = slugify(body && body.slug ? body.slug : title);
  const postDate = String(body && body.postDate ? body.postDate : "").trim();
  const imageUrl = String(body && body.imageUrl ? body.imageUrl : "").trim();
  const imageAlt = String(body && body.imageAlt ? body.imageAlt : title).trim();
  const contentMarkdown = String(body && body.contentMarkdown ? body.contentMarkdown : "").trim();
  const status = validatePostStatus(body && body.status, "pending");

  if (!Number.isInteger(categoryId) || categoryId <= 0) {
    throw new HttpError(400, "A category is required.");
  }

  if (!title) {
    throw new HttpError(400, "Post title is required.");
  }

  if (!slug) {
    throw new HttpError(400, "Post slug is required.");
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(postDate)) {
    throw new HttpError(400, "Post date must use YYYY-MM-DD.");
  }

  if (!imageUrl) {
    throw new HttpError(400, "An image URL is required.");
  }

  if (!contentMarkdown) {
    throw new HttpError(400, "Post content is required.");
  }

  return {
    categoryId,
    title,
    slug,
    postDate,
    imageUrl,
    imageAlt,
    contentMarkdown,
    status
  };
}

export function validateUserInput(body, options) {
  const settings = options || {};
  const name = String(body && body.name ? body.name : "").trim();
  const email = validatePeorCasoEmail(body && body.email);
  const password = String(body && body.password ? body.password : "");
  const accessLevel = settings.includeAccessLevel
    ? validateAccessLevel(body && body.accessLevel)
    : undefined;

  if (!name) {
    throw new HttpError(400, "Name is required.");
  }

  if (settings.requirePassword && password.length < 8) {
    throw new HttpError(400, "Password must be at least 8 characters.");
  }

  return {
    name,
    email,
    password,
    accessLevel
  };
}

function mapCategoryRecord(record) {
  return {
    id: record.id,
    name: record.name,
    slug: record.slug,
    description: record.description || "",
    sortOrder: record.sort_order || 0,
    updatedAt: record.updated_at
  };
}

function mapPostRecord(record) {
  return {
    id: record.id,
    categoryId: record.category_id,
    authorId: record.author_id,
    title: record.title,
    slug: record.slug,
    postDate: record.post_date,
    imageUrl: record.image_url,
    imageAlt: record.image_alt || "",
    contentMarkdown: record.content_markdown,
    contentHtml: renderMarkdown(record.content_markdown),
    excerpt: excerptFromMarkdown(record.content_markdown),
    status: record.status,
    approvedAt: record.approved_at,
    updatedAt: record.updated_at,
    category: {
      id: record.category_id,
      name: record.category_name,
      slug: record.category_slug
    },
    author: {
      id: record.author_id,
      name: record.author_name,
      email: record.author_email
    },
    approvedBy: record.approved_by ? {
      id: record.approved_by,
      name: record.approved_by_name,
      email: record.approved_by_email
    } : null
  };
}

function mapPostAccessRecord(record) {
  return {
    id: record.id,
    authorId: record.author_id,
    status: record.status,
    approvedBy: record.approved_by,
    approvedAt: record.approved_at
  };
}

export async function countUsers(db) {
  const record = await db.prepare("SELECT COUNT(*) AS total FROM users").first();
  return Number(record && record.total ? record.total : 0);
}

export async function listUsers(db) {
  const baseQuery = "SELECT id, email, name, access_level, is_active, updated_at";
  const inviteFields = await tableExists(db, "user_invites")
    ? ", (SELECT purpose FROM user_invites WHERE user_id = users.id AND " + OPEN_INVITE_FILTER + " ORDER BY created_at DESC LIMIT 1) AS pending_invite_purpose, (SELECT expires_at FROM user_invites WHERE user_id = users.id AND " + OPEN_INVITE_FILTER + " ORDER BY created_at DESC LIMIT 1) AS pending_invite_expires_at"
    : ", NULL AS pending_invite_purpose, NULL AS pending_invite_expires_at";
  const response = await db.prepare(
    baseQuery + inviteFields + " FROM users ORDER BY access_level ASC, name ASC, email ASC"
  ).bind(new Date().toISOString()).all();

  return (response.results || []).map(sanitizeUser);
}

export async function getUserAuthByEmail(db, email) {
  const record = await db.prepare(
    "SELECT id, email, name, access_level, is_active, password_hash, password_salt, updated_at FROM users WHERE email = ?1"
  ).bind(email).first();

  return record ? {
    ...record,
    isActive: Boolean(record.is_active)
  } : null;
}

export async function getUserAuthById(db, id) {
  const record = await db.prepare(
    "SELECT id, email, name, access_level, is_active, password_hash, password_salt, updated_at FROM users WHERE id = ?1"
  ).bind(id).first();

  return record ? {
    ...record,
    isActive: Boolean(record.is_active)
  } : null;
}

export async function createUser(db, input, passwordHash, passwordSalt) {
  const result = await db.prepare(
    "INSERT INTO users (email, name, access_level, password_hash, password_salt) VALUES (?1, ?2, ?3, ?4, ?5)"
  ).bind(
    input.email,
    input.name,
    input.accessLevel,
    passwordHash,
    passwordSalt
  ).run();

  return sanitizeUser(await getUserAuthById(db, result.meta.last_row_id));
}

export async function getUserById(db, id) {
  const record = await db.prepare(
    "SELECT id, email, name, access_level, is_active, updated_at FROM users WHERE id = ?1"
  ).bind(id).first();

  if (!record) {
    throw new HttpError(404, "User not found.");
  }

  return sanitizeUser(record);
}

export async function getUserPendingInvite(db, userId) {
  await requireInvitesTable(db);
  const record = await db.prepare(
    "SELECT purpose, expires_at FROM user_invites WHERE user_id = ?1 AND used_at IS NULL ORDER BY created_at DESC LIMIT 1"
  ).bind(userId).first();

  if (!record || record.expires_at <= new Date().toISOString()) {
    return null;
  }

  return {
    purpose: record.purpose,
    expiresAt: record.expires_at
  };
}

export async function updateUserProfile(db, id, input) {
  const fields = [
    "email = ?1",
    "name = ?2",
    "updated_at = CURRENT_TIMESTAMP"
  ];
  const values = [input.email, input.name];

  if (input.accessLevel !== undefined) {
    fields.splice(2, 0, "access_level = ?3");
    values.push(input.accessLevel);
    values.push(id);
  } else {
    values.push(id);
  }

  const statement = input.accessLevel !== undefined
    ? "UPDATE users SET " + fields.join(", ") + " WHERE id = ?4"
    : "UPDATE users SET " + fields.join(", ") + " WHERE id = ?3";
  const result = await db.prepare(statement).bind(...values).run();

  if (!result.meta.changes) {
    throw new HttpError(404, "User not found.");
  }

  return sanitizeUser(await getUserAuthById(db, id));
}

export async function updateUserPassword(db, id, passwordHash, passwordSalt) {
  const result = await db.prepare(
    "UPDATE users SET password_hash = ?1, password_salt = ?2, updated_at = CURRENT_TIMESTAMP WHERE id = ?3"
  ).bind(passwordHash, passwordSalt, id).run();

  if (!result.meta.changes) {
    throw new HttpError(404, "User not found.");
  }
}

export async function expireOpenInvites(db, userId, purpose) {
  await requireInvitesTable(db);
  await db.prepare(
    "UPDATE user_invites SET used_at = ?1 WHERE user_id = ?2 AND purpose = ?3 AND used_at IS NULL"
  ).bind(new Date().toISOString(), userId, purpose).run();
}

export async function createUserInvite(db, input) {
  await requireInvitesTable(db);
  await expireOpenInvites(db, input.userId, input.purpose);

  const now = new Date().toISOString();
  const result = await db.prepare(
    "INSERT INTO user_invites (user_id, token_hash, purpose, expires_at, sent_at, created_by, created_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)"
  ).bind(
    input.userId,
    input.tokenHash,
    input.purpose,
    input.expiresAt,
    now,
    input.createdBy || null,
    now
  ).run();

  return getInviteById(db, result.meta.last_row_id);
}

export async function getInviteById(db, id) {
  await requireInvitesTable(db);
  const record = await db.prepare(
    "SELECT user_invites.id, user_invites.user_id, user_invites.purpose, user_invites.expires_at, user_invites.sent_at, user_invites.used_at, users.email, users.name, users.access_level FROM user_invites INNER JOIN users ON users.id = user_invites.user_id WHERE user_invites.id = ?1"
  ).bind(id).first();

  if (!record) {
    throw new HttpError(404, "Invite not found.");
  }

  return {
    id: record.id,
    userId: record.user_id,
    email: record.email,
    name: record.name,
    accessLevel: Number(record.access_level),
    purpose: record.purpose,
    expiresAt: record.expires_at,
    sentAt: record.sent_at,
    usedAt: record.used_at
  };
}

export async function getOpenInviteByTokenHash(db, tokenHash) {
  await requireInvitesTable(db);
  const record = await db.prepare(
    "SELECT user_invites.id, user_invites.user_id, user_invites.purpose, user_invites.expires_at, user_invites.sent_at, user_invites.used_at, users.email, users.name, users.access_level FROM user_invites INNER JOIN users ON users.id = user_invites.user_id WHERE user_invites.token_hash = ?1 AND user_invites.used_at IS NULL"
  ).bind(tokenHash).first();

  if (!record) {
    return null;
  }

  if (record.expires_at <= new Date().toISOString()) {
    return null;
  }

  return {
    id: record.id,
    userId: record.user_id,
    email: record.email,
    name: record.name,
    accessLevel: Number(record.access_level),
    purpose: record.purpose,
    expiresAt: record.expires_at,
    sentAt: record.sent_at,
    usedAt: record.used_at
  };
}

export async function markInviteUsed(db, id) {
  await requireInvitesTable(db);
  await db.prepare(
    "UPDATE user_invites SET used_at = ?1 WHERE id = ?2"
  ).bind(new Date().toISOString(), id).run();
}

export async function listCategories(db) {
  const response = await db.prepare(
    "SELECT id, name, slug, description, sort_order, updated_at FROM categories ORDER BY sort_order ASC, name ASC"
  ).all();

  return (response.results || []).map(mapCategoryRecord);
}

function postsBaseQuery(whereClause) {
  return "SELECT posts.id, posts.category_id, posts.author_id, posts.title, posts.slug, posts.post_date, posts.image_url, posts.image_alt, posts.content_markdown, posts.status, posts.approved_by, posts.approved_at, posts.updated_at, categories.name AS category_name, categories.slug AS category_slug, authors.name AS author_name, authors.email AS author_email, approvers.name AS approved_by_name, approvers.email AS approved_by_email FROM posts INNER JOIN categories ON categories.id = posts.category_id INNER JOIN users AS authors ON authors.id = posts.author_id LEFT JOIN users AS approvers ON approvers.id = posts.approved_by " + whereClause + " ORDER BY posts.post_date DESC, posts.id DESC";
}

export async function listPublishedPosts(db) {
  const response = await db.prepare(postsBaseQuery("WHERE posts.status = 'published'")).all();
  return (response.results || []).map(mapPostRecord);
}

export async function listPostsForUser(db, user) {
  const query = user.accessLevel <= 2
    ? postsBaseQuery("")
    : postsBaseQuery("WHERE posts.author_id = ?1");
  const statement = db.prepare(query);
  const response = user.accessLevel <= 2
    ? await statement.all()
    : await statement.bind(user.id).all();

  return (response.results || []).map(mapPostRecord);
}

export async function getCategory(db, id) {
  const record = await db.prepare(
    "SELECT id, name, slug, description, sort_order, updated_at FROM categories WHERE id = ?1"
  ).bind(id).first();

  if (!record) {
    throw new HttpError(404, "Category not found.");
  }

  return mapCategoryRecord(record);
}

export async function getPost(db, id) {
  const record = await db.prepare(
    postsBaseQuery("WHERE posts.id = ?1")
  ).bind(id).first();

  if (!record) {
    throw new HttpError(404, "Post not found.");
  }

  return mapPostRecord(record);
}

export async function getPostAccessRecord(db, id) {
  const record = await db.prepare(
    "SELECT id, author_id, status, approved_by, approved_at FROM posts WHERE id = ?1"
  ).bind(id).first();

  if (!record) {
    throw new HttpError(404, "Post not found.");
  }

  return mapPostAccessRecord(record);
}

export async function createCategory(db, input) {
  const result = await db.prepare(
    "INSERT INTO categories (name, slug, description, sort_order) VALUES (?1, ?2, ?3, ?4)"
  ).bind(input.name, input.slug, input.description, input.sortOrder).run();

  return getCategory(db, result.meta.last_row_id);
}

export async function updateCategory(db, id, input) {
  const result = await db.prepare(
    "UPDATE categories SET name = ?1, slug = ?2, description = ?3, sort_order = ?4, updated_at = CURRENT_TIMESTAMP WHERE id = ?5"
  ).bind(input.name, input.slug, input.description, input.sortOrder, id).run();

  if (!result.meta.changes) {
    throw new HttpError(404, "Category not found.");
  }

  return getCategory(db, id);
}

export async function deleteCategory(db, id) {
  const result = await db.prepare("DELETE FROM categories WHERE id = ?1").bind(id).run();

  if (!result.meta.changes) {
    throw new HttpError(404, "Category not found.");
  }
}

export async function createPost(db, input) {
  const result = await db.prepare(
    "INSERT INTO posts (category_id, author_id, title, slug, post_date, image_url, image_alt, content_markdown, status, approved_by, approved_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11)"
  ).bind(
    input.categoryId,
    input.authorId,
    input.title,
    input.slug,
    input.postDate,
    input.imageUrl,
    input.imageAlt,
    input.contentMarkdown,
    input.status,
    input.approvedBy || null,
    input.approvedAt || null
  ).run();

  return getPost(db, result.meta.last_row_id);
}

export async function updatePost(db, id, input) {
  const result = await db.prepare(
    "UPDATE posts SET category_id = ?1, title = ?2, slug = ?3, post_date = ?4, image_url = ?5, image_alt = ?6, content_markdown = ?7, status = ?8, approved_by = ?9, approved_at = ?10, updated_at = CURRENT_TIMESTAMP WHERE id = ?11"
  ).bind(
    input.categoryId,
    input.title,
    input.slug,
    input.postDate,
    input.imageUrl,
    input.imageAlt,
    input.contentMarkdown,
    input.status,
    input.approvedBy || null,
    input.approvedAt || null,
    id
  ).run();

  if (!result.meta.changes) {
    throw new HttpError(404, "Post not found.");
  }

  return getPost(db, id);
}

export async function deletePost(db, id) {
  const result = await db.prepare("DELETE FROM posts WHERE id = ?1").bind(id).run();

  if (!result.meta.changes) {
    throw new HttpError(404, "Post not found.");
  }
}
