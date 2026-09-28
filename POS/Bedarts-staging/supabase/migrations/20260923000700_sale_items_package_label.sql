-- Add package_label to sale_items and update submit_sale_v3 to persist it

ALTER TABLE sale_items ADD COLUMN IF NOT EXISTS package_label text;

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
  INSERT INTO sales (
    cashier_id, customer_id, subtotal, discount_amount, total_amount, status
  )
  VALUES (
    p_cashier_id, p_customer_id, p_subtotal, p_discount, p_total, 'completed'
  )
  RETURNING id INTO v_sale_id;

  FOR v_item IN SELECT value FROM jsonb_array_elements(p_items) t(value)
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
    );

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
