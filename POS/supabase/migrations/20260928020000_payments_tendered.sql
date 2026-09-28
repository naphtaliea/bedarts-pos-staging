-- Payments store the NET amount kept (matters for cash reconciliation), but
-- the receipt needs the original tendered amount to show change. Add a
-- nullable `tendered` column: for over-tendered cash it holds what the
-- customer handed over; for exact payments it may be null or equal to amount.

alter table public.payments
  add column if not exists tendered numeric(12,2);

-- submit_sale_v5: propagate p_payments[].tendered → payments.tendered
create or replace function public.submit_sale_v5(
  p_cashier_id   uuid,
  p_customer_id  uuid,
  p_subtotal     numeric,
  p_discount     numeric,
  p_total        numeric,
  p_items        jsonb,
  p_payments     jsonb,
  p_pending_pickup boolean default false,
  p_pickup_note  text    default null,
  p_stock_override_reason text default null
) returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_sale_id        uuid;
  v_item           jsonb;
  v_pay            jsonb;
  v_sale_item_id   uuid;
  v_qty            numeric;
  v_remaining      numeric;
  v_deduct         numeric;
  v_batch          record;
  v_weighted_cost  numeric;
  v_qty_deducted   numeric;
  v_track_deficit  boolean;
begin
  v_track_deficit := (p_stock_override_reason = 'Stock received but not yet entered in system');

  insert into public.sales (
    cashier_id, customer_id, subtotal, discount_amount, total_amount, status,
    pending_pickup, pickup_note, stock_deducted, stock_override_reason
  )
  values (
    p_cashier_id, p_customer_id, p_subtotal, p_discount, p_total, 'completed',
    coalesce(p_pending_pickup, false),
    nullif(btrim(coalesce(p_pickup_note, '')), ''),
    not coalesce(p_pending_pickup, false),
    nullif(btrim(coalesce(p_stock_override_reason, '')), '')
  )
  returning id into v_sale_id;

  for v_item in select * from jsonb_array_elements(p_items) loop
    v_qty := (v_item->>'quantity')::numeric;

    insert into public.sale_items (
      sale_id, product_id, quantity, unit_price, discount_amount, total_price, package_label
    )
    values (
      v_sale_id,
      (v_item->>'product_id')::uuid,
      v_qty,
      (v_item->>'unit_price')::numeric,
      coalesce((v_item->>'discount_amount')::numeric, 0),
      round(v_qty * (v_item->>'unit_price')::numeric - coalesce((v_item->>'discount_amount')::numeric, 0), 2),
      nullif(btrim(coalesce(v_item->>'package_label', '')), '')
    )
    returning id into v_sale_item_id;

    if not coalesce(p_pending_pickup, false) then
      v_remaining     := v_qty;
      v_weighted_cost := 0;
      v_qty_deducted  := 0;

      for v_batch in
        select id, quantity_remaining, cost_price
        from   public.stock_batches
        where  product_id = (v_item->>'product_id')::uuid
          and  quantity_remaining > 0
          and  (expiry_date is null or expiry_date >= current_date)
        order  by expiry_date asc nulls last, received_date asc
        for update
      loop
        exit when v_remaining <= 0;
        v_deduct        := least(v_remaining, v_batch.quantity_remaining);
        update public.stock_batches
           set quantity_remaining = quantity_remaining - v_deduct
         where id = v_batch.id;
        v_weighted_cost := v_weighted_cost + v_deduct * v_batch.cost_price;
        v_qty_deducted  := v_qty_deducted + v_deduct;
        v_remaining     := v_remaining - v_deduct;
      end loop;

      if v_remaining > 0.0005 then
        if p_stock_override_reason is null then
          raise exception 'Insufficient valid (non-expired) stock for product %', v_item->>'product_id';
        elsif v_track_deficit then
          insert into public.stock_deficits (
            product_id, sale_id, sale_item_id, original_qty, remaining_qty, reason
          ) values (
            (v_item->>'product_id')::uuid, v_sale_id, v_sale_item_id,
            v_remaining, v_remaining, p_stock_override_reason
          );
        end if;
      end if;

      if v_qty_deducted > 0 then
        update public.sale_items
           set cost_at_sale = round(v_weighted_cost / v_qty_deducted, 4)
         where id = v_sale_item_id;
      end if;
    end if;
  end loop;

  for v_pay in select * from jsonb_array_elements(p_payments) loop
    insert into public.payments (sale_id, method, amount, tendered, reference)
    values (
      v_sale_id,
      v_pay->>'method',
      (v_pay->>'amount')::numeric,
      nullif((v_pay->>'tendered')::numeric, (v_pay->>'amount')::numeric),
      nullif(btrim(coalesce(v_pay->>'reference', '')), '')
    );
  end loop;

  return v_sale_id;
end;
$$;

grant execute on function public.submit_sale_v5(uuid, uuid, numeric, numeric, numeric, jsonb, jsonb, boolean, text, text) to authenticated;
