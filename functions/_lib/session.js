import { HttpError } from "./http.js";

const COOKIE_NAME = "peorcaso_session";
const SESSION_MAX_AGE = 60 * 60 * 24 * 7;

function bytesToBase64Url(bytes) {
  let binary = "";

  bytes.forEach(function (byte) {
    binary += String.fromCharCode(byte);
  });

  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function base64UrlToBytes(value) {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized + "=".repeat((4 - normalized.length % 4) % 4);
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);

  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }

  return bytes;
}

function encodePayload(payload) {
  return bytesToBase64Url(new TextEncoder().encode(JSON.stringify(payload)));
}

function decodePayload(encoded) {
  return JSON.parse(new TextDecoder().decode(base64UrlToBytes(encoded)));
}

function parseCookies(cookieHeader) {
  return String(cookieHeader || "").split(/;\s*/).reduce(function (cookies, item) {
    if (!item) {
      return cookies;
    }

    const separatorIndex = item.indexOf("=");

    if (separatorIndex === -1) {
      return cookies;
    }

    const key = item.slice(0, separatorIndex).trim();
    const value = item.slice(separatorIndex + 1).trim();

    cookies[key] = value;
    return cookies;
  }, {});
}

function serializeCookie(name, value, options) {
  const settings = options || {};
  const segments = [name + "=" + value];

  segments.push("Path=" + (settings.path || "/"));

  if (settings.maxAge !== undefined) {
    segments.push("Max-Age=" + settings.maxAge);
  }

  if (settings.httpOnly !== false) {
    segments.push("HttpOnly");
  }

  if (settings.sameSite) {
    segments.push("SameSite=" + settings.sameSite);
  }

  if (settings.secure) {
    segments.push("Secure");
  }

  return segments.join("; ");
}

async function sign(encodedPayload, env) {
  const secret = String(env.SESSION_SECRET || "").trim();

  if (!secret) {
    throw new HttpError(500, "Missing SESSION_SECRET binding.");
  }

  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(encodedPayload));

  return bytesToBase64Url(new Uint8Array(signature));
}

function cookieSecureFlag(request) {
  const url = new URL(request.url);
  return url.protocol === "https:" && url.hostname !== "localhost";
}

export async function writeSessionCookie(request, env, user) {
  const payload = encodePayload({
    userId: user.id,
    exp: Date.now() + SESSION_MAX_AGE * 1000
  });
  const signature = await sign(payload, env);

  return serializeCookie(COOKIE_NAME, payload + "." + signature, {
    httpOnly: true,
    sameSite: "Lax",
    secure: cookieSecureFlag(request),
    maxAge: SESSION_MAX_AGE
  });
}

export function clearSessionCookie(request) {
  return serializeCookie(COOKIE_NAME, "", {
    httpOnly: true,
    sameSite: "Lax",
    secure: cookieSecureFlag(request),
    maxAge: 0
  });
}

export async function readSession(request, env) {
  const cookies = parseCookies(request.headers.get("cookie"));
  const token = cookies[COOKIE_NAME];

  if (!token) {
    return null;
  }

  const parts = token.split(".");

  if (parts.length !== 2) {
    return null;
  }

  const encodedPayload = parts[0];
  const signature = parts[1];
  const expectedSignature = await sign(encodedPayload, env);

  if (signature !== expectedSignature) {
    return null;
  }

  const payload = decodePayload(encodedPayload);

  if (!payload.exp || payload.exp < Date.now()) {
    return null;
  }

  return payload;
}
