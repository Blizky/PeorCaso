import { HttpError } from "./http.js";

const PBKDF2_ITERATIONS = 210000;
const FALLBACK_ITERATIONS = 12000;
const HASH_SEPARATOR = "$";

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

function randomPasswordValue() {
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  return bytesToHex(bytes);
}

function concatBytes() {
  const segments = Array.from(arguments);
  const totalLength = segments.reduce(function (sum, bytes) {
    return sum + bytes.length;
  }, 0);
  const result = new Uint8Array(totalLength);
  let offset = 0;

  segments.forEach(function (bytes) {
    result.set(bytes, offset);
    offset += bytes.length;
  });

  return result;
}

async function digestBytes(bytes) {
  return new Uint8Array(await crypto.subtle.digest("SHA-256", bytes));
}

async function derivePbkdf2Hash(password, saltHex) {
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
    iterations: PBKDF2_ITERATIONS
  }, keyMaterial, 256);

  return bytesToHex(new Uint8Array(bits));
}

async function deriveFallbackHash(password, saltHex) {
  const saltBytes = hexToBytes(saltHex);
  let digest = concatBytes(saltBytes, new TextEncoder().encode(password));

  for (let index = 0; index < FALLBACK_ITERATIONS; index += 1) {
    digest = await digestBytes(concatBytes(saltBytes, digest));
  }

  return bytesToHex(digest);
}

async function deriveHash(password, saltHex, algorithm) {
  if (algorithm === "pbkdf2") {
    return derivePbkdf2Hash(password, saltHex);
  }

  if (algorithm === "sha256i") {
    return deriveFallbackHash(password, saltHex);
  }

  throw new Error("Unsupported password algorithm.");
}

async function derivePreferredHash(password, saltHex) {
  try {
    return {
      algorithm: "pbkdf2",
      hash: await derivePbkdf2Hash(password, saltHex)
    };
  } catch (error) {
    console.warn("PBKDF2 unavailable, falling back to iterative SHA-256.", error);

    return {
      algorithm: "sha256i",
      hash: await deriveFallbackHash(password, saltHex)
    };
  }
}

function encodeStoredHash(algorithm, hash) {
  return algorithm + HASH_SEPARATOR + hash;
}

function decodeStoredHash(storedHash) {
  const value = String(storedHash || "").trim();
  const separatorIndex = value.indexOf(HASH_SEPARATOR);

  if (separatorIndex === -1) {
    return {
      algorithm: "pbkdf2",
      hash: value
    };
  }

  return {
    algorithm: value.slice(0, separatorIndex),
    hash: value.slice(separatorIndex + 1)
  };
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
  const derived = await derivePreferredHash(password, salt);

  return {
    salt,
    hash: encodeStoredHash(derived.algorithm, derived.hash)
  };
}

export async function verifyPassword(password, storedHash, storedSalt) {
  if (!storedHash || !storedSalt) {
    return false;
  }

  const parsed = decodeStoredHash(storedHash);
  const derived = await deriveHash(password, storedSalt, parsed.algorithm);
  return timingSafeEqual(derived, parsed.hash);
}

export async function hashTemporaryPassword() {
  return hashPassword(randomPasswordValue());
}
