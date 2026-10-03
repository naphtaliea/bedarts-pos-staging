-- Add fulfillment_type to online_orders (delivery vs pickup).
-- Make delivery_address nullable — pickup orders don't need it.

alter table public.online_orders
  add column if not exists fulfillment_type text not null default 'delivery'
    check (fulfillment_type in ('delivery', 'pickup'));

alter table public.online_orders
  alter column delivery_address drop not null;
