import { HttpError } from "./http.js";

const INVITE_TTL_HOURS = 48;

function bytesToHex(bytes) {
  return Array.from(bytes).map(function (byte) {
    return byte.toString(16).padStart(2, "0");
  }).join("");
}

function bytesToBase64Url(bytes) {
  let binary = "";

  bytes.forEach(function (byte) {
    binary += String.fromCharCode(byte);
  });

  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

export function inviteExpiresAt() {
  return new Date(Date.now() + INVITE_TTL_HOURS * 60 * 60 * 1000).toISOString();
}

export function generateInviteToken() {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return bytesToBase64Url(bytes);
}

export async function hashInviteToken(token) {
  if (!token) {
    throw new HttpError(400, "Invite token is required.");
  }

  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(token));
  return bytesToHex(new Uint8Array(digest));
}

export function inviteActionLabel(purpose) {
  return purpose === "reset_password" ? "password reset" : "account invite";
}
