-- Add `stock_total` to the thaw RPC so the UI can distinguish between
-- 'hit today's bring-out target but freezer still has reserves' (where the
-- action is "bring more out") and 'actually have nothing left in the shop
-- for this product' (where the action is "stop promising it, reorder").
--
-- stock_total = SUM(stock_batches.quantity_remaining) for non-expired batches,
-- i.e. the same number the product_stock view already exposes. Sourced from
-- that view directly to keep the expiry-filter logic in one place.

DROP FUNCTION IF EXISTS public.get_thaw_targets_v1();

CREATE OR REPLACE FUNCTION public.get_thaw_targets_v1()
RETURNS TABLE (
  name         text,
  unit         text,
  suggested    numeric,
  today_sold   numeric,
  remaining    numeric,
  stock_total  numeric,
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
      t.pname AS name,
      t.punit AS unit,
      CASE
        WHEN t.punit = 'kg' THEN ceil(t.p75_qty * 2)::numeric / 2
        ELSE ceil(t.p75_qty)::numeric
      END                                           AS suggested,
      round(coalesce(ts.today_qty, 0), 2)           AS today_sold,
      greatest(
        0,
        (CASE
           WHEN t.punit = 'kg' THEN ceil(t.p75_qty * 2)::numeric / 2
           ELSE ceil(t.p75_qty)::numeric
         END) - round(coalesce(ts.today_qty, 0), 2)
      )                                             AS remaining,
      coalesce(ps.stock_quantity, 0)                AS stock_total,
      t.active_days                                 AS active_days
    FROM targets t
    LEFT JOIN today_sold_cte ts ON ts.product_id = t.product_id
    LEFT JOIN product_stock  ps ON ps.id         = t.product_id
    WHERE
      CASE
        WHEN t.punit = 'kg' THEN ceil(t.p75_qty * 2)::numeric / 2
        ELSE ceil(t.p75_qty)::numeric
      END > 0
    ORDER BY
      -- Urgency first: completely out of stock at the very top, then target-hit
      -- rows, then by fraction remaining ascending.
      CASE WHEN coalesce(ps.stock_quantity, 0) = 0 THEN 0 ELSE 1 END ASC,
      (CASE
         WHEN greatest(
                0,
                (CASE
                   WHEN t.punit = 'kg' THEN ceil(t.p75_qty * 2)::numeric / 2
                   ELSE ceil(t.p75_qty)::numeric
                 END) - round(coalesce(ts.today_qty, 0), 2)
              ) = 0 THEN 0
         ELSE
           greatest(
             0,
             (CASE
                WHEN t.punit = 'kg' THEN ceil(t.p75_qty * 2)::numeric / 2
                ELSE ceil(t.p75_qty)::numeric
              END) - round(coalesce(ts.today_qty, 0), 2)
           )
           /
           NULLIF(
             CASE
               WHEN t.punit = 'kg' THEN ceil(t.p75_qty * 2)::numeric / 2
               ELSE ceil(t.p75_qty)::numeric
             END, 0)
       END) ASC,
      t.pname ASC;
END;
$$;

REVOKE ALL ON FUNCTION public.get_thaw_targets_v1() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_thaw_targets_v1() TO authenticated;
