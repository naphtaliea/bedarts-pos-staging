-- Accountant role RLS additions.
--
-- The refunds server action allows manager/accountant to void sales, but the
-- existing RLS policies restrict sales SELECT/UPDATE and stock_batches INSERT
-- to admin/manager only. Without these additive policies, an accountant sees
-- an empty /refunds page and any void attempt is silently rejected by RLS.
--
-- These are additive (separate CREATE POLICY per role) so the existing
-- admin/manager policies remain untouched and easy to reason about.

CREATE POLICY "accountants_read_sales" ON sales
  FOR SELECT TO authenticated
  USING (get_user_role() = 'accountant');

CREATE POLICY "accountants_void_sales" ON sales
  FOR UPDATE TO authenticated
  USING (get_user_role() = 'accountant')
  WITH CHECK (get_user_role() = 'accountant');

CREATE POLICY "accountants_insert_correction_batches" ON stock_batches
  FOR INSERT TO authenticated
  WITH CHECK (get_user_role() = 'accountant');
