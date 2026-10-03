-- Round suggested bring-out quantities to whole numbers.
-- Previously used ceil(p75 * 2) / 2 which gave 0.5-step values like 10.5 kg
-- or 29.5 kg — awkward to weigh. Now uses ceil(p75) so suggestions are always
-- whole kilograms / whole pieces.

DROP FUNCTION IF EXISTS public.get_thaw_targets_v1();

CREATE OR REPLACE FUNCTION public.get_thaw_targets_v1()
RETURNS TABLE (
  product_id   uuid,
  name         text,
  unit         text,
  suggested    numeric,
  today_sold   numeric,
  remaining    numeric,
  stock_total  numeric,
  brought_out  numeric,
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
        p.id                                                   AS pid,
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
        pd.pid,
        pd.pname,
        pd.punit,
        percentile_cont(0.75) WITHIN GROUP (ORDER BY pd.qty)::numeric AS p75_qty,
        count(DISTINCT pd.day)::int                                    AS active_days
      FROM per_day pd
      GROUP BY pd.pid, pd.pname, pd.punit
    )
    SELECT
      t.pid                                                              AS product_id,
      t.pname                                                            AS name,
      t.punit                                                            AS unit,
      -- Whole numbers only — no 10.5 kg or 29.5 kg suggestions
      ceil(t.p75_qty)::numeric                                           AS suggested,
      round(coalesce(ts.today_qty, 0), 2)                                AS today_sold,
      greatest(
        0,
        coalesce(tbo.quantity, ceil(t.p75_qty)::numeric)
          - round(coalesce(ts.today_qty, 0), 2)
      )                                                                  AS remaining,
      coalesce(ps.stock_quantity, 0)                                     AS stock_total,
      tbo.quantity                                                       AS brought_out,
      t.active_days                                                      AS active_days
    FROM targets t
    LEFT JOIN today_sold_cte     ts  ON ts.product_id  = t.pid
    LEFT JOIN product_stock      ps  ON ps.id          = t.pid
    LEFT JOIN thaw_brought_out   tbo ON tbo.product_id = t.pid
                                    AND tbo.brought_date = date((now() AT TIME ZONE 'Africa/Accra'))
    WHERE ceil(t.p75_qty)::numeric > 0
    ORDER BY
      CASE WHEN coalesce(ps.stock_quantity, 0) = 0 THEN 0 ELSE 1 END ASC,
      (CASE
         WHEN greatest(
                0,
                coalesce(tbo.quantity, ceil(t.p75_qty)::numeric)
                  - round(coalesce(ts.today_qty, 0), 2)
              ) = 0 THEN 0
         ELSE 1
       END) ASC,
      t.pname ASC;
END;
$$;

REVOKE ALL ON FUNCTION public.get_thaw_targets_v1() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_thaw_targets_v1() TO authenticated;
