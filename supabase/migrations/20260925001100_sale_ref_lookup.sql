-- Look up a sale by the short receipt reference the app prints
-- (first 8 chars of the sale UUID, case-insensitive).
-- Used by /api/lookup-sale for the pickups "Log pickup" dialog.

create or replace function public.find_sale_by_short_ref(p_ref text)
returns setof uuid
language sql
security definer
set search_path = ''
stable
as $$
  select id from public.sales
  where id::text ilike (lower(p_ref) || '%')
  limit 2;
$$;

grant execute on function public.find_sale_by_short_ref(text) to authenticated;
