// Vercel Edge Middleware: rejects clearly-invalid requests to the API
// routes at the edge, before they ever reach the Node serverless
// functions in api/. This saves a function invocation on obvious junk
// traffic and is a cheap first layer in front of the Vercel Firewall
// rate-limit rule (configured in the dashboard, see README).
//
// This only runs on Vercel. server.js (Cloud Run / generic Node hosting)
// has no edge tier, so every api/_*Handler.js still does its own
// method/origin checks — this is defense in depth, not a replacement
// for those. Auth-token verification and Groq/database calls stay in
// the Node functions since they need Node's crypto module and
// GROQ_API_KEY/SUPABASE_SERVICE_ROLE_KEY, neither of which belong at
// the edge.
import { next } from "@vercel/functions";

export const config = {
  matcher: "/api/:path*",
};

// Most routes (claude, auth, student-auth) are POST-only; session.js and
// teacher-roster.js also need GET (teacher reading data) and, for
// session.js, PATCH (caching a generated diagnostic report). Broadened
// here rather than allow-listing per path so a new read-only endpoint
// doesn't need a middleware change too — each handler still enforces its
// own exact allowed method(s) itself, this is just the edge-level floor.
const ALLOWED_METHODS = new Set(["POST", "GET", "PATCH"]);

function getAllowedOrigins() {
  return (process.env.ALLOWED_ORIGINS || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

export default function middleware(request) {
  if (!ALLOWED_METHODS.has(request.method)) {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { "content-type": "application/json", allow: "POST, GET, PATCH" },
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
