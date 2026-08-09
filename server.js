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

app.all("/api/claude", (req, res) => {
  claudeHandler(req, res);
});

app.all("/api/auth", (req, res) => {
  authHandler(req, res);
});

app.use(express.static(distDir));
app.get("*", (req, res) => {
  res.sendFile(path.join(distDir, "index.html"));
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`G.I.S.T. server listening on port ${port}`);
});
