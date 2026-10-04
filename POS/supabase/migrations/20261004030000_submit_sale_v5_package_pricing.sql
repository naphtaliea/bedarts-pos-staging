-- Box / half-box lines must be priced from product_packages, not selling_price.
--
-- The Oct 3 server-price change made submit_sale_v5 (and the server action)
-- overwrite every line's unit_price with products.selling_price. A Full Box is
-- sold at its own package price (e.g. Drumsticks Full Box GH 390 vs 10 x 40 =
-- 400), so every box sale was re-priced above what the customer was quoted,
-- the payment-coverage check (H-9) then failed, and the till showed a masked
-- React error #441. 11 of 44 active packages have a box price different from
-- quantity x per-kg price; no box sale has completed since Oct 3.
--
-- The price is still server-authoritative: when a line carries a package_label
-- the unit price is package.price / package.quantity read from the database;
-- otherwise it is selling_price. Nothing the client sends sets a price.
-- All other logic is unchanged from 20261004020000.

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
  v_selling_price    numeric;
  v_pkg_label        text;
  v_override_reason  text;
  v_track_deficit    boolean;
begin
  -- An override is allowed for any seller, but it must say why.
  v_override_reason := nullif(btrim(coalesce(p_stock_override_reason, '')), '');
  if p_stock_override_reason is not null and v_override_reason is null then
    raise exception 'A reason is required for a stock override';
  end if;
  v_track_deficit := (v_override_reason = 'Stock received but not yet entered in system');

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
    v_override_reason
  )
  returning id into v_sale_id;

  for v_item in select value from jsonb_array_elements(p_items) t(value)
  loop
    v_qty       := (v_item->>'quantity')::numeric;
    v_item_disc := coalesce((v_item->>'discount_amount')::numeric, 0);

    -- Authoritative price, ignoring whatever unit_price the client sent:
    -- a box/half-box line uses its package price, anything else the unit price.
    v_pkg_label  := nullif(btrim(coalesce(v_item->>'package_label', '')), '');
    v_unit_price := null;
    if v_pkg_label is not null then
      select pp.price / pp.quantity
        into v_unit_price
        from product_packages pp
       where pp.product_id = (v_item->>'product_id')::uuid
         and pp.label      = v_pkg_label
         and pp.quantity   > 0;
    end if;

    select selling_price, is_active
      into v_selling_price, v_product_active
      from products
     where id = (v_item->>'product_id')::uuid;

    if not found then
      raise exception 'Product % not found', v_item->>'product_id';
    end if;

    v_unit_price := coalesce(v_unit_price, v_selling_price);

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

      -- Shortfall handling:
      --   no override                       -> hard fail
      --   'received but not yet entered'    -> record a deficit the next receipt settles
      --   any other override reason         -> allowed, reason is logged on the sale
      if v_remaining > 0.0005 then
        if v_override_reason is null then
          raise exception 'Insufficient valid (non-expired) stock for product %', v_item->>'product_id';
        elsif v_track_deficit then
          insert into stock_deficits (
            product_id, sale_id, sale_item_id, original_qty, remaining_qty, reason
          ) values (
            (v_item->>'product_id')::uuid, v_sale_id, v_sale_item_id,
            v_remaining, v_remaining, v_override_reason
          );
        end if;
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
    -- tendered is stored only when it differs from the amount kept, i.e. when
    -- a cash customer handed over more than the sale needed.
    insert into payments (sale_id, method, amount, tendered, reference)
    values (
      v_sale_id,
      v_pay->>'method',
      (v_pay->>'amount')::numeric,
      nullif((v_pay->>'tendered')::numeric, (v_pay->>'amount')::numeric),
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
