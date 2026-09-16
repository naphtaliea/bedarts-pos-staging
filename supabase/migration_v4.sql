-- ─────────────────────────────────────────────────────────────────────────────
-- Migration v4 — Fix handle_new_user trigger
--
-- Problem: The trigger fires inside GoTrue's INSERT on auth.users. That context
-- is unauthenticated, so the RLS policy "admins_manage_profiles" (FOR ALL TO
-- authenticated) has no applicable rule — by default RLS blocks everything.
-- The INSERT into profiles fails, rolls back the auth.users INSERT, and GoTrue
-- reports "Database error saving new user".
--
-- Fix 1: SET row_security = off so the SECURITY DEFINER function can bypass RLS
--         in the background (auth) context.
-- Fix 2: ON CONFLICT (id) DO NOTHING so a re-invite of an existing user doesn't
--         throw a duplicate-key exception.
-- Fix 3: Explicitly include is_active = true (was relying on DEFAULT, fine but
--         explicit is clearer).
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO profiles (id, full_name, role, is_active)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    COALESCE(NEW.raw_user_meta_data->>'role', 'cashier'),
    true
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET row_security = off;

-- Re-create the trigger to pick up the new function definition
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();
