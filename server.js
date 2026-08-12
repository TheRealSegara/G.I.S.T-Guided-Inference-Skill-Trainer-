// Standalone Node server for hosting environments that run a container
// rather than deploying serverless functions (e.g. Google AI Studio /
// Cloud Run, which expects a process listening on process.env.PORT).
// Vercel deployments don't use this file at all, they use api/claude.js
// as a serverless function directly.
import express from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";
import claudeHandler from "./api/_claudeHandler.js";
import authHandler from "./api/_authHandler.js";
import studentAuthHandler from "./api/_studentAuthHandler.js";
import sessionHandler from "./api/_sessionHandler.js";
import teacherRosterHandler from "./api/_teacherRosterHandler.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const distDir = path.join(__dirname, "dist");

const app = express();
// Only trust X-Forwarded-For if explicitly told to, and only trust the
// number of hops actually configured. Defaulting to trusting a hop
// unconditionally was verified to let a client bypass both the per-IP
// rate limiter and /api/auth's brute-force guard just by sending a
// fresh X-Forwarded-For value on every request, since Express then
// trusts that header at face value with no real proxy required to be
// there setting it. Safe default here is trusting nothing (falls back
// to the raw socket address, un-spoofable). Set TRUST_PROXY_HOPS to the
// exact number of trusted reverse-proxy hops in front of this process
// (usually 1) only on a host, like Cloud Run, where that's actually
// true and the app isn't otherwise directly reachable.
if (process.env.TRUST_PROXY_HOPS) {
  app.set("trust proxy", Number(process.env.TRUST_PROXY_HOPS));
}
app.use(express.json({ limit: "1mb" }));
// Without this, Express's default error handler returns a raw stack
// trace (including absolute file paths on the server) to the client for
// any body-parsing failure. Vercel's serverless functions don't have
// this problem (the platform parses/rejects bad bodies itself), but
// server.js needs its own handling. Deliberately generic (any body-
// parser error, identified by a sub-500 status code already set by
// body-parser/raw-body) rather than special-casing just SyntaxError:
// an oversized body throws a distinct PayloadTooLargeError (413), not a
// SyntaxError, and was confirmed to leak a full stack trace + absolute
// server file paths before this was broadened to cover it too.
app.use((err, req, res, next) => {
  if (err && typeof err.status === "number" && err.status >= 400 && err.status < 500) {
    const message = err.type === "entity.too.large" ? "Request body too large" : "Invalid request body";
    return res.status(err.status).json({ error: message });
  }
  next(err);
});

// Both handlers are async functions; called bare like this, an exception
// thrown after their first `await` becomes an unhandled promise
// rejection, which crashes this entire process (verified: Node exits
// immediately, taking down every other in-flight request on this
// container, not just the one that errored). This wrapper guarantees any
// unexpected failure — not just the specific ones each handler already
// catches — ends in a clean response instead of an outage.
function withErrorBoundary(handler) {
  return (req, res) => {
    Promise.resolve(handler(req, res)).catch((err) => {
      console.error(err);
      if (!res.headersSent) res.status(500).json({ error: "Internal server error" });
    });
  };
}

app.all("/api/claude", withErrorBoundary(claudeHandler));

app.all("/api/auth", withErrorBoundary(authHandler));

app.all("/api/student-auth", withErrorBoundary(studentAuthHandler));

app.all("/api/session", withErrorBoundary(sessionHandler));

app.all("/api/teacher-roster", withErrorBoundary(teacherRosterHandler));

app.use(express.static(distDir));
app.get("*", (req, res) => {
  res.sendFile(path.join(distDir, "index.html"));
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`G.I.S.T. server listening on port ${port}`);
});
