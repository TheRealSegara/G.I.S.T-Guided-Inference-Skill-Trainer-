// Vercel serverless function entry point. Logic lives in
// _sessionHandler.js so it can be shared with server.js, same pattern
// as claude.js / _claudeHandler.js.
export { default } from "./_sessionHandler.js";
