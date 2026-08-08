// Vercel serverless function: proxies AI calls so the API key never
// reaches the browser. See src/App.jsx's callClaude(), which is the single
// point in the frontend that hits this endpoint.
//
// Internally this calls Google's Gemini API (free tier) rather than
// Anthropic's, but translates the request/response to the same shape
// Anthropic's Messages API uses, so callClaude() in App.jsx needs no
// changes: { content: [{ type: "text", text: "..." }] }.

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
