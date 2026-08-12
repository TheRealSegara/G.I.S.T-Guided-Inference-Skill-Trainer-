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
    return res.status(401).json({ error: "Missing or expired access token" });
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
    return res.status(401).json({ error: "Name or secret animals not recognized. Ask your teacher, or sign up as a new student." });
  }

  await supabase.from("students").update({ last_login_at: new Date().toISOString() }).eq("id", student.id);

  const exp = Date.now() + TOKEN_TTL_MINUTES * 60_000;
  const token = signToken({ kind: "student", studentId: student.id, label: claims.label, exp }, secret);
  return res.status(200).json({
    token,
    expiresAt: exp,
    student: { id: student.id, fullName: student.full_name, avatarConfig: student.avatar_config },
  });
}
