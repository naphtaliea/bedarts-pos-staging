import { createClient } from "@supabase/supabase-js";

/**
 * Supabase client for use inside unstable_cache callbacks.
 * Uses the service role key (bypasses RLS) since cached functions
 * run outside the request context and have no user auth cookies.
 * Only use this for shared, non-user-specific read queries.
 */
export function createCacheClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}
