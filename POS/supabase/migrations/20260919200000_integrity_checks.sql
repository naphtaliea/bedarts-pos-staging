-- =============================================================================
-- Migration: Integrity Check System
-- =============================================================================
-- Provides a scheduled audit of all financial calculations. Catches anomalies
-- that can arise from bugs, manual DB edits, or race conditions — before they
-- compound into hard-to-trace accounting errors.
--
-- Checks implemented:
--   1. sale_total_mismatch        — total_amount ≠ subtotal − discount
--   2. sale_item_total_mismatch   — line total ≠ qty × price − discount
--   3. sale_payment_mismatch      — payments collected ≠ sale total
--   4. negative_cost_at_sale      — cost_at_sale < 0
--   5. negative_stock_quantity    — quantity_remaining < 0
--   6. invalid_expense_amount     — active expense amount ≤ 0
--   7. duplicate_reconciliation   — multiple till counts for same cashier+date
-- =============================================================================

-- ── 1. Results table ──────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS integrity_check_results (
  id            bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  run_id        timestamptz NOT NULL,           -- groups all rows from one run
  check_name    text NOT NULL,
  severity      text NOT NULL CHECK (severity IN ('ok', 'warning', 'error')),
  anomaly_count integer NOT NULL DEFAULT 0,
  sample_ids    text[] NULL,                    -- up to 5 affected row IDs
  description   text NOT NULL,
  checked_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_integrity_run_id
  ON integrity_check_results (run_id DESC);

COMMENT ON TABLE integrity_check_results IS
  'Stores results of periodic data integrity assertion runs.';

-- ── 2. RLS — admin and manager can read ───────────────────────────────────────

ALTER TABLE integrity_check_results ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "integrity_checks_select" ON integrity_check_results;
CREATE POLICY "integrity_checks_select" ON integrity_check_results
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role IN ('admin', 'manager')
    )
  );

-- ── 3. Pruning helper — keep only the most recent 30 runs ─────────────────────

CREATE OR REPLACE FUNCTION prune_integrity_runs()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  DELETE FROM integrity_check_results
  WHERE run_id NOT IN (
    SELECT DISTINCT run_id
    FROM integrity_check_results
    ORDER BY run_id DESC
    LIMIT 30
  );
$$;

-- ── 4. Main check function ────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION run_integrity_checks()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_run_id  timestamptz := now();
  v_count   integer;
  v_samples text[];
BEGIN

  -- ── Check 1: Sale header totals ─────────────────────────────────────────────
  -- total_amount must equal ROUND(subtotal - discount_amount, 2)
  SELECT COUNT(*)::integer INTO v_count
  FROM sales
  WHERE ABS(total_amount - ROUND(subtotal - discount_amount, 2)) > 0.02;

  SELECT ARRAY_AGG(id::text) INTO v_samples
  FROM (
    SELECT id FROM sales
    WHERE ABS(total_amount - ROUND(subtotal - discount_amount, 2)) > 0.02
    ORDER BY created_at DESC LIMIT 5
  ) s;

  INSERT INTO integrity_check_results
    (run_id, check_name, severity, anomaly_count, sample_ids, description)
  VALUES (
    v_run_id, 'sale_total_mismatch',
    CASE WHEN v_count = 0 THEN 'ok' ELSE 'error' END,
    v_count, v_samples,
    'Sales where total_amount ≠ subtotal − discount_amount (tolerance 0.02)'
  );

  -- ── Check 2: Sale line item totals ──────────────────────────────────────────
  -- total_price must equal GREATEST(0, ROUND(quantity × unit_price − discount, 2))
  SELECT COUNT(*)::integer INTO v_count
  FROM sale_items
  WHERE ABS(total_price - GREATEST(0, ROUND(quantity * unit_price - discount_amount, 2))) > 0.02;

  SELECT ARRAY_AGG(id::text) INTO v_samples
  FROM (
    SELECT id FROM sale_items
    WHERE ABS(total_price - GREATEST(0, ROUND(quantity * unit_price - discount_amount, 2))) > 0.02
    LIMIT 5
  ) s;

  INSERT INTO integrity_check_results
    (run_id, check_name, severity, anomaly_count, sample_ids, description)
  VALUES (
    v_run_id, 'sale_item_total_mismatch',
    CASE WHEN v_count = 0 THEN 'ok' ELSE 'error' END,
    v_count, v_samples,
    'Line items where total_price ≠ quantity × unit_price − discount'
  );

  -- ── Check 3: Payment coverage ───────────────────────────────────────────────
  -- For completed sales: sum(payments.amount) must equal sales.total_amount
  SELECT COUNT(*)::integer INTO v_count
  FROM (
    SELECT s.id
    FROM sales s
    LEFT JOIN payments p ON p.sale_id = s.id
    WHERE s.status = 'completed'
    GROUP BY s.id, s.total_amount
    HAVING ABS(COALESCE(SUM(p.amount), 0) - s.total_amount) > 0.02
  ) sub;

  SELECT ARRAY_AGG(sub.id::text) INTO v_samples
  FROM (
    SELECT s.id
    FROM sales s
    LEFT JOIN payments p ON p.sale_id = s.id
    WHERE s.status = 'completed'
    GROUP BY s.id, s.total_amount
    HAVING ABS(COALESCE(SUM(p.amount), 0) - s.total_amount) > 0.02
    LIMIT 5
  ) sub;

  INSERT INTO integrity_check_results
    (run_id, check_name, severity, anomaly_count, sample_ids, description)
  VALUES (
    v_run_id, 'sale_payment_mismatch',
    CASE WHEN v_count = 0 THEN 'ok' ELSE 'error' END,
    v_count, v_samples,
    'Completed sales where total payments collected ≠ sale total_amount'
  );

  -- ── Check 4: Negative cost at sale ──────────────────────────────────────────
  -- cost_at_sale is a physical cost — it can never be negative
  SELECT COUNT(*)::integer INTO v_count
  FROM sale_items
  WHERE cost_at_sale IS NOT NULL AND cost_at_sale < 0;

  SELECT ARRAY_AGG(id::text) INTO v_samples
  FROM (
    SELECT id FROM sale_items
    WHERE cost_at_sale IS NOT NULL AND cost_at_sale < 0
    LIMIT 5
  ) s;

  INSERT INTO integrity_check_results
    (run_id, check_name, severity, anomaly_count, sample_ids, description)
  VALUES (
    v_run_id, 'negative_cost_at_sale',
    CASE WHEN v_count = 0 THEN 'ok' ELSE 'error' END,
    v_count, v_samples,
    'Sale items with a negative cost_at_sale value'
  );

  -- ── Check 5: Negative stock quantity ────────────────────────────────────────
  -- FEFO deduction should never push a batch below zero
  SELECT COUNT(*)::integer INTO v_count
  FROM stock_batches
  WHERE quantity_remaining < 0;

  SELECT ARRAY_AGG(id::text) INTO v_samples
  FROM (
    SELECT id FROM stock_batches
    WHERE quantity_remaining < 0
    LIMIT 5
  ) s;

  INSERT INTO integrity_check_results
    (run_id, check_name, severity, anomaly_count, sample_ids, description)
  VALUES (
    v_run_id, 'negative_stock_quantity',
    CASE WHEN v_count = 0 THEN 'ok' ELSE 'error' END,
    v_count, v_samples,
    'Stock batches where quantity_remaining has gone below zero'
  );

  -- ── Check 6: Invalid expense amounts ────────────────────────────────────────
  -- Active expenses must have a positive amount
  SELECT COUNT(*)::integer INTO v_count
  FROM expenses
  WHERE is_deleted = false AND amount <= 0;

  SELECT ARRAY_AGG(id::text) INTO v_samples
  FROM (
    SELECT id FROM expenses
    WHERE is_deleted = false AND amount <= 0
    LIMIT 5
  ) s;

  INSERT INTO integrity_check_results
    (run_id, check_name, severity, anomaly_count, sample_ids, description)
  VALUES (
    v_run_id, 'invalid_expense_amount',
    CASE WHEN v_count = 0 THEN 'ok' ELSE 'warning' END,
    v_count, v_samples,
    'Active expenses recorded with an amount of zero or less'
  );

  -- ── Check 7: Duplicate shift reconciliations ─────────────────────────────────
  -- Each cashier should have at most one reconciliation per shift date
  SELECT COUNT(*)::integer INTO v_count
  FROM (
    SELECT cashier_id, shift_date
    FROM cashier_reconciliations
    GROUP BY cashier_id, shift_date
    HAVING COUNT(*) > 1
  ) sub;

  INSERT INTO integrity_check_results
    (run_id, check_name, severity, anomaly_count, sample_ids, description)
  VALUES (
    v_run_id, 'duplicate_reconciliation',
    CASE WHEN v_count = 0 THEN 'ok' ELSE 'warning' END,
    v_count, NULL,
    'Cashiers with more than one till count recorded for the same shift date'
  );

  -- ── Prune history (keep 30 runs) ─────────────────────────────────────────────
  PERFORM prune_integrity_runs();

  -- ── Return run summary ────────────────────────────────────────────────────────
  RETURN (
    SELECT jsonb_build_object(
      'run_id',       v_run_id,
      'total_checks', COUNT(*),
      'errors',       COUNT(*) FILTER (WHERE severity = 'error'),
      'warnings',     COUNT(*) FILTER (WHERE severity = 'warning'),
      'ok',           COUNT(*) FILTER (WHERE severity = 'ok')
    )
    FROM integrity_check_results
    WHERE run_id = v_run_id
  );
END;
$$;

REVOKE ALL ON FUNCTION run_integrity_checks()  FROM PUBLIC;
REVOKE ALL ON FUNCTION prune_integrity_runs()  FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION run_integrity_checks() TO authenticated;

-- =============================================================================
-- Optional: pg_cron daily schedule (requires pg_cron extension)
-- Enable in: Supabase Dashboard → Database → Extensions → pg_cron
-- Then uncomment and run the line below:
-- =============================================================================
-- SELECT cron.schedule('bedarts-integrity-daily', '0 6 * * *', $$SELECT run_integrity_checks()$$);
