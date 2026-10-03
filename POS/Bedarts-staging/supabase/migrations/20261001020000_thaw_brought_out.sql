-- Butcher-entered "how much I actually brought out of the freezer today"
-- per product per day. Overrides the system's suggested bring-out quantity
-- so the thaw guide's 'X kg left' hero reflects reality (what's on the
-- counter), not an assumption (what the algorithm recommended).
--
-- One row per (product, day). Upsert on edit. Keyed by Africa/Accra date.

CREATE TABLE IF NOT EXISTS public.thaw_brought_out (
  id            uuid primary key default gen_random_uuid(),
  product_id    uuid        not null references public.products(id) on delete cascade,
  brought_date  date        not null,
  quantity      numeric(12,2) not null check (quantity >= 0),
  set_by        uuid                 references public.profiles(id) on delete set null,
  set_at        timestamptz not null default now(),
  UNIQUE (product_id, brought_date)
);

CREATE INDEX IF NOT EXISTS thaw_brought_out_date_idx
  ON public.thaw_brought_out (brought_date);

ALTER TABLE public.thaw_brought_out ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tbo_read_staff  ON public.thaw_brought_out;
DROP POLICY IF EXISTS tbo_write_staff ON public.thaw_brought_out;

CREATE POLICY tbo_read_staff ON public.thaw_brought_out
  FOR SELECT TO authenticated
  USING (get_user_role() IN ('admin', 'manager', 'accountant', 'butcher'));

CREATE POLICY tbo_write_staff ON public.thaw_brought_out
  FOR ALL TO authenticated
  USING      (get_user_role() IN ('admin', 'manager', 'butcher'))
  WITH CHECK (get_user_role() IN ('admin', 'manager', 'butcher'));

-- Extend the thaw RPC with a `brought_out` field. Null means "butcher hasn't
-- set it today — fall back to suggested."

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
      CASE
        WHEN t.punit = 'kg' THEN ceil(t.p75_qty * 2)::numeric / 2
        ELSE ceil(t.p75_qty)::numeric
      END                                                                AS suggested,
      round(coalesce(ts.today_qty, 0), 2)                                AS today_sold,
      -- Prefer butcher's actual brought-out value when they've set it today;
      -- fall back to the system's suggested quantity otherwise.
      greatest(
        0,
        coalesce(
          tbo.quantity,
          (CASE
             WHEN t.punit = 'kg' THEN ceil(t.p75_qty * 2)::numeric / 2
             ELSE ceil(t.p75_qty)::numeric
           END)
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
    WHERE
      CASE
        WHEN t.punit = 'kg' THEN ceil(t.p75_qty * 2)::numeric / 2
        ELSE ceil(t.p75_qty)::numeric
      END > 0
    ORDER BY
      CASE WHEN coalesce(ps.stock_quantity, 0) = 0 THEN 0 ELSE 1 END ASC,
      (CASE
         WHEN greatest(
                0,
                coalesce(
                  tbo.quantity,
                  (CASE
                     WHEN t.punit = 'kg' THEN ceil(t.p75_qty * 2)::numeric / 2
                     ELSE ceil(t.p75_qty)::numeric
                   END)
                ) - round(coalesce(ts.today_qty, 0), 2)
              ) = 0 THEN 0
         ELSE 1
       END) ASC,
      t.pname ASC;
END;
$$;

REVOKE ALL ON FUNCTION public.get_thaw_targets_v1() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_thaw_targets_v1() TO authenticated;
