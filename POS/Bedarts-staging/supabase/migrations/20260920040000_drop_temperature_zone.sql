-- Drop the view that depends on temperature_zone, remove the column, recreate the view
DROP VIEW IF EXISTS product_stock;

ALTER TABLE products DROP COLUMN IF EXISTS temperature_zone;

CREATE OR REPLACE VIEW product_stock AS
  SELECT
    p.id,
    p.name,
    p.category_id,
    p.unit,
    p.selling_price,
    p.cost_price,
    p.low_stock_threshold,
    p.is_active,
    COALESCE(SUM(sb.quantity_remaining), 0) AS stock_quantity
  FROM products p
  LEFT JOIN stock_batches sb ON sb.product_id = p.id
  GROUP BY p.id;
