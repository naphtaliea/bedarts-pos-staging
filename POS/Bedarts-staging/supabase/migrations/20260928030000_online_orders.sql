-- Online ordering schema.
-- Adds customer_profiles, online_orders, online_order_items.
-- Extends sales with channel + online_order_id columns.
-- Provides submit_online_order_v1 RPC (called by Paystack webhook).
-- Provides get_storefront_products() RPC (called by storefront server actions).

-- ── 1. Make sales.cashier_id nullable (online orders have no POS cashier) ────
alter table public.sales
  alter column cashier_id drop not null;

-- ── 2. Extend sales with channel + online_order_id ────────────────────────────
-- online_order_id FK is added after the online_orders table is created.
alter table public.sales
  add column if not exists channel text not null default 'pos'
    check (channel in ('pos', 'online')),
  add column if not exists online_order_id uuid;

-- ── 3. customer_profiles ──────────────────────────────────────────────────────
create table if not exists public.customer_profiles (
  id         uuid        primary key references auth.users on delete cascade,
  full_name  text        not null,
  phone      text,
  created_at timestamptz not null default now()
);

alter table public.customer_profiles enable row level security;

create policy "customer_profiles_select_own"
  on public.customer_profiles for select
  using (auth.uid() = id);

create policy "customer_profiles_update_own"
  on public.customer_profiles for update
  using (auth.uid() = id);

create policy "customer_profiles_insert_own"
  on public.customer_profiles for insert
  with check (auth.uid() = id);

-- Staff can read customer profiles (for the Online Orders view in POS)
create policy "customer_profiles_staff_read"
  on public.customer_profiles for select
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid()
        and role in ('admin', 'manager', 'accountant', 'cashier', 'terminal')
    )
  );

-- ── 4. online_orders ──────────────────────────────────────────────────────────
create table if not exists public.online_orders (
  id                   uuid        primary key default gen_random_uuid(),
  customer_id          uuid        not null references public.customer_profiles(id),
  status               text        not null default 'pending_payment'
    check (status in ('pending_payment', 'paid', 'dispatched', 'delivered', 'cancelled')),
  paystack_ref         text        unique,
  paystack_access_code text,
  total_amount         numeric(12,2) not null,
  delivery_name        text        not null,
  delivery_phone       text        not null,
  delivery_address     text        not null,
  delivery_notes       text,
  sale_id              uuid        references public.sales(id),
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);

alter table public.online_orders enable row level security;

create policy "online_orders_select_own"
  on public.online_orders for select
  using (auth.uid() = customer_id);

create policy "online_orders_insert_own"
  on public.online_orders for insert
  with check (auth.uid() = customer_id);

-- Customers can cancel their own pending_payment orders
create policy "online_orders_update_cancel"
  on public.online_orders for update
  using (auth.uid() = customer_id and status = 'pending_payment')
  with check (auth.uid() = customer_id and status = 'cancelled');

create policy "online_orders_staff_read"
  on public.online_orders for select
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid()
        and role in ('admin', 'manager', 'accountant', 'cashier', 'terminal')
    )
  );

create policy "online_orders_staff_update"
  on public.online_orders for update
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid()
        and role in ('admin', 'manager')
    )
  );

create index if not exists online_orders_customer_idx on public.online_orders(customer_id);
create index if not exists online_orders_status_idx   on public.online_orders(status, created_at desc);
create index if not exists online_orders_ref_idx      on public.online_orders(paystack_ref) where paystack_ref is not null;

-- ── 5. online_order_items ─────────────────────────────────────────────────────
create table if not exists public.online_order_items (
  id           uuid          primary key default gen_random_uuid(),
  order_id     uuid          not null references public.online_orders(id) on delete cascade,
  product_id   uuid          not null references public.products(id),
  product_name text          not null,
  unit         text          not null,
  quantity     numeric(10,3) not null check (quantity > 0),
  unit_price   numeric(12,2) not null,
  total_price  numeric(12,2) not null
);

alter table public.online_order_items enable row level security;

create policy "online_order_items_select_own"
  on public.online_order_items for select
  using (
    exists (
      select 1 from public.online_orders o
      where o.id = order_id and o.customer_id = auth.uid()
    )
  );

create policy "online_order_items_insert_own"
  on public.online_order_items for insert
  with check (
    exists (
      select 1 from public.online_orders o
      where o.id = order_id
        and o.customer_id = auth.uid()
        and o.status = 'pending_payment'
    )
  );

create policy "online_order_items_staff_read"
  on public.online_order_items for select
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid()
        and role in ('admin', 'manager', 'accountant', 'cashier', 'terminal')
    )
  );

create index if not exists online_order_items_order_idx on public.online_order_items(order_id);

-- ── 6. FK: sales → online_orders (added after online_orders exists) ───────────
alter table public.sales
  add constraint sales_online_order_id_fkey
    foreign key (online_order_id) references public.online_orders(id);

-- ── 7. updated_at trigger ─────────────────────────────────────────────────────
create or replace function public.online_orders_set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger online_orders_updated_at
  before update on public.online_orders
  for each row execute function public.online_orders_set_updated_at();

-- ── 8. Anon read on products for the storefront ───────────────────────────────
-- Wrapped in a DO block because CREATE POLICY IF NOT EXISTS is not supported.
do $$ begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename  = 'products'
      and policyname = 'storefront_anon_read_active'
  ) then
    execute '
      create policy "storefront_anon_read_active"
        on public.products for select
        to anon, authenticated
        using (is_active = true)
    ';
  end if;
end $$;

-- Anon read on categories (storefront filter sidebar)
do $$ begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename  = 'categories'
      and policyname = 'storefront_anon_read_categories'
  ) then
    execute '
      create policy "storefront_anon_read_categories"
        on public.categories for select
        to anon, authenticated
        using (true)
    ';
  end if;
end $$;

-- ── 9. get_storefront_products() ──────────────────────────────────────────────
-- Returns all active products with current in-date stock quantity and category.
-- Called by the storefront with the anon key; security definer so it can read
-- stock_batches regardless of any RLS on that table.
create or replace function public.get_storefront_products()
returns table (
  id             uuid,
  name           text,
  category_id    uuid,
  category_name  text,
  unit           text,
  selling_price  numeric,
  image_url      text,
  stock_quantity numeric
)
language sql
security definer
set search_path = ''
stable
as $$
  select
    p.id,
    p.name,
    p.category_id,
    coalesce(c.name, 'Other') as category_name,
    p.unit,
    p.selling_price,
    p.image_url,
    coalesce(
      sum(sb.quantity_remaining)
        filter (
          where sb.quantity_remaining > 0
            and (sb.expiry_date is null or sb.expiry_date >= current_date)
        ),
      0
    ) as stock_quantity
  from public.products p
  left join public.stock_batches sb on sb.product_id = p.id
  left join public.categories    c  on c.id = p.category_id
  where p.is_active = true
  group by p.id, c.name
  order by c.name nulls last, p.name;
$$;

grant execute on function public.get_storefront_products() to anon, authenticated;

-- ── 10. submit_online_order_v1(p_order_id) ────────────────────────────────────
-- Called by the storefront webhook server (service_role) after Paystack
-- charge.success. Deducts stock FEFO (same logic as submit_sale_v5), records
-- cost_at_sale, creates a completed POS sale (channel='online'), and marks the
-- online_order as paid. Raises an exception if stock is insufficient — online
-- orders have no override path.
create or replace function public.submit_online_order_v1(p_order_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_order         public.online_orders;
  v_item          public.online_order_items%rowtype;
  v_sale_id       uuid;
  v_sale_item_id  uuid;
  v_batch         record;
  v_remaining     numeric;
  v_deduct        numeric;
  v_weighted_cost numeric;
  v_qty_deducted  numeric;
  v_stock_qty     numeric;
begin
  -- Lock the row to prevent duplicate processing from concurrent webhooks.
  select * into v_order
  from public.online_orders
  where id = p_order_id and status = 'pending_payment'
  for update;

  if not found then
    raise exception 'Order % is not in pending_payment state', p_order_id;
  end if;

  -- Pre-flight: verify all items have sufficient non-expired stock.
  for v_item in
    select * from public.online_order_items where order_id = p_order_id
  loop
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
  end loop;

  -- Create the POS sale (sale_number auto-assigned by sequence default).
  insert into public.sales (
    cashier_id, customer_id, channel, online_order_id,
    subtotal, discount_amount, total_amount, status,
    pending_pickup, stock_deducted
  ) values (
    null, null, 'online', p_order_id,
    v_order.total_amount, 0, v_order.total_amount, 'completed',
    false, true
  )
  returning id into v_sale_id;

  -- FEFO stock deduction + cost_at_sale for each item.
  for v_item in
    select * from public.online_order_items where order_id = p_order_id
  loop
    v_remaining     := v_item.quantity;
    v_weighted_cost := 0;
    v_qty_deducted  := 0;

    insert into public.sale_items (
      sale_id, product_id, quantity, unit_price,
      discount_amount, total_price, package_label
    ) values (
      v_sale_id, v_item.product_id, v_item.quantity, v_item.unit_price,
      0, v_item.total_price, null
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

  -- Payment record: Paystack treated as pos_machine (card/online).
  insert into public.payments (sale_id, method, amount, reference)
  values (
    v_sale_id,
    'pos_machine',
    v_order.total_amount,
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
