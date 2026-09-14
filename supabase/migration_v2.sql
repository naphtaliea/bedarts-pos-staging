-- ============================================================
-- Bedarts Cold Supplies — Migration v2
-- Features: PIN login, box/package pricing, tax settings
-- Run once in Supabase SQL Editor
-- ============================================================

-- ── 1. profiles: PIN column ───────────────────────────────────────────────────
-- Stores the 4-digit cashier PIN (plain text — short, internal, low-risk).
-- NULL means no PIN set; admin/manager accounts never need one.

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS pin text;

-- ── 2. store_settings: tax fields ────────────────────────────────────────────

ALTER TABLE store_settings
  ADD COLUMN IF NOT EXISTS tax_rate    numeric(5, 2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS tax_enabled boolean       NOT NULL DEFAULT false;

-- ── 3. product_packages table ─────────────────────────────────────────────────
-- Fixed-quantity box/package options for a product (e.g. "Pack of 6 @ GH₵ 50").
-- POS shows a picker modal; quantity added to cart = package.quantity base units.

CREATE TABLE IF NOT EXISTS product_packages (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id  uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  label       text NOT NULL,
  quantity    numeric(12, 3) NOT NULL CHECK (quantity > 0),
  price       numeric(12, 2) NOT NULL CHECK (price >= 0),
  created_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE product_packages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "authenticated_read_packages" ON product_packages
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "admins_managers_manage_packages" ON product_packages
  FOR ALL TO authenticated
  USING  (get_user_role() IN ('admin', 'manager'))
  WITH CHECK (get_user_role() IN ('admin', 'manager'));

-- ── 4. verify_cashier_pin RPC ─────────────────────────────────────────────────
-- SECURITY DEFINER so callers never read the raw pin column directly.
-- Returns true only if the profile is active, is a cashier, and pin matches.

CREATE OR REPLACE FUNCTION verify_cashier_pin(p_cashier_id uuid, p_pin text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_stored_pin text;
BEGIN
  SELECT pin INTO v_stored_pin
  FROM profiles
  WHERE id        = p_cashier_id
    AND is_active = true
    AND role      = 'cashier';

  IF v_stored_pin IS NULL THEN
    RETURN false;
  END IF;

  RETURN v_stored_pin = p_pin;
END;
$$;

REVOKE ALL  ON FUNCTION verify_cashier_pin(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION verify_cashier_pin(uuid, text) TO authenticated;

-- ── 5. deduct_batch_stock RPC ─────────────────────────────────────────────────
-- Atomic FEFO batch deduction called from submitSale server action.
-- SECURITY DEFINER lets the server action update stock_batches even though
-- the authenticated role may be a cashier with limited table permissions.

CREATE OR REPLACE FUNCTION deduct_batch_stock(p_batch_id uuid, p_deduct numeric)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE stock_batches
  SET quantity_remaining = quantity_remaining - p_deduct
  WHERE id = p_batch_id
    AND quantity_remaining >= p_deduct;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Insufficient stock in batch %', p_batch_id;
  END IF;
END;
$$;

REVOKE ALL  ON FUNCTION deduct_batch_stock(uuid, numeric) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION deduct_batch_stock(uuid, numeric) TO authenticated;

-- ── 6. Fix sale INSERT policy for PIN sessions ────────────────────────────────
-- Problem: the old policy required cashier_id = auth.uid().
-- With PIN login, auth.uid() is the admin/owner account, but cashier_id is the
-- cashier's profile UUID stored in the httpOnly cookie.
-- Fix: admin and manager can INSERT a sale with any cashier_id.

DROP POLICY IF EXISTS "cashiers_create_sales" ON sales;

CREATE POLICY "cashiers_create_sales" ON sales
  FOR INSERT TO authenticated
  WITH CHECK (
    cashier_id = auth.uid()
    OR get_user_role() IN ('admin', 'manager')
  );
