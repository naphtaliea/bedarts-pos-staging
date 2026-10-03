-- Security fixes (H-6 + H-9) added to submit_sale_v5.
--
-- H-6 — Stock override role gate:
--   Any authenticated user (including cashiers) could call submit_sale_v5
--   with a non-null p_stock_override_reason to bypass the stock check.
--   Fix: raise 42501 if the caller is not admin or manager.
--   Added as the very first statement in the function body, before the
--   sale INSERT, so no side effects occur on a rejected override attempt.
--
-- H-9 — Payment coverage check:
--   After all payment rows are inserted the function now asserts that
--   the sum of collected payments covers p_total within a 0.01 tolerance.
--   Pending-pickup sales are included: they collect payment at sale time.
--   Added after the account credit update, immediately before RETURN.
--
-- All other logic is preserved verbatim from
-- 20261003010000_submit_sale_v5_server_price.sql.

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
  v_product_active   boolean;
begin
  -- H-6: stock override is a manager/admin privilege only.
  if p_stock_override_reason is not null
     and get_user_role() not in ('admin', 'manager') then
    raise exception 'Stock override requires manager or admin authorisation'
      using errcode = '42501';
  end if;

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
    v_qty       := (v_item->>'quantity')::numeric;
    v_item_disc := coalesce((v_item->>'discount_amount')::numeric, 0);

    -- Re-fetch authoritative price; ignore whatever unit_price the client sent.
    select selling_price, is_active
      into v_unit_price, v_product_active
      from products
     where id = (v_item->>'product_id')::uuid;

    if not found then
      raise exception 'Product % not found', v_item->>'product_id';
    end if;

    if not v_product_active then
      raise exception 'Product % is not available for sale', v_item->>'product_id';
    end if;

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

  -- H-9: assert collected payments cover the sale total (0.01 tolerance).
  if (select coalesce(sum(amount), 0) from payments where sale_id = v_sale_id)
       < p_total - 0.01 then
    raise exception 'Payments do not cover sale total';
  end if;

  return v_sale_id;
end;
$$;

revoke all on function public.submit_sale_v5(uuid,uuid,numeric,numeric,numeric,jsonb,jsonb,boolean,text,text) from public;
grant execute on function public.submit_sale_v5(uuid,uuid,numeric,numeric,numeric,jsonb,jsonb,boolean,text,text) to authenticated;
