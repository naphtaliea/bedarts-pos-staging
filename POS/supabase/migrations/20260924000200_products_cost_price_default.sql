-- products.cost_price is no longer set from the product form (it's auto-updated by
-- receiveStock). New products must be creatable without a value, so set a default of 0.
ALTER TABLE products ALTER COLUMN cost_price SET DEFAULT 0;
