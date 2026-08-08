// Standalone Node server for hosting environments that run a container
// rather than deploying serverless functions (e.g. Google AI Studio /
// Cloud Run, which expects a process listening on process.env.PORT).
// Vercel deployments don't use this file at all, they use api/claude.js
// as a serverless function directly.
import express from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";
import claudeHandler from "./api/_claudeHandler.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const distDir = path.join(__dirname, "dist");

const app = express();
app.use(express.json({ limit: "1mb" }));

app.all("/api/claude", (req, res) => {
  claudeHandler(req, res);
});

app.use(express.static(distDir));
app.get("*", (req, res) => {
  res.sendFile(path.join(distDir, "index.html"));
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`G.I.S.T. server listening on port ${port}`);
});
