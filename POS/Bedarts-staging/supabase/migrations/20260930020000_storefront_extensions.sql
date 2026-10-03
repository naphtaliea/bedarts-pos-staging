-- Storefront-facing extensions.
--
-- 1) Add an online-order cutoff column to store_settings so both apps can read
--    the daily cutoff without parsing the free-text opening_hours field.
-- 2) Extend get_storefront_products() to expose bulk (Full Box / Half Box)
--    pricing and units-per-box so the storefront can offer bulk discounts.

-- ── 1. store_settings.online_order_cutoff_time ────────────────────────────────
alter table public.store_settings
  add column if not exists online_order_cutoff_time time not null default '17:50:00';

comment on column public.store_settings.online_order_cutoff_time is
  'Local time (Africa/Accra) after which online orders are dispatched the next business day. Read by the storefront checkout and confirmation pages.';

-- ── 2. get_storefront_products() — extended ───────────────────────────────────
-- Returns box pricing (nullable if a product has no packages) and sorts
-- out-of-stock items to the end of each category. Must drop first because
-- CREATE OR REPLACE cannot change return type.
drop function if exists public.get_storefront_products();

create or replace function public.get_storefront_products()
returns table (
  id             uuid,
  name           text,
  category_id    uuid,
  category_name  text,
  unit           text,
  units_per_box  integer,
  selling_price  numeric,
  full_box_price numeric,
  half_box_price numeric,
  image_url      text,
  stock_quantity numeric
)
language sql
security definer
set search_path = ''
stable
as $$
  with pkg as (
    select
      product_id,
      max(price) filter (where label = 'Full Box') as full_box_price,
      max(price) filter (where label = 'Half Box') as half_box_price
    from public.product_packages
    group by product_id
  ),
  stk as (
    select
      product_id,
      sum(quantity_remaining) filter (
        where quantity_remaining > 0
          and (expiry_date is null or expiry_date >= current_date)
      ) as stock_quantity
    from public.stock_batches
    group by product_id
  )
  select
    p.id,
    p.name,
    p.category_id,
    coalesce(c.name, 'Other')                as category_name,
    p.unit,
    p.units_per_box,
    p.selling_price,
    pkg.full_box_price,
    pkg.half_box_price,
    p.image_url,
    coalesce(stk.stock_quantity, 0)          as stock_quantity
  from public.products p
  left join public.categories    c   on c.id = p.category_id
  left join pkg                       on pkg.product_id = p.id
  left join stk                       on stk.product_id = p.id
  where p.is_active = true
  order by
    (coalesce(stk.stock_quantity, 0) <= 0), -- in-stock first, out-of-stock last
    c.name nulls last,
    p.name;
$$;

grant execute on function public.get_storefront_products() to anon, authenticated;
