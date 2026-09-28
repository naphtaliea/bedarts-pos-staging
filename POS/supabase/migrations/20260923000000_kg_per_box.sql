-- Add kg_per_box to products.
-- Represents how many kg are in one box of this product (10 or 20).
-- Existing products default to 10kg boxes.
ALTER TABLE products
  ADD COLUMN IF NOT EXISTS kg_per_box integer NOT NULL DEFAULT 10
    CHECK (kg_per_box IN (10, 20));
