-- Separate algorithmic demand from what's actually achievable.
--
-- `demand`   = ceil(p75) — what the system says you'd ideally bring out.
-- `suggested` = FLOOR(LEAST(demand, available_stock)) — capped at what's
--               actually in the freezer, rounded down to whole units.
--
-- When stock is lower than demand the butcher sees the correct achievable
-- number, not an impossible one. `demand` is kept so the UI can show context
-- ("needs 25 kg · only 5 kg in freezer") and out-of-stock detection continues
-- to work (suggested = 0 when stock = 0, so detection must use demand > 0).
--
-- `remaining` now counts down from the capped suggested (or the butcher's own
-- override if set), so it always reflects reality.

DROP FUNCTION IF EXISTS public.get_thaw_targets_v1();

CREATE OR REPLACE FUNCTION public.get_thaw_targets_v1()
RETURNS TABLE (
  product_id   uuid,
  name         text,
  unit         text,
  demand       numeric,   -- algorithmic target (whole number, uncapped)
  suggested    numeric,   -- capped at available stock, floored to whole number
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
      -- Whole-number algorithmic target (what you'd ideally need)
      ceil(t.p75_qty)::numeric                                           AS demand,
      -- Capped at available stock and floored to whole units
      floor(
        LEAST(ceil(t.p75_qty)::numeric, GREATEST(coalesce(ps.stock_quantity, 0), 0))
      )                                                                  AS suggested,
      round(coalesce(ts.today_qty, 0), 2)                                AS today_sold,
      -- remaining counts down from butcher's override when set,
      -- otherwise from the stock-capped suggestion
      greatest(
        0,
        coalesce(
          tbo.quantity,
          floor(LEAST(ceil(t.p75_qty)::numeric, GREATEST(coalesce(ps.stock_quantity, 0), 0)))
        ) - round(coalesce(ts.today_qty, 0), 2)
      )                                                                  AS remaining,
      coalesce(ps.stock_quantity, 0)                                     AS stock_total,
      tbo.quantity                                                       AS brought_out,
      t.active_days                                                      AS active_days
    FROM targets t
    LEFT JOIN today_sold_cte     ts  ON ts.product_id  = t.pid
    LEFT JOIN product_stock      ps  ON ps.id          = t.pid
    LEFT JOIN thaw_brought_out   tbo ON tbo.product_id = t.pid
                                    AND tbo.brought_date = date((now() AT TIME ZONE 'Africa/Accra'))
    -- Filter on demand (uncapped) so out-of-stock products still appear
    WHERE ceil(t.p75_qty)::numeric > 0
    ORDER BY
      -- Out-of-stock first, then sold-out, then everything else
      CASE WHEN coalesce(ps.stock_quantity, 0) = 0 THEN 0 ELSE 1 END ASC,
      (CASE
         WHEN greatest(
                0,
                coalesce(
                  tbo.quantity,
                  floor(LEAST(ceil(t.p75_qty)::numeric, GREATEST(coalesce(ps.stock_quantity, 0), 0)))
                ) - round(coalesce(ts.today_qty, 0), 2)
              ) = 0 THEN 0
         ELSE 1
       END) ASC,
      t.pname ASC;
END;
$$;

REVOKE ALL ON FUNCTION public.get_thaw_targets_v1() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_thaw_targets_v1() TO authenticated;
