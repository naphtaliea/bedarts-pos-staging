import { createClient } from "@/lib/supabase/server";
import { ButcherClient } from "./butcher-client";

// Server component. Re-runs every request (revalidate = 0) so a pull-to-refresh
// on the client fetches fresh RPC data immediately.
export const revalidate = 0;

export default async function ButcherPage() {
  const supabase = await createClient();

  // Auth is already enforced by the (butcher)/layout — we can call the RPC
  // straight away. It's role-gated inside the SQL definer function.
  const { data } = await supabase.rpc("get_thaw_targets_v1");

  const thawTargets = ((data ?? []) as Array<{
    product_id: string;
    name: string;
    unit: string;
    demand: number | string;
    suggested: number | string;
    today_sold: number | string;
    remaining: number | string;
    stock_total: number | string;
    brought_out: number | string | null;
    active_days: number | string;
  }>).map((row) => ({
    productId: row.product_id,
    name: row.name,
    unit: row.unit,
    demand: Number(row.demand),
    suggested: Number(row.suggested),
    todaySold: Number(row.today_sold),
    remaining: Number(row.remaining),
    stockTotal: Number(row.stock_total),
    broughtOut: row.brought_out != null ? Number(row.brought_out) : null,
    activeDays: Number(row.active_days),
  }));

  return <ButcherClient thawTargets={thawTargets} />;
}
