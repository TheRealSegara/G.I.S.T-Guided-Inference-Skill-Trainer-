-- G.I.S.T. database schema. Run this once in your Supabase project's
-- SQL Editor (Supabase dashboard -> SQL Editor -> New query -> paste
-- this whole file -> Run). Safe to re-run: every statement is
-- idempotent (create ... if not exists).
--
-- Access model: Row Level Security is enabled on every table below with
-- NO policies defined for the anon/authenticated roles, so the anon key
-- (safe to expose) grants zero access to this data. Only the service
-- role key, used exclusively by this app's own server-side API routes
-- (never shipped to the browser), can read or write these tables. All
-- authorization — which teacher can see which students, which student
-- can save to which session — is enforced in application code (api/*),
-- the same custom access-code/token model already used for the rest of
-- this app, not Supabase Auth or RLS policies.

create extension if not exists pgcrypto;

-- One row per student account. Scoped to the access-code label (the
-- teacher/school identity from ACCESS_CODES, see .env.example) rather
-- than a global namespace, so two different schools can each enroll a
-- student with the same name without collision or cross-visibility.
create table if not exists students (
  id uuid primary key default gen_random_uuid(),
  access_code_label text not null,
  full_name text not null,
  full_name_key text not null, -- normalizeName(full_name): lowercased/trimmed/collapsed, the actual lookup key
  secret_hash text not null, -- HMAC-SHA256 of their 3-animal secret sequence, see api/_studentAuth.js
  avatar_config jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  last_login_at timestamptz
);

create unique index if not exists students_access_code_name_key
  on students (access_code_label, full_name_key);

-- One row per passage attempt (from picking a word to the whole-passage
-- comprehension check). diagnostic_report caches the AI-generated
-- summary once a teacher views it in the File Box, so revisiting the
-- same session later doesn't spend AI quota generating it again.
create table if not exists sessions (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references students(id) on delete cascade,
  passage_title text not null,
  passage_emoji text,
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  comprehension_result jsonb,
  diagnostic_report jsonb,
  teacher_notes text
);

create index if not exists sessions_student_id_idx on sessions (student_id);

-- One row per target word attempted within a session. Mirrors the shape
-- of the in-memory `log` entries in src/App.jsx (see handleWordResolved).
create table if not exists session_words (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references sessions(id) on delete cascade,
  word text not null,
  clue_type text,
  concreteness text,
  final_stage int,
  hints_used int,
  skipped boolean not null default false,
  -- Only meaningful when skipped is true: "manual" (student tapped Skip
  -- right away) vs "stuck_limit" (kept trying for STUCK_WORD_LIMIT
  -- exchanges and still couldn't land it) — see skipWord() in src/App.jsx.
  skip_reason text,
  revealed_meaning text,
  prior_knowledge text,
  got_it_via text,
  clue_identified text,
  transfer_passed boolean,
  time_to_answer_sec int,
  fun_fact text,
  solved_at timestamptz not null default now()
);

-- Added after the table already existed in earlier deployments; safe to
-- re-run against a fresh database too (the column is already present from
-- the create table above in that case, so this is a no-op there).
alter table session_words add column if not exists skip_reason text;

create index if not exists session_words_session_id_idx on session_words (session_id);

alter table students enable row level security;
alter table sessions enable row level security;
alter table session_words enable row level security;
