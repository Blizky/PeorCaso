import { HttpError } from "./http.js";
import { renderMarkdown, slugify, stripMarkdown } from "../../shared/markdown.js";

const USER_ROLES = ["owner", "admin", "moderator", "contributor", "user"];
const USER_FLAGS = ["is_comment_moderator", "is_patreon", "is_suspended"];
const POST_STATUSES = new Set(["visible", "pending", "removed", "published"]);
const COMMENT_STATUSES = new Set(["pending", "visible", "spam", "deleted"]);
const TICKET_TYPES = new Set(["report_post", "report_comment", "support", "other"]);
const TICKET_STATUSES = new Set(["open", "in_progress", "closed", "rejected"]);
const OPEN_INVITE_FILTER = "used_at IS NULL AND expires_at > ?1";
const CURSE_WORDS = ["idiot", "stupid", "moron", "imbecil", "pendejo", "mierda", "fuck", "shit"];

function excerptFromMarkdown(markdown) {
  const plain = stripMarkdown(markdown);

  if (plain.length <= 180) {
    return plain;
  }

  return plain.slice(0, 177).trimEnd() + "...";
}

function normalizeEmail(value) {
  return String(value || "").trim().toLowerCase();
}

export function parseUserFlags(value) {
  return String(value || "")
    .split(",")
    .map(function (item) {
      return item.trim();
    })
    .filter(Boolean);
}

function encodeUserFlags(value) {
  const flags = Array.isArray(value) ? value : parseUserFlags(value);
  const unique = Array.from(new Set(flags));

  unique.forEach(function (flag) {
    if (!USER_FLAGS.includes(flag)) {
      throw new HttpError(400, "Unsupported user flag: " + flag);
    }
  });

  return unique.join(",");
}

export function normalizeUserRole(value) {
  const raw = String(value || "").trim().toLowerCase();

  if (!raw) {
    throw new HttpError(400, "Access level is required.");
  }

  if (USER_ROLES.includes(raw)) {
    return raw;
  }

  const numeric = Number(raw);

  if (numeric === 1) {
    return "admin";
  }

  if (numeric === 2) {
    return "moderator";
  }

  if (numeric === 3) {
    return "contributor";
  }

  throw new HttpError(400, "Access level must be owner, admin, moderator, contributor, or user.");
}

export function roleRank(role) {
  const normalized = normalizeUserRole(role);
  return USER_ROLES.indexOf(normalized) + 1;
}

function legacyAccessLevel(role) {
  const normalized = normalizeUserRole(role);

  if (normalized === "owner" || normalized === "admin") {
    return 1;
  }

  if (normalized === "moderator") {
    return 2;
  }

  return 3;
}

function normalizePostStatus(value, defaultStatus) {
  const status = String(value || defaultStatus || "pending").trim().toLowerCase();

  if (status === "published") {
    return "visible";
  }

  if (!POST_STATUSES.has(status)) {
    throw new HttpError(400, "Post status must be visible, pending, or removed.");
  }

  return status;
}

function normalizeCommentStatus(value, defaultStatus) {
  const status = String(value || defaultStatus || "pending").trim().toLowerCase();

  if (!COMMENT_STATUSES.has(status)) {
    throw new HttpError(400, "Comment status must be pending, visible, spam, or deleted.");
  }

  return status;
}

function normalizeTicketStatus(value, defaultStatus) {
  const status = String(value || defaultStatus || "open").trim().toLowerCase();

  if (!TICKET_STATUSES.has(status)) {
    throw new HttpError(400, "Ticket status must be open, in_progress, closed, or rejected.");
  }

  return status;
}

function normalizeTicketType(value) {
  const type = String(value || "").trim().toLowerCase();

  if (!TICKET_TYPES.has(type)) {
    throw new HttpError(400, "Unsupported ticket type.");
  }

  return type;
}

export function validatePeorCasoEmail(value) {
  const email = normalizeEmail(value);

  if (!email) {
    throw new HttpError(400, "Email is required.");
  }

  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    throw new HttpError(400, "Email must be valid.");
  }

  return email;
}

function validateAccessLevel(value) {
  return normalizeUserRole(value);
}

export function getDb(env) {
  if (!env.DB) {
    throw new HttpError(500, "Missing DB binding.");
  }

  return env.DB;
}

export function sanitizeUser(record) {
  const role = normalizeUserRole(record.access_level);
  const flags = parseUserFlags(record.flag);

  return {
    id: record.id,
    email: record.email,
    pendingEmail: record.pending_email ? {
      email: record.pending_email,
      expiresAt: record.pending_email_expires_at
    } : null,
    name: record.name,
    role,
    accessLevel: legacyAccessLevel(role),
    flags,
    isActive: Boolean(record.is_active),
    createdAt: record.created_at,
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
  const videoUrl = String(body && body.videoUrl ? body.videoUrl : "").trim();
  const likes = Number(body && body.likes !== undefined ? body.likes : 0);
  const contentMarkdown = String(body && body.contentMarkdown ? body.contentMarkdown : "").trim();
  const status = normalizePostStatus(body && body.status, "pending");

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

  if (!Number.isFinite(likes) || likes < 0) {
    throw new HttpError(400, "Likes must be zero or greater.");
  }

  if (videoUrl && !/^https?:\/\//i.test(videoUrl)) {
    throw new HttpError(400, "Video URL must be absolute.");
  }

  return {
    categoryId,
    title,
    slug,
    postDate,
    imageUrl,
    imageAlt,
    videoUrl: videoUrl || null,
    likes: Math.floor(likes),
    contentMarkdown,
    status
  };
}

export function validateUserInput(body, options) {
  const settings = options || {};
  const name = String(body && body.name ? body.name : "").trim();
  const email = settings.requireEmail === false ? null : validatePeorCasoEmail(body && body.email);
  const password = String(body && body.password ? body.password : "");
  const role = settings.includeAccessLevel
    ? validateAccessLevel(body && (body.role !== undefined ? body.role : body.accessLevel))
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
    role,
    accessLevel: role !== undefined ? legacyAccessLevel(role) : undefined
  };
}

export function validateCommentInput(body) {
  const parentCommentId = body && body.parentCommentId !== undefined && body.parentCommentId !== null
    ? Number(body.parentCommentId)
    : null;
  const text = String(body && body.body ? body.body : "").replace(/\r/g, "").trim();

  if (!text) {
    throw new HttpError(400, "Comment body is required.");
  }

  if (text.length > 5000) {
    throw new HttpError(400, "Comment body is too long.");
  }

  if (parentCommentId !== null && (!Number.isInteger(parentCommentId) || parentCommentId <= 0)) {
    throw new HttpError(400, "Parent comment ID is invalid.");
  }

  return {
    parentCommentId,
    body: text
  };
}

export function validateTicketInput(body, defaults) {
  const settings = defaults || {};
  const type = normalizeTicketType(settings.type || body && body.type);
  const status = normalizeTicketStatus(settings.status || body && body.status, "open");
  const postId = settings.postId !== undefined
    ? (settings.postId === null ? null : Number(settings.postId))
    : (body && body.postId !== undefined && body.postId !== null ? Number(body.postId) : null);
  const commentId = settings.commentId !== undefined
    ? (settings.commentId === null ? null : Number(settings.commentId))
    : (body && body.commentId !== undefined && body.commentId !== null ? Number(body.commentId) : null);
  const userId = settings.userId !== undefined
    ? settings.userId
    : (body && body.userId !== undefined ? Number(body.userId) : null);
  const guestName = String(settings.guestName !== undefined ? settings.guestName : body && body.guestName || "").trim();
  const guestEmailRaw = settings.guestEmail !== undefined ? settings.guestEmail : body && body.guestEmail;
  const guestEmail = guestEmailRaw ? validatePeorCasoEmail(guestEmailRaw) : null;
  const subject = String(settings.subject !== undefined ? settings.subject : body && body.subject || "").trim();
  const message = String(settings.message !== undefined ? settings.message : body && body.message || "").trim();
  const assignedTo = settings.assignedTo !== undefined
    ? (settings.assignedTo === null ? null : Number(settings.assignedTo))
    : (body && body.assignedTo !== undefined && body.assignedTo !== null ? Number(body.assignedTo) : null);

  if (postId !== null && (!Number.isInteger(postId) || postId <= 0)) {
    throw new HttpError(400, "Post ID is invalid.");
  }

  if (commentId !== null && (!Number.isInteger(commentId) || commentId <= 0)) {
    throw new HttpError(400, "Comment ID is invalid.");
  }

  if (postId !== null && commentId !== null) {
    throw new HttpError(400, "Use either postId or commentId, not both.");
  }

  if (!subject) {
    throw new HttpError(400, "Ticket subject is required.");
  }

  if (!message) {
    throw new HttpError(400, "Ticket message is required.");
  }

  if (!userId && (!guestName || !guestEmail)) {
    throw new HttpError(400, "Guest name and email are required when not signed in.");
  }

  return {
    type,
    status,
    postId,
    commentId,
    userId,
    guestName: guestName || null,
    guestEmail,
    subject,
    message,
    assignedTo
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
    videoUrl: record.video_url || null,
    likes: Number(record.likes || 0),
    contentMarkdown: record.content_markdown,
    contentHtml: renderMarkdown(record.content_markdown),
    excerpt: excerptFromMarkdown(record.content_markdown),
    status: record.status,
    viewerHasLiked: Boolean(record.viewer_has_liked),
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

function mapCommentRecord(record) {
  return {
    id: record.id,
    postId: record.post_id,
    postTitle: record.post_title || null,
    parentCommentId: record.parent_comment_id,
    userId: record.user_id,
    body: record.body,
    bodyHtml: renderMarkdown(record.body),
    status: record.status,
    createdAt: record.created_at,
    updatedAt: record.updated_at,
    user: record.user_id ? {
      id: record.user_id,
      name: record.user_name,
      role: record.user_access_level
    } : null
  };
}

function mapTicketRecord(record) {
  return {
    id: record.id,
    type: record.type,
    status: record.status,
    postId: record.post_id,
    commentId: record.comment_id,
    userId: record.user_id,
    guestName: record.guest_name,
    guestEmail: record.guest_email,
    subject: record.subject,
    message: record.message,
    assignedTo: record.assigned_to,
    createdAt: record.created_at,
    updatedAt: record.updated_at
  };
}

export async function countUsers(db) {
  const record = await db.prepare("SELECT COUNT(*) AS total FROM users").first();
  return Number(record && record.total ? record.total : 0);
}

export async function listUsers(db) {
  const baseQuery = "SELECT id, email, pending_email, pending_email_expires_at, name, access_level, flag, is_active, created_at, updated_at";
  const inviteFields = await tableExists(db, "user_invites")
    ? ", (SELECT purpose FROM user_invites WHERE user_id = users.id AND " + OPEN_INVITE_FILTER + " ORDER BY created_at DESC LIMIT 1) AS pending_invite_purpose, (SELECT expires_at FROM user_invites WHERE user_id = users.id AND " + OPEN_INVITE_FILTER + " ORDER BY created_at DESC LIMIT 1) AS pending_invite_expires_at"
    : ", NULL AS pending_invite_purpose, NULL AS pending_invite_expires_at";
  const response = await db.prepare(
    baseQuery + inviteFields + " FROM users ORDER BY CASE users.access_level WHEN 'owner' THEN 1 WHEN 'admin' THEN 2 WHEN 'moderator' THEN 3 WHEN 'contributor' THEN 4 ELSE 5 END ASC, name ASC, email ASC"
  ).bind(new Date().toISOString()).all();

  return (response.results || []).map(sanitizeUser);
}

export async function getUserAuthByEmail(db, email) {
  const record = await db.prepare(
    "SELECT id, email, pending_email, pending_email_token, pending_email_expires_at, name, access_level, flag, is_active, password_hash, password_salt, created_at, updated_at FROM users WHERE email = ?1"
  ).bind(normalizeEmail(email)).first();

  return record ? {
    ...record,
    isActive: Boolean(record.is_active)
  } : null;
}

export async function getUserAuthById(db, id) {
  const record = await db.prepare(
    "SELECT id, email, pending_email, pending_email_token, pending_email_expires_at, name, access_level, flag, is_active, password_hash, password_salt, created_at, updated_at FROM users WHERE id = ?1"
  ).bind(id).first();

  return record ? {
    ...record,
    isActive: Boolean(record.is_active)
  } : null;
}

export async function createUser(db, input, passwordHash, passwordSalt) {
  const role = normalizeUserRole(input.role !== undefined ? input.role : input.accessLevel);
  const result = await db.prepare(
    "INSERT INTO users (email, name, access_level, password_hash, password_salt, flag, is_active) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)"
  ).bind(
    validatePeorCasoEmail(input.email),
    input.name,
    role,
    passwordHash,
    passwordSalt,
    encodeUserFlags(input.flags || []),
    input.isActive === false ? 0 : 1
  ).run();

  return sanitizeUser(await getUserAuthById(db, result.meta.last_row_id));
}

export async function getUserById(db, id) {
  const record = await db.prepare(
    "SELECT id, email, pending_email, pending_email_expires_at, name, access_level, flag, is_active, created_at, updated_at FROM users WHERE id = ?1"
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
  const fields = [];
  const values = [];

  if (input.email !== undefined && input.email !== null) {
    fields.push("email = ?" + (values.length + 1));
    values.push(validatePeorCasoEmail(input.email));
  }

  if (input.name !== undefined) {
    const name = String(input.name || "").trim();

    if (!name) {
      throw new HttpError(400, "Name is required.");
    }

    fields.push("name = ?" + (values.length + 1));
    values.push(name);
  }

  if (input.role !== undefined || input.accessLevel !== undefined) {
    fields.push("access_level = ?" + (values.length + 1));
    values.push(normalizeUserRole(input.role !== undefined ? input.role : input.accessLevel));
  }

  if (!fields.length) {
    throw new HttpError(400, "No user changes were provided.");
  }

  fields.push("updated_at = CURRENT_TIMESTAMP");
  values.push(id);

  const result = await db.prepare(
    "UPDATE users SET " + fields.join(", ") + " WHERE id = ?" + values.length
  ).bind(...values).run();

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

export async function requestEmailChange(db, input) {
  const email = validatePeorCasoEmail(input.pendingEmail);
  const expiresAt = String(input.expiresAt || "").trim();
  const tokenHash = String(input.tokenHash || "").trim();
  const user = await getUserAuthById(db, input.userId);

  if (!expiresAt || !tokenHash) {
    throw new HttpError(400, "Pending email token data is required.");
  }

  if (user.email === email) {
    return sanitizeUser(user);
  }

  const existing = await db.prepare(
    "SELECT id FROM users WHERE (email = ?1 OR pending_email = ?1) AND id != ?2 LIMIT 1"
  ).bind(email, input.userId).first();

  if (existing) {
    throw new HttpError(409, "That email is already in use.");
  }

  await db.prepare(
    "UPDATE users SET pending_email = ?1, pending_email_token = ?2, pending_email_expires_at = ?3, updated_at = CURRENT_TIMESTAMP WHERE id = ?4"
  ).bind(email, tokenHash, expiresAt, input.userId).run();

  return sanitizeUser(await getUserAuthById(db, input.userId));
}

export async function getUserByPendingEmailToken(db, tokenHash) {
  const record = await db.prepare(
    "SELECT id, email, pending_email, pending_email_token, pending_email_expires_at, name, access_level, flag, is_active, created_at, updated_at FROM users WHERE pending_email_token = ?1"
  ).bind(tokenHash).first();

  if (!record || !record.pending_email || !record.pending_email_expires_at) {
    return null;
  }

  if (record.pending_email_expires_at <= new Date().toISOString()) {
    return null;
  }

  return record;
}

export async function completeEmailChange(db, userId) {
  const user = await getUserAuthById(db, userId);

  if (!user || !user.pending_email) {
    throw new HttpError(404, "Pending email change not found.");
  }

  await db.prepare(
    "UPDATE users SET email = pending_email, pending_email = NULL, pending_email_token = NULL, pending_email_expires_at = NULL, updated_at = CURRENT_TIMESTAMP WHERE id = ?1"
  ).bind(userId).run();

  return sanitizeUser(await getUserAuthById(db, userId));
}

export async function clearPendingEmailChange(db, userId) {
  await db.prepare(
    "UPDATE users SET pending_email = NULL, pending_email_token = NULL, pending_email_expires_at = NULL, updated_at = CURRENT_TIMESTAMP WHERE id = ?1"
  ).bind(userId).run();
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
    role: record.access_level,
    accessLevel: legacyAccessLevel(record.access_level),
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
    role: record.access_level,
    accessLevel: legacyAccessLevel(record.access_level),
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

export async function setUserActive(db, id, isActive) {
  const result = await db.prepare(
    "UPDATE users SET is_active = ?1, updated_at = CURRENT_TIMESTAMP WHERE id = ?2"
  ).bind(isActive ? 1 : 0, id).run();

  if (!result.meta.changes) {
    throw new HttpError(404, "User not found.");
  }
}

export async function listCategories(db) {
  const response = await db.prepare(
    "SELECT id, name, slug, description, sort_order, updated_at FROM categories ORDER BY sort_order ASC, name ASC"
  ).all();

  return (response.results || []).map(mapCategoryRecord);
}

function postsBaseQuery(whereClause) {
  return "SELECT posts.id, posts.category_id, posts.author_id, posts.title, posts.slug, posts.post_date, posts.image_url, posts.image_alt, posts.video_url, posts.likes, posts.content_markdown, posts.status, posts.approved_by, posts.approved_at, posts.updated_at, categories.name AS category_name, categories.slug AS category_slug, authors.name AS author_name, authors.email AS author_email, approvers.name AS approved_by_name, approvers.email AS approved_by_email FROM posts INNER JOIN categories ON categories.id = posts.category_id INNER JOIN users AS authors ON authors.id = posts.author_id LEFT JOIN users AS approvers ON approvers.id = posts.approved_by " + whereClause + " ORDER BY posts.post_date DESC, posts.id DESC";
}

export async function listPublishedPosts(db) {
  const response = await db.prepare(postsBaseQuery("WHERE posts.status = 'visible'")).all();
  return (response.results || []).map(mapPostRecord);
}

export async function listVisiblePosts(db) {
  return listPublishedPosts(db);
}

export async function listPostsForUser(db, user) {
  const query = roleRank(user.role) <= roleRank("moderator")
    ? postsBaseQuery("")
    : postsBaseQuery("WHERE posts.author_id = ?1");
  const statement = db.prepare(query);
  const response = roleRank(user.role) <= roleRank("moderator")
    ? await statement.all()
    : await statement.bind(user.id).all();

  return (response.results || []).map(mapPostRecord);
}

export async function listOwnPosts(db, userId) {
  const response = await db.prepare(
    postsBaseQuery("WHERE posts.author_id = ?1")
  ).bind(userId).all();

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

export async function getPostForViewer(db, id, viewer) {
  const post = await getPost(db, id);

  if (post.status === "visible") {
    return viewer ? withViewerLikeState(db, post, viewer.id) : post;
  }

  if (!viewer) {
    throw new HttpError(404, "Post not found.");
  }

  if (["owner", "admin", "moderator"].includes(viewer.role) || post.authorId === viewer.id) {
    return withViewerLikeState(db, post, viewer.id);
  }

  throw new HttpError(404, "Post not found.");
}

async function withViewerLikeState(db, post, userId) {
  const record = await db.prepare(
    "SELECT 1 AS liked FROM post_likes WHERE post_id = ?1 AND user_id = ?2"
  ).bind(post.id, userId).first();

  return {
    ...post,
    viewerHasLiked: Boolean(record && record.liked)
  };
}

export async function requireVisiblePost(db, id) {
  const post = await getPost(db, id);

  if (post.status !== "visible") {
    throw new HttpError(404, "Post not found.");
  }

  return post;
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
    "INSERT INTO posts (category_id, author_id, title, slug, post_date, image_url, image_alt, video_url, likes, content_markdown, status, approved_by, approved_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13)"
  ).bind(
    input.categoryId,
    input.authorId,
    input.title,
    input.slug,
    input.postDate,
    input.imageUrl,
    input.imageAlt,
    input.videoUrl || null,
    input.likes || 0,
    input.contentMarkdown,
    normalizePostStatus(input.status, "pending"),
    input.approvedBy || null,
    input.approvedAt || null
  ).run();

  return getPost(db, result.meta.last_row_id);
}

export async function updatePost(db, id, input) {
  const result = await db.prepare(
    "UPDATE posts SET category_id = ?1, title = ?2, slug = ?3, post_date = ?4, image_url = ?5, image_alt = ?6, video_url = ?7, likes = ?8, content_markdown = ?9, status = ?10, approved_by = ?11, approved_at = ?12, updated_at = CURRENT_TIMESTAMP WHERE id = ?13"
  ).bind(
    input.categoryId,
    input.title,
    input.slug,
    input.postDate,
    input.imageUrl,
    input.imageAlt,
    input.videoUrl || null,
    input.likes || 0,
    input.contentMarkdown,
    normalizePostStatus(input.status, "pending"),
    input.approvedBy || null,
    input.approvedAt || null,
    id
  ).run();

  if (!result.meta.changes) {
    throw new HttpError(404, "Post not found.");
  }

  return getPost(db, id);
}

export async function getImportedPostIdByYoutubeVideoId(db, videoId) {
  const record = await db.prepare(
    "SELECT post_id FROM youtube_video_imports WHERE video_id = ?1"
  ).bind(String(videoId || "").trim()).first();

  return record ? Number(record.post_id) : null;
}

export async function upsertYoutubeVideoImport(db, input) {
  await db.prepare(
    "INSERT INTO youtube_video_imports (video_id, playlist_id, post_id, created_at, updated_at) VALUES (?1, ?2, ?3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP) ON CONFLICT(video_id) DO UPDATE SET playlist_id = excluded.playlist_id, post_id = excluded.post_id, updated_at = CURRENT_TIMESTAMP"
  ).bind(
    String(input.videoId || "").trim(),
    String(input.playlistId || "").trim(),
    Number(input.postId)
  ).run();
}

export async function deletePost(db, id) {
  const result = await db.prepare("DELETE FROM posts WHERE id = ?1").bind(id).run();

  if (!result.meta.changes) {
    throw new HttpError(404, "Post not found.");
  }
}

export async function getComment(db, id) {
  const record = await db.prepare(
    "SELECT comments.id, comments.post_id, comments.parent_comment_id, comments.user_id, comments.body, comments.status, comments.created_at, comments.updated_at, users.name AS user_name, users.access_level AS user_access_level FROM comments INNER JOIN users ON users.id = comments.user_id WHERE comments.id = ?1"
  ).bind(id).first();

  if (!record) {
    throw new HttpError(404, "Comment not found.");
  }

  return mapCommentRecord(record);
}

export async function listCommentsForPost(db, postId, viewerId) {
  const query = viewerId
    ? "SELECT comments.id, comments.post_id, comments.parent_comment_id, comments.user_id, comments.body, comments.status, comments.created_at, comments.updated_at, users.name AS user_name, users.access_level AS user_access_level FROM comments INNER JOIN users ON users.id = comments.user_id WHERE comments.post_id = ?1 AND (comments.status = 'visible' OR comments.user_id = ?2) ORDER BY comments.created_at ASC, comments.id ASC"
    : "SELECT comments.id, comments.post_id, comments.parent_comment_id, comments.user_id, comments.body, comments.status, comments.created_at, comments.updated_at, users.name AS user_name, users.access_level AS user_access_level FROM comments INNER JOIN users ON users.id = comments.user_id WHERE comments.post_id = ?1 AND comments.status = 'visible' ORDER BY comments.created_at ASC, comments.id ASC";
  const statement = db.prepare(query);
  const response = viewerId
    ? await statement.bind(postId, viewerId).all()
    : await statement.bind(postId).all();

  return (response.results || []).map(mapCommentRecord);
}

export async function listCommentsForModeration(db) {
  const response = await db.prepare(
    "SELECT comments.id, comments.post_id, posts.title AS post_title, comments.parent_comment_id, comments.user_id, comments.body, comments.status, comments.created_at, comments.updated_at, users.name AS user_name, users.access_level AS user_access_level FROM comments INNER JOIN users ON users.id = comments.user_id INNER JOIN posts ON posts.id = comments.post_id ORDER BY comments.created_at DESC, comments.id DESC"
  ).all();

  return (response.results || []).map(mapCommentRecord);
}

function textLooksSuspicious(text) {
  const lowered = text.toLowerCase();
  const hasUrl = /(?:https?:\/\/|www\.|(?:[a-z0-9-]+\.)+(?:com|net|org|io|co|ly|gg|tv|me|info|biz)\b)/i.test(text);
  const hasMaskedText = /\b(?:[a-z][\s._*-]+){2,}[a-z]\b/i.test(text);
  const hasCurseWord = CURSE_WORDS.some(function (word) {
    return new RegExp("\\b" + word + "\\b", "i").test(lowered);
  });

  return hasUrl || hasMaskedText || hasCurseWord;
}

async function userNeedsCommentReview(db, userId, body) {
  const [account, visibleComments] = await Promise.all([
    getUserAuthById(db, userId),
    db.prepare("SELECT COUNT(*) AS total FROM comments WHERE user_id = ?1 AND status = 'visible'").bind(userId).first()
  ]);
  const accountCreatedAt = new Date(account.created_at);
  const accountAgeMs = Date.now() - accountCreatedAt.getTime();
  const hasThreeVisibleComments = Number(visibleComments && visibleComments.total ? visibleComments.total : 0) >= 3;
  const isEstablished = Number.isFinite(accountAgeMs) && accountAgeMs >= 7 * 24 * 60 * 60 * 1000;

  return textLooksSuspicious(body) || !hasThreeVisibleComments || !isEstablished;
}

export async function createComment(db, input) {
  await requireVisiblePost(db, input.postId);

  if (input.parentCommentId) {
    const parent = await getComment(db, input.parentCommentId);

    if (parent.postId !== input.postId) {
      throw new HttpError(400, "Parent comment must belong to the same post.");
    }
  }

  const status = await userNeedsCommentReview(db, input.userId, input.body) ? "pending" : "visible";
  const result = await db.prepare(
    "INSERT INTO comments (post_id, parent_comment_id, user_id, body, status) VALUES (?1, ?2, ?3, ?4, ?5)"
  ).bind(
    input.postId,
    input.parentCommentId || null,
    input.userId,
    input.body,
    status
  ).run();

  return getComment(db, result.meta.last_row_id);
}

export async function togglePostLike(db, postId, userId) {
  await requireVisiblePost(db, postId);
  const existing = await db.prepare(
    "SELECT 1 AS liked FROM post_likes WHERE post_id = ?1 AND user_id = ?2"
  ).bind(postId, userId).first();

  if (existing) {
    await db.prepare(
      "DELETE FROM post_likes WHERE post_id = ?1 AND user_id = ?2"
    ).bind(postId, userId).run();
    await db.prepare(
      "UPDATE posts SET likes = CASE WHEN likes > 0 THEN likes - 1 ELSE 0 END, updated_at = CURRENT_TIMESTAMP WHERE id = ?1"
    ).bind(postId).run();
  } else {
    await db.prepare(
      "INSERT INTO post_likes (post_id, user_id) VALUES (?1, ?2)"
    ).bind(postId, userId).run();
    await db.prepare(
      "UPDATE posts SET likes = likes + 1, updated_at = CURRENT_TIMESTAMP WHERE id = ?1"
    ).bind(postId).run();
  }

  const post = await getPost(db, postId);

  return {
    likes: post.likes,
    viewerHasLiked: !existing
  };
}

export async function updateCommentStatus(db, id, status) {
  const normalized = normalizeCommentStatus(status);
  const result = await db.prepare(
    "UPDATE comments SET status = ?1, updated_at = CURRENT_TIMESTAMP WHERE id = ?2"
  ).bind(normalized, id).run();

  if (!result.meta.changes) {
    throw new HttpError(404, "Comment not found.");
  }

  return getComment(db, id);
}

export async function createTicket(db, input) {
  const result = await db.prepare(
    "INSERT INTO tickets (type, status, post_id, comment_id, user_id, guest_name, guest_email, subject, message, assigned_to) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10)"
  ).bind(
    input.type,
    input.status,
    input.postId || null,
    input.commentId || null,
    input.userId || null,
    input.guestName || null,
    input.guestEmail || null,
    input.subject,
    input.message,
    input.assignedTo || null
  ).run();

  return getTicketById(db, result.meta.last_row_id);
}

export async function getTicketById(db, id) {
  const record = await db.prepare(
    "SELECT id, type, status, post_id, comment_id, user_id, guest_name, guest_email, subject, message, assigned_to, created_at, updated_at FROM tickets WHERE id = ?1"
  ).bind(id).first();

  if (!record) {
    throw new HttpError(404, "Ticket not found.");
  }

  return mapTicketRecord(record);
}

export async function listTickets(db) {
  const response = await db.prepare(
    "SELECT id, type, status, post_id, comment_id, user_id, guest_name, guest_email, subject, message, assigned_to, created_at, updated_at FROM tickets ORDER BY CASE status WHEN 'open' THEN 1 WHEN 'in_progress' THEN 2 WHEN 'closed' THEN 3 ELSE 4 END ASC, created_at DESC, id DESC"
  ).all();

  return (response.results || []).map(mapTicketRecord);
}

export async function updateTicket(db, id, input) {
  const fields = [];
  const values = [];

  if (input.status !== undefined) {
    fields.push("status = ?" + (values.length + 1));
    values.push(normalizeTicketStatus(input.status));
  }

  if (input.assignedTo !== undefined) {
    fields.push("assigned_to = ?" + (values.length + 1));
    values.push(input.assignedTo === null ? null : Number(input.assignedTo));
  }

  if (!fields.length) {
    throw new HttpError(400, "No ticket changes were provided.");
  }

  fields.push("updated_at = CURRENT_TIMESTAMP");
  values.push(id);

  const result = await db.prepare(
    "UPDATE tickets SET " + fields.join(", ") + " WHERE id = ?" + values.length
  ).bind(...values).run();

  if (!result.meta.changes) {
    throw new HttpError(404, "Ticket not found.");
  }

  return getTicketById(db, id);
}

async function getOpenTicketForTarget(db, postId, commentId) {
  if (postId) {
    const record = await db.prepare(
      "SELECT id, type, status, post_id, comment_id, user_id, guest_name, guest_email, subject, message, assigned_to, created_at, updated_at FROM tickets WHERE post_id = ?1 AND status IN ('open', 'in_progress') ORDER BY created_at ASC LIMIT 1"
    ).bind(postId).first();

    return record ? mapTicketRecord(record) : null;
  }

  if (commentId) {
    const record = await db.prepare(
      "SELECT id, type, status, post_id, comment_id, user_id, guest_name, guest_email, subject, message, assigned_to, created_at, updated_at FROM tickets WHERE comment_id = ?1 AND status IN ('open', 'in_progress') ORDER BY created_at ASC LIMIT 1"
    ).bind(commentId).first();

    return record ? mapTicketRecord(record) : null;
  }

  return null;
}

export async function createOrGetReportTicket(db, input) {
  if (input.postId) {
    await getPost(db, input.postId);
  }

  if (input.commentId) {
    await getComment(db, input.commentId);
  }

  const existing = await getOpenTicketForTarget(db, input.postId, input.commentId);

  if (existing) {
    return {
      created: false,
      ticket: existing
    };
  }

  return {
    created: true,
    ticket: await createTicket(db, validateTicketInput(input, {
      type: input.type,
      postId: input.postId || null,
      commentId: input.commentId || null,
      status: "open",
      userId: input.userId || null,
      guestName: input.guestName || null,
      guestEmail: input.guestEmail || null,
      subject: input.subject,
      message: input.message,
      assignedTo: input.assignedTo || null
    }))
  };
}
