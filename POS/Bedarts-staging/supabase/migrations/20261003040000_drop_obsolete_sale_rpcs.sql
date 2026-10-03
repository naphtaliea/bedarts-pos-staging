-- Security fix (C-2): drop obsolete sale RPCs that trust client unit_price.
--
-- complete_sale(jsonb), submit_sale_v3(...), and submit_sale_v4(...) were
-- superseded by submit_sale_v5 but never removed.  All three remain GRANT
-- EXECUTE TO authenticated in the live DB and all three accept the
-- client-submitted unit_price verbatim, allowing any authenticated user to
-- record a sale at an arbitrary price by calling the old entry point directly.
--
-- Exact signatures taken from their REVOKE statements in the originating
-- migrations (schema.sql:595, 20260919000000:155, 20260925001200:125).

drop function if exists public.complete_sale(jsonb);

drop function if exists public.submit_sale_v3(
  uuid, uuid, numeric, numeric, numeric, jsonb, jsonb
);

drop function if exists public.submit_sale_v4(
  uuid, uuid, numeric, numeric, numeric, jsonb, jsonb, boolean, text
);
