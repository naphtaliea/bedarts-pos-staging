import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ThawGuide } from "@/components/thaw-guide";

export const revalidate = 0;

export default async function ThawPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!profile || !["admin", "manager", "accountant"].includes(profile.role)) {
    redirect("/dashboard");
  }

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
    productId: row.product_id ?? "",
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

  return (
    <div className="min-h-full bg-slate-50">
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 py-4">
          <p className="text-[10px] sm:text-[11px] font-black uppercase tracking-[0.15em] text-slate-400">
            Operations
          </p>
          <h1 className="text-slate-900 leading-tight text-xl sm:text-2xl font-display-black">
            Daily Thaw Guide
          </h1>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-6">
        <ThawGuide thawTargets={thawTargets} />
      </div>
    </div>
  );
}
