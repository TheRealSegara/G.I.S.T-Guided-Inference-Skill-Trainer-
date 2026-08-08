// Vercel serverless function entry point. The actual logic lives in
// _authHandler.js so it can be shared with server.js (used for Cloud Run
// / non-Vercel hosting), same pattern as claude.js / _claudeHandler.js.
export { default } from "./_authHandler.js";
