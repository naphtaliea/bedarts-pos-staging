-- Add payment-tracking columns to purchases
ALTER TABLE purchases
  ADD COLUMN IF NOT EXISTS payment_status    TEXT        NOT NULL DEFAULT 'unpaid',
  ADD COLUMN IF NOT EXISTS paid_at           TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS payment_method    TEXT,
  ADD COLUMN IF NOT EXISTS payment_reference TEXT,
  ADD COLUMN IF NOT EXISTS paid_by           UUID REFERENCES profiles(id);

ALTER TABLE purchases DROP CONSTRAINT IF EXISTS purchases_payment_status_check;
ALTER TABLE purchases ADD CONSTRAINT purchases_payment_status_check
  CHECK (payment_status IN ('unpaid', 'paid'));

-- Atomic function: lock row → assert unpaid → mark paid in one transaction
CREATE OR REPLACE FUNCTION mark_purchase_paid(
  p_purchase_id    UUID,
  p_payment_method TEXT,
  p_reference      TEXT,
  p_paid_by        UUID
) RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_status TEXT;
BEGIN
  SELECT payment_status INTO v_status
  FROM   purchases
  WHERE  id = p_purchase_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Purchase % not found', p_purchase_id;
  END IF;

  IF v_status = 'paid' THEN
    RAISE EXCEPTION 'Purchase is already marked as paid';
  END IF;

  UPDATE purchases
  SET
    payment_status    = 'paid',
    paid_at           = NOW(),
    payment_method    = p_payment_method,
    payment_reference = NULLIF(p_reference, ''),
    paid_by           = p_paid_by
  WHERE id = p_purchase_id;
END;
$$;
