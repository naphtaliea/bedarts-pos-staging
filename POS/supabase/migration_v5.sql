-- ─────────────────────────────────────────────────────────────────────────────
-- Migration v5 — Fix handle_new_user search_path
--
-- Root cause: supabase_auth_admin has `search_path=auth` as its default role
-- config. SECURITY DEFINER functions inherit the CALLER's search_path when
-- no explicit search_path GUC is set in the function definition. So when
-- GoTrue (running as supabase_auth_admin) triggers handle_new_user, the
-- function can't find `profiles` — it only looks in the `auth` schema.
--
-- Fix: pin search_path = public, auth and use the schema-qualified name
-- public.profiles. This makes the trigger work regardless of what search_path
-- the calling session has.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, role, is_active)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    COALESCE(NEW.raw_user_meta_data->>'role', 'cashier'),
    true
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
   SET row_security = off
   SET search_path = public, auth;
