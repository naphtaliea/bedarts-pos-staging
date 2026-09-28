-- Rename kg_per_box → units_per_box and remove the restrictive IN (10, 20) constraint.
-- This lets pieces products store arbitrary box sizes (e.g. 24 sausages/box, 12 chicken breasts/box).
ALTER TABLE products RENAME COLUMN kg_per_box TO units_per_box;
ALTER TABLE products DROP CONSTRAINT IF EXISTS products_kg_per_box_check;
ALTER TABLE products ADD CONSTRAINT products_units_per_box_check CHECK (units_per_box > 0);
