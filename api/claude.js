// Vercel serverless function entry point. The actual proxy logic lives in
// _claudeHandler.js so it can be shared with server.js (used for Cloud
// Run / non-Vercel hosting).
export { default } from "./_claudeHandler.js";
