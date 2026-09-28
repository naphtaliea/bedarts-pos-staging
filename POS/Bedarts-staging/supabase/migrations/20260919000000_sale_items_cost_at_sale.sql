-- =============================================================================
-- Migration v8 — cost_at_sale on sale_items for accurate historical COGS
-- =============================================================================
-- Problem: prior COGS calculations used products.cost_price at query time — this
-- is the CURRENT cost, not the historical cost at the moment of sale. When a
-- product's cost price changes over time, historical COGS is distorted.
--
-- Fix: record the actual per-unit cost at the time each sale item was sold,
-- computed as a weighted average of the batches consumed during FEFO deduction.
--
-- Backwards compatibility:
--  - Column is nullable (existing sale_items backfilled with current product
--    cost_price as a best-guess only — the true historical cost is unrecoverable)
--  - App code falls back to product.cost_price when cost_at_sale is NULL
-- =============================================================================

-- 1. Add column ───────────────────────────────────────────────────────────────

ALTER TABLE sale_items
  ADD COLUMN IF NOT EXISTS cost_at_sale numeric(12, 2)
    CHECK (cost_at_sale IS NULL OR cost_at_sale >= 0);

COMMENT ON COLUMN sale_items.cost_at_sale IS
  'Per-unit cost at time of sale (weighted average across FEFO-consumed batches). NULL for very old rows pre-migration.';

-- 2. Backfill existing rows (best-guess: current product cost_price) ─────────

UPDATE sale_items si
SET    cost_at_sale = p.cost_price
FROM   products p
WHERE  si.product_id  = p.id
  AND  si.cost_at_sale IS NULL
  AND  p.cost_price   IS NOT NULL;

-- 3. Rewrite submit_sale_v3 to compute + write cost_at_sale ───────────────────
-- Behaviour unchanged from previous version EXCEPT it now:
--   - Captures the sale_item id after insert
--   - Accumulates (deducted_qty × batch.cost_price) during FEFO
--   - Updates sale_item with weighted-average per-unit cost after FEFO completes

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
  v_sale_id       uuid;
  v_sale_item_id  uuid;
  v_item          jsonb;
  v_pay           jsonb;
  v_remaining     numeric;
  v_deduct        numeric;
  v_batch         record;
  v_qty           numeric;
  v_unit_price    numeric;
  v_item_disc     numeric;
  v_total_cost    numeric;
  v_avg_unit_cost numeric;
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

  -- Sale items + expiry-aware FEFO deduction (with weighted-avg cost capture)
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
    )
    RETURNING id INTO v_sale_item_id;

    -- FEFO: pick batches by nearest expiry (NULLs last), skip fully expired batches
    -- Accumulate the total cost of what we deduct so we can compute weighted-avg
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
      v_deduct     := LEAST(v_remaining, v_batch.quantity_remaining);
      v_total_cost := v_total_cost + (v_deduct * v_batch.cost_price);
      UPDATE stock_batches SET quantity_remaining = quantity_remaining - v_deduct WHERE id = v_batch.id;
      v_remaining  := v_remaining - v_deduct;
    END LOOP;

    IF v_remaining > 0.0005 THEN
      RAISE EXCEPTION 'Insufficient valid (non-expired) stock for product %', v_item->>'product_id';
    END IF;

    -- Compute weighted-average per-unit cost and persist on the sale_item.
    -- Round to 2 decimals to match the numeric(12,2) column and prevent drift.
    IF v_qty > 0 THEN
      v_avg_unit_cost := ROUND(v_total_cost / v_qty, 2);
      UPDATE sale_items SET cost_at_sale = v_avg_unit_cost WHERE id = v_sale_item_id;
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
