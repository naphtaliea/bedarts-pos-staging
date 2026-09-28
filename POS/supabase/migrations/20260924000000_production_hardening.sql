-- Production hardening migration
-- 1. Fix product_stock view to exclude expired batches
-- 2. Add server-side p_total validation to submit_sale_v3
-- 3. Restrict stock_adjustments RLS from FOR ALL to SELECT + INSERT
-- 4. Drop obsolete void_sale() function (superseded by app/(dashboard)/refunds/actions.ts)

BEGIN;

-- ─── 1. product_stock view: exclude expired batches ──────────────────────────
DROP VIEW IF EXISTS product_stock;
CREATE VIEW product_stock AS
  SELECT
    p.id,
    p.name,
    p.category_id,
    p.unit,
    p.units_per_box,
    p.selling_price,
    p.wholesale_price,
    p.cost_price,
    p.low_stock_threshold,
    p.is_active,
    p.image_url,
    p.created_at,
    COALESCE(SUM(
      CASE
        WHEN sb.expiry_date IS NULL OR sb.expiry_date >= CURRENT_DATE
        THEN sb.quantity_remaining
        ELSE 0
      END
    ), 0) AS stock_quantity
  FROM products p
  LEFT JOIN stock_batches sb ON sb.product_id = p.id
  GROUP BY p.id;

-- ─── 2. submit_sale_v3: server-side p_total validation ───────────────────────
-- Guards against tampered clients submitting inflated/deflated totals.
-- The server recomputes the expected total from item quantities, unit prices, and
-- item-level discounts, then asserts p_total matches within 0.01 GHC tolerance.
CREATE OR REPLACE FUNCTION submit_sale_v3(
  p_cashier_id  uuid,
  p_customer_id uuid,
  p_subtotal    numeric,
  p_discount    numeric,
  p_total       numeric,
  p_items       jsonb,
  p_payments    jsonb
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_sale_id           uuid;
  v_sale_item_id      uuid;
  v_item              jsonb;
  v_payment           jsonb;
  v_batch             record;
  v_qty               numeric;
  v_unit_price        numeric;
  v_item_disc         numeric;
  v_remaining         numeric;
  v_deduct            numeric;
  v_total_cost        numeric;
  v_avg_unit_cost     numeric;
  v_expected_subtotal numeric := 0;
  v_expected_total    numeric;
  v_computed_line     numeric;
BEGIN
  -- ─── SERVER-SIDE TOTAL VALIDATION ──────────────────────────────────────────
  -- Recompute expected subtotal from items; reject if client-submitted values diverge
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    v_qty        := (v_item->>'quantity')::numeric;
    v_unit_price := (v_item->>'unit_price')::numeric;
    v_item_disc  := COALESCE((v_item->>'discount_amount')::numeric, 0);
    v_computed_line := GREATEST(0, v_qty * v_unit_price - v_item_disc);
    v_expected_subtotal := v_expected_subtotal + v_computed_line;
  END LOOP;

  v_expected_total := GREATEST(0, v_expected_subtotal - COALESCE(p_discount, 0));

  IF ABS(COALESCE(p_subtotal, 0) - v_expected_subtotal) > 0.01 THEN
    RAISE EXCEPTION 'Subtotal mismatch: client=% server=%', p_subtotal, v_expected_subtotal;
  END IF;

  IF ABS(COALESCE(p_total, 0) - v_expected_total) > 0.01 THEN
    RAISE EXCEPTION 'Total mismatch: client=% server=%', p_total, v_expected_total;
  END IF;

  -- ─── INSERT SALE ───────────────────────────────────────────────────────────
  INSERT INTO sales (cashier_id, customer_id, subtotal, discount_amount, total_amount, status)
  VALUES (p_cashier_id, p_customer_id, p_subtotal, p_discount, p_total, 'completed')
  RETURNING id INTO v_sale_id;

  -- ─── INSERT ITEMS + FEFO DEDUCTION ─────────────────────────────────────────
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    v_qty        := (v_item->>'quantity')::numeric;
    v_unit_price := (v_item->>'unit_price')::numeric;
    v_item_disc  := COALESCE((v_item->>'discount_amount')::numeric, 0);

    INSERT INTO sale_items (sale_id, product_id, quantity, unit_price, discount_amount, total_price, package_label)
    VALUES (
      v_sale_id,
      (v_item->>'product_id')::uuid,
      v_qty,
      v_unit_price,
      v_item_disc,
      GREATEST(0, v_qty * v_unit_price - v_item_disc),
      NULLIF(btrim(COALESCE(v_item->>'package_label', '')), '')
    )
    RETURNING id INTO v_sale_item_id;

    v_remaining  := v_qty;
    v_total_cost := 0;

    FOR v_batch IN
      SELECT id, quantity_remaining, cost_price
      FROM   stock_batches
      WHERE  product_id         = (v_item->>'product_id')::uuid
        AND  quantity_remaining > 0
        AND  (expiry_date IS NULL OR expiry_date >= CURRENT_DATE)
      ORDER  BY expiry_date ASC NULLS LAST, received_date ASC
      FOR UPDATE
    LOOP
      EXIT WHEN v_remaining <= 0;
      v_deduct := LEAST(v_remaining, v_batch.quantity_remaining);
      UPDATE stock_batches
      SET quantity_remaining = quantity_remaining - v_deduct
      WHERE id = v_batch.id;
      v_total_cost := v_total_cost + (v_deduct * v_batch.cost_price);
      v_remaining  := v_remaining - v_deduct;
    END LOOP;

    IF v_remaining > 0.0005 THEN
      RAISE EXCEPTION 'Insufficient valid (non-expired) stock for product %', v_item->>'product_id';
    END IF;

    v_avg_unit_cost := ROUND(v_total_cost / v_qty, 2);
    UPDATE sale_items SET cost_at_sale = v_avg_unit_cost WHERE id = v_sale_item_id;
  END LOOP;

  -- ─── INSERT PAYMENTS ───────────────────────────────────────────────────────
  FOR v_payment IN SELECT * FROM jsonb_array_elements(p_payments)
  LOOP
    INSERT INTO payments (sale_id, method, amount, reference)
    VALUES (
      v_sale_id,
      (v_payment->>'method')::text,
      (v_payment->>'amount')::numeric,
      NULLIF(btrim(COALESCE(v_payment->>'reference', '')), '')
    );
  END LOOP;

  RETURN v_sale_id;
END;
$$;

REVOKE ALL ON FUNCTION submit_sale_v3(uuid,uuid,numeric,numeric,numeric,jsonb,jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION submit_sale_v3(uuid,uuid,numeric,numeric,numeric,jsonb,jsonb) TO authenticated;

-- ─── 3. stock_adjustments RLS: split FOR ALL into SELECT + INSERT ────────────
DROP POLICY IF EXISTS "stock_adjustments_all" ON stock_adjustments;
DROP POLICY IF EXISTS "stock_adjustments_manage" ON stock_adjustments;
DROP POLICY IF EXISTS "stock_adjustments admin" ON stock_adjustments;

CREATE POLICY "stock_adjustments_select" ON stock_adjustments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role IN ('admin', 'manager', 'accountant')
    )
  );

CREATE POLICY "stock_adjustments_insert" ON stock_adjustments
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role IN ('admin', 'manager')
    )
  );

-- Explicitly deny UPDATE and DELETE — no policy means denied under RLS

-- ─── 4. Drop obsolete void_sale() DB function ────────────────────────────────
-- Superseded by app/(dashboard)/refunds/actions.ts voidSale() which correctly
-- creates a correction stock_batch instead of restoring to the oldest batch.
DROP FUNCTION IF EXISTS void_sale(uuid, text);
DROP FUNCTION IF EXISTS void_sale(uuid, text, uuid);

COMMIT;
