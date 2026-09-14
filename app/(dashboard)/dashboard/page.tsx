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
  if (!["admin", "manager"].includes(profile.role)) redirect("/pos");

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

  const [salesRes, productsRes, batchesRes] = await Promise.all([
    supabase
      .from("sales")
      .select(
        `id, total_amount, discount_amount, created_at,
         cashier:profiles!sales_cashier_id_fkey(full_name),
         payments(method, amount),
         sale_items(total_price, quantity, product:products(name, category:categories(name)))`
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
  ]);

  // ── Aggregations ──────────────────────────────────────────────────────────

  const allSales = (salesRes.data ?? []) as any[];
  const allProducts = (productsRes.data ?? []) as any[];
  const allBatches = (batchesRes.data ?? []) as any[];

  // Today stats
  const todaySales = allSales.filter((s) => s.created_at.startsWith(todayStr));
  const todayRevenue = todaySales.reduce((sum: number, s: any) => sum + s.total_amount, 0);
  const todayTransactions = todaySales.length;
  const todayDiscount = todaySales.reduce((sum: number, s: any) => sum + s.discount_amount, 0);

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

  // Recent 10 sales
  const recentSales = allSales.slice(0, 10).map((s: any) => ({
    id: s.id as string,
    total: s.total_amount as number,
    cashier: s.cashier?.full_name ?? "—",
    method: (s.payments?.[0]?.method as string) ?? "—",
    created_at: s.created_at as string,
  }));

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
      stockValue={stockValue}
      activeProductCount={activeProductCount}
      lowStockItems={lowStockItems}
      expiringItems={expiringItems}
      revenueByDay={revenueByDay}
      categoryMix={categoryMix}
      peakHours={peakHours}
      topProducts={topProducts}
      recentSales={recentSales}
    />
  );
}
