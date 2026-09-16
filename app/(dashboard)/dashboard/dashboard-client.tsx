"use client";

import { useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { AlertTriangle, X, Clock, TrendingUp } from "lucide-react";
import { cn, formatCurrency } from "@/lib/utils";

// ── Types ────────────────────────────────────────────────────────────────────

interface RecentSale {
  id: string;
  total: number;
  cashier: string;
  method: string;
  created_at: string;
}

interface DashboardClientProps {
  todayRevenue: number;
  todayTransactions: number;
  todayDiscount: number;
  stockValue: number;
  activeProductCount: number;
  lowStockItems: { name: string; stock_quantity: number; low_stock_threshold: number; unit: string }[];
  expiringItems: { name: string; expiry_date: string; quantity_remaining: number; urgent: boolean }[];
  revenueByDay: { day: string; label: string; revenue: number; count: number }[];
  categoryMix: { name: string; revenue: number }[];
  peakHours: { hour: number; label: string; count: number; revenue: number }[];
  topProducts: { name: string; revenue: number; units: number }[];
  recentSales: RecentSale[];
}

// ── Constants ────────────────────────────────────────────────────────────────

const DONUT_COLORS = ["#CC1B14", "#1B50C0", "#16A34A", "#D97706", "#7C3AED", "#0891B2", "#6B7280"];

const METHOD_LABELS: Record<string, string> = {
  cash: "Cash",
  momo: "MoMo",
  pos_machine: "POS",
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatShortDate(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-GH", { month: "short", day: "numeric" });
}

function formatTime(dateStr: string) {
  return new Date(dateStr).toLocaleTimeString("en-GH", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function daysUntil(dateStr: string) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(dateStr);
  return Math.round((target.getTime() - today.getTime()) / 86400000);
}

// ── Custom tooltip for revenue chart ─────────────────────────────────────────

function RevenueTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-border bg-card shadow-md px-3 py-2 text-xs">
      <p className="font-medium text-foreground mb-1">{label}</p>
      <p className="text-primary font-bold">{formatCurrency(payload[0].value)}</p>
      <p className="text-muted-foreground">{payload[0].payload.count} sales</p>
    </div>
  );
}

function HoursTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-border bg-card shadow-md px-3 py-2 text-xs">
      <p className="font-medium text-foreground mb-1">{label}</p>
      <p className="text-accent font-bold">{payload[0].value} sales</p>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export function DashboardClient({
  todayRevenue,
  todayTransactions,
  todayDiscount,
  stockValue,
  activeProductCount,
  lowStockItems,
  expiringItems,
  revenueByDay,
  categoryMix,
  peakHours,
  topProducts,
  recentSales,
}: DashboardClientProps) {
  const [dismissedAlerts, setDismissedAlerts] = useState<string[]>([]);

  const urgentExpiry = expiringItems.filter((e) => e.urgent);
  const hasLowStock = lowStockItems.length > 0;
  const hasUrgentExpiry = urgentExpiry.length > 0;

  const totalRevenue7d = revenueByDay.reduce((s, d) => s + d.revenue, 0);
  const maxRevenue = Math.max(...revenueByDay.map((d) => d.revenue), 1);
  const maxHourCount = Math.max(...peakHours.map((h) => h.count), 1);

  return (
    <div className="p-6 space-y-6 max-w-[1400px] mx-auto">

      {/* ── Alert banners ───────────────────────────────────────── */}
      <div className="space-y-2">
        {hasUrgentExpiry && !dismissedAlerts.includes("expiry") && (
          <div className="flex items-start justify-between gap-4 rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-4 h-4 text-destructive mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-semibold text-destructive">
                  {urgentExpiry.length} batch{urgentExpiry.length > 1 ? "es" : ""} expiring within 7 days
                </p>
                <p className="text-xs text-destructive/80 mt-0.5">
                  {urgentExpiry.slice(0, 3).map((e) => e.name).join(", ")}
                  {urgentExpiry.length > 3 ? ` + ${urgentExpiry.length - 3} more` : ""}
                </p>
              </div>
            </div>
            <button
              onClick={() => setDismissedAlerts((d) => [...d, "expiry"])}
              className="shrink-0 text-destructive/60 hover:text-destructive transition-colors"
              aria-label="Dismiss alert"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {hasLowStock && !dismissedAlerts.includes("lowstock") && (
          <div className="flex items-start justify-between gap-4 rounded-xl border border-warning/30 bg-warning/5 px-4 py-3">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-4 h-4 text-warning mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-semibold text-warning">
                  {lowStockItems.length} product{lowStockItems.length > 1 ? "s" : ""} below reorder threshold
                </p>
                <p className="text-xs text-warning/80 mt-0.5">
                  {lowStockItems.slice(0, 3).map((p) => p.name).join(", ")}
                  {lowStockItems.length > 3 ? ` + ${lowStockItems.length - 3} more` : ""}
                </p>
              </div>
            </div>
            <button
              onClick={() => setDismissedAlerts((d) => [...d, "lowstock"])}
              className="shrink-0 text-warning/60 hover:text-warning transition-colors"
              aria-label="Dismiss alert"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* ── Stat cards ──────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
        <StatCard
          label="Today's Revenue"
          value={formatCurrency(todayRevenue)}
          sub={`${todayTransactions} sale${todayTransactions !== 1 ? "s" : ""}`}
          accent="accent"
        />
        <StatCard
          label="7-Day Revenue"
          value={formatCurrency(totalRevenue7d)}
          sub="last 7 days"
          accent="accent"
        />
        <StatCard
          label="Stock Value"
          value={formatCurrency(stockValue)}
          sub="cost basis"
          accent="neutral"
        />
        <StatCard
          label="Active Products"
          value={String(activeProductCount)}
          sub="in catalogue"
          accent="neutral"
        />
        <StatCard
          label="Low Stock"
          value={String(lowStockItems.length)}
          sub={lowStockItems.length === 0 ? "all clear" : "need restocking"}
          accent={lowStockItems.length > 0 ? "warning" : "success"}
        />
        <StatCard
          label="Expiring Soon"
          value={String(expiringItems.length)}
          sub={expiringItems.length === 0 ? "nothing due" : "within 30 days"}
          accent={urgentExpiry.length > 0 ? "destructive" : expiringItems.length > 0 ? "warning" : "success"}
        />
      </div>

      {/* ── Revenue + Category ───────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Revenue bar chart */}
        <div className="lg:col-span-2 rounded-2xl border border-border bg-card p-5">
          <div className="flex items-center justify-between mb-5">
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Revenue</p>
              <p className="text-sm font-semibold text-foreground mt-0.5">Last 7 days</p>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <TrendingUp className="w-3.5 h-3.5" />
              {formatCurrency(totalRevenue7d)} total
            </div>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={revenueByDay} barSize={28} margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
              <XAxis
                dataKey="label"
                tick={{ fontSize: 11, fill: "#6B7280" }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis hide />
              <Tooltip content={<RevenueTooltip />} cursor={{ fill: "rgba(0,0,0,0.04)" }} />
              <Bar dataKey="revenue" fill="#CC1B14" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Category donut */}
        <div className="rounded-2xl border border-border bg-card p-5">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-0.5">Category Mix</p>
          <p className="text-sm font-semibold text-foreground mb-4">7-day sales</p>
          {categoryMix.length === 0 ? (
            <div className="flex items-center justify-center h-[200px] text-sm text-muted-foreground">
              No sales data
            </div>
          ) : (
            <>
              <ResponsiveContainer width="100%" height={160}>
                <PieChart>
                  <Pie
                    data={categoryMix}
                    cx="50%"
                    cy="50%"
                    innerRadius={45}
                    outerRadius={72}
                    dataKey="revenue"
                    paddingAngle={2}
                  >
                    {categoryMix.map((_, i) => (
                      <Cell key={i} fill={DONUT_COLORS[i % DONUT_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value) => formatCurrency(Number(value))}
                    contentStyle={{
                      fontSize: 12,
                      borderRadius: 8,
                      border: "1px solid var(--color-border)",
                      background: "var(--color-card)",
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-1.5 mt-2">
                {categoryMix.slice(0, 5).map((c, i) => {
                  const pct = totalRevenue7d > 0 ? (c.revenue / totalRevenue7d) * 100 : 0;
                  return (
                    <div key={c.name} className="flex items-center gap-2">
                      <span
                        className="w-2 h-2 rounded-full shrink-0"
                        style={{ background: DONUT_COLORS[i % DONUT_COLORS.length] }}
                      />
                      <span className="text-xs text-foreground truncate flex-1">{c.name}</span>
                      <span className="text-xs font-medium text-muted-foreground tabular-nums">
                        {pct.toFixed(0)}%
                      </span>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </div>

      {/* ── Peak Hours ───────────────────────────────────────────── */}
      <div className="rounded-2xl border border-border bg-card p-5">
        <div className="flex items-center gap-2 mb-5">
          <Clock className="w-4 h-4 text-muted-foreground" />
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Peak Hours</p>
            <p className="text-sm font-semibold text-foreground">Sales volume by hour · 7-day average</p>
          </div>
        </div>
        <ResponsiveContainer width="100%" height={120}>
          <BarChart data={peakHours} barSize={14} margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
            <XAxis
              dataKey="label"
              tick={{ fontSize: 10, fill: "#6B7280" }}
              axisLine={false}
              tickLine={false}
              interval={1}
            />
            <YAxis hide />
            <Tooltip content={<HoursTooltip />} cursor={{ fill: "rgba(0,0,0,0.04)" }} />
            <Bar dataKey="count" fill="#1B50C0" radius={[3, 3, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* ── Top Products + Recent Sales ──────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Top 5 products */}
        <div className="rounded-2xl border border-border bg-card p-5">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-0.5">Top Products</p>
          <p className="text-sm font-semibold text-foreground mb-4">By revenue · 7 days</p>
          {topProducts.length === 0 ? (
            <p className="text-sm text-muted-foreground">No sales data</p>
          ) : (
            <div className="space-y-3">
              {topProducts.map((p, i) => {
                const pct = topProducts[0].revenue > 0 ? (p.revenue / topProducts[0].revenue) * 100 : 0;
                return (
                  <div key={p.name}>
                    <div className="flex items-baseline justify-between mb-1">
                      <span className="text-xs text-foreground truncate max-w-[60%]">
                        <span className="text-muted-foreground mr-1.5 font-medium tabular-nums">{i + 1}.</span>
                        {p.name}
                      </span>
                      <span className="text-xs font-semibold text-foreground tabular-nums">
                        {formatCurrency(p.revenue)}
                      </span>
                    </div>
                    <div className="h-1 rounded-full bg-secondary overflow-hidden">
                      <div
                        className="h-full rounded-full bg-primary transition-all"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Recent transactions */}
        <div className="lg:col-span-2 rounded-2xl border border-border bg-card overflow-hidden">
          <div className="px-5 py-4 border-b border-border">
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Recent Sales</p>
            <p className="text-sm font-semibold text-foreground">Last 10 transactions</p>
          </div>
          {recentSales.length === 0 ? (
            <div className="p-5 text-sm text-muted-foreground">No sales in the last 7 days</div>
          ) : (
            <div className="divide-y divide-border">
              {recentSales.map((sale) => (
                <div key={sale.id} className="flex items-center justify-between px-5 py-3 gap-4">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{sale.cashier}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatShortDate(sale.created_at)} · {formatTime(sale.created_at)}
                    </p>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className="text-xs text-muted-foreground px-2 py-0.5 rounded-full bg-secondary capitalize">
                      {METHOD_LABELS[sale.method] ?? sale.method}
                    </span>
                    <span className="text-sm font-semibold text-foreground tabular-nums">
                      {formatCurrency(sale.total)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Expiry + Low Stock lists ─────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pb-6">
        {/* Expiry alert list */}
        <div className="rounded-2xl border border-border bg-card overflow-hidden">
          <div className="px-5 py-4 border-b border-border">
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Expiry Alerts</p>
            <p className="text-sm font-semibold text-foreground">Stock batches expiring within 30 days</p>
          </div>
          {expiringItems.length === 0 ? (
            <div className="px-5 py-8 text-center">
              <p className="text-sm text-muted-foreground">No batches expiring in the next 30 days</p>
            </div>
          ) : (
            <div className="divide-y divide-border max-h-72 overflow-y-auto">
              {expiringItems.map((item, i) => {
                const days = daysUntil(item.expiry_date);
                return (
                  <div key={i} className="flex items-center justify-between px-5 py-3 gap-4">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{item.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {item.quantity_remaining.toFixed(2)} remaining
                      </p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p
                        className={cn(
                          "text-xs font-semibold",
                          item.urgent ? "text-destructive" : "text-warning"
                        )}
                      >
                        {days === 0 ? "Expires today" : days < 0 ? "Expired" : `${days}d left`}
                      </p>
                      <p className="text-xs text-muted-foreground">{formatShortDate(item.expiry_date)}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Low stock list */}
        <div className="rounded-2xl border border-border bg-card overflow-hidden">
          <div className="px-5 py-4 border-b border-border">
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Low Stock</p>
            <p className="text-sm font-semibold text-foreground">Products below reorder threshold</p>
          </div>
          {lowStockItems.length === 0 ? (
            <div className="px-5 py-8 text-center">
              <p className="text-sm text-muted-foreground">All products are adequately stocked</p>
            </div>
          ) : (
            <div className="divide-y divide-border max-h-72 overflow-y-auto">
              {lowStockItems.map((item, i) => {
                const pct = item.low_stock_threshold > 0
                  ? Math.min((item.stock_quantity / item.low_stock_threshold) * 100, 100)
                  : 0;
                return (
                  <div key={i} className="px-5 py-3">
                    <div className="flex items-baseline justify-between mb-1.5">
                      <p className="text-sm font-medium text-foreground truncate max-w-[65%]">{item.name}</p>
                      <p className="text-xs text-muted-foreground tabular-nums shrink-0">
                        {item.stock_quantity.toFixed(2)} / {item.low_stock_threshold} {item.unit}
                      </p>
                    </div>
                    <div className="h-1.5 rounded-full bg-secondary overflow-hidden">
                      <div
                        className={cn(
                          "h-full rounded-full transition-all",
                          pct < 25 ? "bg-destructive" : "bg-warning"
                        )}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Stat card ─────────────────────────────────────────────────────────────────

type AccentType = "primary" | "accent" | "success" | "warning" | "destructive" | "neutral";

const ACCENT_BORDER: Record<AccentType, string> = {
  primary:     "border-l-primary",
  accent:      "border-l-accent",
  success:     "border-l-success",
  warning:     "border-l-warning",
  destructive: "border-l-destructive",
  neutral:     "border-l-border",
};

function StatCard({
  label,
  value,
  sub,
  accent,
}: {
  label: string;
  value: string;
  sub: string;
  accent: AccentType;
}) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-border bg-card px-5 py-4 border-l-4",
        ACCENT_BORDER[accent]
      )}
    >
      <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-2">
        {label}
      </p>
      <p
        className="text-2xl text-foreground tabular-nums leading-none"
        style={{ fontFamily: "var(--font-display)", fontWeight: 900 }}
      >
        {value}
      </p>
      <p className="text-xs text-muted-foreground mt-1.5">{sub}</p>
    </div>
  );
}
