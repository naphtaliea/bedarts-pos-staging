-- Add the `butcher` role: shop-floor staff who bring products out of the
-- freezer for the day. They see nothing but the daily thaw guide.
--
-- Also introduces `get_thaw_targets_v1()`, a SECURITY DEFINER RPC that
-- returns the same numbers the manager dashboard already shows, but computed
-- server-side so the butcher client never touches `sale_items` directly
-- (which carries `cost_at_sale` / COGS data that shouldn't leave the server).
-- Algorithm mirrors the JS code we replaced: p75 of per-day sold quantities
-- across the last 14 days, rounded up to 0.5 kg / 1 pc.
-- Day bucketing uses Africa/Accra time (UTC+0 today, but explicit to future-
-- proof against any hosting / DST change).

-- 1. Add butcher to the role check constraint ─────────────────────────────
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE profiles ADD CONSTRAINT profiles_role_check
  CHECK (role IN ('admin', 'manager', 'cashier', 'accountant', 'terminal', 'butcher'));

-- 2. Allow the /login page (and (auth) shells) to see butcher profiles ────
-- Existing `users_read_own_profile` policy already covers `id = auth.uid()`,
-- so no change is needed here. Skipping.

-- 3. Thaw RPC — server-side aggregation, role-gated ───────────────────────
CREATE OR REPLACE FUNCTION public.get_thaw_targets_v1()
RETURNS TABLE (
  name         text,
  unit         text,
  suggested    numeric,
  today_sold   numeric,
  active_days  integer
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF get_user_role() NOT IN ('admin', 'manager', 'accountant', 'butcher') THEN
    RAISE EXCEPTION 'Access denied' USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
    WITH per_day AS (
      SELECT
        p.id                                                   AS product_id,
        p.name                                                 AS pname,
        p.unit                                                 AS punit,
        date(s.created_at AT TIME ZONE 'Africa/Accra')         AS day,
        sum(si.quantity)::numeric                              AS qty
      FROM sale_items si
      JOIN sales    s ON s.id = si.sale_id
      JOIN products p ON p.id = si.product_id
      WHERE s.stock_deducted = true
        AND s.status         = 'completed'
        AND s.created_at    >= (now() - interval '14 days')
      GROUP BY p.id, p.name, p.unit, day
    ),
    today_sold_cte AS (
      SELECT
        si.product_id,
        sum(si.quantity)::numeric AS today_qty
      FROM sale_items si
      JOIN sales    s ON s.id = si.sale_id
      WHERE s.stock_deducted = true
        AND s.status         = 'completed'
        AND date(s.created_at AT TIME ZONE 'Africa/Accra') =
            date((now() AT TIME ZONE 'Africa/Accra'))
      GROUP BY si.product_id
    ),
    targets AS (
      SELECT
        pd.product_id,
        pd.pname,
        pd.punit,
        percentile_cont(0.75) WITHIN GROUP (ORDER BY pd.qty)::numeric AS p75_qty,
        count(DISTINCT pd.day)::int                                    AS active_days
      FROM per_day pd
      GROUP BY pd.product_id, pd.pname, pd.punit
    )
    SELECT
      t.pname                                                            AS name,
      t.punit                                                            AS unit,
      CASE
        WHEN t.punit = 'kg' THEN ceil(t.p75_qty * 2)::numeric / 2
        ELSE ceil(t.p75_qty)::numeric
      END                                                                AS suggested,
      round(coalesce(ts.today_qty, 0), 2)                                AS today_sold,
      t.active_days                                                      AS active_days
    FROM targets t
    LEFT JOIN today_sold_cte ts ON ts.product_id = t.product_id
    WHERE
      CASE
        WHEN t.punit = 'kg' THEN ceil(t.p75_qty * 2)::numeric / 2
        ELSE ceil(t.p75_qty)::numeric
      END > 0
    ORDER BY
      CASE
        WHEN t.punit = 'kg' THEN ceil(t.p75_qty * 2)::numeric / 2
        ELSE ceil(t.p75_qty)::numeric
      END DESC,
      t.pname ASC;
END;
$$;

REVOKE ALL ON FUNCTION public.get_thaw_targets_v1() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_thaw_targets_v1() TO authenticated;
