// Shared handler for student sign-up and login, used by both
// api/student-auth.js (Vercel) and server.js. Requires a valid teacher-
// level token (issued by /api/auth after a correct access code), so
// student accounts only exist inside an already-unlocked device/session
// and are scoped to that access code's label — two schools can each have
// a student named "Ahmad" without collision, and one school can't see
// another's roster.
//
// The student "password" is a 3-animal secret sequence, not a real
// password: this is a supervised-classroom access gate for tracking
// progress, not a security boundary against a determined attacker. The
// real protections are (1) it's never shown on screen after signup,
// unlike the student's visible coach companion, and (2) the rate limit
// below, not the hash algorithm.

import { verifyToken, signToken } from "./_auth.js";
import { isOriginAllowed, getClientIp, pruneIfLarge, isPlainObjectWithOnlyKeys } from "./_shared.js";
import { getSupabase } from "./_supabase.js";
import { normalizeName, isValidFullName, isValidSecret, isValidAvatarConfig, hashSecret, secretHashesMatch } from "./_studentAuth.js";

const ALLOWED_BODY_KEYS = ["mode", "fullName", "secret", "avatarConfig"];
const TOKEN_TTL_MINUTES = Number(process.env.TOKEN_TTL_MINUTES) || 720;

// Shared with signup and login: a classroom of students authenticating in
// the same minute from the same NAT/IP is normal, so this is generous
// compared to the teacher-code guard, but still stops automated secret
// guessing against a single account.
const MAX_ATTEMPTS = 30;
const ATTEMPT_WINDOW_MS = 60_000;
const attemptLog = new Map();

function isRateLimited(ip) {
  pruneIfLarge(attemptLog, 5000, (e) => Date.now() - e.windowStart > ATTEMPT_WINDOW_MS);
  const now = Date.now();
  const entry = attemptLog.get(ip);
  if (!entry || now - entry.windowStart > ATTEMPT_WINDOW_MS) {
    attemptLog.set(ip, { windowStart: now, count: 1 });
    return false;
  }
  entry.count += 1;
  return entry.count > MAX_ATTEMPTS;
}

// Second, tighter layer against secret brute-forcing, on top of the
// per-IP limiter above: the per-IP counter alone doesn't help against an
// attacker spreading guesses across many IPs at a single student account,
// which matters more here than usual because the secret space is
// intentionally small (3 animals from a fixed set, by design). Keyed by
// access_code_label + normalized name rather than by IP, same best-effort
// in-memory Map pattern as requestLog/quotaLog in _claudeHandler.js (and
// attemptLog above) — not a durable/shared store, but enough to stop an
// automated guesser from just cycling IPs against one name.
const LOGIN_FAIL_MAX = 5;
const LOGIN_LOCKOUT_MS = 60_000;
// How long a per-student entry with no recent failures and no active
// lockout is kept around before pruneIfLarge is allowed to evict it.
const LOGIN_FAIL_IDLE_MS = 5 * 60_000;
const loginFailLog = new Map();

function loginFailKey(label, nameKey) {
  return `${label}::${nameKey}`;
}

function isLoginLocked(key) {
  pruneIfLarge(
    loginFailLog,
    5000,
    (e) => Date.now() > e.lockedUntil && Date.now() - e.lastFailAt > LOGIN_FAIL_IDLE_MS
  );
  const entry = loginFailLog.get(key);
  return !!entry && Date.now() < entry.lockedUntil;
}

function recordLoginFailure(key) {
  const entry = loginFailLog.get(key) || { count: 0, lockedUntil: 0, lastFailAt: 0 };
  entry.count += 1;
  entry.lastFailAt = Date.now();
  if (entry.count >= LOGIN_FAIL_MAX) {
    entry.lockedUntil = Date.now() + LOGIN_LOCKOUT_MS;
    entry.count = 0; // require a fresh run of failures after the cooldown lifts
  }
  loginFailLog.set(key, entry);
}

function clearLoginFailures(key) {
  loginFailLog.delete(key);
}

export default async function studentAuthHandler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }

  if (!isOriginAllowed(req)) {
    return res.status(403).json({ error: "Origin not allowed" });
  }

  const ip = getClientIp(req);
  if (isRateLimited(ip)) {
    return res.status(429).json({ error: "Too many attempts, please wait a minute and try again" });
  }

  const secret = process.env.AUTH_SECRET;
  if (!secret) {
    return res.status(500).json({ error: "Server is missing AUTH_SECRET" });
  }

  const authHeader = req.headers["authorization"] || "";
  const teacherToken = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
  const claims = verifyToken(teacherToken, secret);
  if (!claims || claims.kind === "student") {
    // tokenInvalid distinguishes this from the OTHER 401 this same endpoint
    // returns below (wrong student name/secret animals, line ~199) — both
    // are 401s, but only this one means the caller's own bearer token is
    // actually bad. The client (App.jsx's apiRequest) relies on this flag
    // to decide whether to show "your class session expired, re-enter the
    // code" — it must never fire on a student simply mistyping their
    // secret, which would otherwise look identical (401, teacher token
    // in both cases, since student signup/login always authenticates with
    // the teacher token, not a student token — there isn't one yet).
    return res.status(401).json({ error: "Missing or expired access token", tokenInvalid: true });
  }

  const supabase = getSupabase();
  if (!supabase) {
    return res.status(500).json({ error: "Server is missing SUPABASE_URL/SUPABASE_SERVICE_ROLE_KEY" });
  }

  if (!isPlainObjectWithOnlyKeys(req.body, ALLOWED_BODY_KEYS)) {
    return res.status(400).json({ error: "Missing or unexpected fields in request body" });
  }

  const { mode, fullName, avatarConfig } = req.body;
  if (mode !== "signup" && mode !== "login") {
    return res.status(400).json({ error: "Invalid mode" });
  }
  if (!isValidFullName(fullName)) {
    return res.status(400).json({ error: "Please enter a valid name" });
  }
  if (!isValidSecret(req.body.secret)) {
    return res.status(400).json({ error: "Please pick your 3 secret animals" });
  }

  const nameKey = normalizeName(fullName);
  const secretHash = hashSecret(req.body.secret, secret);

  if (mode === "signup") {
    if (!isValidAvatarConfig(avatarConfig)) {
      return res.status(400).json({ error: "Invalid avatar" });
    }
    const { data: existing, error: lookupError } = await supabase
      .from("students")
      .select("id")
      .eq("access_code_label", claims.label)
      .eq("full_name_key", nameKey)
      .maybeSingle();
    if (lookupError) {
      return res.status(502).json({ error: "Couldn't reach the database, please try again" });
    }
    if (existing) {
      return res.status(409).json({ error: "That name is already registered. Try Returning Student instead." });
    }

    const { data: created, error: insertError } = await supabase
      .from("students")
      .insert({
        access_code_label: claims.label,
        full_name: fullName.trim(),
        full_name_key: nameKey,
        secret_hash: secretHash,
        avatar_config: avatarConfig,
      })
      .select("id, full_name, avatar_config")
      .single();
    if (insertError || !created) {
      return res.status(502).json({ error: "Couldn't create the account, please try again" });
    }

    const exp = Date.now() + TOKEN_TTL_MINUTES * 60_000;
    const token = signToken({ kind: "student", studentId: created.id, label: claims.label, exp }, secret);
    return res.status(200).json({
      token,
      expiresAt: exp,
      student: { id: created.id, fullName: created.full_name, avatarConfig: created.avatar_config },
    });
  }

  // mode === "login"
  const loginKey = loginFailKey(claims.label, nameKey);
  if (isLoginLocked(loginKey)) {
    return res.status(429).json({ error: "Too many failed attempts for this name, please wait a minute and try again" });
  }

  const { data: student, error: lookupError } = await supabase
    .from("students")
    .select("id, full_name, avatar_config, secret_hash")
    .eq("access_code_label", claims.label)
    .eq("full_name_key", nameKey)
    .maybeSingle();
  if (lookupError) {
    return res.status(502).json({ error: "Couldn't reach the database, please try again" });
  }
  // Generic message either way (name not found vs secret mismatch) so a
  // wrong guess can't be used to enumerate which names are registered.
  if (!student || !secretHashesMatch(secretHash, student.secret_hash)) {
    recordLoginFailure(loginKey);
    return res.status(401).json({ error: "Name or secret animals not recognized. Ask your teacher, or sign up as a new student." });
  }
  clearLoginFailures(loginKey);

  await supabase.from("students").update({ last_login_at: new Date().toISOString() }).eq("id", student.id);

  const exp = Date.now() + TOKEN_TTL_MINUTES * 60_000;
  const token = signToken({ kind: "student", studentId: student.id, label: claims.label, exp }, secret);
  return res.status(200).json({
    token,
    expiresAt: exp,
    student: { id: student.id, fullName: student.full_name, avatarConfig: student.avatar_config },
  });
}
