-- Fix: set_cashier_pin and verify_cashier_pin have SET search_path = public,
-- but Supabase installs pgcrypto in the `extensions` schema. This caused
-- gen_salt() and crypt() to be unresolvable, breaking the PIN feature since
-- migration_v6. Zero cashiers had usable PINs in production.
--
-- Fix: extend the search_path to include the extensions schema so pgcrypto
-- functions resolve.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE OR REPLACE FUNCTION set_cashier_pin(p_user_id uuid, p_pin text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
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

-- Same fix for verify_cashier_pin. Function body preserved verbatim from v6.
DROP FUNCTION IF EXISTS verify_cashier_pin(uuid, text);

CREATE FUNCTION verify_cashier_pin(p_cashier_id uuid, p_pin text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_stored_pin   text;
  v_failed       smallint := 0;
  v_locked_until timestamptz;
  v_new_failed   smallint;
BEGIN
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

  SELECT pin INTO v_stored_pin
  FROM   profiles
  WHERE  id = p_cashier_id AND is_active = true AND role = 'cashier';

  IF v_stored_pin IS NULL THEN
    RETURN jsonb_build_object('success', false, 'locked', false, 'attempts_remaining', 5);
  END IF;

  IF crypt(p_pin, v_stored_pin) = v_stored_pin THEN
    DELETE FROM pin_lockouts WHERE cashier_id = p_cashier_id;
    RETURN jsonb_build_object('success', true, 'locked', false);
  END IF;

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
