// Vercel serverless function: proxies Claude API calls so the Anthropic
// API key never reaches the browser. See src/App.jsx's callClaude(), which
// is the single point in the frontend that hits this endpoint.

const ANTHROPIC_URL = "https://api.anthropic.com/v1/messages";
const ANTHROPIC_VERSION = "2023-06-01";
const ALLOWED_MODEL = "claude-sonnet-4-6";
const MAX_TOKENS_CAP = 1000;
const MAX_MESSAGES = 40;
const MAX_MESSAGE_CHARS = 8000;
const MAX_SYSTEM_CHARS = 12000;

// Best-effort per-instance rate limit. Serverless instances are short-lived
// and not shared, so this doesn't guarantee a global cap, but it stops a
// single abusive client from hammering a warm instance.
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX_REQUESTS = 20;
const requestLog = new Map();

function getAllowedOrigins() {
  return (process.env.ALLOWED_ORIGINS || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

function isOriginAllowed(req) {
  const allowed = getAllowedOrigins();
  if (allowed.length === 0) return true; // not configured yet: allow (see README)
  const origin = req.headers.origin || "";
  const referer = req.headers.referer || "";
  return allowed.some((a) => origin.startsWith(a) || referer.startsWith(a));
}

function getClientIp(req) {
  const fwd = req.headers["x-forwarded-for"];
  if (typeof fwd === "string" && fwd.length) return fwd.split(",")[0].trim();
  return req.socket?.remoteAddress || "unknown";
}

function isRateLimited(ip) {
  const now = Date.now();
  const entry = requestLog.get(ip);
  if (!entry || now - entry.windowStart > RATE_LIMIT_WINDOW_MS) {
    requestLog.set(ip, { windowStart: now, count: 1 });
    return false;
  }
  entry.count += 1;
  return entry.count > RATE_LIMIT_MAX_REQUESTS;
}

function validateBody(body) {
  if (!body || typeof body !== "object") return "Missing request body";
  if (body.model !== ALLOWED_MODEL) return "Unsupported model";
  if (typeof body.system !== "string" || body.system.length > MAX_SYSTEM_CHARS) return "Invalid system prompt";
  if (!Array.isArray(body.messages) || body.messages.length === 0 || body.messages.length > MAX_MESSAGES) {
    return "Invalid messages";
  }
  for (const m of body.messages) {
    if (!m || (m.role !== "user" && m.role !== "assistant")) return "Invalid message role";
    if (typeof m.content !== "string" || m.content.length > MAX_MESSAGE_CHARS) return "Invalid message content";
  }
  return null;
}

export default async function handler(req, res) {
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

  const validationError = validateBody(req.body);
  if (validationError) {
    return res.status(400).json({ error: validationError });
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return res.status(500).json({ error: "Server is missing ANTHROPIC_API_KEY" });
  }

  try {
    const response = await fetch(ANTHROPIC_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY,
        "anthropic-version": ANTHROPIC_VERSION,
      },
      body: JSON.stringify({
        model: req.body.model,
        max_tokens: Math.min(req.body.max_tokens || MAX_TOKENS_CAP, MAX_TOKENS_CAP),
        system: req.body.system,
        messages: req.body.messages,
      }),
    });

    const data = await response.json();
    return res.status(response.status).json(data);
  } catch (err) {
    return res.status(502).json({ error: "Upstream request failed" });
  }
}
