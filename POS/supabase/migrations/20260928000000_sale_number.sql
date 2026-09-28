-- Human-friendly sequential order number, formatted for the printed receipt
-- as NNNNN-NNN-NNNN (12 digits, zero-padded, split 5-3-4).

alter table public.sales
  add column if not exists sale_number bigint;

-- Backfill existing rows in chronological order so older sales get lower numbers.
do $$
declare
  r record;
  n bigint := 1;
begin
  for r in select id from public.sales where sale_number is null order by created_at asc, id asc loop
    update public.sales set sale_number = n where id = r.id;
    n := n + 1;
  end loop;
end$$;

-- Dedicated sequence so we control the starting value cleanly.
create sequence if not exists public.sales_sale_number_seq;
select setval('public.sales_sale_number_seq', greatest(coalesce((select max(sale_number) from public.sales), 0), 1));

alter table public.sales
  alter column sale_number set default nextval('public.sales_sale_number_seq'),
  alter column sale_number set not null;

alter sequence public.sales_sale_number_seq owned by public.sales.sale_number;

create unique index if not exists sales_sale_number_key on public.sales(sale_number);

-- Update lookup RPC: try sale_number first (digits only), fall back to short UUID prefix.
create or replace function public.find_sale_by_short_ref(p_ref text)
returns setof uuid
language sql
security definer
set search_path = ''
stable
as $$
  with digits as (
    select regexp_replace(p_ref, '\D', '', 'g') as d
  )
  select id from public.sales
  where sale_number = nullif((select d from digits), '')::bigint
  union all
  select id from public.sales
  where id::text ilike (lower(p_ref) || '%')
  limit 2;
$$;
