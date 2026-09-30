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
    name: string;
    unit: string;
    suggested: number | string;
    today_sold: number | string;
    active_days: number;
  }>).map((row) => ({
    name: row.name,
    unit: row.unit,
    suggested: Number(row.suggested),
    todaySold: Number(row.today_sold),
    activeDays: row.active_days,
  }));

  return <ButcherClient thawTargets={thawTargets} />;
}
