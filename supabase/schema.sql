-- ============================================================
-- Bedarts Cold Supplies — Database Schema
-- Run this in Supabase SQL Editor (Dashboard > SQL Editor > New query)
-- ============================================================

-- ============================================================
-- PROFILES (must be created FIRST — other functions depend on it)
-- ============================================================
CREATE TABLE IF NOT EXISTS profiles (
  id          uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name   text NOT NULL,
  role        text NOT NULL CHECK (role IN ('admin', 'manager', 'cashier')),
  is_active   boolean NOT NULL DEFAULT true,
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- HELPER FUNCTION (created after profiles table exists)
-- ============================================================
CREATE OR REPLACE FUNCTION get_user_role()
RETURNS text AS $$
  SELECT role FROM profiles WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ============================================================
-- PROFILES — RLS
-- ============================================================
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_read_own_profile" ON profiles
  FOR SELECT TO authenticated
  USING (id = auth.uid() OR get_user_role() IN ('admin', 'manager'));

CREATE POLICY "admins_manage_profiles" ON profiles
  FOR ALL TO authenticated
  USING (get_user_role() = 'admin')
  WITH CHECK (get_user_role() = 'admin');

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO profiles (id, full_name, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    COALESCE(NEW.raw_user_meta_data->>'role', 'cashier')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ============================================================
-- CATEGORIES
-- ============================================================
CREATE TABLE IF NOT EXISTS categories (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text NOT NULL UNIQUE,
  created_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "authenticated_read_categories" ON categories
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "admins_managers_manage_categories" ON categories
  FOR ALL TO authenticated
  USING (get_user_role() IN ('admin', 'manager'))
  WITH CHECK (get_user_role() IN ('admin', 'manager'));

-- ============================================================
-- PRODUCTS
-- ============================================================
CREATE TABLE IF NOT EXISTS products (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name                  text NOT NULL,
  category_id           uuid REFERENCES categories(id) ON DELETE SET NULL,
  unit                  text NOT NULL DEFAULT 'piece',
  selling_price         numeric(12, 2) NOT NULL CHECK (selling_price >= 0),
  cost_price            numeric(12, 2) NOT NULL CHECK (cost_price >= 0),
  temperature_zone      text NOT NULL DEFAULT 'chilled'
                          CHECK (temperature_zone IN ('frozen', 'chilled', 'ambient')),
  low_stock_threshold   integer NOT NULL DEFAULT 5,
  is_active             boolean NOT NULL DEFAULT true,
  created_at            timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "authenticated_read_products" ON products
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "admins_managers_manage_products" ON products
  FOR ALL TO authenticated
  USING (get_user_role() IN ('admin', 'manager'))
  WITH CHECK (get_user_role() IN ('admin', 'manager'));

-- ============================================================
-- SUPPLIERS (before stock_batches which references it)
-- ============================================================
CREATE TABLE IF NOT EXISTS suppliers (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text NOT NULL,
  phone       text,
  email       text,
  address     text,
  created_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "authenticated_read_suppliers" ON suppliers
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "admins_managers_manage_suppliers" ON suppliers
  FOR ALL TO authenticated
  USING (get_user_role() IN ('admin', 'manager'))
  WITH CHECK (get_user_role() IN ('admin', 'manager'));

-- ============================================================
-- STOCK BATCHES (inventory with expiry tracking)
-- ============================================================
CREATE TABLE IF NOT EXISTS stock_batches (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id          uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  supplier_id         uuid REFERENCES suppliers(id) ON DELETE SET NULL,
  quantity_received   numeric(12, 3) NOT NULL CHECK (quantity_received > 0),
  quantity_remaining  numeric(12, 3) NOT NULL CHECK (quantity_remaining >= 0),
  cost_price          numeric(12, 2) NOT NULL CHECK (cost_price >= 0),
  expiry_date         date,
  received_date       date NOT NULL DEFAULT CURRENT_DATE,
  notes               text,
  created_at          timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE stock_batches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "authenticated_read_stock" ON stock_batches
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "admins_managers_manage_stock" ON stock_batches
  FOR ALL TO authenticated
  USING (get_user_role() IN ('admin', 'manager'))
  WITH CHECK (get_user_role() IN ('admin', 'manager'));

-- View: current stock quantity per product
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
    COALESCE(SUM(sb.quantity_remaining), 0) AS stock_quantity
  FROM products p
  LEFT JOIN stock_batches sb ON sb.product_id = p.id
  GROUP BY p.id;

-- ============================================================
-- CUSTOMERS
-- ============================================================
CREATE TABLE IF NOT EXISTS customers (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name            text NOT NULL,
  phone           text,
  email           text,
  credit_limit    numeric(12, 2) NOT NULL DEFAULT 0,
  credit_balance  numeric(12, 2) NOT NULL DEFAULT 0,
  created_at      timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE customers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "authenticated_read_customers" ON customers
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "admins_managers_manage_customers" ON customers
  FOR ALL TO authenticated
  USING (get_user_role() IN ('admin', 'manager'))
  WITH CHECK (get_user_role() IN ('admin', 'manager'));

CREATE POLICY "cashiers_create_customers" ON customers
  FOR INSERT TO authenticated
  WITH CHECK (true);

-- ============================================================
-- SALES
-- ============================================================
CREATE TABLE IF NOT EXISTS sales (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cashier_id      uuid NOT NULL REFERENCES profiles(id),
  customer_id     uuid REFERENCES customers(id) ON DELETE SET NULL,
  subtotal        numeric(12, 2) NOT NULL CHECK (subtotal >= 0),
  discount_amount numeric(12, 2) NOT NULL DEFAULT 0 CHECK (discount_amount >= 0),
  total_amount    numeric(12, 2) NOT NULL CHECK (total_amount >= 0),
  status          text NOT NULL DEFAULT 'completed'
                    CHECK (status IN ('completed', 'voided')),
  voided_by       uuid REFERENCES profiles(id),
  void_reason     text,
  created_at      timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE sales ENABLE ROW LEVEL SECURITY;

CREATE POLICY "cashiers_read_own_sales" ON sales
  FOR SELECT TO authenticated
  USING (cashier_id = auth.uid() OR get_user_role() IN ('admin', 'manager'));

CREATE POLICY "cashiers_create_sales" ON sales
  FOR INSERT TO authenticated
  WITH CHECK (cashier_id = auth.uid());

CREATE POLICY "managers_admins_void_sales" ON sales
  FOR UPDATE TO authenticated
  USING (get_user_role() IN ('admin', 'manager'))
  WITH CHECK (get_user_role() IN ('admin', 'manager'));

-- ============================================================
-- SALE ITEMS
-- ============================================================
CREATE TABLE IF NOT EXISTS sale_items (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_id         uuid NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
  product_id      uuid NOT NULL REFERENCES products(id),
  quantity        numeric(12, 3) NOT NULL CHECK (quantity > 0),
  unit_price      numeric(12, 2) NOT NULL CHECK (unit_price >= 0),
  discount_amount numeric(12, 2) NOT NULL DEFAULT 0 CHECK (discount_amount >= 0),
  total_price     numeric(12, 2) NOT NULL CHECK (total_price >= 0)
);

ALTER TABLE sale_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "sale_items_follow_sales" ON sale_items
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM sales s
      WHERE s.id = sale_id
        AND (s.cashier_id = auth.uid() OR get_user_role() IN ('admin', 'manager'))
    )
  );

-- ============================================================
-- PAYMENTS
-- ============================================================
CREATE TABLE IF NOT EXISTS payments (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_id     uuid NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
  method      text NOT NULL CHECK (method IN ('cash', 'momo', 'pos_machine')),
  amount      numeric(12, 2) NOT NULL CHECK (amount > 0),
  reference   text,
  created_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "payments_follow_sales" ON payments
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM sales s
      WHERE s.id = sale_id
        AND (s.cashier_id = auth.uid() OR get_user_role() IN ('admin', 'manager'))
    )
  );

-- ============================================================
-- PURCHASES (from suppliers)
-- ============================================================
CREATE TABLE IF NOT EXISTS purchases (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id   uuid NOT NULL REFERENCES suppliers(id),
  received_by   uuid NOT NULL REFERENCES profiles(id),
  total_amount  numeric(12, 2) NOT NULL CHECK (total_amount >= 0),
  notes         text,
  created_at    timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE purchases ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admins_managers_manage_purchases" ON purchases
  FOR ALL TO authenticated
  USING (get_user_role() IN ('admin', 'manager'))
  WITH CHECK (get_user_role() IN ('admin', 'manager'));

-- ============================================================
-- PURCHASE ITEMS
-- ============================================================
CREATE TABLE IF NOT EXISTS purchase_items (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  purchase_id   uuid NOT NULL REFERENCES purchases(id) ON DELETE CASCADE,
  product_id    uuid NOT NULL REFERENCES products(id),
  quantity      numeric(12, 3) NOT NULL CHECK (quantity > 0),
  cost_price    numeric(12, 2) NOT NULL CHECK (cost_price >= 0),
  expiry_date   date
);

ALTER TABLE purchase_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admins_managers_manage_purchase_items" ON purchase_items
  FOR ALL TO authenticated
  USING (get_user_role() IN ('admin', 'manager'))
  WITH CHECK (get_user_role() IN ('admin', 'manager'));

-- ============================================================
-- STOCK ADJUSTMENTS
-- ============================================================
CREATE TABLE IF NOT EXISTS stock_adjustments (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id      uuid NOT NULL REFERENCES products(id),
  adjusted_by     uuid NOT NULL REFERENCES profiles(id),
  quantity_change numeric(12, 3) NOT NULL,
  reason          text NOT NULL CHECK (reason IN ('write_off', 'correction', 'return')),
  notes           text,
  created_at      timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE stock_adjustments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admins_managers_manage_adjustments" ON stock_adjustments
  FOR ALL TO authenticated
  USING (get_user_role() IN ('admin', 'manager'))
  WITH CHECK (get_user_role() IN ('admin', 'manager'));

-- ============================================================
-- STORE SETTINGS (singleton row)
-- ============================================================
CREATE TABLE IF NOT EXISTS store_settings (
  id              integer PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  store_name      text NOT NULL DEFAULT 'Bedarts Cold Supplies',
  address         text,
  phone           text,
  email           text,
  receipt_footer  text DEFAULT 'Thank you for shopping with us!',
  updated_at      timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE store_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "authenticated_read_settings" ON store_settings
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "admins_manage_settings" ON store_settings
  FOR ALL TO authenticated
  USING (get_user_role() = 'admin')
  WITH CHECK (get_user_role() = 'admin');

INSERT INTO store_settings (id, store_name) VALUES (1, 'Bedarts Cold Supplies')
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- POS RPCs (cashier stock deduction + manager void)
-- ============================================================
CREATE OR REPLACE FUNCTION complete_sale(payload jsonb)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_role text;
  v_active boolean;
  v_sale_id uuid;
  v_item jsonb;
  v_pay jsonb;
  v_remaining numeric;
  v_deduct numeric;
  v_batch record;
  v_qty numeric;
  v_unit_price numeric;
  v_item_discount numeric;
  v_line_total numeric;
  v_customer_id uuid;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT role, is_active INTO v_role, v_active
  FROM profiles
  WHERE id = v_user_id;

  IF v_role IS NULL THEN
    RAISE EXCEPTION 'Profile not found';
  END IF;
  IF NOT v_active THEN
    RAISE EXCEPTION 'Account is inactive';
  END IF;

  IF payload IS NULL
     OR jsonb_typeof(payload->'items') <> 'array'
     OR jsonb_array_length(payload->'items') < 1 THEN
    RAISE EXCEPTION 'Sale has no items';
  END IF;

  IF jsonb_typeof(payload->'payments') <> 'array'
     OR jsonb_array_length(payload->'payments') < 1 THEN
    RAISE EXCEPTION 'Sale has no payments';
  END IF;

  v_customer_id := NULLIF(payload->>'customer_id', '')::uuid;

  INSERT INTO sales (
    cashier_id,
    customer_id,
    subtotal,
    discount_amount,
    total_amount,
    status
  )
  VALUES (
    v_user_id,
    v_customer_id,
    (payload->>'subtotal')::numeric,
    COALESCE((payload->>'discount')::numeric, 0),
    (payload->>'total')::numeric,
    'completed'
  )
  RETURNING id INTO v_sale_id;

  FOR v_item IN SELECT value FROM jsonb_array_elements(payload->'items') AS t(value)
  LOOP
    v_qty := (v_item->>'quantity')::numeric;
    v_unit_price := (v_item->>'unit_price')::numeric;
    v_item_discount := COALESCE((v_item->>'discount_amount')::numeric, 0);
    v_line_total := GREATEST(0, v_qty * v_unit_price - v_item_discount);

    IF v_qty IS NULL OR v_qty <= 0 THEN
      RAISE EXCEPTION 'Invalid item quantity';
    END IF;

    INSERT INTO sale_items (
      sale_id,
      product_id,
      quantity,
      unit_price,
      discount_amount,
      total_price
    )
    VALUES (
      v_sale_id,
      (v_item->>'product_id')::uuid,
      v_qty,
      v_unit_price,
      v_item_discount,
      v_line_total
    );

    v_remaining := v_qty;
    FOR v_batch IN
      SELECT id, quantity_remaining
      FROM stock_batches
      WHERE product_id = (v_item->>'product_id')::uuid
        AND quantity_remaining > 0
      ORDER BY received_date ASC, created_at ASC
      FOR UPDATE
    LOOP
      EXIT WHEN v_remaining <= 0;
      v_deduct := LEAST(v_remaining, v_batch.quantity_remaining);
      UPDATE stock_batches
      SET quantity_remaining = quantity_remaining - v_deduct
      WHERE id = v_batch.id;
      v_remaining := v_remaining - v_deduct;
    END LOOP;

    IF v_remaining > 0.0005 THEN
      RAISE EXCEPTION 'Insufficient stock for product %', v_item->>'product_id';
    END IF;
  END LOOP;

  FOR v_pay IN SELECT value FROM jsonb_array_elements(payload->'payments') AS t(value)
  LOOP
    INSERT INTO payments (sale_id, method, amount, reference)
    VALUES (
      v_sale_id,
      v_pay->>'method',
      (v_pay->>'amount')::numeric,
      NULLIF(btrim(COALESCE(v_pay->>'reference', '')), '')
    );
  END LOOP;

  RETURN v_sale_id;
END;
$$;

CREATE OR REPLACE FUNCTION void_sale(p_sale_id uuid, p_reason text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_role text;
  v_status text;
  v_item record;
  v_batch_id uuid;
  v_remaining numeric;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  v_role := get_user_role();
  IF v_role NOT IN ('admin', 'manager') THEN
    RAISE EXCEPTION 'Not allowed to void sales';
  END IF;

  IF p_reason IS NULL OR btrim(p_reason) = '' THEN
    RAISE EXCEPTION 'Void reason is required';
  END IF;

  SELECT status INTO v_status
  FROM sales
  WHERE id = p_sale_id
  FOR UPDATE;

  IF v_status IS NULL THEN
    RAISE EXCEPTION 'Sale not found';
  END IF;
  IF v_status = 'voided' THEN
    RAISE EXCEPTION 'Sale already voided';
  END IF;

  UPDATE sales
  SET
    status = 'voided',
    voided_by = v_user_id,
    void_reason = btrim(p_reason)
  WHERE id = p_sale_id;

  FOR v_item IN
    SELECT product_id, quantity
    FROM sale_items
    WHERE sale_id = p_sale_id
  LOOP
    v_remaining := v_item.quantity;
    v_batch_id := NULL;

    SELECT id INTO v_batch_id
    FROM stock_batches
    WHERE product_id = v_item.product_id
    ORDER BY received_date ASC, created_at ASC
    LIMIT 1
    FOR UPDATE;

    IF v_batch_id IS NOT NULL THEN
      UPDATE stock_batches
      SET quantity_remaining = quantity_remaining + v_remaining
      WHERE id = v_batch_id;
    END IF;
  END LOOP;
END;
$$;

REVOKE ALL ON FUNCTION complete_sale(jsonb) FROM PUBLIC;
REVOKE ALL ON FUNCTION void_sale(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION complete_sale(jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION void_sale(uuid, text) TO authenticated;

-- ============================================================
-- SEED DATA — Default categories
-- ============================================================
INSERT INTO categories (name) VALUES
  ('Poultry'),
  ('Fish & Seafood'),
  ('Processed Meat')
ON CONFLICT (name) DO NOTHING;

-- ============================================================
-- BOOTSTRAP — Create admin profile for the first user
-- ============================================================
DO $$
DECLARE
  v_user_id uuid;
BEGIN
  SELECT id INTO v_user_id
  FROM auth.users
  WHERE email = 'naphtaliea01@gmail.com'
  LIMIT 1;

  IF v_user_id IS NOT NULL THEN
    INSERT INTO profiles (id, full_name, role, is_active)
    VALUES (v_user_id, 'Naphtali', 'admin', true)
    ON CONFLICT (id) DO UPDATE
      SET role = 'admin', is_active = true;
    RAISE NOTICE 'Admin profile ready for naphtaliea01@gmail.com';
  ELSE
    RAISE NOTICE 'User naphtaliea01@gmail.com not found — create them in Auth first';
  END IF;
END $$;
