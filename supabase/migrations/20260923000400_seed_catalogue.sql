-- Create missing categories
INSERT INTO categories (name) VALUES
  ('Poultry'),
  ('Fish & Seafood'),
  ('Processed Meat')
ON CONFLICT (name) DO NOTHING;

-- Assign existing uncategorised products to correct categories
UPDATE products SET category_id = (SELECT id FROM categories WHERE name = 'Beef')
WHERE name IN ('BEEF LIPS', 'BEEF MASK', 'BEEF SINEWS AGRA', 'BEEF THROAT', 'BEEF TRIPES-PLATE') AND category_id IS NULL;

UPDATE products SET category_id = (SELECT id FROM categories WHERE name = 'Processed Meat')
WHERE name = 'BIG BEEF SAUSAGE' AND category_id IS NULL;

UPDATE products SET category_id = (SELECT id FROM categories WHERE name = 'Poultry')
WHERE name IN ('CHICKEN BREAST', 'CHICKEN WINGS (SOFT)') AND category_id IS NULL;

UPDATE products SET category_id = (SELECT id FROM categories WHERE name = 'Fish & Seafood')
WHERE name = 'TILAPIA' AND category_id IS NULL;

-- ── Poultry — new products only ───────────────────────────────────────────────
WITH cat AS (SELECT id FROM categories WHERE name = 'Poultry')
INSERT INTO products (name, category_id, unit, units_per_box, selling_price, cost_price, low_stock_threshold, is_active)
SELECT v.name, cat.id, v.unit, v.upb, v.sell, v.cost, 5, true
FROM cat
CROSS JOIN (VALUES
  ('CHICKEN THIGHS - HARD', 'kg', 10, 45.00, 39.00),
  ('CHICKEN THIGHS - SOFT', 'kg', 10, 36.00, 28.00),
  ('HEN WINGS - HARD',      'kg', 10, 55.00, 45.00),
  ('CHICKEN BACKS - SOFT',  'kg', 10, 26.00, 20.00),
  ('DRUMSTICKS',            'kg', 10, 40.00, 33.00),
  ('CHICKEN FEET',          'kg', 10, 28.00,  0.00),
  ('GIZZARD',               'kg', 10, 40.00, 37.00),
  ('TURKEY WINGS',          'kg', 10, 67.00, 61.00)
) AS v(name, unit, upb, sell, cost)
WHERE NOT EXISTS (SELECT 1 FROM products WHERE products.name = v.name);

-- ── Fish & Seafood — new products only ───────────────────────────────────────
WITH cat AS (SELECT id FROM categories WHERE name = 'Fish & Seafood')
INSERT INTO products (name, category_id, unit, units_per_box, selling_price, cost_price, low_stock_threshold, is_active)
SELECT v.name, cat.id, v.unit, v.upb, v.sell, v.cost, 5, true
FROM cat
CROSS JOIN (VALUES
  ('HAKE',             'kg', 10, 38.00, 30.00),
  ('CASSAVA FISH',     'kg', 10, 48.00, 42.00),
  ('KPALA 16+',        'kg', 10, 39.00, 31.50),
  ('KPALA 20+',        'kg', 10, 43.00, 37.00),
  ('KPALA 25+',        'kg', 20, 48.00, 37.50),
  ('LOCAL SALMON 20+', 'kg', 10, 45.00,  0.00),
  ('LOCAL SALMON 25+', 'kg', 10, 48.00, 35.00),
  ('HM 2/4',           'kg', 10, 43.00, 27.50),
  ('CHINA MACKEREL',   'kg', 10, 45.00, 30.00),
  ('RED FISH',         'kg', 10, 67.00,  0.00),
  ('MK SOYA 25+',      'kg', 20, 48.00, 41.00)
) AS v(name, unit, upb, sell, cost)
WHERE NOT EXISTS (SELECT 1 FROM products WHERE products.name = v.name);

-- ── Processed Meat — new products only ───────────────────────────────────────
WITH cat AS (SELECT id FROM categories WHERE name = 'Processed Meat')
INSERT INTO products (name, category_id, unit, units_per_box, selling_price, cost_price, low_stock_threshold, is_active)
SELECT v.name, cat.id, v.unit, v.upb, v.sell, v.cost, 10, true
FROM cat
CROSS JOIN (VALUES
  ('SAADIA SAUSAGE', 'pieces', 24, 22.00, 16.67),
  ('SEARA SAUSAGE',  'pieces', 24, 20.00, 12.92)
) AS v(name, unit, upb, sell, cost)
WHERE NOT EXISTS (SELECT 1 FROM products WHERE products.name = v.name);
