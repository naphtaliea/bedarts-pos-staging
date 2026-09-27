"use client";

import { useState, useEffect } from "react";
import { TrendingUp, ShoppingCart, Receipt } from "lucide-react";
import { getDashboardSales } from "@/app/(cashier)/cashier/dashboard/actions";
import { PosTopBar } from "@/components/pos/pos-topbar";
import { EODSection } from "@/app/(cashier)/cashier/dashboard/eod-section";
import { formatCurrency } from "@/lib/utils";
import type { Profile, PaymentMethod } from "@/lib/types";

interface DashboardViewProps {
  cashier: Profile;
  onBack: () => void;
}

type SaleRow = {
  id: string;
  total_amount: number;
  created_at: string;
  sale_items: { product_id: string; quantity: number; products: { name: string } | { name: string }[] | null }[];
  payments: { method: PaymentMethod; amount: number }[];
};

export function DashboardView({ cashier, onBack }: DashboardViewProps) {
  const canSeeRevenue = cashier.role === "admin" || cashier.role === "manager" || cashier.role === "accountant";
  const [sales, setSales] = useState<SaleRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      if (!navigator.onLine) { setLoading(false); return; }
      try {
        const result = await getDashboardSales();
        setSales(result.sales as unknown as SaleRow[]);
      } catch {
        // leave sales empty
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  let grossSales = 0, momoSales = 0, posSales = 0;
  for (const sale of sales) {
    grossSales += Number(sale.total_amount);
    for (const p of sale.payments ?? []) {
      if (p.method === "momo") momoSales += Number(p.amount);
      else if (p.method === "pos_machine") posSales += Number(p.amount);
    }
  }
  const cashSales = Math.max(0, grossSales - momoSales - posSales);
  const totalRevenue = grossSales;
  const orderCount = sales.length;
  const avgTicket = orderCount > 0 ? totalRevenue / orderCount : 0;

  const productTotals: Record<string, { name: string; qty: number }> = {};
  for (const sale of sales) {
    for (const item of sale.sale_items) {
      const p = item.products;
      const name = Array.isArray(p) ? (p[0]?.name ?? "Unknown") : (p?.name ?? "Unknown");
      if (!productTotals[item.product_id]) productTotals[item.product_id] = { name, qty: 0 };
      productTotals[item.product_id].qty += item.quantity;
    }
  }

  const topProducts = Object.values(productTotals).sort((a, b) => b.qty - a.qty).slice(0, 8);
  const maxQty = topProducts[0]?.qty ?? 1;

  const STATS = [
    ...(canSeeRevenue ? [{ label: "Revenue", value: formatCurrency(totalRevenue), icon: TrendingUp, color: "text-primary", bg: "bg-primary/10", accent: "border-l-primary" }] : []),
    { label: "Orders", value: String(orderCount), icon: ShoppingCart, color: "text-accent", bg: "bg-accent/10", accent: "border-l-accent" },
    ...(canSeeRevenue ? [{ label: "Avg Ticket", value: formatCurrency(avgTicket), icon: Receipt, color: "text-success", bg: "bg-success/10", accent: "border-l-success" }] : []),
  ];

  return (
    <div className="flex flex-col h-dvh bg-background overflow-hidden animate-page-enter">
      <PosTopBar
        cashierName={cashier.full_name}
        avatarUrl={cashier.avatar_url}
        title="Cashier Dashboard"
        showBack
        onBack={onBack}
        hideDashboardLink
      />

      <div className="shrink-0 border-b border-border px-4 lg:px-6 py-2 bg-white">
        <p className="text-sm text-muted-foreground">{new Date().toLocaleDateString("en-GH", { dateStyle: "full" })}</p>
      </div>

      <main className="flex-1 overflow-y-auto p-4 lg:p-6 space-y-6 max-w-5xl mx-auto w-full">
        {loading ? (
          <div className="space-y-4 animate-pulse">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {[1, 2, 3].map((i) => <div key={i} className="h-24 rounded-xl bg-secondary" />)}
            </div>
            <div className="h-64 rounded-xl bg-secondary" />
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {STATS.map((stat) => {
                const Icon = stat.icon;
                return (
                  <div
                    key={stat.label}
                    className={`rounded-xl border border-border border-l-[3px] ${stat.accent} bg-card p-5 flex items-start gap-4 shadow-sm hover:shadow-md transition-shadow`}
                  >
                    <div className={`shrink-0 w-11 h-11 rounded-xl ${stat.bg} flex items-center justify-center`}>
                      <Icon className={`w-5 h-5 ${stat.color}`} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[10px] text-muted-foreground uppercase tracking-[0.15em] font-bold">{stat.label}</p>
                      <p className="font-display text-2xl font-black text-foreground tabular-nums mt-0.5 leading-tight">{stat.value}</p>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="rounded-xl border border-border bg-card p-5">
              <h2 className="text-sm font-semibold text-foreground mb-4">Top Selling Products</h2>
              {topProducts.length === 0 ? (
                <p className="text-sm text-muted-foreground">No sales recorded today</p>
              ) : (
                <div className="space-y-3">
                  {topProducts.map((p, idx) => (
                    <div key={idx} className="space-y-1">
                      <div className="flex justify-between text-sm">
                        <span className="text-foreground truncate pr-2">{p.name}</span>
                        <span className="text-muted-foreground tabular-nums shrink-0">{p.qty} sold</span>
                      </div>
                      <div className="h-2 rounded-full bg-secondary overflow-hidden">
                        <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${(p.qty / maxQty) * 100}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <EODSection
              role={cashier.role}
              grossSales={grossSales}
              cashSales={cashSales}
              momoSales={momoSales}
              posSales={posSales}
              todayExpenses={0}
            />
          </>
        )}
      </main>
    </div>
  );
}
