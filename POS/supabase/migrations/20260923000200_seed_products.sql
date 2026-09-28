-- Seed product catalogue from initial stock data.
-- All inserts are idempotent (skip if product name already exists).
-- Cost prices marked 0.00 are unknown at time of seeding.

-- Ensure Beef category exists (Poultry, Fish & Seafood, Processed Meat were seeded in schema.sql)
INSERT INTO categories (name) VALUES ('Beef') ON CONFLICT (name) DO NOTHING;

-- ── Poultry ──────────────────────────────────────────────────────────────────
WITH cat AS (SELECT id FROM categories WHERE name = 'Poultry')
INSERT INTO products (name, category_id, unit, units_per_box, selling_price, cost_price, low_stock_threshold, is_active)
SELECT v.name, cat.id, v.unit, v.upb, v.sell, v.cost, 5, true
FROM cat
CROSS JOIN (VALUES
  ('Chicken Thighs - Hard', 'kg', 10, 45.00,  39.00),
  ('Chicken Thighs - Soft', 'kg', 10, 36.00,  28.00),
  ('Hen Wings - Hard',      'kg', 10, 55.00,  45.00),
  ('Chicken Backs - Soft',  'kg', 10, 26.00,  20.00),
  ('Drumsticks',            'kg', 10, 40.00,  33.00),
  ('Chicken Breast',        'kg', 12, 80.00,   0.00),
  ('Chicken Feet',          'kg', 10, 28.00,   0.00),
  ('Gizzard',               'kg', 10, 40.00,  37.00),
  ('Turkey Wings',          'kg', 10, 67.00,  61.00)
) AS v(name, unit, upb, sell, cost)
WHERE NOT EXISTS (SELECT 1 FROM products WHERE products.name = v.name);

-- ── Beef ─────────────────────────────────────────────────────────────────────
WITH cat AS (SELECT id FROM categories WHERE name = 'Beef')
INSERT INTO products (name, category_id, unit, units_per_box, selling_price, cost_price, low_stock_threshold, is_active)
SELECT v.name, cat.id, v.unit, v.upb, v.sell, v.cost, 5, true
FROM cat
CROSS JOIN (VALUES
  ('Beef Tripes', 'kg', 10, 41.00, 32.00),
  ('Beef Sinews', 'kg', 10, 40.00, 26.00),
  ('Cow Leg',     'kg', 20, 34.00, 26.00),
  ('Beef Mask',   'kg', 10, 43.00,  0.00)
) AS v(name, unit, upb, sell, cost)
WHERE NOT EXISTS (SELECT 1 FROM products WHERE products.name = v.name);

-- ── Fish & Seafood ────────────────────────────────────────────────────────────
WITH cat AS (SELECT id FROM categories WHERE name = 'Fish & Seafood')
INSERT INTO products (name, category_id, unit, units_per_box, selling_price, cost_price, low_stock_threshold, is_active)
SELECT v.name, cat.id, v.unit, v.upb, v.sell, v.cost, 5, true
FROM cat
CROSS JOIN (VALUES
  ('Hake',             'kg', 10, 38.00, 30.00),
  ('Cassava Fish',     'kg', 10, 48.00, 42.00),
  ('Kpala 16+',        'kg', 10, 39.00, 31.50),
  ('Kpala 20+',        'kg', 10, 43.00, 37.00),
  ('Kpala 25+',        'kg', 20, 48.00, 37.50),
  ('Local Salmon 20+', 'kg', 10, 45.00,  0.00),
  ('Local Salmon 25+', 'kg', 10, 48.00, 35.00),
  ('HM 2/4',           'kg', 10, 43.00, 27.50),
  ('China Mackerel',   'kg', 10, 45.00, 30.00),
  ('Red Fish',         'kg', 10, 67.00,  0.00),
  ('MK Soya 25+',      'kg', 20, 48.00, 41.00)
) AS v(name, unit, upb, sell, cost)
WHERE NOT EXISTS (SELECT 1 FROM products WHERE products.name = v.name);

-- ── Processed Meat (sausages — pieces unit) ───────────────────────────────────
WITH cat AS (SELECT id FROM categories WHERE name = 'Processed Meat')
INSERT INTO products (name, category_id, unit, units_per_box, selling_price, cost_price, low_stock_threshold, is_active)
SELECT v.name, cat.id, v.unit, v.upb, v.sell, v.cost, 10, true
FROM cat
CROSS JOIN (VALUES
  ('Saadia Sausage', 'pieces', 24, 22.00, 16.67),
  ('Seara Sausage',  'pieces', 24, 20.00, 12.92)
) AS v(name, unit, upb, sell, cost)
WHERE NOT EXISTS (SELECT 1 FROM products WHERE products.name = v.name);
