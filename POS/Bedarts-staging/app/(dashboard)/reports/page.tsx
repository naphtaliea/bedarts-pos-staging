import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ReportsClient } from "./reports-client";

export const revalidate = 0;

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string }>;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (!["admin", "manager", "accountant"].includes(profile?.role ?? "")) redirect("/pos");

  const params = await searchParams;

  const today = new Date();
  const toDate = params.to ?? today.toISOString().split("T")[0];
  const fromDate = params.from ?? (() => {
    const d = new Date(today);
    d.setDate(d.getDate() - 29);
    return d.toISOString().split("T")[0];
  })();

  const [salesRes, adjustmentsRes, expensesRes, refundsRes] = await Promise.all([
    supabase
      .from("sales")
      .select(
        `id, total_amount, discount_amount, subtotal, created_at, status,
         cashier:profiles!sales_cashier_id_fkey(full_name),
         payments(method, amount),
         sale_items(total_price, quantity, unit_price, cost_at_sale, product:products(name, cost_price, category:categories(name)))`
      )
      .gte("created_at", `${fromDate}T00:00:00.000Z`)
      .lte("created_at", `${toDate}T23:59:59.999Z`)
      .order("created_at", { ascending: false }),

    supabase
      .from("stock_adjustments")
      .select("quantity_change, reason, created_at, product:products(name)")
      .gte("created_at", `${fromDate}T00:00:00.000Z`)
      .lte("created_at", `${toDate}T23:59:59.999Z`)
      .order("created_at", { ascending: false }),

    supabase
      .from("expenses")
      .select("amount, expense_date, category:expense_categories(name)")
      .gte("expense_date", fromDate)
      .lte("expense_date", toDate)
      .eq("is_deleted", false)
      .order("expense_date", { ascending: false }),

    supabase
      .from("refunds")
      .select("sale_id, refund_amount")
      .gte("created_at", `${fromDate}T00:00:00.000Z`)
      .lte("created_at", `${toDate}T23:59:59.999Z`),
  ]);

  // Deduct refunds from each sale's total_amount so all downstream calculations are net
  const refundMap: Record<string, number> = {};
  for (const r of (refundsRes.data ?? []) as any[]) {
    refundMap[r.sale_id] = (refundMap[r.sale_id] ?? 0) + Number(r.refund_amount);
  }
  const salesWithNetAmount = ((salesRes.data ?? []) as any[]).map((s) => ({
    ...s,
    total_amount: Math.max(0, Number(s.total_amount) - (refundMap[s.id] ?? 0)),
  }));

  // Compute payment breakdown server-side so the correct figures reach the
  // client regardless of which JS bundle version the browser has cached.
  // Cash is derived from total_amount after deducting non-cash payments —
  // raw cash records are over-tendered (change given back) and cannot be summed directly.
  const paymentMap: Record<string, { total: number; count: number }> = {};
  for (const sale of salesWithNetAmount) {
    if (sale.status !== "completed") continue;
    let saleNonCash = 0;
    for (const p of sale.payments ?? []) {
      if (p.method === "cash") continue;
      if (!paymentMap[p.method]) paymentMap[p.method] = { total: 0, count: 0 };
      paymentMap[p.method].total = Math.round((paymentMap[p.method].total + Number(p.amount)) * 100) / 100;
      paymentMap[p.method].count++;
      saleNonCash += Number(p.amount);
    }
    const saleCash = Math.max(0, Number(sale.total_amount) - saleNonCash);
    if (saleCash > 0) {
      if (!paymentMap["cash"]) paymentMap["cash"] = { total: 0, count: 0 };
      paymentMap["cash"].total = Math.round((paymentMap["cash"].total + saleCash) * 100) / 100;
      paymentMap["cash"].count++;
    }
  }

  return (
    <ReportsClient
      fromDate={fromDate}
      toDate={toDate}
      sales={salesWithNetAmount}
      adjustments={(adjustmentsRes.data ?? []) as any[]}
      expenses={(expensesRes.data ?? []) as any[]}
      paymentBreakdown={paymentMap}
    />
  );
}
