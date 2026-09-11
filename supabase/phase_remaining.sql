-- ============================================================
-- Bedarts — remaining features (complete_sale + void_sale)
-- Apply in Supabase SQL Editor or via the pooler.
-- ============================================================

CREATE OR REPLACE FUNCTION complete_sale(payload jsonb)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_role text;
  v_active boolean;
  v_sale_id uuid;
  v_item jsonb;
  v_pay jsonb;
  v_remaining numeric;
  v_deduct numeric;
  v_batch record;
  v_qty numeric;
  v_unit_price numeric;
  v_item_discount numeric;
  v_line_total numeric;
  v_customer_id uuid;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT role, is_active INTO v_role, v_active
  FROM profiles
  WHERE id = v_user_id;

  IF v_role IS NULL THEN
    RAISE EXCEPTION 'Profile not found';
  END IF;
  IF NOT v_active THEN
    RAISE EXCEPTION 'Account is inactive';
  END IF;

  IF payload IS NULL
     OR jsonb_typeof(payload->'items') <> 'array'
     OR jsonb_array_length(payload->'items') < 1 THEN
    RAISE EXCEPTION 'Sale has no items';
  END IF;

  IF jsonb_typeof(payload->'payments') <> 'array'
     OR jsonb_array_length(payload->'payments') < 1 THEN
    RAISE EXCEPTION 'Sale has no payments';
  END IF;

  v_customer_id := NULLIF(payload->>'customer_id', '')::uuid;

  INSERT INTO sales (
    cashier_id,
    customer_id,
    subtotal,
    discount_amount,
    total_amount,
    status
  )
  VALUES (
    v_user_id,
    v_customer_id,
    (payload->>'subtotal')::numeric,
    COALESCE((payload->>'discount')::numeric, 0),
    (payload->>'total')::numeric,
    'completed'
  )
  RETURNING id INTO v_sale_id;

  FOR v_item IN SELECT value FROM jsonb_array_elements(payload->'items') AS t(value)
  LOOP
    v_qty := (v_item->>'quantity')::numeric;
    v_unit_price := (v_item->>'unit_price')::numeric;
    v_item_discount := COALESCE((v_item->>'discount_amount')::numeric, 0);
    v_line_total := GREATEST(0, v_qty * v_unit_price - v_item_discount);

    IF v_qty IS NULL OR v_qty <= 0 THEN
      RAISE EXCEPTION 'Invalid item quantity';
    END IF;

    INSERT INTO sale_items (
      sale_id,
      product_id,
      quantity,
      unit_price,
      discount_amount,
      total_price
    )
    VALUES (
      v_sale_id,
      (v_item->>'product_id')::uuid,
      v_qty,
      v_unit_price,
      v_item_discount,
      v_line_total
    );

    v_remaining := v_qty;
    FOR v_batch IN
      SELECT id, quantity_remaining
      FROM stock_batches
      WHERE product_id = (v_item->>'product_id')::uuid
        AND quantity_remaining > 0
      ORDER BY received_date ASC, created_at ASC
      FOR UPDATE
    LOOP
      EXIT WHEN v_remaining <= 0;
      v_deduct := LEAST(v_remaining, v_batch.quantity_remaining);
      UPDATE stock_batches
      SET quantity_remaining = quantity_remaining - v_deduct
      WHERE id = v_batch.id;
      v_remaining := v_remaining - v_deduct;
    END LOOP;

    IF v_remaining > 0.0005 THEN
      RAISE EXCEPTION 'Insufficient stock for product %', v_item->>'product_id';
    END IF;
  END LOOP;

  FOR v_pay IN SELECT value FROM jsonb_array_elements(payload->'payments') AS t(value)
  LOOP
    INSERT INTO payments (sale_id, method, amount, reference)
    VALUES (
      v_sale_id,
      v_pay->>'method',
      (v_pay->>'amount')::numeric,
      NULLIF(btrim(COALESCE(v_pay->>'reference', '')), '')
    );
  END LOOP;

  RETURN v_sale_id;
END;
$$;

CREATE OR REPLACE FUNCTION void_sale(p_sale_id uuid, p_reason text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_role text;
  v_status text;
  v_item record;
  v_batch_id uuid;
  v_remaining numeric;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  v_role := get_user_role();
  IF v_role NOT IN ('admin', 'manager') THEN
    RAISE EXCEPTION 'Not allowed to void sales';
  END IF;

  IF p_reason IS NULL OR btrim(p_reason) = '' THEN
    RAISE EXCEPTION 'Void reason is required';
  END IF;

  SELECT status INTO v_status
  FROM sales
  WHERE id = p_sale_id
  FOR UPDATE;

  IF v_status IS NULL THEN
    RAISE EXCEPTION 'Sale not found';
  END IF;
  IF v_status = 'voided' THEN
    RAISE EXCEPTION 'Sale already voided';
  END IF;

  UPDATE sales
  SET
    status = 'voided',
    voided_by = v_user_id,
    void_reason = btrim(p_reason)
  WHERE id = p_sale_id;

  FOR v_item IN
    SELECT product_id, quantity
    FROM sale_items
    WHERE sale_id = p_sale_id
  LOOP
    v_remaining := v_item.quantity;
    v_batch_id := NULL;

    SELECT id INTO v_batch_id
    FROM stock_batches
    WHERE product_id = v_item.product_id
    ORDER BY received_date ASC, created_at ASC
    LIMIT 1
    FOR UPDATE;

    IF v_batch_id IS NOT NULL THEN
      UPDATE stock_batches
      SET quantity_remaining = quantity_remaining + v_remaining
      WHERE id = v_batch_id;
    END IF;
  END LOOP;
END;
$$;

REVOKE ALL ON FUNCTION complete_sale(jsonb) FROM PUBLIC;
REVOKE ALL ON FUNCTION void_sale(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION complete_sale(jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION void_sale(uuid, text) TO authenticated;
