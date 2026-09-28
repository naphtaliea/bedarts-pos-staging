-- Enable realtime on stock_batches so all POS clients receive live stock updates.
-- REPLICA IDENTITY FULL is required so UPDATE events include the old row values,
-- allowing clients to compute the delta (new qty - old qty) without a round-trip.

alter table public.stock_batches replica identity full;
alter publication supabase_realtime add table public.stock_batches;
