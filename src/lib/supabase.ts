import { createClient } from "@supabase/supabase-js";

/**
 * Server-only Supabase client, using the service role key.
 *
 * IMPORTANT: this file must never be imported from a Client Component or
 * anything that ships to the browser — the service role key bypasses Row
 * Level Security entirely. It's only ever used inside API routes / the cron
 * job, which already sit behind our own passcode-session middleware.
 *
 * (See README "Why polling instead of Supabase Realtime" for why the browser
 * never talks to Supabase directly in this app.)
 */
export function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set"
    );
  }
  return createClient(url, key, {
    auth: { persistSession: false },
  });
}
