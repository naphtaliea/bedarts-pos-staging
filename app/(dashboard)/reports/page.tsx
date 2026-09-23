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

  const [salesRes, adjustmentsRes, expensesRes] = await Promise.all([
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
  ]);

  return (
    <ReportsClient
      fromDate={fromDate}
      toDate={toDate}
      sales={(salesRes.data ?? []) as any[]}
      adjustments={(adjustmentsRes.data ?? []) as any[]}
      expenses={(expensesRes.data ?? []) as any[]}
    />
  );
}
