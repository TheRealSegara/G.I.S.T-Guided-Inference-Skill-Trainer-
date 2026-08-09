// Request-identity helpers shared by _claudeHandler.js and _authHandler.js
// (both Node-style req/res handlers, used by both api/*.js on Vercel and
// server.js elsewhere). Kept separate from middleware.js's near-identical
// origin check, which runs on the Edge runtime against the Web Request
// API (different shape from Node's req/res) — that duplication is
// intentional defense-in-depth, not something to share code with.
import { ipAddress } from "@vercel/functions";

export function getAllowedOrigins() {
  return (process.env.ALLOWED_ORIGINS || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

export function isOriginAllowed(req) {
  const allowed = getAllowedOrigins();
  if (allowed.length === 0) return true; // not configured yet: allow (see README)
  const origin = req.headers.origin || "";
  const referer = req.headers.referer || "";
  return allowed.some((a) => origin.startsWith(a) || referer.startsWith(a));
}

// req.headers["x-forwarded-for"] is client-suppliable and must never be
// trusted directly, anyone can send a fake value and rotate it per
// request to defeat IP-keyed rate limiting / brute-force guards. On
// Vercel, ipAddress() reads "x-real-ip", which is set by Vercel's own
// edge network and can't be spoofed by the client. req.ip is the
// fallback for the Express path (server.js), which requires
// `app.set("trust proxy", ...)` (see server.js) so Express resolves the
// real client IP from its trusted proxy hop instead of raw client input.
export function getClientIp(req) {
  return ipAddress(new Headers(req.headers)) || req.ip || req.socket?.remoteAddress || "unknown";
}

// Opportunistically evicts expired entries from an in-memory rate-limit
// map once it grows past maxSize. Vercel serverless instances recycle
// before this matters, but server.js runs as one long-lived process, so
// without this the map would grow forever as distinct IPs/labels show up.
export function pruneIfLarge(map, maxSize, isExpired) {
  if (map.size <= maxSize) return;
  for (const [key, value] of map) {
    if (isExpired(value)) map.delete(key);
  }
}

// True if obj is a plain, non-array object containing only keys present
// in `allowedKeys`. Used to reject request bodies with extra/unexpected
// fields (OWASP API3: mass assignment / excessive data exposure) instead
// of silently ignoring fields the handler doesn't look at — an unused
// field today is a foothold for a bug tomorrow if the body is ever
// forwarded, logged, or spread into something else without this check.
export function isPlainObjectWithOnlyKeys(obj, allowedKeys) {
  if (!obj || typeof obj !== "object" || Array.isArray(obj)) return false;
  return Object.keys(obj).every((k) => allowedKeys.includes(k));
}
