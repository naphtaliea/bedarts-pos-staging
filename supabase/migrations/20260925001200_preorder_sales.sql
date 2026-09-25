-- Support cashier-initiated pre-orders (customer pays now, goods collected later).
--
-- Adds a `stock_deducted` flag on sales:
--   • normal sales: true (stock is deducted at sale time — existing behavior)
--   • pre-order sales: false (stock is deducted at pickup delivery time)
--
-- New RPCs:
--   submit_sale_v4 — like v3, plus optional pending_pickup + pickup_note; if
--                    pending_pickup is true, sale is inserted with
--                    stock_deducted=false and NO FEFO deduction runs
--   deduct_pickup_stock_v1 — runs FEFO deduction for a sale whose stock
--                            hasn't been deducted yet; called by the
--                            "Mark as delivered" action

alter table public.sales
  add column if not exists stock_deducted boolean not null default true;

-- Existing rows: default = true (their stock was already deducted at sale time)

create or replace function public.submit_sale_v4(
  p_cashier_id     uuid,
  p_customer_id    uuid,
  p_subtotal       numeric,
  p_discount       numeric,
  p_total          numeric,
  p_items          jsonb,
  p_payments       jsonb,
  p_pending_pickup boolean default false,
  p_pickup_note    text    default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_sale_id       uuid;
  v_item          jsonb;
  v_pay           jsonb;
  v_remaining     numeric;
  v_deduct        numeric;
  v_batch         record;
  v_qty           numeric;
  v_unit_price    numeric;
  v_item_disc     numeric;
  v_account_total numeric := 0;
begin
  insert into sales (
    cashier_id, customer_id, subtotal, discount_amount, total_amount, status,
    pending_pickup, pickup_note, stock_deducted
  )
  values (
    p_cashier_id, p_customer_id, p_subtotal, p_discount, p_total, 'completed',
    coalesce(p_pending_pickup, false),
    nullif(btrim(coalesce(p_pickup_note, '')), ''),
    not coalesce(p_pending_pickup, false)
  )
  returning id into v_sale_id;

  -- Insert sale_items always; run FEFO deduction only for non-preorder sales
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
    );

    if not coalesce(p_pending_pickup, false) then
      v_remaining := v_qty;
      for v_batch in
        select id, quantity_remaining
        from   stock_batches
        where  product_id         = (v_item->>'product_id')::uuid
          and  quantity_remaining > 0
          and  (expiry_date is null or expiry_date >= current_date)
        order  by expiry_date asc nulls last, received_date asc
        for update
      loop
        exit when v_remaining <= 0;
        v_deduct := least(v_remaining, v_batch.quantity_remaining);
        update stock_batches set quantity_remaining = quantity_remaining - v_deduct where id = v_batch.id;
        v_remaining := v_remaining - v_deduct;
      end loop;

      if v_remaining > 0.0005 then
        raise exception 'Insufficient valid (non-expired) stock for product %', v_item->>'product_id';
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

revoke all on function public.submit_sale_v4(uuid,uuid,numeric,numeric,numeric,jsonb,jsonb,boolean,text) from public;
grant execute on function public.submit_sale_v4(uuid,uuid,numeric,numeric,numeric,jsonb,jsonb,boolean,text) to authenticated;


-- Run FEFO deduction for a pre-order sale that hasn't had its stock deducted
-- yet. Returns nothing; raises on insufficient stock. Marks stock_deducted=true.
create or replace function public.deduct_pickup_stock_v1(p_sale_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_already_deducted boolean;
  v_row  record;
  v_qty  numeric;
  v_remaining numeric;
  v_deduct    numeric;
  v_batch     record;
begin
  select stock_deducted into v_already_deducted from sales where id = p_sale_id for update;
  if v_already_deducted is null then
    raise exception 'Sale % not found', p_sale_id;
  end if;
  if v_already_deducted then
    -- Nothing to do; caller can safely proceed to flip pending_pickup
    return;
  end if;

  for v_row in
    select product_id, quantity from sale_items where sale_id = p_sale_id
  loop
    v_qty := v_row.quantity;
    v_remaining := v_qty;
    for v_batch in
      select id, quantity_remaining
      from   stock_batches
      where  product_id         = v_row.product_id
        and  quantity_remaining > 0
        and  (expiry_date is null or expiry_date >= current_date)
      order  by expiry_date asc nulls last, received_date asc
      for update
    loop
      exit when v_remaining <= 0;
      v_deduct := least(v_remaining, v_batch.quantity_remaining);
      update stock_batches set quantity_remaining = quantity_remaining - v_deduct where id = v_batch.id;
      v_remaining := v_remaining - v_deduct;
    end loop;

    if v_remaining > 0.0005 then
      raise exception 'Not enough valid stock to fulfill pickup for product %', v_row.product_id;
    end if;
  end loop;

  update sales set stock_deducted = true where id = p_sale_id;
end;
$$;

revoke all on function public.deduct_pickup_stock_v1(uuid) from public;
grant execute on function public.deduct_pickup_stock_v1(uuid) to authenticated;
