-- =============================================================================
-- Migration v7 — Expenses module (operational cost tracking)
-- =============================================================================
-- Adds:
--   1. expense_categories — lookup table (Salaries, Rent, Utilities, etc.)
--   2. expenses — the source-of-truth expense records
--   3. expense_audit_log — immutable per-row change log written by triggers
--   4. RLS policies scoped to admin / manager / accountant
--   5. Triggers that guarantee every mutation to expenses appears in the log
--
-- Money stored as numeric(12,2) to match rest of schema.
-- Soft-delete only (is_deleted flag) — no hard DELETE from any role.
-- =============================================================================

-- 1. expense_categories ───────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS expense_categories (
  id          UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT          NOT NULL UNIQUE,
  is_active   BOOLEAN       NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ   NOT NULL DEFAULT now()
);

-- Seed default categories
INSERT INTO expense_categories (name) VALUES
  ('Salaries'),
  ('Rent'),
  ('Electricity'),
  ('Water'),
  ('Transport'),
  ('Marketing'),
  ('Maintenance'),
  ('Utilities'),
  ('Bank Charges'),
  ('Supplies'),
  ('Other')
ON CONFLICT (name) DO NOTHING;

ALTER TABLE expense_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "financial_roles_read_expense_categories"
  ON expense_categories FOR SELECT TO authenticated
  USING (get_user_role() IN ('admin', 'manager', 'accountant'));

CREATE POLICY "admins_manage_expense_categories"
  ON expense_categories FOR ALL TO authenticated
  USING (get_user_role() = 'admin')
  WITH CHECK (get_user_role() = 'admin');

-- 2. expenses ─────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS expenses (
  id             UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  amount         NUMERIC(12,2) NOT NULL CHECK (amount > 0),
  category_id    UUID          NOT NULL REFERENCES expense_categories(id),
  description    TEXT          NOT NULL CHECK (length(trim(description)) > 0),
  expense_date   DATE          NOT NULL,
  paid_via       TEXT          NOT NULL DEFAULT 'cash'
                 CHECK (paid_via IN ('cash', 'momo', 'bank_transfer', 'other')),
  reference      TEXT,
  is_deleted     BOOLEAN       NOT NULL DEFAULT false,
  created_by     UUID          NOT NULL REFERENCES profiles(id),
  created_at     TIMESTAMPTZ   NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ   NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS expenses_expense_date_idx    ON expenses(expense_date);
CREATE INDEX IF NOT EXISTS expenses_category_id_idx     ON expenses(category_id);
CREATE INDEX IF NOT EXISTS expenses_is_deleted_idx      ON expenses(is_deleted);

ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;

-- Read: admin, manager, accountant
CREATE POLICY "financial_roles_read_expenses"
  ON expenses FOR SELECT TO authenticated
  USING (get_user_role() IN ('admin', 'manager', 'accountant'));

-- Insert: admin, manager, accountant
CREATE POLICY "financial_roles_insert_expenses"
  ON expenses FOR INSERT TO authenticated
  WITH CHECK (get_user_role() IN ('admin', 'manager', 'accountant'));

-- Update (also used for soft delete via is_deleted): admin, manager only
CREATE POLICY "admins_managers_update_expenses"
  ON expenses FOR UPDATE TO authenticated
  USING (get_user_role() IN ('admin', 'manager'))
  WITH CHECK (get_user_role() IN ('admin', 'manager'));

-- No DELETE policy — hard delete blocked for all roles by default (RLS deny).

-- 3. expense_audit_log ────────────────────────────────────────────────────────
-- Immutable per-row change log. Only trigger writes; no manual INSERT allowed.

CREATE TABLE IF NOT EXISTS expense_audit_log (
  id           UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  expense_id   UUID          NOT NULL REFERENCES expenses(id) ON DELETE RESTRICT,
  action       TEXT          NOT NULL CHECK (action IN ('created','updated','deleted')),
  changed_by   UUID          NOT NULL REFERENCES profiles(id),
  changed_at   TIMESTAMPTZ   NOT NULL DEFAULT now(),
  old_values   JSONB,
  new_values   JSONB
);

CREATE INDEX IF NOT EXISTS expense_audit_log_expense_id_idx ON expense_audit_log(expense_id);
CREATE INDEX IF NOT EXISTS expense_audit_log_changed_at_idx ON expense_audit_log(changed_at DESC);

ALTER TABLE expense_audit_log ENABLE ROW LEVEL SECURITY;

-- Read: admin, manager, accountant
CREATE POLICY "financial_roles_read_expense_audit_log"
  ON expense_audit_log FOR SELECT TO authenticated
  USING (get_user_role() IN ('admin', 'manager', 'accountant'));

-- No INSERT/UPDATE/DELETE policies at all — trigger writes as table owner
-- (SECURITY DEFINER) so RLS is bypassed for its writes but blocked for users.

-- 4. Audit trigger ────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION log_expense_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  actor UUID := auth.uid();
  op    TEXT;
BEGIN
  IF TG_OP = 'INSERT' THEN
    op := 'created';
    INSERT INTO expense_audit_log (expense_id, action, changed_by, old_values, new_values)
    VALUES (
      NEW.id,
      op,
      COALESCE(actor, NEW.created_by),
      NULL,
      jsonb_build_object(
        'amount',       NEW.amount,
        'category_id',  NEW.category_id,
        'description',  NEW.description,
        'expense_date', NEW.expense_date,
        'paid_via',     NEW.paid_via,
        'reference',    NEW.reference
      )
    );
    RETURN NEW;

  ELSIF TG_OP = 'UPDATE' THEN
    -- Soft-delete transition = deleted; other updates = updated
    IF NEW.is_deleted = true AND OLD.is_deleted = false THEN
      op := 'deleted';
    ELSIF NEW.is_deleted = false AND OLD.is_deleted = true THEN
      op := 'updated';  -- restore
    ELSE
      op := 'updated';
    END IF;

    INSERT INTO expense_audit_log (expense_id, action, changed_by, old_values, new_values)
    VALUES (
      NEW.id,
      op,
      COALESCE(actor, NEW.created_by),
      jsonb_build_object(
        'amount',       OLD.amount,
        'category_id',  OLD.category_id,
        'description',  OLD.description,
        'expense_date', OLD.expense_date,
        'paid_via',     OLD.paid_via,
        'reference',    OLD.reference,
        'is_deleted',   OLD.is_deleted
      ),
      jsonb_build_object(
        'amount',       NEW.amount,
        'category_id',  NEW.category_id,
        'description',  NEW.description,
        'expense_date', NEW.expense_date,
        'paid_via',     NEW.paid_via,
        'reference',    NEW.reference,
        'is_deleted',   NEW.is_deleted
      )
    );

    -- Keep updated_at fresh on every UPDATE
    NEW.updated_at := now();
    RETURN NEW;
  END IF;

  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS expenses_audit_trigger ON expenses;
CREATE TRIGGER expenses_audit_trigger
  AFTER INSERT ON expenses
  FOR EACH ROW EXECUTE FUNCTION log_expense_change();

DROP TRIGGER IF EXISTS expenses_audit_update_trigger ON expenses;
CREATE TRIGGER expenses_audit_update_trigger
  BEFORE UPDATE ON expenses
  FOR EACH ROW EXECUTE FUNCTION log_expense_change();
