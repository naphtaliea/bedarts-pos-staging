-- Three related accuracy fixes, one pass:
--
-- 1. DAY-OF-WEEK AWARE DEMAND
--    per_day now filters to only same-weekday rows, using a 70-day (10-week)
--    lookback so there are still ~10 data points per product.  A Friday gets
--    a p75 from other Fridays, not diluted by Tuesdays.
--
-- 2. CONFIDENCE FLOOR
--    active_days now counts same-weekday sales days (max 10), not all days.
--    Callers can flag products with active_days < 3 as low-confidence.
--
-- 3. NEW PRODUCT VISIBILITY
--    Base FROM is products p with a LEFT JOIN to targets, so active products
--    with stock but no DOW history still appear (demand=0, suggested=0,
--    active_days=0).  Products with neither history nor stock are excluded.
--
-- Return table shape is unchanged — no DROP/CREATE needed.

CREATE OR REPLACE FUNCTION public.get_thaw_targets_v1()
RETURNS TABLE (
  product_id   uuid,
  name         text,
  unit         text,
  demand       numeric,
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
DECLARE
  today_date  date;
  today_dow   integer;
BEGIN
  IF get_user_role() NOT IN ('admin', 'manager', 'accountant', 'butcher') THEN
    RAISE EXCEPTION 'Access denied' USING ERRCODE = '42501';
  END IF;

  today_date := date(now() AT TIME ZONE 'Africa/Accra');
  today_dow  := EXTRACT(DOW FROM today_date)::integer;

  RETURN QUERY
    WITH per_day AS (
      -- Same-weekday rows in the past 10 weeks.  Each row is a comparable
      -- data point (another Friday, another Tuesday) so p75 reflects this
      -- specific weekday's demand rather than a blended weekly average.
      SELECT
        p.id                                                 AS pid,
        p.name                                               AS pname,
        p.unit                                               AS punit,
        date(s.created_at AT TIME ZONE 'Africa/Accra')       AS day,
        sum(si.quantity)::numeric                            AS qty
      FROM sale_items si
      JOIN sales    s ON s.id = si.sale_id
      JOIN products p ON p.id = si.product_id
      WHERE s.stock_deducted = true
        AND s.status         = 'completed'
        AND s.created_at    >= (now() - interval '70 days')
        AND EXTRACT(DOW FROM date(s.created_at AT TIME ZONE 'Africa/Accra'))::integer = today_dow
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
        AND date(s.created_at AT TIME ZONE 'Africa/Accra') = today_date
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
      p.id                                                             AS product_id,
      p.name                                                           AS name,
      p.unit                                                           AS unit,
      -- demand: whole-number algorithmic target; 0 when no DOW history
      coalesce(ceil(t.p75_qty)::numeric, 0)                           AS demand,
      -- suggested: capped at available stock, floored to whole units;
      -- 0 for new products (demand=0 → LEAST(0, stock)=0)
      floor(
        LEAST(
          coalesce(ceil(t.p75_qty)::numeric, 0),
          GREATEST(coalesce(ps.stock_quantity, 0), 0)
        )
      )                                                                AS suggested,
      round(coalesce(ts.today_qty, 0), 2)                             AS today_sold,
      -- remaining counts down from butcher's override when set,
      -- otherwise from the stock-capped suggestion
      greatest(
        0,
        coalesce(
          tbo.quantity,
          floor(LEAST(
            coalesce(ceil(t.p75_qty)::numeric, 0),
            GREATEST(coalesce(ps.stock_quantity, 0), 0)
          ))
        ) - round(coalesce(ts.today_qty, 0), 2)
      )                                                                AS remaining,
      coalesce(ps.stock_quantity, 0)                                   AS stock_total,
      tbo.quantity                                                     AS brought_out,
      -- 0 for new/no-history products; max ~10 for a full 10-week history
      coalesce(t.active_days, 0)                                      AS active_days
    FROM products p
    LEFT JOIN targets          t   ON t.pid          = p.id
    LEFT JOIN today_sold_cte   ts  ON ts.product_id  = p.id
    LEFT JOIN product_stock    ps  ON ps.id          = p.id
    LEFT JOIN thaw_brought_out tbo ON tbo.product_id = p.id
                                  AND tbo.brought_date = today_date
    WHERE p.is_active = true
      -- Include products with demand for today's DOW, or with stock (new/dormant).
      -- Exclude active products that have neither — they'd just add noise.
      AND (
        coalesce(ceil(t.p75_qty)::numeric, 0) > 0
        OR coalesce(ps.stock_quantity, 0) > 0
      )
    ORDER BY
      -- 1. Out-of-stock with known demand — butcher needs to know to stop promising
      CASE
        WHEN coalesce(ps.stock_quantity, 0) = 0
         AND coalesce(ceil(t.p75_qty)::numeric, 0) > 0
        THEN 0 ELSE 1
      END ASC,
      -- 2. Products with DOW history before no-history products
      CASE WHEN t.pid IS NULL THEN 1 ELSE 0 END ASC,
      -- 3. Within history group: sold-out/needs-refill before active
      CASE
        WHEN greatest(
               0,
               coalesce(
                 tbo.quantity,
                 floor(LEAST(
                   coalesce(ceil(t.p75_qty)::numeric, 0),
                   GREATEST(coalesce(ps.stock_quantity, 0), 0)
                 ))
               ) - round(coalesce(ts.today_qty, 0), 2)
             ) = 0
         AND coalesce(ceil(t.p75_qty)::numeric, 0) > 0
        THEN 0 ELSE 1
      END ASC,
      p.name ASC;
END;
$$;

REVOKE ALL ON FUNCTION public.get_thaw_targets_v1() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_thaw_targets_v1() TO authenticated;
