"use client";

import { useState, useEffect } from "react";
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
import { AlertTriangle, X, Clock, TrendingUp, TrendingDown, ArrowRight } from "lucide-react";
import Link from "next/link";
import { cn, formatCurrency } from "@/lib/utils";

// ── Types ────────────────────────────────────────────────────────────────────

interface DashboardClientProps {
  todayRevenue: number;
  todayTransactions: number;
  todayDiscount: number;
  todayCogs: number;
  todayGrossProfit: number;
  todayExpenses: number;
  todayNetProfit: number;
  sevenDayRevenue: number;
  sevenDayCogs: number;
  sevenDayGrossProfit: number;
  sevenDayExpenses: number;
  sevenDayNetProfit: number;
  expensesByCategory: { name: string; total: number }[];
  stockValue: number;
  activeProductCount: number;
  lowStockItems: { name: string; stock_quantity: number; low_stock_threshold: number; unit: string }[];
  expiringItems: { name: string; expiry_date: string; quantity_remaining: number; urgent: boolean }[];
  revenueByDay: { day: string; label: string; revenue: number; count: number }[];
  categoryMix: { name: string; revenue: number }[];
  peakHours: { hour: number; label: string; count: number; revenue: number }[];
  topProducts: { name: string; revenue: number; units: number }[];
  outstandingPayablesTotal: number;
  outstandingPayablesCount: number;
}

// ── Constants ────────────────────────────────────────────────────────────────

const DONUT_COLORS = ["#1B50C0", "#16A34A", "#D97706", "#7C3AED", "#0891B2", "#0F172A", "#6B7280"];

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatShortDate(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-GH", { month: "short", day: "numeric" });
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
  todayCogs,
  todayGrossProfit,
  todayExpenses,
  todayNetProfit,
  sevenDayRevenue,
  sevenDayCogs,
  sevenDayGrossProfit,
  sevenDayExpenses,
  sevenDayNetProfit,
  expensesByCategory,
  stockValue,
  activeProductCount,
  lowStockItems,
  expiringItems,
  revenueByDay,
  categoryMix,
  peakHours,
  topProducts,
  outstandingPayablesTotal,
  outstandingPayablesCount,
}: DashboardClientProps) {
  // Persist alert dismissals per calendar day so they don't nag on every refresh,
  // but reset naturally each day (in case the underlying situation is still true).
  const todayKey = new Date().toISOString().slice(0, 10);
  const storageKey = `bedarts.dismissedAlerts.${todayKey}`;

  const [dismissedAlerts, setDismissedAlerts] = useState<string[]>([]);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(storageKey);
      if (raw) setDismissedAlerts(JSON.parse(raw));
    } catch { /* ignore parse errors */ }
  }, [storageKey]);

  useEffect(() => {
    try { window.localStorage.setItem(storageKey, JSON.stringify(dismissedAlerts)); } catch {}
  }, [dismissedAlerts, storageKey]);

  const urgentExpiry = expiringItems.filter((e) => e.urgent);
  const hasLowStock = lowStockItems.length > 0;
  const hasUrgentExpiry = urgentExpiry.length > 0;

  const totalRevenue7d = revenueByDay.reduce((s, d) => s + d.revenue, 0);
  const maxRevenue = Math.max(...revenueByDay.map((d) => d.revenue), 1);
  const maxHourCount = Math.max(...peakHours.map((h) => h.count), 1);

  return (
    <>
      {/* Branded page banner */}
      <div className="relative bg-white overflow-hidden">
        <div className="border-b border-border px-4 lg:px-6 py-4 lg:py-5 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-1 self-stretch rounded-full bg-primary shrink-0" />
            <div>
              <p className="text-muted-foreground text-[11px] font-bold uppercase tracking-widest mb-1">Bedarts Cold Supplies</p>
              <h1 className="text-foreground leading-none" style={{ fontFamily: "var(--font-display)", fontWeight: 900, fontSize: "clamp(1.5rem, 3vw, 2.25rem)" }}>Dashboard</h1>
            </div>
          </div>
          <img src="/icon-192.png" className="h-12 w-auto opacity-[0.08]" aria-hidden="true" draggable={false} />
        </div>
      </div>
    <div className="p-4 lg:p-6 space-y-4 lg:space-y-6 max-w-[1400px] mx-auto">

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
      <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3">
        <StatCard
          label="Today's Revenue"
          value={formatCurrency(todayRevenue)}
          sub={`${todayTransactions} sale${todayTransactions !== 1 ? "s" : ""}`}
          accent="accent"
          hero="red"
        />
        <StatCard
          label="7-Day Revenue"
          value={formatCurrency(totalRevenue7d)}
          sub="last 7 days"
          accent="accent"
          hero="navy"
        />
        <StatCard
          label="Stock Value"
          value={formatCurrency(stockValue)}
          sub="cost basis"
          accent="neutral"
        />
        <StatCard
          label="Payables"
          value={formatCurrency(outstandingPayablesTotal)}
          sub={
            outstandingPayablesCount === 0
              ? "no outstanding invoices"
              : `${outstandingPayablesCount} unpaid invoice${outstandingPayablesCount !== 1 ? "s" : ""}`
          }
          accent={outstandingPayablesCount > 0 ? "warning" : "success"}
        />
      </div>

      {/* ── Secondary stat cards ─────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-3 gap-3">
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

      {/* ── P&L snapshot ─────────────────────────────────────────── */}
      <ProfitLossPanel
        todayRevenue={todayRevenue}
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
      />

      {/* ── Revenue + Category ───────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-6">
        {/* Revenue bar chart */}
        <div className="lg:col-span-2 rounded-2xl border border-border bg-card p-5">
          <div className="flex items-center justify-between mb-5">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Revenue</p>
              <h3 className="text-lg text-foreground mt-0.5">Last 7 days</h3>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <TrendingUp className="w-3.5 h-3.5" />
              {formatCurrency(totalRevenue7d)} total
            </div>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={revenueByDay} barSize={24} margin={{ top: 0, right: 0, bottom: 0, left: -8 }}>
              <XAxis
                dataKey="label"
                tick={{ fontSize: 11, fill: "#6B7280" }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 10, fill: "#9CA3AF" }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v)}
                width={36}
              />
              <Tooltip content={<RevenueTooltip />} cursor={{ fill: "rgba(0,0,0,0.04)" }} />
              <Bar dataKey="revenue" fill="#1B50C0" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Category donut */}
        <div className="rounded-2xl border border-border bg-card p-5 shadow-card">
          <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground mb-0.5">Category Mix</p>
          <h3 className="text-lg text-foreground mb-4">7-day sales</h3>
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
      <div className="rounded-2xl border border-border bg-card p-5 shadow-card">
        <div className="flex items-center gap-2 mb-5">
          <Clock className="w-4 h-4 text-muted-foreground" />
          <div>
            <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Peak Hours</p>
            <h3 className="text-lg text-foreground">Sales volume by hour · 7-day average</h3>
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

      {/* ── Top Products ─────────────────────────────────────────── */}
      <div className="rounded-2xl border border-border bg-card p-5 shadow-card">
        <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground mb-0.5">Top Products</p>
        <h3 className="text-lg text-foreground mb-4">By revenue · 7 days</h3>
        {topProducts.length === 0 ? (
          <p className="text-sm text-muted-foreground">No sales data</p>
        ) : (
          <div className="space-y-3 max-w-md">
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

      {/* ── Expiry + Low Stock lists ─────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6 pb-4 lg:pb-6">
        {/* Expiry alert list */}
        <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-card">
          <div className="px-5 py-4 border-b border-border">
            <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Expiry Alerts</p>
            <h3 className="text-lg text-foreground">Stock batches expiring within 30 days</h3>
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
        <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-card">
          <div className="px-5 py-4 border-b border-border">
            <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Low Stock</p>
            <h3 className="text-lg text-foreground">Products below reorder threshold</h3>
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
    </>
  );
}

// ── Profit & Loss Panel ──────────────────────────────────────────────────────

interface PLProps {
  todayRevenue: number;
  todayCogs: number;
  todayGrossProfit: number;
  todayExpenses: number;
  todayNetProfit: number;
  sevenDayRevenue: number;
  sevenDayCogs: number;
  sevenDayGrossProfit: number;
  sevenDayExpenses: number;
  sevenDayNetProfit: number;
  expensesByCategory: { name: string; total: number }[];
}

function ProfitLossPanel({
  todayRevenue, todayCogs, todayGrossProfit, todayExpenses, todayNetProfit,
  sevenDayRevenue, sevenDayCogs, sevenDayGrossProfit, sevenDayExpenses, sevenDayNetProfit,
  expensesByCategory,
}: PLProps) {
  const [window, setWindow] = useState<"today" | "7d">("today");

  const isToday = window === "today";
  const revenue     = isToday ? todayRevenue     : sevenDayRevenue;
  const cogs        = isToday ? todayCogs        : sevenDayCogs;
  const grossProfit = isToday ? todayGrossProfit : sevenDayGrossProfit;
  const expenses    = isToday ? todayExpenses    : sevenDayExpenses;
  const netProfit   = isToday ? todayNetProfit   : sevenDayNetProfit;

  const grossMargin = revenue > 0 ? (grossProfit / revenue) * 100 : 0;
  const netMargin   = revenue > 0 ? (netProfit / revenue) * 100 : 0;

  const netIsPositive = netProfit >= 0;
  const NetIcon = netIsPositive ? TrendingUp : TrendingDown;

  return (
    <div className="rounded-2xl border border-border bg-card overflow-hidden">
      {/* Header + toggle */}
      <div className="flex items-center justify-between gap-3 px-4 sm:px-5 py-3.5 border-b border-border flex-wrap">
        <div className="min-w-0">
          <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Profit & Loss</p>
          <h3 className="text-lg text-foreground truncate">{isToday ? "Today" : "Last 7 days"}</h3>
        </div>
        <div className="flex items-center gap-1 rounded-lg border border-border bg-secondary/40 p-0.5 shrink-0">
          {(["today", "7d"] as const).map((w) => (
            <button
              key={w}
              onClick={() => setWindow(w)}
              className={cn(
                "px-3 py-1 rounded-md text-xs font-semibold transition-colors",
                window === w ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
              )}
            >
              {w === "today" ? "Today" : "7 days"}
            </button>
          ))}
        </div>
      </div>

      {/* Money flow — visible math */}
      <div className="grid grid-cols-1 lg:grid-cols-3 divide-y lg:divide-y-0 lg:divide-x divide-border">
        {/* Left: line-by-line breakdown */}
        <div className="lg:col-span-2 p-4 sm:p-5 space-y-2">
          <PLRow label="Revenue"           value={revenue}     tone="neutral" />
          <PLRow label="− Cost of goods"   value={cogs}        tone="deduct" />
          <PLRow label="= Gross Profit"    value={grossProfit} tone="positive" strong sub={`${grossMargin.toFixed(1)}% margin`} />
          <PLRow label="− Expenses"        value={expenses}    tone="deduct" href="/expenses" />
          <div className="pt-2 mt-1 border-t border-border">
            <PLRow
              label="= Net Profit"
              value={netProfit}
              tone={netIsPositive ? "positive" : "negative"}
              strong
              sub={`${netMargin.toFixed(1)}% net margin`}
              icon={NetIcon}
              size="lg"
            />
          </div>
        </div>

        {/* Right: expense category mini-breakdown */}
        <div className="p-4 sm:p-5">
          <div className="flex items-center justify-between mb-3">
            <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
              Expense breakdown
            </p>
            <Link href="/expenses" className="text-[11px] text-muted-foreground hover:text-foreground flex items-center gap-0.5">
              All <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          {expensesByCategory.length === 0 ? (
            <p className="text-xs text-muted-foreground">No expenses recorded in the last 7 days.</p>
          ) : (
            <div className="space-y-2">
              {expensesByCategory.slice(0, 6).map((c) => {
                const pct = sevenDayExpenses > 0 ? (c.total / sevenDayExpenses) * 100 : 0;
                return (
                  <div key={c.name}>
                    <div className="flex items-baseline justify-between gap-2 mb-1">
                      <span className="text-xs text-foreground truncate">{c.name}</span>
                      <span className="text-xs font-semibold text-foreground tabular-nums shrink-0">
                        {formatCurrency(c.total)}
                      </span>
                    </div>
                    <div className="h-1 rounded-full bg-secondary overflow-hidden">
                      <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
              {expensesByCategory.length > 6 && (
                <p className="text-[11px] text-muted-foreground pt-1">
                  + {expensesByCategory.length - 6} more categories
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

type PLTone = "neutral" | "positive" | "negative" | "deduct";
const PL_TONE_CLASS: Record<PLTone, string> = {
  neutral:  "text-foreground",
  positive: "text-success",
  negative: "text-destructive",
  deduct:   "text-muted-foreground",
};

function PLRow({
  label, value, tone, strong, sub, icon: Icon, size, href,
}: {
  label: string;
  value: number;
  tone: PLTone;
  strong?: boolean;
  sub?: string;
  icon?: React.ElementType;
  size?: "lg";
  href?: string;
}) {
  const amountCls = cn(
    "tabular-nums shrink-0",
    PL_TONE_CLASS[tone],
    size === "lg" ? "text-2xl" : "text-base",
    strong ? "font-bold" : "font-medium",
    strong && size === "lg" && "font-display font-black"
  );
  const labelCls = cn(
    "text-sm",
    strong ? "font-semibold text-foreground" : "text-muted-foreground"
  );

  return (
    <div className="flex items-baseline justify-between gap-3">
      <span className="flex items-center gap-1.5 min-w-0">
        <span className={labelCls}>{label}</span>
        {sub && <span className="text-[11px] text-muted-foreground truncate">{sub}</span>}
        {href && (
          <Link href={href} className="text-[11px] text-muted-foreground hover:text-foreground flex items-center">
            <ArrowRight className="w-3 h-3" />
          </Link>
        )}
      </span>
      <span className="flex items-center gap-1.5">
        {Icon && <Icon className={cn("w-4 h-4", PL_TONE_CLASS[tone])} />}
        <span className={amountCls}>{formatCurrency(value)}</span>
      </span>
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
  hero,
}: {
  label: string;
  value: string;
  sub: string;
  accent: AccentType;
  hero?: "red" | "navy";
}) {
  if (hero === "red") {
    return (
      <div className="relative overflow-hidden rounded-2xl shadow-raised px-4 py-4 lg:px-5 lg:py-5" style={{ background: "#CC1B14" }}>
        <img src="/icon-192.png" aria-hidden="true" draggable={false} className="absolute right-2 top-1 h-14 lg:h-16 w-auto opacity-15 rotate-12 select-none" />
        <p className="text-[10px] font-bold uppercase tracking-widest text-white/60 mb-2">{label}</p>
        <p className="text-2xl lg:text-3xl text-white tabular-nums leading-none break-all" style={{ fontFamily: "var(--font-display)", fontWeight: 900 }}>{value}</p>
        <p className="text-xs text-white/70 mt-2">{sub}</p>
      </div>
    );
  }
  if (hero === "navy") {
    return (
      <div className="relative overflow-hidden rounded-2xl shadow-raised px-4 py-4 lg:px-5 lg:py-5" style={{ background: "#060F40" }}>
        <img src="/icon-192.png" aria-hidden="true" draggable={false} className="absolute right-2 top-1 h-14 lg:h-16 w-auto opacity-15 -rotate-12 select-none" />
        <p className="text-[10px] font-bold uppercase tracking-widest text-sidebar-muted/80 mb-2">{label}</p>
        <p className="text-2xl lg:text-3xl text-white tabular-nums leading-none break-all" style={{ fontFamily: "var(--font-display)", fontWeight: 900 }}>{value}</p>
        <p className="text-xs text-sidebar-muted mt-2">{sub}</p>
      </div>
    );
  }
  return (
    <div className="rounded-2xl border border-border bg-card px-4 py-4 lg:px-5 lg:py-5 shadow-card">
      <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground mb-2">
        {label}
      </p>
      <p
        className="text-2xl lg:text-3xl text-foreground tabular-nums leading-none break-all"
        style={{ fontFamily: "var(--font-display)", fontWeight: 900 }}
      >
        {value}
      </p>
      <p className="text-xs text-muted-foreground mt-2">{sub}</p>
    </div>
  );
}
