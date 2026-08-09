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

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const distDir = path.join(__dirname, "dist");

const app = express();
// Trust exactly one hop (the host's own load balancer/reverse proxy, e.g.
// Cloud Run's) so req.ip resolves the real client IP instead of a raw,
// client-suppliable X-Forwarded-For value. Used as a fallback by
// getClientIp() in api/_shared.js when Vercel's x-real-ip isn't present.
app.set("trust proxy", 1);
app.use(express.json({ limit: "1mb" }));
// Without this, Express's default error handler returns a raw stack
// trace (including absolute file paths on the server) to the client for
// malformed JSON bodies. Vercel's serverless functions don't have this
// problem (the platform parses/rejects bad JSON itself), but server.js
// needs its own handling.
app.use((err, req, res, next) => {
  if (err instanceof SyntaxError && err.status === 400 && "body" in err) {
    return res.status(400).json({ error: "Invalid JSON body" });
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

app.use(express.static(distDir));
app.get("*", (req, res) => {
  res.sendFile(path.join(distDir, "index.html"));
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`G.I.S.T. server listening on port ${port}`);
});
