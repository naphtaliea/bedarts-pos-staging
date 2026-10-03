import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { DashboardClient } from "./dashboard-client";

export const revalidate = 0;

export default async function DashboardPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  if (!profile) redirect("/login");
  if (!["admin", "manager", "accountant"].includes(profile.role)) redirect("/pos");

  const today = new Date();
  const todayStr = today.toISOString().split("T")[0];
  const sevenDaysAgo = new Date(today);
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
  const sevenDaysAgoStr = sevenDaysAgo.toISOString().split("T")[0];

  const [salesRes, productsRes, expensesRes, payablesRes, refundsRes] = await Promise.all([
    supabase
      .from("sales")
      .select(
        `id, total_amount, discount_amount, created_at,
         cashier:profiles!sales_cashier_id_fkey(full_name),
         payments(method, amount),
         sale_items(total_price, quantity, cost_at_sale, product:products(name, cost_price))`
      )
      .gte("created_at", `${sevenDaysAgoStr}T00:00:00.000Z`)
      .eq("status", "completed")
      .order("created_at", { ascending: false }),

    supabase
      .from("product_stock")
      .select("id, name, stock_quantity, selling_price, low_stock_threshold, unit")
      .eq("is_active", true),

    supabase
      .from("expenses")
      .select("amount, expense_date, category:expense_categories(name)")
      .gte("expense_date", sevenDaysAgoStr)
      .lte("expense_date", todayStr)
      .eq("is_deleted", false),

    supabase
      .from("purchases")
      .select("total_amount")
      .eq("payment_status", "unpaid"),

    supabase
      .from("refunds")
      .select("sale_id, refund_amount")
      .gte("created_at", `${sevenDaysAgoStr}T00:00:00.000Z`),
  ]);

  // ── Aggregations ──────────────────────────────────────────────────────────

  const allSales = (salesRes.data ?? []) as any[];
  const allProducts = (productsRes.data ?? []) as any[];
  const allExpenses = (expensesRes.data ?? []) as any[];
  const allUnpaidPurchases = (payablesRes.data ?? []) as any[];

  // Build a per-sale refund total so revenue figures are net of refunds
  const refundMap: Record<string, number> = {};
  for (const r of (refundsRes.data ?? []) as any[]) {
    refundMap[r.sale_id] = (refundMap[r.sale_id] ?? 0) + Number(r.refund_amount);
  }
  const saleNet = (s: any) => Math.max(0, Number(s.total_amount) - (refundMap[s.id] ?? 0));

  // ── Money helpers — round to 2 decimals to avoid float drift ─────────────
  const round2 = (n: number) => Math.round(n * 100) / 100;

  const outstandingPayablesTotal = round2(
    allUnpaidPurchases.reduce((s: number, p: any) => s + Number(p.total_amount), 0)
  );
  const outstandingPayablesCount = allUnpaidPurchases.length;
  // COGS uses the per-unit cost_at_sale recorded at time of sale (accurate to
  // the batches consumed via FEFO). Falls back to current product.cost_price
  // only for pre-migration rows where cost_at_sale is NULL.
  const cogsOfSale = (sale: any): number =>
    (sale.sale_items ?? []).reduce((sum: number, i: any) => {
      const unitCost = i.cost_at_sale != null
        ? Number(i.cost_at_sale)
        : Number(i.product?.cost_price ?? 0);
      return sum + Number(i.quantity ?? 0) * unitCost;
    }, 0);

  // Today stats
  const todaySales = allSales.filter((s) => s.created_at.startsWith(todayStr));
  const todayRevenue = round2(todaySales.reduce((sum: number, s: any) => sum + saleNet(s), 0));
  const todayTransactions = todaySales.length;
  const todayCogs = round2(todaySales.reduce((sum: number, s: any) => {
    const refunded = refundMap[s.id] ?? 0;
    const refundPct = Number(s.total_amount) > 0 ? Math.min(1, refunded / Number(s.total_amount)) : 0;
    return sum + cogsOfSale(s) * (1 - refundPct);
  }, 0));
  const todayGrossProfit = round2(todayRevenue - todayCogs);

  // Payment method breakdown — single pass over all 7-day sales; today is a subset.
  // Waterfall refund attribution: momo up to what was paid via momo, then pos up to
  // what was paid via pos, then remainder implicit as cash (via saleNet reducing revenue).
  let _todayMomo = 0, _todayPos = 0, _sevenDayMomo = 0, _sevenDayPos = 0;
  for (const s of allSales) {
    const isT = s.created_at.startsWith(todayStr);
    let refundAmt = refundMap[s.id] ?? 0;
    let saleMomo = 0, salePos = 0;
    for (const p of (s.payments ?? []) as { method: string; amount: number }[]) {
      if (p.method === "momo") { saleMomo += Number(p.amount); }
      else if (p.method === "pos_machine") { salePos += Number(p.amount); }
    }
    const momoDeduct = Math.min(refundAmt, saleMomo); refundAmt -= momoDeduct;
    const posDeduct  = Math.min(refundAmt, salePos);
    _sevenDayMomo += saleMomo - momoDeduct;
    _sevenDayPos  += salePos  - posDeduct;
    if (isT) { _todayMomo += saleMomo - momoDeduct; _todayPos += salePos - posDeduct; }
  }
  const todayMomo = round2(_todayMomo);
  const todayPos = round2(_todayPos);
  const todayCash = round2(Math.max(0, todayRevenue - todayMomo - todayPos));
  const sevenDayMomo = round2(_sevenDayMomo);
  const sevenDayPos = round2(_sevenDayPos);

  // 7-day COGS + gross profit
  const sevenDayRevenue = round2(allSales.reduce((sum: number, s: any) => sum + saleNet(s), 0));
  const sevenDayCash = round2(Math.max(0, sevenDayRevenue - sevenDayMomo - sevenDayPos));
  const sevenDayCogs = round2(allSales.reduce((sum: number, s: any) => {
    const refunded = refundMap[s.id] ?? 0;
    const refundPct = Number(s.total_amount) > 0 ? Math.min(1, refunded / Number(s.total_amount)) : 0;
    return sum + cogsOfSale(s) * (1 - refundPct);
  }, 0));
  const sevenDayGrossProfit = round2(sevenDayRevenue - sevenDayCogs);

  // Expenses (by expense_date, not created_at)
  const todayExpenses = round2(
    allExpenses
      .filter((e: any) => e.expense_date === todayStr)
      .reduce((sum: number, e: any) => sum + Number(e.amount), 0)
  );
  const sevenDayExpenses = round2(
    allExpenses.reduce((sum: number, e: any) => sum + Number(e.amount), 0)
  );

  // Net profit
  const todayNetProfit = round2(todayGrossProfit - todayExpenses);
  const sevenDayNetProfit = round2(sevenDayGrossProfit - sevenDayExpenses);

  // Expense breakdown by category (7-day) for a small chart on the dashboard
  const expenseCategoryMap: Record<string, number> = {};
  for (const e of allExpenses) {
    const name = e.category?.name ?? "Uncategorised";
    expenseCategoryMap[name] = round2((expenseCategoryMap[name] ?? 0) + Number(e.amount));
  }
  const expensesByCategory = Object.entries(expenseCategoryMap)
    .map(([name, total]) => ({ name, total }))
    .sort((a, b) => b.total - a.total);

  // 7-day revenue by day
  const revenueByDay = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(sevenDaysAgo);
    d.setDate(d.getDate() + i);
    const dayStr = d.toISOString().split("T")[0];
    const daySales = allSales.filter((s) => s.created_at.startsWith(dayStr));
    return {
      day: dayStr,
      label: d.toLocaleDateString("en-GH", { weekday: "short", day: "numeric" }),
      revenue: daySales.reduce((sum: number, s: any) => sum + saleNet(s), 0),
      count: daySales.length,
    };
  });

  // Top 5 products (7-day)
  const productMap: Record<string, { revenue: number; units: number }> = {};
  for (const sale of allSales) {
    for (const item of sale.sale_items ?? []) {
      const name = item.product?.name ?? "Unknown";
      if (!productMap[name]) productMap[name] = { revenue: 0, units: 0 };
      productMap[name].revenue += item.total_price ?? 0;
      productMap[name].units += item.quantity ?? 0;
    }
  }
  const topProducts = Object.entries(productMap)
    .map(([name, data]) => ({ name, ...data }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 5);

  // Peak hours (7-day)
  const hourMap: Record<number, { count: number; revenue: number }> = {};
  for (const sale of allSales) {
    const hour = new Date(sale.created_at).getHours();
    if (!hourMap[hour]) hourMap[hour] = { count: 0, revenue: 0 };
    hourMap[hour].count++;
    hourMap[hour].revenue += saleNet(sale);
  }
  const peakHours = Array.from({ length: 18 }, (_, i) => {
    const h = i + 6; // 06:00 – 23:00
    return {
      hour: h,
      label: h < 12 ? `${h}am` : h === 12 ? "12pm" : `${h - 12}pm`,
      count: hourMap[h]?.count ?? 0,
      revenue: hourMap[h]?.revenue ?? 0,
    };
  });

  // Stock value
  const stockValue = allProducts.reduce(
    (sum: number, p: any) => sum + Number(p.stock_quantity ?? 0) * Number(p.selling_price ?? 0),
    0
  );

  // Low stock
  const lowStockItems = allProducts
    .filter((p: any) => p.stock_quantity < p.low_stock_threshold)
    .map((p: any) => ({
      name: p.name as string,
      stock_quantity: p.stock_quantity as number,
      low_stock_threshold: p.low_stock_threshold as number,
      unit: p.unit as string,
    }))
    .sort((a: any, b: any) => a.stock_quantity - b.stock_quantity);

  const activeProductCount = allProducts.length;

  return (
    <DashboardClient
      todayRevenue={todayRevenue}
      todayCash={todayCash}
      todayMomo={todayMomo}
      todayPos={todayPos}
      sevenDayCash={sevenDayCash}
      sevenDayMomo={sevenDayMomo}
      sevenDayPos={sevenDayPos}
      todayTransactions={todayTransactions}
      todayCogs={todayCogs}
      todayGrossProfit={todayGrossProfit}
      todayExpenses={todayExpenses}
      todayNetProfit={todayNetProfit}
      sevenDayRevenue={sevenDayRevenue}
      sevenDayCogs={sevenDayCogs}
      sevenDayGrossProfit={sevenDayGrossProfit}
      sevenDayExpenses={sevenDayExpenses}
      sevenDayNetProfit={sevenDayNetProfit}
      expensesByCategory={expensesByCategory}
      stockValue={stockValue}
      activeProductCount={activeProductCount}
      lowStockItems={lowStockItems}
      revenueByDay={revenueByDay}
      peakHours={peakHours}
      topProducts={topProducts}
      outstandingPayablesTotal={outstandingPayablesTotal}
      outstandingPayablesCount={outstandingPayablesCount}
    />
  );
}
