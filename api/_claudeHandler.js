// Shared request handler for the AI proxy. Used by both api/claude.js
// (Vercel serverless function) and server.js (Cloud Run / generic Node
// hosting, e.g. Google AI Studio's deploy target), so the proxy logic and
// its protections live in exactly one place. Filename is prefixed with
// "_" so Vercel's file-system routing doesn't turn it into its own route.
//
// Internally this calls Google's Gemini API (free tier) rather than
// Anthropic's, but translates the request/response to the same shape
// Anthropic's Messages API uses, so callClaude() in App.jsx needs no
// changes: { content: [{ type: "text", text: "..." }] }.

import { verifyToken } from "./_auth.js";
import { isOriginAllowed, getClientIp, pruneIfLarge, isPlainObjectWithOnlyKeys } from "./_shared.js";

// The exact, complete shape callClaude() in App.jsx is allowed to send.
// Anything outside this (extra top-level fields, extra fields on a
// message) is rejected outright rather than silently ignored.
const ALLOWED_BODY_KEYS = ["model", "system", "messages", "max_tokens"];
const ALLOWED_MESSAGE_KEYS = ["role", "content"];

const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-3.6-flash";
const GEMINI_URL = (model, key) =>
  `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`;
const ALLOWED_MODEL = "claude-sonnet-4-6"; // the model name App.jsx still sends; unused beyond validation
const MAX_TOKENS_CAP = 1000;
const MAX_MESSAGES = 40;
const MAX_MESSAGE_CHARS = 8000;
const MAX_SYSTEM_CHARS = 12000;

// Best-effort per-instance rate limit. Serverless instances are short-lived
// and not shared, so this doesn't guarantee a global cap, but it stops a
// single abusive client from hammering a warm instance. Vercel's Firewall
// rate-limit rule (configured in the dashboard, see README) is the real
// global backstop; this is a second, cheaper layer.
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX_REQUESTS = 20;
const requestLog = new Map();

// Per-access-code daily quota, keyed by the label embedded in the token
// (see _authHandler.js / ACCESS_CODES), not by IP. Same best-effort,
// per-instance caveat as the rate limiter above.
const DAILY_QUOTA_PER_CODE = Number(process.env.DAILY_QUOTA_PER_CODE) || 300;
const quotaLog = new Map();

function isRateLimited(ip) {
  pruneIfLarge(requestLog, 5000, (e) => Date.now() - e.windowStart > RATE_LIMIT_WINDOW_MS);
  const now = Date.now();
  const entry = requestLog.get(ip);
  if (!entry || now - entry.windowStart > RATE_LIMIT_WINDOW_MS) {
    requestLog.set(ip, { windowStart: now, count: 1 });
    return false;
  }
  entry.count += 1;
  return entry.count > RATE_LIMIT_MAX_REQUESTS;
}

function isOverDailyQuota(label) {
  const day = new Date().toISOString().slice(0, 10);
  pruneIfLarge(quotaLog, 5000, (e) => e.day !== day);
  const entry = quotaLog.get(label);
  if (!entry || entry.day !== day) {
    quotaLog.set(label, { day, count: 1 });
    return false;
  }
  entry.count += 1;
  return entry.count > DAILY_QUOTA_PER_CODE;
}

function validateBody(body) {
  if (!isPlainObjectWithOnlyKeys(body, ALLOWED_BODY_KEYS)) return "Missing or unexpected fields in request body";
  if (body.model !== ALLOWED_MODEL) return "Unsupported model";
  if (typeof body.system !== "string" || body.system.length > MAX_SYSTEM_CHARS) return "Invalid system prompt";
  if (!Array.isArray(body.messages) || body.messages.length === 0 || body.messages.length > MAX_MESSAGES) {
    return "Invalid messages";
  }
  for (const m of body.messages) {
    if (!isPlainObjectWithOnlyKeys(m, ALLOWED_MESSAGE_KEYS)) return "Unexpected fields in message";
    if (m.role !== "user" && m.role !== "assistant") return "Invalid message role";
    if (typeof m.content !== "string" || m.content.length > MAX_MESSAGE_CHARS) return "Invalid message content";
  }
  if (body.max_tokens !== undefined && (typeof body.max_tokens !== "number" || !Number.isFinite(body.max_tokens) || body.max_tokens <= 0)) {
    return "Invalid max_tokens";
  }
  return null;
}

// Anthropic uses role "user"/"assistant"; Gemini uses "user"/"model", and
// wraps text in a "parts" array instead of a plain string.
function toGeminiContents(messages) {
  return messages.map((m) => ({
    role: m.role === "assistant" ? "model" : "user",
    parts: [{ text: m.content }],
  }));
}

// Reshape Gemini's response into the { content: [{ type, text }] } shape
// App.jsx's callClaude() already expects from Anthropic's API.
function toAnthropicShape(geminiData) {
  const parts = geminiData?.candidates?.[0]?.content?.parts || [];
  const text = parts.map((p) => p.text || "").join("");
  return { content: [{ type: "text", text }] };
}

export default async function claudeHandler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }

  if (!isOriginAllowed(req)) {
    return res.status(403).json({ error: "Origin not allowed" });
  }

  const ip = getClientIp(req);
  if (isRateLimited(ip)) {
    return res.status(429).json({ error: "Too many requests, please slow down" });
  }

  const authHeader = req.headers["authorization"] || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
  const claims = verifyToken(token, process.env.AUTH_SECRET);
  if (!claims) {
    return res.status(401).json({ error: "Missing or expired access token" });
  }

  // Validate the body before spending quota, so a malformed request (or a
  // client bug retrying on failure) can't burn a class's daily budget
  // without ever reaching Gemini.
  const validationError = validateBody(req.body);
  if (validationError) {
    return res.status(400).json({ error: validationError });
  }

  if (isOverDailyQuota(claims.label)) {
    return res.status(429).json({ error: "Daily quota reached for this access code, please try again tomorrow" });
  }

  if (!process.env.GEMINI_API_KEY) {
    return res.status(500).json({ error: "Server is missing GEMINI_API_KEY" });
  }

  try {
    const response = await fetch(GEMINI_URL(GEMINI_MODEL, process.env.GEMINI_API_KEY), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: toGeminiContents(req.body.messages),
        systemInstruction: { parts: [{ text: req.body.system }] },
        generationConfig: {
          maxOutputTokens: Math.min(req.body.max_tokens || MAX_TOKENS_CAP, MAX_TOKENS_CAP),
        },
      }),
    });

    const data = await response.json();
    if (!response.ok) {
      return res.status(response.status).json({ error: data?.error?.message || "Upstream error" });
    }
    return res.status(200).json(toAnthropicShape(data));
  } catch (err) {
    return res.status(502).json({ error: "Upstream request failed" });
  }
}
