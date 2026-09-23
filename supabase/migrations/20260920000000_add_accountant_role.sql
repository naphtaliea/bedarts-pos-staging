-- Add 'accountant' to the profiles.role CHECK constraint.
-- The frontend has treated accountant as a valid role since the expenses module
-- (migration v7), but the DB constraint from schema.sql was never updated,
-- so accountant users could not be created.

ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_role_check;

ALTER TABLE profiles ADD CONSTRAINT profiles_role_check
  CHECK (role IN ('admin', 'manager', 'cashier', 'accountant'));
