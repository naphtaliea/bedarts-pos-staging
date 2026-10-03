-- Enable realtime on products so cashier grids receive live price and
-- is_active changes without waiting for the hourly router.refresh().
-- REPLICA IDENTITY FULL is required so UPDATE events carry the old row,
-- matching the pattern already used for stock_batches.

alter table public.products replica identity full;
alter publication supabase_realtime add table public.products;
