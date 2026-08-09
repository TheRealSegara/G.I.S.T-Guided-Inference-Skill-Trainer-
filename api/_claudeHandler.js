// Shared request handler for the AI proxy. Used by both api/claude.js
// (Vercel serverless function) and server.js (Cloud Run / generic Node
// hosting), so the proxy logic and its protections live in exactly one
// place. Filename is prefixed with "_" so Vercel's file-system routing
// doesn't turn it into its own route.
//
// Internally this calls Groq's API (free tier, OpenAI-compatible chat
// completions shape) rather than Anthropic's, but translates the
// request/response to the same shape Anthropic's Messages API uses, so
// callClaude() in App.jsx needs no changes: { content: [{ type: "text",
// text: "..." }] }. Chose Groq over Gemini (the original provider) for
// its far more generous free tier and much faster inference — see the
// git history / commit messages around this change for the comparison.

import { verifyToken } from "./_auth.js";
import { isOriginAllowed, getClientIp, pruneIfLarge, isPlainObjectWithOnlyKeys, DAILY_QUOTA_PER_CODE } from "./_shared.js";

// The exact, complete shape callClaude() in App.jsx is allowed to send.
// Anything outside this (extra top-level fields, extra fields on a
// message) is rejected outright rather than silently ignored.
const ALLOWED_BODY_KEYS = ["model", "system", "messages", "max_tokens"];
const ALLOWED_MESSAGE_KEYS = ["role", "content"];

const GROQ_MODEL = process.env.GROQ_MODEL || "llama-3.1-8b-instant";
const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";
const ALLOWED_MODEL = "claude-sonnet-4-6"; // the model name App.jsx still sends; unused beyond validation
const MAX_TOKENS_CAP = 1000;
const MAX_MESSAGES = 40;
const MAX_MESSAGE_CHARS = 8000;
const MAX_SYSTEM_CHARS = 12000;

// Best-effort per-instance rate limit. Serverless instances are short-lived
// and not shared, so this doesn't guarantee a global cap, but it stops a
// single abusive client from hammering a warm instance. Vercel's Firewall
// rate-limit rule (configured in the dashboard, see README) and Groq's own
// account-wide limits are the real backstops; this is a cheap first layer
// against obvious abuse, not a precise model of Groq's shared token budget.
//
// Set to match Groq's actual stated free-tier ceiling for
// llama-3.1-8b-instant (30 requests/minute, no billing linked — verify
// your own live numbers at console.groq.com/docs/rate-limits, they can
// differ by account and model), the same "match the real number, don't
// try to be clever about a sub-limit" approach used for the Gemini
// version. An earlier attempt here tried to preempt Groq's *token*-per-
// minute ceiling (6,000) instead by estimating ~3 calls/minute, then 10 —
// both were confirmed live to be too tight, tripping this during normal
// single-student play, not abuse. A higher value than the real ceiling
// would be pointless: Groq's own limit would reject the request first
// regardless, just with a raw upstream error instead of our own clearer
// message — exactly the outcome to avoid, so this matches their number
// directly rather than a hand-estimated fraction of it.
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX_REQUESTS = Number(process.env.RATE_LIMIT_MAX_REQUESTS) || 30;
const requestLog = new Map();

// Per-access-code daily quota, keyed by the label embedded in the token
// (see _authHandler.js / ACCESS_CODES), not by IP. Same best-effort,
// per-instance caveat as the rate limiter above. DAILY_QUOTA_PER_CODE
// itself lives in _shared.js since _authHandler.js needs it too.
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

// Increments and returns this access code's usage for today. Included in
// every response from this point on so the frontend can show a live "X
// of Y used today" indicator — there's no separate read-only endpoint
// for this because Vercel serverless functions don't share memory across
// different route files, so a standalone /api/quota check would almost
// always read a different, likely-empty counter instead of this one.
function getQuotaStatus(label) {
  const day = new Date().toISOString().slice(0, 10);
  pruneIfLarge(quotaLog, 5000, (e) => e.day !== day);
  const entry = quotaLog.get(label);
  const used = !entry || entry.day !== day ? 1 : entry.count + 1;
  quotaLog.set(label, { day, count: used });
  return { used, limit: DAILY_QUOTA_PER_CODE, remaining: Math.max(0, DAILY_QUOTA_PER_CODE - used), exceeded: used > DAILY_QUOTA_PER_CODE };
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

// Groq's chat completions API is OpenAI-compatible: role "user"/"assistant"
// plain-string messages, same as Anthropic's shape and what App.jsx already
// sends, so no per-message reshaping is needed here. The one difference is
// the system prompt: Groq takes it as a "system"-role message prepended to
// the array, not a separate top-level field like Gemini's systemInstruction
// or Anthropic's system param.
function toGroqMessages(system, messages) {
  return [{ role: "system", content: system }, ...messages.map((m) => ({ role: m.role, content: m.content }))];
}

// Reshape Groq's OpenAI-compatible response into the { content: [{ type,
// text }] } shape App.jsx's callClaude() already expects from Anthropic's
// API.
function toAnthropicShape(groqData) {
  const text = groqData?.choices?.[0]?.message?.content || "";
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
  // without ever reaching Groq.
  const validationError = validateBody(req.body);
  if (validationError) {
    return res.status(400).json({ error: validationError });
  }

  const quota = getQuotaStatus(claims.label);
  if (quota.exceeded) {
    return res.status(429).json({ error: "Daily quota reached for this access code, please try again tomorrow", quota });
  }

  if (!process.env.GROQ_API_KEY) {
    return res.status(500).json({ error: "Server is missing GROQ_API_KEY", quota });
  }

  try {
    const response = await fetch(GROQ_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: GROQ_MODEL,
        messages: toGroqMessages(req.body.system, req.body.messages),
        max_tokens: Math.min(req.body.max_tokens || MAX_TOKENS_CAP, MAX_TOKENS_CAP),
      }),
    });

    const data = await response.json();
    if (!response.ok) {
      return res.status(response.status).json({ error: data?.error?.message || "Upstream error", quota });
    }
    return res.status(200).json({ ...toAnthropicShape(data), quota });
  } catch (err) {
    return res.status(502).json({ error: "Upstream request failed", quota });
  }
}
