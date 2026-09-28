-- Add Half Box and Full Box packages for all active products.
-- Skips any product that already has a package with that label.

INSERT INTO product_packages (product_id, label, quantity, price)
SELECT
  p.id,
  'Half Box',
  (p.units_per_box / 2)::numeric,
  ((p.units_per_box / 2) * p.selling_price)::numeric
FROM products p
WHERE p.is_active = true
  AND NOT EXISTS (
    SELECT 1 FROM product_packages pp
    WHERE pp.product_id = p.id AND pp.label = 'Half Box'
  );

INSERT INTO product_packages (product_id, label, quantity, price)
SELECT
  p.id,
  'Full Box',
  p.units_per_box::numeric,
  (p.units_per_box * p.selling_price)::numeric
FROM products p
WHERE p.is_active = true
  AND NOT EXISTS (
    SELECT 1 FROM product_packages pp
    WHERE pp.product_id = p.id AND pp.label = 'Full Box'
  );
