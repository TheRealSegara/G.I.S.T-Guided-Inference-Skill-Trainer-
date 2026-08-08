// Short-lived, signed access token helpers shared by _authHandler.js
// (issues tokens) and _claudeHandler.js (verifies them). HMAC-SHA256
// over Node's built-in crypto module, no JWT library needed since the
// payload shape is fixed and tiny.

import crypto from "node:crypto";

function sign(body, secret) {
  return crypto.createHmac("sha256", secret).update(body).digest("base64url");
}

export function signToken(payload, secret) {
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${body}.${sign(body, secret)}`;
}

export function verifyToken(token, secret) {
  if (typeof token !== "string" || !secret) return null;
  const parts = token.split(".");
  if (parts.length !== 2) return null;
  const [body, sig] = parts;

  const expectedSig = sign(body, secret);
  const sigBuf = Buffer.from(sig);
  const expectedBuf = Buffer.from(expectedSig);
  if (sigBuf.length !== expectedBuf.length || !crypto.timingSafeEqual(sigBuf, expectedBuf)) {
    return null;
  }

  let payload;
  try {
    payload = JSON.parse(Buffer.from(body, "base64url").toString());
  } catch (e) {
    return null;
  }
  if (!payload || typeof payload.exp !== "number" || payload.exp < Date.now()) return null;
  return payload;
}
