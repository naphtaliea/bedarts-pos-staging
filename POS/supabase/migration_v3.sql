-- ============================================================
-- Bedarts Cold Supplies — Migration v3
-- Gaps: wholesale pricing, customer credit/account, weight UoM,
--       GRA VAT number, waste/shrinkage adjustment types,
--       expired-batch FEFO guard, cashier reconciliation
-- Run once in Supabase SQL Editor
-- ============================================================

-- ── 1. customers: price group ─────────────────────────────────────────────────
ALTER TABLE customers
  ADD COLUMN IF NOT EXISTS price_group text NOT NULL DEFAULT 'retail'
    CHECK (price_group IN ('retail', 'wholesale', 'distributor'));

-- ── 2. products: wholesale price ──────────────────────────────────────────────
ALTER TABLE products
  ADD COLUMN IF NOT EXISTS wholesale_price numeric(12, 2);

-- ── 3. store_settings: VAT / GRA number ──────────────────────────────────────
ALTER TABLE store_settings
  ADD COLUMN IF NOT EXISTS vat_number text;

-- ── 4. payments: allow 'account' method (sell on account) ────────────────────
ALTER TABLE payments
  DROP CONSTRAINT IF EXISTS payments_method_check;

ALTER TABLE payments
  ADD CONSTRAINT payments_method_check
    CHECK (method IN ('cash', 'momo', 'pos_machine', 'account'));

-- ── 5. stock_adjustments: richer reason taxonomy ─────────────────────────────
ALTER TABLE stock_adjustments
  DROP CONSTRAINT IF EXISTS stock_adjustments_reason_check;

ALTER TABLE stock_adjustments
  ADD CONSTRAINT stock_adjustments_reason_check
    CHECK (reason IN ('write_off','correction','return','waste','theft','damaged','found'));

-- ── 6. cashier_reconciliations table ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS cashier_reconciliations (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cashier_id      uuid NOT NULL REFERENCES profiles(id),
  shift_date      date NOT NULL DEFAULT CURRENT_DATE,
  opening_float   numeric(12, 2) NOT NULL DEFAULT 0,
  cash_counted    numeric(12, 2),
  cash_expected   numeric(12, 2),
  cash_variance   numeric(12, 2),
  momo_total      numeric(12, 2) NOT NULL DEFAULT 0,
  pos_total       numeric(12, 2) NOT NULL DEFAULT 0,
  account_total   numeric(12, 2) NOT NULL DEFAULT 0,
  gross_sales     numeric(12, 2) NOT NULL DEFAULT 0,
  notes           text,
  created_at      timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE cashier_reconciliations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "cashiers_manage_own_recon" ON cashier_reconciliations
  FOR ALL TO authenticated
  USING  (cashier_id = auth.uid() OR get_user_role() IN ('admin', 'manager'))
  WITH CHECK (cashier_id = auth.uid() OR get_user_role() IN ('admin', 'manager'));

-- ── 7. update submitSale to handle 'account' payment + expiry-aware FEFO ─────
-- Drop old version if exists, then recreate with full logic.

CREATE OR REPLACE FUNCTION submit_sale_v3(
  p_cashier_id  uuid,
  p_customer_id uuid,
  p_subtotal    numeric,
  p_discount    numeric,
  p_total       numeric,
  p_items       jsonb,
  p_payments    jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_sale_id   uuid;
  v_item      jsonb;
  v_pay       jsonb;
  v_remaining numeric;
  v_deduct    numeric;
  v_batch     record;
  v_qty       numeric;
  v_unit_price numeric;
  v_item_disc  numeric;
  v_account_total numeric := 0;
BEGIN
  -- Insert sale
  INSERT INTO sales (
    cashier_id, customer_id, subtotal, discount_amount, total_amount, status
  )
  VALUES (
    p_cashier_id, p_customer_id, p_subtotal, p_discount, p_total, 'completed'
  )
  RETURNING id INTO v_sale_id;

  -- Sale items + expiry-aware FEFO deduction
  FOR v_item IN SELECT value FROM jsonb_array_elements(p_items) t(value)
  LOOP
    v_qty        := (v_item->>'quantity')::numeric;
    v_unit_price := (v_item->>'unit_price')::numeric;
    v_item_disc  := COALESCE((v_item->>'discount_amount')::numeric, 0);

    INSERT INTO sale_items (sale_id, product_id, quantity, unit_price, discount_amount, total_price)
    VALUES (
      v_sale_id,
      (v_item->>'product_id')::uuid,
      v_qty,
      v_unit_price,
      v_item_disc,
      GREATEST(0, v_qty * v_unit_price - v_item_disc)
    );

    -- FEFO: pick batches by nearest expiry (NULLs last), skip fully expired batches
    v_remaining := v_qty;
    FOR v_batch IN
      SELECT id, quantity_remaining
      FROM   stock_batches
      WHERE  product_id         = (v_item->>'product_id')::uuid
        AND  quantity_remaining > 0
        AND  (expiry_date IS NULL OR expiry_date >= CURRENT_DATE)
      ORDER  BY expiry_date ASC NULLS LAST, received_date ASC
      FOR UPDATE
    LOOP
      EXIT WHEN v_remaining <= 0;
      v_deduct := LEAST(v_remaining, v_batch.quantity_remaining);
      UPDATE stock_batches SET quantity_remaining = quantity_remaining - v_deduct WHERE id = v_batch.id;
      v_remaining := v_remaining - v_deduct;
    END LOOP;

    IF v_remaining > 0.0005 THEN
      RAISE EXCEPTION 'Insufficient valid (non-expired) stock for product %', v_item->>'product_id';
    END IF;
  END LOOP;

  -- Payments (including 'account')
  FOR v_pay IN SELECT value FROM jsonb_array_elements(p_payments) t(value)
  LOOP
    INSERT INTO payments (sale_id, method, amount, reference)
    VALUES (
      v_sale_id,
      v_pay->>'method',
      (v_pay->>'amount')::numeric,
      NULLIF(btrim(COALESCE(v_pay->>'reference', '')), '')
    );
    IF v_pay->>'method' = 'account' THEN
      v_account_total := v_account_total + (v_pay->>'amount')::numeric;
    END IF;
  END LOOP;

  -- If any amount charged to account, increase customer credit_balance
  IF v_account_total > 0 AND p_customer_id IS NOT NULL THEN
    UPDATE customers
    SET credit_balance = credit_balance + v_account_total
    WHERE id = p_customer_id;
  END IF;

  RETURN v_sale_id;
END;
$$;

REVOKE ALL ON FUNCTION submit_sale_v3(uuid,uuid,numeric,numeric,numeric,jsonb,jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION submit_sale_v3(uuid,uuid,numeric,numeric,numeric,jsonb,jsonb) TO authenticated;

-- ── 8. customer payment (reduce credit_balance) ───────────────────────────────
CREATE OR REPLACE FUNCTION record_customer_payment(
  p_customer_id uuid,
  p_amount      numeric,
  p_notes       text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF get_user_role() NOT IN ('admin', 'manager') THEN
    RAISE EXCEPTION 'Not allowed';
  END IF;
  UPDATE customers
  SET credit_balance = GREATEST(0, credit_balance - p_amount)
  WHERE id = p_customer_id;
END;
$$;

REVOKE ALL ON FUNCTION record_customer_payment(uuid, numeric, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION record_customer_payment(uuid, numeric, text) TO authenticated;
