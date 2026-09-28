-- Track over-sold quantities when a cashier chooses the "Stock received but not
-- yet entered in system" override reason. When new stock arrives, an AFTER-INSERT
-- trigger on stock_batches consumes outstanding deficits FEFO so the arrival
-- reflects the true available quantity.

create table if not exists public.stock_deficits (
  id            uuid primary key default gen_random_uuid(),
  product_id    uuid not null references public.products(id) on delete restrict,
  sale_id       uuid not null references public.sales(id) on delete cascade,
  sale_item_id  uuid references public.sale_items(id) on delete cascade,
  original_qty  numeric(12,4) not null check (original_qty > 0),
  remaining_qty numeric(12,4) not null check (remaining_qty >= 0),
  reason        text not null,
  created_at    timestamptz not null default now(),
  resolved_at   timestamptz
);

create index if not exists stock_deficits_product_open_idx
  on public.stock_deficits(product_id, created_at)
  where resolved_at is null;

alter table public.stock_deficits enable row level security;

drop policy if exists "stock_deficits_read_staff"     on public.stock_deficits;
drop policy if exists "stock_deficits_write_none"    on public.stock_deficits;

create policy "stock_deficits_read_staff"
  on public.stock_deficits for select
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role in ('admin','manager','accountant','cashier','terminal')
    )
  );

-- Deficits are written by the DB (submit_sale_v5, backfill, trigger), not by clients.
create policy "stock_deficits_write_none"
  on public.stock_deficits for all
  using (false)
  with check (false);

-- ─────────────────────────────────────────────────────────────────────────────
-- submit_sale_v5: on the tracked override reason, record a deficit instead of
-- silently ignoring the unfulfilled quantity.
-- ─────────────────────────────────────────────────────────────────────────────

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

      -- Handle the shortfall:
      -- 1. No override → hard fail (as before)
      -- 2. Tracked reason ("Stock received but not yet entered in system") → record deficit
      -- 3. Other override reasons (miscount, other) → silently allow (as before)
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
    insert into public.payments (sale_id, method, amount, reference)
    values (
      v_sale_id,
      v_pay->>'method',
      (v_pay->>'amount')::numeric,
      nullif(btrim(coalesce(v_pay->>'reference', '')), '')
    );
  end loop;

  return v_sale_id;
end;
$$;

grant execute on function public.submit_sale_v5(uuid, uuid, numeric, numeric, numeric, jsonb, jsonb, boolean, text, text) to authenticated;

-- ─────────────────────────────────────────────────────────────────────────────
-- Trigger: when new stock is inserted, consume outstanding deficits FEFO.
-- The new batch's quantity_remaining is reduced accordingly so callers see the
-- true available quantity after settling debts.
-- ─────────────────────────────────────────────────────────────────────────────

create or replace function public.consume_stock_deficits() returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_deficit record;
  v_avail   numeric;
  v_take    numeric;
begin
  v_avail := new.quantity_remaining;
  if v_avail is null or v_avail <= 0 then
    return new;
  end if;

  for v_deficit in
    select id, remaining_qty
    from   public.stock_deficits
    where  product_id = new.product_id
      and  resolved_at is null
    order  by created_at asc
    for update
  loop
    exit when v_avail <= 0;
    v_take := least(v_avail, v_deficit.remaining_qty);
    update public.stock_deficits
       set remaining_qty = remaining_qty - v_take,
           resolved_at   = case when remaining_qty - v_take <= 0.0005 then now() else null end
     where id = v_deficit.id;
    v_avail := v_avail - v_take;
  end loop;

  if v_avail < new.quantity_remaining then
    update public.stock_batches
       set quantity_remaining = v_avail
     where id = new.id;
  end if;

  return new;
end;
$$;

drop trigger if exists consume_deficits_after_insert on public.stock_batches;
create trigger consume_deficits_after_insert
  after insert on public.stock_batches
  for each row
  execute function public.consume_stock_deficits();

-- ─────────────────────────────────────────────────────────────────────────────
-- Backfill: existing sales with the tracked reason but no deficit row yet.
-- We can't recover the precise deducted-vs-shortfall split retroactively, so
-- we conservatively record the FULL line quantity as the deficit. This may
-- over-estimate for lines where some batch was available at sale time; the
-- manager can zero out remaining_qty on any that were physically reconciled.
-- ─────────────────────────────────────────────────────────────────────────────

insert into public.stock_deficits (product_id, sale_id, sale_item_id, original_qty, remaining_qty, reason)
select si.product_id, s.id, si.id, si.quantity, si.quantity, s.stock_override_reason
from   public.sales s
join   public.sale_items si on si.sale_id = s.id
where  s.stock_override_reason = 'Stock received but not yet entered in system'
  and  not exists (
    select 1 from public.stock_deficits d where d.sale_item_id = si.id
  );
