-- Additive RLS for accountants on sale_items and payments.
--
-- The refunds page renders sale_items + payments in the sales list. The void
-- server action selects sale_items.cost_at_sale for stock restoration and
-- payments.method/amount for on-account reversal. Both tables' existing
-- follow-sales policies hard-code ('admin', 'manager'), silently returning
-- empty joins for accountants.

CREATE POLICY "accountants_read_sale_items" ON sale_items
  FOR SELECT TO authenticated
  USING (
    get_user_role() = 'accountant'
    AND EXISTS (SELECT 1 FROM sales s WHERE s.id = sale_id)
  );

CREATE POLICY "accountants_read_payments" ON payments
  FOR SELECT TO authenticated
  USING (
    get_user_role() = 'accountant'
    AND EXISTS (SELECT 1 FROM sales s WHERE s.id = sale_id)
  );
