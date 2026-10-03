-- Public storefront needs a subset of store_settings (hours, cutoff, address,
-- phone). The table's RLS is authenticated-only, so wrap the read in a
-- SECURITY DEFINER RPC that only exposes the customer-safe columns.

drop function if exists public.get_storefront_settings();

create or replace function public.get_storefront_settings()
returns table (
  store_name               text,
  address                  text,
  phone                    text,
  opening_hours            text,
  sunday_hours             text,
  online_order_cutoff_time time
)
language sql
security definer
set search_path = ''
stable
as $$
  select
    store_name,
    address,
    phone,
    opening_hours,
    sunday_hours,
    online_order_cutoff_time
  from public.store_settings
  where id = 1;
$$;

grant execute on function public.get_storefront_settings() to anon, authenticated;
