import { HttpError } from "./http.js";
import { clearSessionCookie, readSession, writeSessionCookie } from "./session.js";
import { getDb, getUserAuthById, normalizeUserRole, parseUserFlags, roleRank, sanitizeUser } from "./store.js";

export function canManageUsers(user) {
  return user && ["owner", "admin"].includes(user.role);
}

export function canAccessAdmin(user) {
  return user && ["owner", "admin"].includes(user.role);
}

export function canManageCategories(user) {
  return user && ["owner", "admin"].includes(user.role);
}

export function canApprovePosts(user) {
  return user && ["owner", "admin"].includes(user.role);
}

export function canModerateComments(user) {
  return user && (
    ["owner", "admin", "moderator"].includes(user.role) ||
    (Array.isArray(user.flags) && user.flags.includes("is_comment_moderator"))
  );
}

function meetsLegacyRequirement(user, maximumAccessLevel) {
  if (maximumAccessLevel === 1) {
    return ["owner", "admin"].includes(user.role);
  }

  if (maximumAccessLevel === 2) {
    return ["owner", "admin", "moderator"].includes(user.role);
  }

  if (maximumAccessLevel === 3) {
    return ["owner", "admin", "moderator", "contributor"].includes(user.role);
  }

  return true;
}

function meetsNamedRequirement(user, minimumRole) {
  return roleRank(user.role) <= roleRank(normalizeUserRole(minimumRole));
}

export async function getCurrentUser(request, env) {
  const session = await readSession(request, env);

  if (!session) {
    return null;
  }

  const user = await getUserAuthById(getDb(env), session.userId);

  if (!user || !user.isActive) {
    return null;
  }

  if (parseUserFlags(user.flag).includes("is_suspended")) {
    return null;
  }

  return sanitizeUser(user);
}

export async function requireUser(context, requirement) {
  const user = await getCurrentUser(context.request, context.env);

  if (!user) {
    throw new HttpError(401, "Authentication required.");
  }

  if (typeof requirement === "number" && !meetsLegacyRequirement(user, requirement)) {
    throw new HttpError(403, "Insufficient permissions.");
  }

  if (typeof requirement === "string" && !meetsNamedRequirement(user, requirement)) {
    throw new HttpError(403, "Insufficient permissions.");
  }

  return user;
}

export async function createSessionHeaders(request, env, user) {
  const headers = new Headers();
  headers.append("set-cookie", await writeSessionCookie(request, env, user));
  return headers;
}

export function createLogoutHeaders(request) {
  const headers = new Headers();
  headers.append("set-cookie", clearSessionCookie(request));
  return headers;
}
