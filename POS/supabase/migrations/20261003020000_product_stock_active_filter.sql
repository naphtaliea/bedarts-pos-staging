-- Security fix: exclude deactivated products from product_stock so they
-- cannot be added to a sale at checkout.  Rows where is_active = false
-- disappear from the view entirely, which the checkout UI treats as
-- unavailable (zero stock).

DROP VIEW IF EXISTS product_stock;
CREATE VIEW product_stock AS
  SELECT
    p.id,
    p.name,
    p.category_id,
    p.unit,
    p.selling_price,
    p.wholesale_price,
    p.cost_price,
    p.low_stock_threshold,
    p.is_active,
    p.image_url,
    p.created_at,
    COALESCE(SUM(sb.quantity_remaining), 0) AS stock_quantity
  FROM products p
  LEFT JOIN stock_batches sb ON sb.product_id = p.id
  WHERE p.is_active = true
  GROUP BY p.id;
