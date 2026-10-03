-- Security fix: re-fetch selling_price and is_active from products inside
-- submit_online_order_v1 so a customer cannot manipulate unit_price or
-- total_amount on their online_order to pay less than the real price.
--
-- Previously the function used v_item.unit_price and v_order.total_amount
-- verbatim — both values were written by the customer's browser.  A customer
-- could create an order with total_amount = 0.01, pay GHC 0.01 via Paystack,
-- and receive full stock deduction at that price.
--
-- Fixes applied (mirrors the pattern in 20261003010000_submit_sale_v5_server_price):
--   1. Pre-flight loop now also fetches selling_price + is_active per item,
--      raising immediately if the product is deactivated.
--   2. Corrected line totals (qty * server_price) are accumulated into
--      v_computed_total, which replaces v_order.total_amount everywhere.
--   3. sale_items.unit_price and sale_items.total_price use the server price.
--   4. payments.amount uses v_computed_total, not v_order.total_amount.
--
-- Return type and all other behaviour (FEFO, cost_at_sale, order status
-- update, idempotency lock) are unchanged.

create or replace function public.submit_online_order_v1(p_order_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_order           public.online_orders;
  v_item            public.online_order_items%rowtype;
  v_sale_id         uuid;
  v_sale_item_id    uuid;
  v_batch           record;
  v_remaining       numeric;
  v_deduct          numeric;
  v_weighted_cost   numeric;
  v_qty_deducted    numeric;
  v_stock_qty       numeric;
  v_server_price    numeric;
  v_product_active  boolean;
  v_computed_total  numeric := 0;
  v_line_total      numeric;
begin
  -- Lock the row to prevent duplicate processing from concurrent webhooks.
  select * into v_order
  from public.online_orders
  where id = p_order_id and status = 'pending_payment'
  for update;

  if not found then
    raise exception 'Order % is not in pending_payment state', p_order_id;
  end if;

  -- Pre-flight: verify each item is active, has sufficient stock, and
  -- accumulate the authoritative total from server-side selling_price.
  for v_item in
    select * from public.online_order_items where order_id = p_order_id
  loop
    -- Re-fetch authoritative price; ignore whatever price the client stored.
    select selling_price, is_active
      into v_server_price, v_product_active
      from public.products
      where id = v_item.product_id;

    if not found then
      raise exception 'Product % not found', v_item.product_id;
    end if;

    if not v_product_active then
      raise exception 'Product "%" is not available', v_item.product_name;
    end if;

    select coalesce(sum(quantity_remaining), 0)
      into v_stock_qty
      from public.stock_batches
      where product_id = v_item.product_id
        and quantity_remaining > 0
        and (expiry_date is null or expiry_date >= current_date);

    if v_stock_qty < v_item.quantity then
      raise exception 'Insufficient stock for "%": need %, have %',
        v_item.product_name, v_item.quantity, v_stock_qty;
    end if;

    -- Accumulate corrected total using the server-authoritative price.
    v_computed_total := v_computed_total + v_item.quantity * v_server_price;
  end loop;

  -- Create the POS sale using the recomputed total, not the client value.
  insert into public.sales (
    cashier_id, customer_id, channel, online_order_id,
    subtotal, discount_amount, total_amount, status,
    pending_pickup, stock_deducted
  ) values (
    null, null, 'online', p_order_id,
    v_computed_total, 0, v_computed_total, 'completed',
    false, true
  )
  returning id into v_sale_id;

  -- FEFO stock deduction + cost_at_sale for each item.
  -- Re-fetch selling_price a second time so the recorded unit_price is
  -- authoritative even if prices change between pre-flight and deduction.
  for v_item in
    select * from public.online_order_items where order_id = p_order_id
  loop
    select selling_price
      into v_server_price
      from public.products
      where id = v_item.product_id;

    v_line_total    := v_item.quantity * v_server_price;
    v_remaining     := v_item.quantity;
    v_weighted_cost := 0;
    v_qty_deducted  := 0;

    insert into public.sale_items (
      sale_id, product_id, quantity, unit_price,
      discount_amount, total_price, package_label
    ) values (
      v_sale_id, v_item.product_id, v_item.quantity, v_server_price,
      0, v_line_total, null
    )
    returning id into v_sale_item_id;

    for v_batch in
      select id, quantity_remaining, cost_price
      from public.stock_batches
      where product_id = v_item.product_id
        and quantity_remaining > 0
        and (expiry_date is null or expiry_date >= current_date)
      order by expiry_date asc nulls last, received_date asc
      for update
    loop
      exit when v_remaining <= 0;
      v_deduct        := least(v_remaining, v_batch.quantity_remaining);
      update public.stock_batches
        set quantity_remaining = quantity_remaining - v_deduct
        where id = v_batch.id;
      v_weighted_cost := v_weighted_cost + v_deduct * v_batch.cost_price;
      v_qty_deducted  := v_qty_deducted  + v_deduct;
      v_remaining     := v_remaining     - v_deduct;
    end loop;

    if v_qty_deducted > 0 then
      update public.sale_items
        set cost_at_sale = round(v_weighted_cost / v_qty_deducted, 4)
        where id = v_sale_item_id;
    end if;
  end loop;

  -- Payment record: use v_computed_total, not the customer-supplied amount.
  insert into public.payments (sale_id, method, amount, reference)
  values (
    v_sale_id,
    'pos_machine',
    v_computed_total,
    coalesce(v_order.paystack_ref, 'online-' || p_order_id::text)
  );

  -- Mark the online order as paid and link it to the created sale.
  update public.online_orders
  set status     = 'paid',
      sale_id    = v_sale_id,
      updated_at = now()
  where id = p_order_id;
end;
$$;

-- Only the service_role (webhook server) may call this; never the anon key.
grant execute on function public.submit_online_order_v1(uuid) to service_role;
