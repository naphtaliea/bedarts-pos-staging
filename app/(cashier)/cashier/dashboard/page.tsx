import { createClient } from "@/lib/supabase/server";
import { PosTopBar } from "@/components/pos/pos-topbar";
import { formatCurrency } from "@/lib/utils";
import { redirect } from "next/navigation";
import { TrendingUp, ShoppingCart, Receipt } from "lucide-react";

type SaleItemWithProduct = {
  product_id: string;
  quantity: number;
  products: { name: string }[] | { name: string } | null;
};

type SaleRow = {
  id: string;
  total_amount: number;
  created_at: string;
  sale_items: SaleItemWithProduct[];
};

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name")
    .eq("id", user.id)
    .single();

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const { data: salesData } = await supabase
    .from("sales")
    .select(
      "id, total_amount, created_at, sale_items(product_id, quantity, products(name))"
    )
    .gte("created_at", today.toISOString())
    .eq("status", "completed");

  const sales = (salesData ?? []) as unknown as SaleRow[];

  const totalRevenue = sales.reduce((s, o) => s + o.total_amount, 0);
  const orderCount = sales.length;
  const avgTicket = orderCount > 0 ? totalRevenue / orderCount : 0;

  // Aggregate top products
  const productTotals: Record<string, { name: string; qty: number }> = {};
  for (const sale of sales) {
    for (const item of sale.sale_items) {
      const p = item.products;
      const name = Array.isArray(p) ? (p[0]?.name ?? "Unknown") : (p?.name ?? "Unknown");
      if (!productTotals[item.product_id]) {
        productTotals[item.product_id] = { name, qty: 0 };
      }
      productTotals[item.product_id].qty += item.quantity;
    }
  }

  const topProducts = Object.values(productTotals)
    .sort((a, b) => b.qty - a.qty)
    .slice(0, 8);

  const maxQty = topProducts[0]?.qty ?? 1;

  const STATS = [
    {
      label: "Revenue",
      value: formatCurrency(totalRevenue),
      icon: TrendingUp,
      color: "text-primary",
      bg: "bg-primary/10",
    },
    {
      label: "Orders",
      value: String(orderCount),
      icon: ShoppingCart,
      color: "text-accent",
      bg: "bg-accent/10",
    },
    {
      label: "Avg Ticket",
      value: formatCurrency(avgTicket),
      icon: Receipt,
      color: "text-success",
      bg: "bg-success/10",
    },
  ];

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <PosTopBar cashierName={profile?.full_name ?? ""} showBack backHref="/cashier" />

      <main className="flex-1 p-4 lg:p-6 space-y-6 max-w-5xl mx-auto w-full">
        <div>
          <h1 className="text-xl font-bold text-foreground">Today</h1>
          <p className="text-sm text-muted-foreground">
            {new Date().toLocaleDateString("en-GH", { dateStyle: "full" })}
          </p>
        </div>

        {/* Stat cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {STATS.map((stat) => {
            const Icon = stat.icon;
            return (
              <div
                key={stat.label}
                className="rounded-xl border border-border bg-card p-5 flex items-start gap-4"
              >
                <div
                  className={`shrink-0 w-10 h-10 rounded-xl ${stat.bg} flex items-center justify-center`}
                >
                  <Icon className={`w-5 h-5 ${stat.color}`} />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">
                    {stat.label}
                  </p>
                  <p className="text-2xl font-bold text-foreground tabular-nums mt-0.5">
                    {stat.value}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Top-selling items */}
        <div className="rounded-xl border border-border bg-card p-5">
          <h2 className="text-sm font-semibold text-foreground mb-4">
            Top Selling Products
          </h2>

          {topProducts.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No sales recorded today
            </p>
          ) : (
            <div className="space-y-3">
              {topProducts.map((p, idx) => (
                <div key={idx} className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="text-foreground truncate pr-2">{p.name}</span>
                    <span className="text-muted-foreground tabular-nums shrink-0">
                      {p.qty} sold
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-secondary overflow-hidden">
                    <div
                      className="h-full rounded-full bg-primary transition-all"
                      style={{ width: `${(p.qty / maxQty) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
