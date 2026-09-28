-- Remove seeded products that duplicate existing all-caps records
DELETE FROM products WHERE name IN ('Beef Mask', 'Beef Sinews', 'Beef Tripes');

-- Match naming convention
UPDATE products SET name = 'COW LEG' WHERE name = 'Cow Leg';
