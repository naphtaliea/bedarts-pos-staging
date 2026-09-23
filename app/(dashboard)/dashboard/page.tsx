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
  const thirtyDaysFromNow = new Date(today);
  thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
  const thirtyDaysFromNowStr = thirtyDaysFromNow.toISOString().split("T")[0];
  const sevenDaysFromNowStr = new Date(today.getTime() + 7 * 86400000)
    .toISOString()
    .split("T")[0];

  const [salesRes, productsRes, batchesRes, expensesRes, payablesRes] = await Promise.all([
    supabase
      .from("sales")
      .select(
        `id, total_amount, discount_amount, created_at,
         cashier:profiles!sales_cashier_id_fkey(full_name),
         payments(method, amount),
         sale_items(total_price, quantity, cost_at_sale, product:products(name, cost_price, category:categories(name)))`
      )
      .gte("created_at", `${sevenDaysAgoStr}T00:00:00.000Z`)
      .eq("status", "completed")
      .order("created_at", { ascending: false }),

    supabase
      .from("product_stock")
      .select("id, name, stock_quantity, low_stock_threshold, unit")
      .eq("is_active", true),

    supabase
      .from("stock_batches")
      .select("quantity_remaining, cost_price, expiry_date, product:products(name)")
      .gt("quantity_remaining", 0),

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
  ]);

  // ── Aggregations ──────────────────────────────────────────────────────────

  const allSales = (salesRes.data ?? []) as any[];
  const allProducts = (productsRes.data ?? []) as any[];
  const allBatches = (batchesRes.data ?? []) as any[];
  const allExpenses = (expensesRes.data ?? []) as any[];
  const allUnpaidPurchases = (payablesRes.data ?? []) as any[];

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
  const todayRevenue = round2(todaySales.reduce((sum: number, s: any) => sum + Number(s.total_amount), 0));
  const todayTransactions = todaySales.length;
  const todayDiscount = round2(todaySales.reduce((sum: number, s: any) => sum + Number(s.discount_amount), 0));
  const todayCogs = round2(todaySales.reduce((sum: number, s: any) => sum + cogsOfSale(s), 0));
  const todayGrossProfit = round2(todayRevenue - todayCogs);

  // 7-day COGS + gross profit
  const sevenDayRevenue = round2(allSales.reduce((sum: number, s: any) => sum + Number(s.total_amount), 0));
  const sevenDayCogs = round2(allSales.reduce((sum: number, s: any) => sum + cogsOfSale(s), 0));
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
      revenue: daySales.reduce((sum: number, s: any) => sum + s.total_amount, 0),
      count: daySales.length,
    };
  });

  // Category mix (7-day)
  const categoryMap: Record<string, number> = {};
  for (const sale of allSales) {
    for (const item of sale.sale_items ?? []) {
      const cat = item.product?.category?.name ?? "Uncategorised";
      categoryMap[cat] = (categoryMap[cat] ?? 0) + (item.total_price ?? 0);
    }
  }
  const categoryMix = Object.entries(categoryMap)
    .map(([name, revenue]) => ({ name, revenue }))
    .sort((a, b) => b.revenue - a.revenue);

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
    hourMap[hour].revenue += sale.total_amount;
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
  const stockValue = allBatches.reduce(
    (sum: number, b: any) => sum + b.quantity_remaining * b.cost_price,
    0
  );

  // Expiry alerts
  const expiringItems = allBatches
    .filter((b: any) => b.expiry_date && b.expiry_date <= thirtyDaysFromNowStr)
    .map((b: any) => ({
      name: b.product?.name ?? "Unknown",
      expiry_date: b.expiry_date as string,
      quantity_remaining: b.quantity_remaining as number,
      urgent: (b.expiry_date as string) <= sevenDaysFromNowStr,
    }))
    .sort((a: any, b: any) => a.expiry_date.localeCompare(b.expiry_date));

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
      todayTransactions={todayTransactions}
      todayDiscount={todayDiscount}
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
      expiringItems={expiringItems}
      revenueByDay={revenueByDay}
      categoryMix={categoryMix}
      peakHours={peakHours}
      topProducts={topProducts}
      outstandingPayablesTotal={outstandingPayablesTotal}
      outstandingPayablesCount={outstandingPayablesCount}
    />
  );
}
