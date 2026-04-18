import { HttpError } from "./http.js";
import { clearSessionCookie, readSession, writeSessionCookie } from "./session.js";
import { getDb, getUserAuthById, sanitizeUser } from "./store.js";

export function canManageUsers(user) {
  return user && user.accessLevel === 1;
}

export function canManageCategories(user) {
  return user && user.accessLevel <= 2;
}

export function canApprovePosts(user) {
  return user && user.accessLevel <= 2;
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

  return sanitizeUser(user);
}

export async function requireUser(context, maximumAccessLevel) {
  const user = await getCurrentUser(context.request, context.env);

  if (!user) {
    throw new HttpError(401, "Authentication required.");
  }

  if (maximumAccessLevel && user.accessLevel > maximumAccessLevel) {
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
