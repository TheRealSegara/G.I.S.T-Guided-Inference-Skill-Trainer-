// Shared helpers for _studentAuthHandler.js (signup/login), _sessionHandler.js
// and _teacherRosterHandler.js: student secret hashing, name normalization,
// and the allowed-value lists mirrored from src/App.jsx's avatar builder
// constants (AVATAR_HEADS, SKIN_TONES, BADGE_COLORS, ACCESSORY_STICKERS,
// ANIMAL_COMPANIONS) so a request can't smuggle an arbitrary string into
// stored avatar/secret data. Keep these lists in sync with App.jsx if the
// avatar builder's options ever change.

import crypto from "node:crypto";

export const ALLOWED_HEADS = ["child", "girl", "boy"];
export const ALLOWED_SKIN_TONES = ["", "🏻", "🏼", "🏽", "🏾", "🏿"];
export const ALLOWED_BADGES = ["khaki", "red", "blue", "purple", "green", "orange", "teal", "pink"];
export const ALLOWED_ACCESSORIES = ["backpack", "cap", "sunglasses", "binoculars", "compass", "boots", "camera", "none"];
export const ALLOWED_ANIMALS = ["orangutan", "tiger", "parrot", "turtle", "butterfly", "monkey", "owl", "gecko"];

export const SECRET_LENGTH = 3;

// Case/whitespace-insensitive so "Ahmad Bin Ali" and "ahmad  bin ali" (a
// student retyping their name slightly differently) match the same
// account, and used as the DB lookup key alongside access_code_label.
export function normalizeName(name) {
  return name.trim().toLowerCase().replace(/\s+/g, " ");
}

export function isValidFullName(name) {
  return typeof name === "string" && name.trim().length >= 1 && name.trim().length <= 80;
}

export function isValidSecret(secret) {
  return (
    Array.isArray(secret) &&
    secret.length === SECRET_LENGTH &&
    secret.every((s) => typeof s === "string" && ALLOWED_ANIMALS.includes(s))
  );
}

export function isValidAvatarConfig(config) {
  return (
    config &&
    typeof config === "object" &&
    !Array.isArray(config) &&
    ALLOWED_HEADS.includes(config.head) &&
    ALLOWED_SKIN_TONES.includes(config.skinTone) &&
    ALLOWED_BADGES.includes(config.badge) &&
    ALLOWED_ACCESSORIES.includes(config.accessory) &&
    ALLOWED_ANIMALS.includes(config.companion) &&
    Object.keys(config).length === 5
  );
}

// HMAC-SHA256 over the joined sequence, keyed by AUTH_SECRET (already
// required, already kept out of the browser). Not meant to resist offline
// brute force on its own — a 3-of-8 sequence is only 8^3 = 512
// possibilities, small enough that anyone with both the pepper and a
// leaked hash could brute-force it near-instantly regardless of hash
// algorithm. The real protection against guessing is the login/signup
// endpoints' rate limiting; this only keeps the raw sequence out of the
// database at rest, and out of application logs.
export function hashSecret(secret, pepper) {
  return crypto.createHmac("sha256", pepper).update(`student-secret:${secret.join(",")}`).digest("hex");
}

export function secretHashesMatch(a, b) {
  const bufA = Buffer.from(a, "hex");
  const bufB = Buffer.from(b, "hex");
  return bufA.length === bufB.length && crypto.timingSafeEqual(bufA, bufB);
}
