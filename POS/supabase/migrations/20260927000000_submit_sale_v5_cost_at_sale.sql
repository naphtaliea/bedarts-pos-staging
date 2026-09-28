-- Fix submit_sale_v5 to populate cost_at_sale on each sale_items row.
-- Previously this column was left NULL, forcing the dashboard and reports
-- to fall back to the product's current cost_price — wrong whenever prices
-- change between receiving a batch and selling from it.
--
-- The weighted-average unit cost is derived from the FEFO batches consumed:
--   cost_at_sale = SUM(deducted_qty × batch.cost_price) / total_deducted_qty
-- Rounded to 4 decimal places to preserve accuracy for kg-weight products.
-- Pending-pickup sales still leave cost_at_sale NULL (set on pickup confirm).

create or replace function public.submit_sale_v5(
  p_cashier_id            uuid,
  p_customer_id           uuid,
  p_subtotal              numeric,
  p_discount              numeric,
  p_total                 numeric,
  p_items                 jsonb,
  p_payments              jsonb,
  p_pending_pickup        boolean default false,
  p_pickup_note           text    default null,
  p_stock_override_reason text    default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_sale_id          uuid;
  v_sale_item_id     uuid;
  v_item             jsonb;
  v_pay              jsonb;
  v_remaining        numeric;
  v_deduct           numeric;
  v_batch            record;
  v_qty              numeric;
  v_unit_price       numeric;
  v_item_disc        numeric;
  v_account_total    numeric := 0;
  v_weighted_cost    numeric;
  v_qty_deducted     numeric;
begin
  insert into sales (
    cashier_id, customer_id, subtotal, discount_amount, total_amount, status,
    pending_pickup, pickup_note, stock_deducted, stock_override_reason
  )
  values (
    p_cashier_id,
    p_customer_id,
    p_subtotal,
    p_discount,
    p_total,
    'completed',
    coalesce(p_pending_pickup, false),
    nullif(btrim(coalesce(p_pickup_note, '')), ''),
    not coalesce(p_pending_pickup, false),
    nullif(btrim(coalesce(p_stock_override_reason, '')), '')
  )
  returning id into v_sale_id;

  for v_item in select value from jsonb_array_elements(p_items) t(value)
  loop
    v_qty        := (v_item->>'quantity')::numeric;
    v_unit_price := (v_item->>'unit_price')::numeric;
    v_item_disc  := coalesce((v_item->>'discount_amount')::numeric, 0);

    insert into sale_items (sale_id, product_id, quantity, unit_price, discount_amount, total_price, package_label)
    values (
      v_sale_id,
      (v_item->>'product_id')::uuid,
      v_qty,
      v_unit_price,
      v_item_disc,
      greatest(0, v_qty * v_unit_price - v_item_disc),
      nullif(btrim(coalesce(v_item->>'package_label', '')), '')
    )
    returning id into v_sale_item_id;

    if not coalesce(p_pending_pickup, false) then
      v_remaining     := v_qty;
      v_weighted_cost := 0;
      v_qty_deducted  := 0;

      for v_batch in
        select id, quantity_remaining, cost_price
        from   stock_batches
        where  product_id         = (v_item->>'product_id')::uuid
          and  quantity_remaining > 0
          and  (expiry_date is null or expiry_date >= current_date)
        order  by expiry_date asc nulls last, received_date asc
        for update
      loop
        exit when v_remaining <= 0;
        v_deduct        := least(v_remaining, v_batch.quantity_remaining);
        update stock_batches
           set quantity_remaining = quantity_remaining - v_deduct
         where id = v_batch.id;
        v_weighted_cost := v_weighted_cost + v_deduct * v_batch.cost_price;
        v_qty_deducted  := v_qty_deducted + v_deduct;
        v_remaining     := v_remaining - v_deduct;
      end loop;

      if v_remaining > 0.0005 and p_stock_override_reason is null then
        raise exception 'Insufficient valid (non-expired) stock for product %', v_item->>'product_id';
      end if;

      -- Persist weighted-average batch cost so future COGS reporting never
      -- falls back to the product's current price (which may have changed).
      if v_qty_deducted > 0 then
        update sale_items
           set cost_at_sale = round(v_weighted_cost / v_qty_deducted, 4)
         where id = v_sale_item_id;
      end if;
    end if;
  end loop;

  for v_pay in select value from jsonb_array_elements(p_payments) t(value)
  loop
    insert into payments (sale_id, method, amount, reference)
    values (
      v_sale_id,
      v_pay->>'method',
      (v_pay->>'amount')::numeric,
      nullif(btrim(coalesce(v_pay->>'reference', '')), '')
    );
    if v_pay->>'method' = 'account' then
      v_account_total := v_account_total + (v_pay->>'amount')::numeric;
    end if;
  end loop;

  if v_account_total > 0 and p_customer_id is not null then
    update customers
    set credit_balance = credit_balance + v_account_total
    where id = p_customer_id;
  end if;

  return v_sale_id;
end;
$$;

revoke all on function public.submit_sale_v5(uuid,uuid,numeric,numeric,numeric,jsonb,jsonb,boolean,text,text) from public;
grant execute on function public.submit_sale_v5(uuid,uuid,numeric,numeric,numeric,jsonb,jsonb,boolean,text,text) to authenticated;
