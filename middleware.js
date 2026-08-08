// Vercel Edge Middleware: rejects clearly-invalid requests to the API
// routes at the edge, before they ever reach the Node serverless
// functions in api/. This saves a function invocation on obvious junk
// traffic and is a cheap first layer in front of the Vercel Firewall
// rate-limit rule (configured in the dashboard, see README).
//
// This only runs on Vercel. server.js (Cloud Run / generic Node hosting)
// has no edge tier, so api/_claudeHandler.js and api/_authHandler.js
// still do their own method/origin checks — this is defense in depth,
// not a replacement for those. Auth-token verification and Gemini calls
// stay in the Node functions since they need Node's crypto module and
// GEMINI_API_KEY, neither of which belong at the edge.
import { next } from "@vercel/functions";

export const config = {
  matcher: "/api/:path*",
};

function getAllowedOrigins() {
  return (process.env.ALLOWED_ORIGINS || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

export default function middleware(request) {
  if (request.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { "content-type": "application/json", allow: "POST" },
    });
  }

  const allowed = getAllowedOrigins();
  if (allowed.length > 0) {
    const origin = request.headers.get("origin") || "";
    const referer = request.headers.get("referer") || "";
    const isAllowed = allowed.some((a) => origin.startsWith(a) || referer.startsWith(a));
    if (!isAllowed) {
      return new Response(JSON.stringify({ error: "Origin not allowed" }), {
        status: 403,
        headers: { "content-type": "application/json" },
      });
    }
  }

  return next();
}
