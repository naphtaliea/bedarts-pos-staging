alter table public.cashier_reconciliations
  add column if not exists expenses jsonb not null default '[]'::jsonb,
  add column if not exists expenses_total numeric(12,2) not null default 0;
