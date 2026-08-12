// Shared handler backing the teacher's "File Box": the roster of
// students enrolled under this access code, and (given ?studentId=) a
// specific student's list of past sessions. Used by both
// api/teacher-roster.js (Vercel) and server.js.
//
// GET  /api/teacher-roster                -> this teacher's student roster
// GET  /api/teacher-roster?studentId=<id> -> that student's session summaries
//
// studentId is checked against this teacher token's access_code_label
// before use, so a guessed/leaked student UUID from another school's
// roster returns nothing.

import { verifyToken } from "./_auth.js";
import { isOriginAllowed, getClientIp, pruneIfLarge } from "./_shared.js";
import { getSupabase } from "./_supabase.js";

const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX_REQUESTS = 30;
const requestLog = new Map();

function isRateLimited(ip) {
  pruneIfLarge(requestLog, 5000, (e) => Date.now() - e.windowStart > RATE_LIMIT_WINDOW_MS);
  const now = Date.now();
  const entry = requestLog.get(ip);
  if (!entry || now - entry.windowStart > RATE_LIMIT_WINDOW_MS) {
    requestLog.set(ip, { windowStart: now, count: 1 });
    return false;
  }
  entry.count += 1;
  return entry.count > RATE_LIMIT_MAX_REQUESTS;
}

async function fetchRoster(supabase, label, res) {
  const { data: students, error } = await supabase
    .from("students")
    .select("id, full_name, created_at, last_login_at, sessions(id, finished_at)")
    .eq("access_code_label", label)
    .order("full_name", { ascending: true });
  if (error) {
    return res.status(502).json({ error: "Couldn't load the roster, please try again" });
  }
  const roster = students.map((s) => {
    const finishedSessions = (s.sessions || []).filter((sess) => sess.finished_at);
    const lastSessionAt = finishedSessions.reduce(
      (latest, sess) => (!latest || sess.finished_at > latest ? sess.finished_at : latest),
      null
    );
    return {
      id: s.id,
      fullName: s.full_name,
      createdAt: s.created_at,
      lastLoginAt: s.last_login_at,
      sessionCount: finishedSessions.length,
      lastSessionAt,
    };
  });
  return res.status(200).json({ students: roster });
}

async function fetchStudentSessions(supabase, label, studentId, res) {
  const { data: student, error: studentError } = await supabase
    .from("students")
    .select("id, full_name, access_code_label")
    .eq("id", studentId)
    .single();
  if (studentError || !student || student.access_code_label !== label) {
    return res.status(404).json({ error: "Student not found" });
  }

  const { data: sessions, error: sessionsError } = await supabase
    .from("sessions")
    .select("id, passage_title, passage_emoji, started_at, finished_at, comprehension_result, session_words(id)")
    .eq("student_id", studentId)
    .order("started_at", { ascending: false });
  if (sessionsError) {
    return res.status(502).json({ error: "Couldn't load this student's sessions" });
  }

  return res.status(200).json({
    student: { id: student.id, fullName: student.full_name },
    sessions: sessions
      .filter((s) => s.finished_at)
      .map((s) => ({
        id: s.id,
        passageTitle: s.passage_title,
        passageEmoji: s.passage_emoji,
        startedAt: s.started_at,
        finishedAt: s.finished_at,
        wordCount: (s.session_words || []).length,
        comprehensionCorrect: s.comprehension_result?.correct ?? null,
      })),
  });
}

export default async function teacherRosterHandler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "Method not allowed" });
  }

  if (!isOriginAllowed(req)) {
    return res.status(403).json({ error: "Origin not allowed" });
  }

  const ip = getClientIp(req);
  if (isRateLimited(ip)) {
    return res.status(429).json({ error: "Too many requests, please slow down" });
  }

  const secret = process.env.AUTH_SECRET;
  if (!secret) {
    return res.status(500).json({ error: "Server is missing AUTH_SECRET" });
  }

  const authHeader = req.headers["authorization"] || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
  const claims = verifyToken(token, secret);
  if (!claims || claims.kind === "student") {
    return res.status(401).json({ error: "Missing or expired access token" });
  }

  const supabase = getSupabase();
  if (!supabase) {
    return res.status(500).json({ error: "Server is missing SUPABASE_URL/SUPABASE_SERVICE_ROLE_KEY" });
  }

  const studentId = typeof req.query?.studentId === "string" ? req.query.studentId : null;
  if (studentId) {
    return fetchStudentSessions(supabase, claims.label, studentId, res);
  }
  return fetchRoster(supabase, claims.label, res);
}
