alter table public.cashier_reconciliations
  add column if not exists pos_change numeric(12,2) not null default 0;
