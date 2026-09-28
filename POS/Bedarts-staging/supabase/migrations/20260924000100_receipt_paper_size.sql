-- Add receipt_paper_size to store_settings so cashiers can print to either 58mm or 80mm thermal printers.
ALTER TABLE store_settings
  ADD COLUMN IF NOT EXISTS receipt_paper_size text NOT NULL DEFAULT '80mm'
  CHECK (receipt_paper_size IN ('58mm', '80mm'));
