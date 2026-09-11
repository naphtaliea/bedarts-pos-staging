ALTER TABLE products ADD COLUMN IF NOT EXISTS image_url text;

DROP VIEW IF EXISTS product_stock;
CREATE OR REPLACE VIEW product_stock AS
  SELECT
    p.id,
    p.name,
    p.category_id,
    p.unit,
    p.selling_price,
    p.cost_price,
    p.temperature_zone,
    p.low_stock_threshold,
    p.is_active,
    p.image_url,
    COALESCE(SUM(sb.quantity_remaining), 0) AS stock_quantity
  FROM products p
  LEFT JOIN stock_batches sb ON sb.product_id = p.id
  GROUP BY p.id;

-- Seed categories if not exist
INSERT INTO categories (name) VALUES ('Poultry'), ('Fish & Seafood'), ('Processed Meat') ON CONFLICT (name) DO NOTHING;

-- Seed sample products
DO $$
DECLARE
  poultry_id uuid;
  fish_id uuid;
  meat_id uuid;
  chicken_id uuid;
  fish_prod_id uuid;
  sausage_id uuid;
  gizzard_id uuid;
BEGIN
  SELECT id INTO poultry_id FROM categories WHERE name = 'Poultry' LIMIT 1;
  SELECT id INTO fish_id FROM categories WHERE name = 'Fish & Seafood' LIMIT 1;
  SELECT id INTO meat_id FROM categories WHERE name = 'Processed Meat' LIMIT 1;

  -- Remove old samples if any to start fresh for these specific items
  -- But let's just insert them safely
  
  -- Whole Chicken
  INSERT INTO products (name, category_id, unit, selling_price, cost_price, temperature_zone, image_url)
  VALUES ('Frozen Whole Chicken (Hard)', poultry_id, 'kg', 35.50, 25.00, 'frozen', 'https://images.unsplash.com/photo-1598514982205-f36b96d1e8d4?auto=format&fit=crop&w=400&q=80')
  RETURNING id INTO chicken_id;
  
  -- Tilapia
  INSERT INTO products (name, category_id, unit, selling_price, cost_price, temperature_zone, image_url)
  VALUES ('Frozen Tilapia', fish_id, 'kg', 40.00, 30.00, 'frozen', 'https://images.unsplash.com/photo-1580476262798-bddd9f4b7369?auto=format&fit=crop&w=400&q=80')
  RETURNING id INTO fish_prod_id;

  -- Sausages
  INSERT INTO products (name, category_id, unit, selling_price, cost_price, temperature_zone, image_url)
  VALUES ('Chicken Sausages', meat_id, 'kg', 25.00, 18.00, 'frozen', 'https://images.unsplash.com/photo-1599818815155-bd42f9e421cd?auto=format&fit=crop&w=400&q=80')
  RETURNING id INTO sausage_id;

  -- Gizzard
  INSERT INTO products (name, category_id, unit, selling_price, cost_price, temperature_zone, image_url)
  VALUES ('Frozen Chicken Gizzard', poultry_id, 'kg', 30.00, 22.00, 'frozen', 'https://images.unsplash.com/photo-1604908176997-125f25cc6f3d?auto=format&fit=crop&w=400&q=80')
  RETURNING id INTO gizzard_id;

  -- Give them some stock batches so they appear in POS (since POS only shows in-stock items?)
  -- Wait, out of stock items appear but are disabled. Let's add stock so they can be clicked.
  INSERT INTO stock_batches (product_id, quantity_received, quantity_remaining, cost_price, received_date)
  VALUES 
    (chicken_id, 100, 100, 25.00, CURRENT_DATE),
    (fish_prod_id, 50, 50, 30.00, CURRENT_DATE),
    (sausage_id, 200, 200, 18.00, CURRENT_DATE),
    (gizzard_id, 150, 150, 22.00, CURRENT_DATE);
    
END $$;
