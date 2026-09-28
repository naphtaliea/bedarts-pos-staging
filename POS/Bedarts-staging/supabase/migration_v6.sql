-- ─────────────────────────────────────────────────────────────────────────────
-- Migration v6 — PIN security, role guards, price history
--
-- Changes:
--   1. Enable pgcrypto (bcrypt hashing for PINs)
--   2. pin_lockouts table — tracks failed attempts per cashier
--   3. Hash all existing plain-text PINs in profiles
--   4. set_cashier_pin RPC — stores bcrypt hash, never plain text
--   5. verify_cashier_pin — now uses crypt() comparison + lockout logic
--      (return type changes boolean → jsonb; old function is dropped first)
--   6. price_history table — append-only audit log for selling_price changes
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. pgcrypto ─────────────────────────────────────────────────────────────────

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 2. pin_lockouts ──────────────────────────────────────────────────────────────
-- Tracks failed PIN attempts per cashier. The verify_cashier_pin function
-- (SECURITY DEFINER) is the only writer; no direct access is granted.

CREATE TABLE IF NOT EXISTS pin_lockouts (
  cashier_id      UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  failed_attempts SMALLINT NOT NULL DEFAULT 0,
  locked_until    TIMESTAMPTZ,
  updated_at      TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE pin_lockouts ENABLE ROW LEVEL SECURITY;

-- Restrictive policy: no authenticated user can read or write directly.
-- The SECURITY DEFINER function bypasses RLS.
CREATE POLICY "no_direct_access" ON pin_lockouts
  AS RESTRICTIVE TO authenticated USING (false) WITH CHECK (false);

-- 3. Hash existing plain-text PINs ────────────────────────────────────────────
-- Safe to run multiple times: crypt() output always starts with '$2a$' or '$2b$'
-- so already-hashed values will be detected and skipped.

UPDATE profiles
SET pin = crypt(pin, gen_salt('bf', 8))
WHERE pin IS NOT NULL
  AND pin NOT LIKE '$2%';

-- 4. set_cashier_pin RPC ───────────────────────────────────────────────────────
-- Called from the settings server action instead of a direct UPDATE.
-- Ensures the raw PIN never leaves PostgreSQL unencrypted.

CREATE OR REPLACE FUNCTION set_cashier_pin(p_user_id uuid, p_pin text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE profiles
  SET pin = crypt(p_pin, gen_salt('bf', 8))
  WHERE id = p_user_id;
END;
$$;

REVOKE ALL ON FUNCTION set_cashier_pin(uuid, text) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION set_cashier_pin(uuid, text) TO authenticated;
GRANT  EXECUTE ON FUNCTION set_cashier_pin(uuid, text) TO service_role;

-- 5. verify_cashier_pin ────────────────────────────────────────────────────────
-- Return type changes from boolean to jsonb — drop first (can't OR REPLACE
-- a function with a different return type in PostgreSQL).
--
-- Return shape:
--   { success: true }
--   { success: false, locked: false, attempts_remaining: N }
--   { success: false, locked: true,  locked_until: "<ISO timestamp>" }
--
-- Policy: 5 failures → 15-minute lockout. Counter resets on success.

DROP FUNCTION IF EXISTS verify_cashier_pin(uuid, text);

CREATE FUNCTION verify_cashier_pin(p_cashier_id uuid, p_pin text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_stored_pin   text;
  v_failed       smallint := 0;
  v_locked_until timestamptz;
  v_new_failed   smallint;
BEGIN
  -- Check current lockout state
  SELECT failed_attempts, locked_until
  INTO   v_failed, v_locked_until
  FROM   pin_lockouts
  WHERE  cashier_id = p_cashier_id;

  IF v_locked_until IS NOT NULL AND v_locked_until > now() THEN
    RETURN jsonb_build_object(
      'success',      false,
      'locked',       true,
      'locked_until', v_locked_until
    );
  END IF;

  -- Fetch stored bcrypt hash
  SELECT pin INTO v_stored_pin
  FROM   profiles
  WHERE  id = p_cashier_id AND is_active = true AND role = 'cashier';

  IF v_stored_pin IS NULL THEN
    RETURN jsonb_build_object('success', false, 'locked', false, 'attempts_remaining', 5);
  END IF;

  -- Constant-time bcrypt comparison via pgcrypto
  IF crypt(p_pin, v_stored_pin) = v_stored_pin THEN
    DELETE FROM pin_lockouts WHERE cashier_id = p_cashier_id;
    RETURN jsonb_build_object('success', true, 'locked', false);
  END IF;

  -- Wrong PIN — increment counter
  INSERT INTO pin_lockouts (cashier_id, failed_attempts, locked_until, updated_at)
  VALUES (
    p_cashier_id,
    1,
    CASE WHEN 1 >= 5 THEN now() + interval '15 minutes' ELSE NULL END,
    now()
  )
  ON CONFLICT (cashier_id) DO UPDATE SET
    failed_attempts = pin_lockouts.failed_attempts + 1,
    locked_until    = CASE
                        WHEN pin_lockouts.failed_attempts + 1 >= 5
                        THEN now() + interval '15 minutes'
                        ELSE pin_lockouts.locked_until
                      END,
    updated_at      = now();

  SELECT failed_attempts INTO v_new_failed
  FROM   pin_lockouts
  WHERE  cashier_id = p_cashier_id;

  RETURN jsonb_build_object(
    'success',           false,
    'locked',            v_new_failed >= 5,
    'locked_until',      CASE WHEN v_new_failed >= 5
                              THEN now() + interval '15 minutes'
                              ELSE NULL END,
    'attempts_remaining', GREATEST(0, 5 - v_new_failed)
  );
END;
$$;

REVOKE ALL ON FUNCTION verify_cashier_pin(uuid, text) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION verify_cashier_pin(uuid, text) TO authenticated;
GRANT  EXECUTE ON FUNCTION verify_cashier_pin(uuid, text) TO service_role;

-- 6. price_history ─────────────────────────────────────────────────────────────
-- Append-only audit log written by the server whenever selling_price changes.
-- No UPDATE or DELETE policies — records cannot be modified after creation.

CREATE TABLE IF NOT EXISTS price_history (
  id          UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id  UUID          NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  old_price   NUMERIC(10,2) NOT NULL,
  new_price   NUMERIC(10,2) NOT NULL,
  changed_by  UUID          REFERENCES profiles(id),
  changed_at  TIMESTAMPTZ   NOT NULL DEFAULT now(),
  notes       TEXT
);

ALTER TABLE price_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "managers_and_admins_read_price_history"
  ON price_history FOR SELECT TO authenticated
  USING (get_user_role() IN ('admin', 'manager'));

CREATE POLICY "managers_and_admins_insert_price_history"
  ON price_history FOR INSERT TO authenticated
  WITH CHECK (get_user_role() IN ('admin', 'manager'));
