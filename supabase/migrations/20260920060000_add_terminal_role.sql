-- Add 'terminal' role for the shared POS machine account.
-- Terminal accounts land on /cashier/pin and never access the dashboard.

ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_role_check;

ALTER TABLE profiles ADD CONSTRAINT profiles_role_check
  CHECK (role IN ('admin', 'manager', 'cashier', 'accountant', 'terminal'));
