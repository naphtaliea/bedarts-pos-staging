-- Track pre-paid sales awaiting physical pickup.
-- A pre-paid pickup is a completed sale whose goods haven't been handed over
-- yet (e.g. customer pre-paid for stock arriving on a later shipment).
--
-- Stock is already deducted at sale time; these fields don't change inventory
-- behavior. They exist purely so staff can see "who still needs their goods"
-- when new stock arrives, and so a manager can log the physical hand-over.

alter table public.sales
  add column if not exists pending_pickup boolean not null default false,
  add column if not exists picked_up_at   timestamptz,
  add column if not exists picked_up_by   uuid references public.profiles(id),
  add column if not exists pickup_note    text;

-- Fast lookup of active pickups (small set, hot query on the pickups page)
create index if not exists sales_pending_pickup_idx
  on public.sales(pending_pickup, created_at desc)
  where pending_pickup = true;
