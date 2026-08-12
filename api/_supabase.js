// Supabase client, server-side only. Uses the service role key, which
// bypasses Row Level Security entirely, so this module must never be
// imported by anything that ships to the browser (only api/*.js and
// server.js). RLS is enabled with no policies on every table (see
// supabase/schema.sql), so the anon key alone grants nothing — all
// authorization happens in our own handlers, the same custom
// access-code/token model already used for /api/claude and /api/auth,
// not Supabase Auth.
import { createClient } from "@supabase/supabase-js";

let client;

export function getSupabase() {
  if (client) return client;
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  client = createClient(url, key, { auth: { persistSession: false } });
  return client;
}
