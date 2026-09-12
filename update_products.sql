-- ============================================================
-- Bedarts — Remove drinks + add images to all demo products
-- Run in Supabase SQL Editor
-- ============================================================

-- 1. Remove all drinks
DELETE FROM products
WHERE name IN (
  'Alvaro 330ml',
  'Coca-Cola 350ml',
  'Energy Drink 250ml',
  'Fanta Orange 350ml',
  'Malta 330ml',
  'Sprite 350ml',
  'Water (750ml)'
);

-- 2. Add images to products that have none
UPDATE products SET image_url = CASE name
  -- Processed Meat
  WHEN 'Beef Mince (500g)'        THEN 'https://images.unsplash.com/photo-1607623814075-ef51b7f9f2a2?auto=format&fit=crop&w=400&q=80'
  WHEN 'Beef Steak (500g)'        THEN 'https://images.unsplash.com/photo-1546964124-0cce460f38ef?auto=format&fit=crop&w=400&q=80'
  WHEN 'Lamb Chops (500g)'        THEN 'https://images.unsplash.com/photo-1604503468506-a8da13d11d36?auto=format&fit=crop&w=400&q=80'
  WHEN 'Pork Chops (1kg)'         THEN 'https://images.unsplash.com/photo-1432139509613-5c4255815697?auto=format&fit=crop&w=400&q=80'
  -- Poultry
  WHEN 'Chicken Breast (500g)'    THEN 'https://images.unsplash.com/photo-1587593810167-a84920ea0781?auto=format&fit=crop&w=400&q=80'
  WHEN 'Chicken Drumsticks (1kg)' THEN 'https://images.unsplash.com/photo-1508615039623-a25605d2b022?auto=format&fit=crop&w=400&q=80'
  WHEN 'Chicken Wings (1kg)'      THEN 'https://images.unsplash.com/photo-1567620832903-9fc6debc209f?auto=format&fit=crop&w=400&q=80'
  WHEN 'Turkey Breast (1kg)'      THEN 'https://images.unsplash.com/photo-1574672280600-4accfa5b6f98?auto=format&fit=crop&w=400&q=80'
  WHEN 'Whole Chicken (1.2kg)'    THEN 'https://images.unsplash.com/photo-1605371924599-2d0365da1ae0?auto=format&fit=crop&w=400&q=80'
  -- Fish & Seafood
  WHEN 'Mackerel (1kg)'           THEN 'https://images.unsplash.com/photo-1556906781-9b5e69fe4c6b?auto=format&fit=crop&w=400&q=80'
  WHEN 'Salmon Fillet (500g)'     THEN 'https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2?auto=format&fit=crop&w=400&q=80'
  WHEN 'Shrimp (500g)'            THEN 'https://images.unsplash.com/photo-1565680018434-b513d5e5fd47?auto=format&fit=crop&w=400&q=80'
  WHEN 'Tilapia (1kg)'            THEN 'https://images.unsplash.com/photo-1580476262798-bddd9f4b7369?auto=format&fit=crop&w=400&q=80'
  WHEN 'Tuna Steak (500g)'        THEN 'https://images.unsplash.com/photo-1611599538835-b52a8c2f9eb5?auto=format&fit=crop&w=400&q=80'
  -- Dairy
  WHEN 'Butter (250g)'            THEN 'https://images.unsplash.com/photo-1589985270958-0fa2d4f63a0b?auto=format&fit=crop&w=400&q=80'
  WHEN 'Cheese Slices (200g)'     THEN 'https://images.unsplash.com/photo-1618160702438-9b02ab6515c9?auto=format&fit=crop&w=400&q=80'
  WHEN 'Fresh Milk 1L'            THEN 'https://images.unsplash.com/photo-1550583724-b2692b85b150?auto=format&fit=crop&w=400&q=80'
  WHEN 'Sour Cream (250ml)'       THEN 'https://images.unsplash.com/photo-1571212515416-fca984b5e537?auto=format&fit=crop&w=400&q=80'
  WHEN 'Whipping Cream (250ml)'   THEN 'https://images.unsplash.com/photo-1611290208501-e7c9dbf41d5c?auto=format&fit=crop&w=400&q=80'
  WHEN 'Yoghurt (500ml)'          THEN 'https://images.unsplash.com/photo-1488477181946-6428a0291777?auto=format&fit=crop&w=400&q=80'
  -- Ice cream / frozen desserts
  WHEN 'Chocolate Ice Cream (1L)' THEN 'https://images.unsplash.com/photo-1563805042-7684c019e1cb?auto=format&fit=crop&w=400&q=80'
  WHEN 'Ice Cream Sandwich'       THEN 'https://images.unsplash.com/photo-1611293388250-580b08c4a145?auto=format&fit=crop&w=400&q=80'
  WHEN 'Ice Lolly'                THEN 'https://images.unsplash.com/photo-1587754603989-78fe04ba80ef?auto=format&fit=crop&w=400&q=80'
  WHEN 'Strawberry Ice Cream (1L)' THEN 'https://images.unsplash.com/photo-1497034825429-c343d7c6a68f?auto=format&fit=crop&w=400&q=80'
  WHEN 'Vanilla Ice Cream (1L)'   THEN 'https://images.unsplash.com/photo-1501443762994-82bd5dace89a?auto=format&fit=crop&w=400&q=80'
  -- Vegetables
  WHEN 'Broccoli (500g)'          THEN 'https://images.unsplash.com/photo-1459411621453-7b03977f4bfc?auto=format&fit=crop&w=400&q=80'
  WHEN 'Green Peas (500g)'        THEN 'https://images.unsplash.com/photo-1587049332298-1c42e83937a7?auto=format&fit=crop&w=400&q=80'
  WHEN 'Mixed Vegetables (500g)'  THEN 'https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&w=400&q=80'
  WHEN 'Sweet Corn (500g)'        THEN 'https://images.unsplash.com/photo-1551754655-cd27e38d2076?auto=format&fit=crop&w=400&q=80'
  ELSE image_url
END
WHERE image_url IS NULL
  AND name NOT IN (
    'Alvaro 330ml','Coca-Cola 350ml','Energy Drink 250ml',
    'Fanta Orange 350ml','Malta 330ml','Sprite 350ml','Water (750ml)'
  );
