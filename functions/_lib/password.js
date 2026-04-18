import { HttpError } from "./http.js";

function bytesToHex(bytes) {
  return Array.from(bytes).map(function (byte) {
    return byte.toString(16).padStart(2, "0");
  }).join("");
}

function hexToBytes(hex) {
  const bytes = new Uint8Array(hex.length / 2);

  for (let index = 0; index < bytes.length; index += 1) {
    bytes[index] = parseInt(hex.slice(index * 2, index * 2 + 2), 16);
  }

  return bytes;
}

function randomSalt() {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return bytesToHex(bytes);
}

async function deriveHash(password, saltHex) {
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    "PBKDF2",
    false,
    ["deriveBits"]
  );
  const bits = await crypto.subtle.deriveBits({
    name: "PBKDF2",
    hash: "SHA-256",
    salt: hexToBytes(saltHex),
    iterations: 210000
  }, keyMaterial, 256);

  return bytesToHex(new Uint8Array(bits));
}

function timingSafeEqual(left, right) {
  if (left.length !== right.length) {
    return false;
  }

  let result = 0;

  for (let index = 0; index < left.length; index += 1) {
    result |= left.charCodeAt(index) ^ right.charCodeAt(index);
  }

  return result === 0;
}

export async function hashPassword(password) {
  if (String(password || "").length < 8) {
    throw new HttpError(400, "Password must be at least 8 characters.");
  }

  const salt = randomSalt();
  const hash = await deriveHash(password, salt);

  return { salt, hash };
}

export async function verifyPassword(password, storedHash, storedSalt) {
  if (!storedHash || !storedSalt) {
    return false;
  }

  const derived = await deriveHash(password, storedSalt);
  return timingSafeEqual(derived, storedHash);
}
