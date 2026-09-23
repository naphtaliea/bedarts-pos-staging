-- System "Walk-in / Market" supplier with a fixed UUID.
-- Used for all ad-hoc cash purchases with no formal supplier relationship.
-- Protected from deletion in application code by WALKIN_SUPPLIER_ID constant.
INSERT INTO suppliers (id, name)
VALUES ('00000000-0000-4000-8000-000000000001', 'Walk-in / Market')
ON CONFLICT (id) DO NOTHING;
