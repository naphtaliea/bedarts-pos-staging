-- Seed stock batches for testing — 2 boxes per product at recorded cost prices.
-- Only inserts for products that currently have zero stock batches.

INSERT INTO stock_batches (product_id, quantity_received, quantity_remaining, cost_price, received_date, supplier_id, expiry_date, notes)
SELECT
  p.id,
  v.qty,
  v.qty,
  v.cost,
  '2026-09-23',
  '00000000-0000-4000-8000-000000000001',
  NULL,
  'Opening stock'
FROM (VALUES
  ('CHICKEN THIGHS - HARD', 20, 39.00),
  ('CHICKEN THIGHS - SOFT', 20, 28.00),
  ('HEN WINGS - HARD',      20, 45.00),
  ('CHICKEN BACKS - SOFT',  20, 20.00),
  ('DRUMSTICKS',            20, 33.00),
  ('CHICKEN FEET',          20,  0.00),
  ('GIZZARD',               20, 37.00),
  ('TURKEY WINGS',          20, 61.00),
  ('HAKE',                  20, 30.00),
  ('CASSAVA FISH',          20, 42.00),
  ('KPALA 16+',             20, 31.50),
  ('KPALA 20+',             20, 37.00),
  ('KPALA 25+',             40, 37.50),
  ('LOCAL SALMON 20+',      20,  0.00),
  ('LOCAL SALMON 25+',      20, 35.00),
  ('HM 2/4',                20, 27.50),
  ('CHINA MACKEREL',        20, 30.00),
  ('RED FISH',              20,  0.00),
  ('MK SOYA 25+',           40, 41.00),
  ('SAADIA SAUSAGE',        48, 16.67),
  ('SEARA SAUSAGE',         48, 12.92)
) AS v(name, qty, cost)
JOIN products p ON p.name = v.name
WHERE NOT EXISTS (
  SELECT 1 FROM stock_batches sb WHERE sb.product_id = p.id
);
