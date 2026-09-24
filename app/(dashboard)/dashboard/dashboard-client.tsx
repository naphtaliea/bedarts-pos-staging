"use client";

import { useState } from "react";
import Link from "next/link";
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
  CartesianGrid,
} from "recharts";
import {
  AlertCircle,
  ArrowRight,
  ArrowUpRight,
  BarChart3,
  Clock,
  Package,
  Receipt,
  TrendingDown,
  TrendingUp,
  Wallet,
} from "lucide-react";
import { cn, formatCurrency } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────

interface DashboardClientProps {
  todayRevenue: number;
  todayTransactions: number;
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
  lowStockItems: {
    name: string;
    stock_quantity: number;
    low_stock_threshold: number;
    unit: string;
  }[];
  revenueByDay: { day: string; label: string; revenue: number; count: number }[];
  categoryMix: { name: string; revenue: number }[];
  peakHours: { hour: number; label: string; count: number; revenue: number }[];
  topProducts: { name: string; revenue: number; units: number }[];
  outstandingPayablesTotal: number;
  outstandingPayablesCount: number;
}

type Range = "today" | "7d";
type Tone = "neutral" | "warning" | "success" | "destructive";

// ─── Palette ──────────────────────────────────────────────────────────────────

// Muted, print-friendly, colour-blind-safe palette. Brand red is reserved for
// destructive states and CTAs — never accent decoration.
const DONUT_COLORS = [
  "#1B50C0", // brand blue
  "#0D9448", // success green
  "#C07C00", // warning amber
  "#7C3AED", // violet
  "#0891B2", // teal
  "#DB2777", // pink
  "#475569", // slate
];

// Standard stroke widths — used consistently so icons feel like one set.
const STROKE_STANDARD = 2;
const STROKE_MUTED = 1.75;

// ─── Small helpers ────────────────────────────────────────────────────────────

function ChartTooltip({
  label,
  value,
  sub,
  accent = "text-accent",
}: {
  label: string;
  value: string;
  sub?: string;
  accent?: string;
}) {
  return (
    <div className="rounded-lg border border-border bg-card shadow-card px-3 py-2 text-xs">
      <p className="font-semibold text-slate-900 mb-1">{label}</p>
      <p className={cn("font-black tabular-nums", accent)}>{value}</p>
      {sub && <p className="text-slate-500 mt-0.5">{sub}</p>}
    </div>
  );
}

// ─── Main component ──────────────────────────────────────────────────────────

export function DashboardClient({
  todayRevenue,
  todayTransactions,
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
  revenueByDay,
  categoryMix,
  peakHours,
  topProducts,
  outstandingPayablesTotal,
  outstandingPayablesCount,
}: DashboardClientProps) {
  const [range, setRange] = useState<Range>("today");
  const isToday = range === "today";

  const revenue     = isToday ? todayRevenue     : sevenDayRevenue;
  const cogs        = isToday ? todayCogs        : sevenDayCogs;
  const grossProfit = isToday ? todayGrossProfit : sevenDayGrossProfit;
  const expenses    = isToday ? todayExpenses    : sevenDayExpenses;
  const netProfit   = isToday ? todayNetProfit   : sevenDayNetProfit;

  const grossMargin = revenue > 0 ? (grossProfit / revenue) * 100 : 0;
  const netMargin   = revenue > 0 ? (netProfit   / revenue) * 100 : 0;

  // Use the prop directly — no redundant recomputation from revenueByDay.
  const sevenDaySalesCount = revenueByDay.reduce((s, d) => s + d.count, 0);

  const avgTicket7d = sevenDaySalesCount > 0 ? sevenDayRevenue / sevenDaySalesCount : 0;
  const avgTicketToday = todayTransactions > 0 ? todayRevenue / todayTransactions : 0;
  const avgTicket = isToday ? avgTicketToday : avgTicket7d;

  return (
    <div className="min-h-full bg-slate-50">
      {/* ── Page header (scrolls with content) ────────────────────
         Sticky was fighting the mobile-navbar padding — see git history.
         Plain non-sticky header keeps positioning predictable on every
         breakpoint. */}
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[10px] sm:text-[11px] font-black uppercase tracking-[0.15em] text-slate-400">
              Overview
            </p>
            <h1 className="text-slate-900 leading-tight text-xl sm:text-2xl font-display-black">
              Dashboard
            </h1>
          </div>

          {/* Range toggle — segmented control. h-11 = 44px min touch target. */}
          <div
            role="tablist"
            aria-label="Time range for Revenue and P&amp;L"
            className="inline-flex rounded-lg bg-slate-100 p-0.5 shrink-0"
          >
            {(["today", "7d"] as const).map((r) => (
              <button
                key={r}
                role="tab"
                aria-selected={range === r}
                onClick={() => setRange(r)}
                className={cn(
                  "px-3 sm:px-4 h-11 rounded-md text-xs font-bold transition-all min-w-[72px]",
                  range === r
                    ? "bg-white text-slate-900 shadow-sm"
                    : "text-slate-500 hover:text-slate-900"
                )}
              >
                {r === "today" ? "Today" : "7 days"}
              </button>
            ))}
          </div>
        </div>
      </header>

      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 py-4 sm:py-6 space-y-4 sm:space-y-6">

        {/* ── Hero: Revenue + Net profit (range-driven) ──────────── */}
        <RevenueHero
          rangeLabel={isToday ? "Today's revenue" : "7-day revenue"}
          revenue={revenue}
          transactionsSub={
            isToday
              ? `${todayTransactions} sale${todayTransactions !== 1 ? "s" : ""} today`
              : `${sevenDaySalesCount} sales over 7 days`
          }
          netProfit={netProfit}
          netMargin={netMargin}
        />

        {/* ── Key metrics grid ──────────────────────────────────── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <MetricCard
            icon={Receipt}
            label="Avg Ticket"
            value={formatCurrency(avgTicket)}
            sub={isToday ? "per sale today" : "7-day average"}
            tone="neutral"
          />
          <MetricCard
            icon={Package}
            label="Stock Value"
            value={formatCurrency(stockValue)}
            sub={`${activeProductCount} active products`}
            tone="neutral"
          />
          <MetricCard
            icon={Wallet}
            label="Payables"
            value={formatCurrency(outstandingPayablesTotal)}
            sub={
              outstandingPayablesCount === 0
                ? "no unpaid invoices"
                : `${outstandingPayablesCount} unpaid invoice${outstandingPayablesCount !== 1 ? "s" : ""}`
            }
            tone={outstandingPayablesCount > 0 ? "warning" : "success"}
            href="/suppliers"
          />
          <MetricCard
            icon={AlertCircle}
            label="Low Stock"
            value={String(lowStockItems.length)}
            sub={lowStockItems.length === 0 ? "all clear" : "need restocking"}
            tone={lowStockItems.length > 0 ? "warning" : "success"}
            href="/inventory"
          />
        </div>

        {/* ── Revenue trend + Category mix (always 7-day) ──────── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
          {/* Revenue trend */}
          <section className="lg:col-span-2 rounded-2xl bg-white border border-slate-200 p-4 sm:p-5">
            <div className="flex items-start justify-between gap-3 mb-4 sm:mb-5">
              <div>
                <p className="text-[10px] sm:text-[11px] font-black uppercase tracking-[0.15em] text-slate-400">
                  Revenue trend
                </p>
                <h3 className="text-slate-900 text-base sm:text-lg mt-0.5 font-display-heading">
                  Last 7 days
                </h3>
              </div>
              <div className="text-right shrink-0">
                <p className="text-slate-900 tabular-nums text-lg sm:text-xl font-display-black">
                  {formatCurrency(sevenDayRevenue)}
                </p>
                <p className="text-[10px] text-slate-500">total</p>
              </div>
            </div>
            {/* Responsive chart margin — 0 left on mobile so labels don't clip */}
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={revenueByDay} barSize={20} margin={{ top: 4, right: 6, bottom: 0, left: 0 }}>
                <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="#E2E8F0" />
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 11, fill: "#64748B" }}
                  axisLine={false}
                  tickLine={false}
                  interval={0}
                />
                <YAxis
                  tick={{ fontSize: 10, fill: "#94A3B8" }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v) => (v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v))}
                  width={40}
                />
                <Tooltip
                  cursor={{ fill: "rgba(15,23,42,0.04)" }}
                  content={({ active, payload, label }) => {
                    if (!active || !payload?.length) return null;
                    return (
                      <ChartTooltip
                        label={String(label)}
                        value={formatCurrency(Number(payload[0].value))}
                        sub={`${payload[0].payload.count} sales`}
                      />
                    );
                  }}
                />
                <Bar dataKey="revenue" fill="#1B50C0" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </section>

          {/* Category mix donut */}
          <section className="rounded-2xl bg-white border border-slate-200 p-4 sm:p-5">
            <p className="text-[10px] sm:text-[11px] font-black uppercase tracking-[0.15em] text-slate-400">
              Category mix
            </p>
            <h3 className="text-slate-900 text-base sm:text-lg mt-0.5 mb-4 font-display-heading">
              Last 7 days
            </h3>

            {categoryMix.length === 0 ? (
              <EmptyBlock height={280} icon={BarChart3} title="No sales yet" hint="Categories appear as sales come in" />
            ) : (
              <>
                <ResponsiveContainer width="100%" height={160}>
                  <PieChart>
                    <Pie
                      data={categoryMix}
                      cx="50%"
                      cy="50%"
                      innerRadius={48}
                      outerRadius={72}
                      dataKey="revenue"
                      paddingAngle={2}
                      strokeWidth={0}
                    >
                      {categoryMix.map((_, i) => (
                        <Cell key={i} fill={DONUT_COLORS[i % DONUT_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      content={({ active, payload }) => {
                        if (!active || !payload?.length) return null;
                        const item = payload[0];
                        return (
                          <ChartTooltip
                            label={String(item.name ?? item.payload?.name ?? "")}
                            value={formatCurrency(Number(item.value))}
                          />
                        );
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <ul className="space-y-1.5 mt-3">
                  {categoryMix.slice(0, 5).map((c, i) => {
                    const pct = sevenDayRevenue > 0 ? (c.revenue / sevenDayRevenue) * 100 : 0;
                    return (
                      <li key={c.name} className="flex items-center gap-2 text-xs">
                        <span
                          className="w-2 h-2 rounded-full shrink-0"
                          style={{ background: DONUT_COLORS[i % DONUT_COLORS.length] }}
                        />
                        <span className="text-slate-700 truncate flex-1" title={c.name}>
                          {c.name}
                        </span>
                        <span className="text-slate-900 tabular-nums font-semibold shrink-0">
                          {pct.toFixed(0)}%
                        </span>
                      </li>
                    );
                  })}
                </ul>
              </>
            )}
          </section>
        </div>

        {/* ── P&L breakdown (range-driven) ─────────────────────── */}
        <ProfitLossPanel
          isToday={isToday}
          revenue={revenue}
          cogs={cogs}
          grossProfit={grossProfit}
          expenses={expenses}
          netProfit={netProfit}
          grossMargin={grossMargin}
          netMargin={netMargin}
          expensesByCategory={expensesByCategory}
          sevenDayExpenses={sevenDayExpenses}
        />

        {/* ── Peak hours + Top products ──────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
          {/* Peak hours */}
          <section className="lg:col-span-2 rounded-2xl bg-white border border-slate-200 p-4 sm:p-5">
            <div className="flex items-center gap-2 mb-4">
              <Clock className="w-4 h-4 text-slate-400" strokeWidth={STROKE_STANDARD} />
              <div>
                <p className="text-[10px] sm:text-[11px] font-black uppercase tracking-[0.15em] text-slate-400">
                  Peak hours
                </p>
                <h3 className="text-slate-900 text-base sm:text-lg font-display-heading">
                  Sales volume · 7-day average
                </h3>
              </div>
            </div>
            <ResponsiveContainer width="100%" height={140}>
              <BarChart data={peakHours} barSize={12} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
                <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="#E2E8F0" />
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 10, fill: "#64748B" }}
                  axisLine={false}
                  tickLine={false}
                  interval={1}
                />
                <YAxis hide />
                <Tooltip
                  cursor={{ fill: "rgba(15,23,42,0.04)" }}
                  content={({ active, payload, label }) => {
                    if (!active || !payload?.length) return null;
                    return (
                      <ChartTooltip
                        label={String(label)}
                        value={`${payload[0].value} sales`}
                        sub={formatCurrency(Number(payload[0].payload.revenue))}
                      />
                    );
                  }}
                />
                <Bar dataKey="count" fill="#1B50C0" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </section>

          {/* Top products */}
          <section className="rounded-2xl bg-white border border-slate-200 p-4 sm:p-5">
            <p className="text-[10px] sm:text-[11px] font-black uppercase tracking-[0.15em] text-slate-400">
              Top products
            </p>
            <h3 className="text-slate-900 text-base sm:text-lg mt-0.5 mb-4 font-display-heading">
              By revenue · Last 7 days
            </h3>
            {topProducts.length === 0 ? (
              <EmptyBlock height={200} icon={TrendingUp} title="No sales yet" hint="Best sellers appear here as sales come in" />
            ) : (
              <ol className="space-y-3">
                {topProducts.map((p, i) => {
                  const pct = topProducts[0].revenue > 0 ? (p.revenue / topProducts[0].revenue) * 100 : 0;
                  return (
                    <li key={p.name}>
                      <div className="flex items-baseline justify-between mb-1.5 gap-2">
                        <span className="text-xs text-slate-700 min-w-0 flex items-baseline gap-1.5">
                          <span className="text-[10px] font-black text-slate-400 tabular-nums shrink-0 w-4">
                            {i + 1}
                          </span>
                          <span className="truncate" title={p.name}>{p.name}</span>
                        </span>
                        <span className="text-xs text-slate-900 tabular-nums shrink-0 font-display-heading">
                          {formatCurrency(p.revenue)}
                        </span>
                      </div>
                      <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-accent transition-all"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </li>
                  );
                })}
              </ol>
            )}
          </section>
        </div>

        {/* ── Low Stock ────────────────────────────────────────── */}
        <section className="rounded-2xl bg-white border border-slate-200 overflow-hidden">
          <div className="px-4 sm:px-5 py-4 border-b border-slate-200 flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[10px] sm:text-[11px] font-black uppercase tracking-[0.15em] text-slate-400">
                Low stock
              </p>
              <h3 className="text-slate-900 text-base sm:text-lg font-display-heading truncate">
                Below reorder threshold
              </h3>
            </div>
            {lowStockItems.length > 0 && (
              <Link
                href="/inventory"
                className="inline-flex items-center gap-1 text-xs font-semibold text-accent hover:text-accent/80 shrink-0 h-9 px-2.5 rounded-md hover:bg-slate-50 transition-colors"
              >
                Manage <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            )}
          </div>

          {lowStockItems.length === 0 ? (
            <EmptyBlock height={140} icon={Package} title="All stocked up" hint="No products below their reorder threshold" />
          ) : (
            <ul className="divide-y divide-slate-100 lg:max-h-80 lg:overflow-y-auto">
              {lowStockItems.map((item, i) => {
                const pct = item.low_stock_threshold > 0
                  ? Math.min((item.stock_quantity / item.low_stock_threshold) * 100, 100)
                  : 0;
                const critical = pct < 25;
                return (
                  <li key={i} className="px-4 sm:px-5 py-3">
                    <div className="flex items-baseline justify-between gap-3 mb-2">
                      <p className="text-sm font-semibold text-slate-900 truncate" title={item.name}>
                        {item.name}
                      </p>
                      <p className="text-xs text-slate-500 tabular-nums shrink-0">
                        <span
                          className={cn(
                            "font-bold",
                            critical ? "text-destructive" : "text-warning"
                          )}
                        >
                          {item.stock_quantity.toFixed(2)}
                        </span>
                        <span className="text-slate-400"> / {item.low_stock_threshold} {item.unit}</span>
                      </p>
                    </div>
                    <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden">
                      <div
                        className={cn(
                          "h-full rounded-full transition-all",
                          critical ? "bg-destructive" : "bg-warning"
                        )}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}

// ─── Revenue hero ────────────────────────────────────────────────────────────

function RevenueHero({
  rangeLabel,
  revenue,
  transactionsSub,
  netProfit,
  netMargin,
}: {
  rangeLabel: string;
  revenue: number;
  transactionsSub: string;
  netProfit: number;
  netMargin: number;
}) {
  const netPositive = netProfit >= 0;
  const TrendIcon = netPositive ? TrendingUp : TrendingDown;

  return (
    <section className="rounded-2xl bg-white border border-slate-200 p-5 sm:p-6">
      {/* 3fr : 2fr split gives revenue the weight it deserves on tablet+ */}
      <div className="grid grid-cols-1 sm:grid-cols-[3fr_2fr] gap-5 sm:gap-6 items-start">
        {/* Revenue */}
        <div>
          <p className="text-[10px] sm:text-[11px] font-black uppercase tracking-[0.15em] text-slate-400 mb-2">
            {rangeLabel}
          </p>
          <p className="text-slate-900 tabular-nums leading-none text-4xl sm:text-5xl font-display-black">
            {formatCurrency(revenue)}
          </p>
          <p className="text-xs sm:text-sm text-slate-500 mt-3">{transactionsSub}</p>
        </div>

        {/* Net profit */}
        <div className="border-t sm:border-t-0 sm:border-l border-slate-200 pt-4 sm:pt-0 sm:pl-6">
          <p className="text-[10px] sm:text-[11px] font-black uppercase tracking-[0.15em] text-slate-400 mb-2">
            Net profit
          </p>
          <div className="flex items-baseline gap-2">
            <p
              className={cn(
                "tabular-nums leading-none text-3xl sm:text-4xl font-display-black",
                netPositive ? "text-success" : "text-destructive"
              )}
            >
              {formatCurrency(netProfit)}
            </p>
            <TrendIcon
              className={cn("w-5 h-5 sm:w-6 sm:h-6 shrink-0", netPositive ? "text-success" : "text-destructive")}
              strokeWidth={2.5}
            />
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-3 tabular-nums">
            {netMargin.toFixed(1)}% margin
          </p>
        </div>
      </div>
    </section>
  );
}

// ─── Metric card ─────────────────────────────────────────────────────────────

// Object-shaped tone map — safer than string-split on className strings.
const TONE: Record<Tone, { icon: string; bg: string }> = {
  neutral:     { icon: "text-slate-500",  bg: "bg-slate-100" },
  warning:     { icon: "text-warning",    bg: "bg-warning/10" },
  success:     { icon: "text-success",    bg: "bg-success/10" },
  destructive: { icon: "text-destructive", bg: "bg-destructive/10" },
};

function MetricCard({
  icon: Icon,
  label,
  value,
  sub,
  tone,
  href,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  sub: string;
  tone: Tone;
  href?: string;
}) {
  const inner = (
    <>
      <div className="flex items-center justify-between gap-2 mb-3">
        <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center", TONE[tone].bg)}>
          <Icon className={cn("w-4 h-4", TONE[tone].icon)} strokeWidth={STROKE_STANDARD} />
        </div>
        {href && (
          <ArrowUpRight
            className="w-4 h-4 text-slate-300 group-hover:text-slate-500 transition-colors"
            strokeWidth={STROKE_STANDARD}
          />
        )}
      </div>
      <p className="text-[10px] sm:text-[11px] font-black uppercase tracking-[0.12em] text-slate-500">
        {label}
      </p>
      <p className="text-slate-900 tabular-nums mt-1 text-xl sm:text-2xl leading-tight font-display-black">
        {value}
      </p>
      <p className="text-[11px] text-slate-500 mt-1.5 truncate">{sub}</p>
    </>
  );

  const shell = "group rounded-2xl bg-white border border-slate-200 p-4 sm:p-5 transition-all";
  const hover = href ? "hover:border-slate-300 hover:shadow-sm cursor-pointer active:scale-[0.99]" : "";

  return href ? (
    <Link href={href} className={cn(shell, hover, "block")}>
      {inner}
    </Link>
  ) : (
    <div className={cn(shell)}>{inner}</div>
  );
}

// ─── P&L Panel ───────────────────────────────────────────────────────────────

function ProfitLossPanel({
  isToday,
  revenue,
  cogs,
  grossProfit,
  expenses,
  netProfit,
  grossMargin,
  netMargin,
  expensesByCategory,
  sevenDayExpenses,
}: {
  isToday: boolean;
  revenue: number;
  cogs: number;
  grossProfit: number;
  expenses: number;
  netProfit: number;
  grossMargin: number;
  netMargin: number;
  expensesByCategory: { name: string; total: number }[];
  sevenDayExpenses: number;
}) {
  const netPositive = netProfit >= 0;

  return (
    <section className="rounded-2xl bg-white border border-slate-200 overflow-hidden">
      <div className="px-4 sm:px-5 py-4 border-b border-slate-200 flex items-center justify-between gap-3">
        <div>
          <p className="text-[10px] sm:text-[11px] font-black uppercase tracking-[0.15em] text-slate-400">
            Profit &amp; loss
          </p>
          <h3 className="text-slate-900 text-base sm:text-lg font-display-heading">
            {isToday ? "Today" : "Last 7 days"}
          </h3>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 divide-y lg:divide-y-0 lg:divide-x divide-slate-200">
        <div className="lg:col-span-2 p-4 sm:p-5 space-y-2.5">
          <PLRow label="Revenue" value={revenue} tone="neutral" />
          <PLRow label="− Cost of goods sold" value={cogs} tone="deduct" />
          <div className="pt-2 mt-1 border-t border-slate-100">
            <PLRow
              label="Gross profit"
              value={grossProfit}
              tone="positive"
              strong
              sub={`${grossMargin.toFixed(1)}% gross margin`}
            />
          </div>
          <PLRow label="− Operating expenses" value={expenses} tone="deduct" href="/expenses" />
          <div className="pt-3 mt-2 border-t border-slate-200">
            <PLRow
              label="Net profit"
              value={netProfit}
              tone={netPositive ? "positive" : "negative"}
              strong
              sub={`${netMargin.toFixed(1)}% net margin`}
              size="lg"
            />
          </div>
        </div>

        {/* Expense breakdown — always 7-day, clearly labelled */}
        <div className="p-4 sm:p-5">
          <div className="flex items-center justify-between mb-3">
            <p className="text-[10px] sm:text-[11px] font-black uppercase tracking-[0.15em] text-slate-400">
              7-day expense breakdown
            </p>
            <Link
              href="/expenses"
              className="text-[11px] font-semibold text-accent hover:text-accent/80 inline-flex items-center gap-0.5"
            >
              All <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          {expensesByCategory.length === 0 ? (
            <p className="text-xs text-slate-500">No expenses recorded in the last 7 days.</p>
          ) : (
            <ul className="space-y-2.5">
              {expensesByCategory.slice(0, 6).map((c, i) => {
                const pct = sevenDayExpenses > 0 ? (c.total / sevenDayExpenses) * 100 : 0;
                return (
                  <li key={c.name}>
                    <div className="flex items-baseline justify-between gap-2 mb-1">
                      <span className="text-xs text-slate-700 truncate" title={c.name}>
                        {c.name}
                      </span>
                      <span className="text-xs text-slate-900 font-semibold tabular-nums shrink-0">
                        {formatCurrency(c.total)}
                      </span>
                    </div>
                    <div className="h-1 rounded-full bg-slate-100 overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{
                          width: `${pct}%`,
                          background: DONUT_COLORS[i % DONUT_COLORS.length],
                        }}
                      />
                    </div>
                  </li>
                );
              })}
              {expensesByCategory.length > 6 && (
                <p className="text-[11px] text-slate-500 pt-1">
                  + {expensesByCategory.length - 6} more categories
                </p>
              )}
            </ul>
          )}
        </div>
      </div>
    </section>
  );
}

type PLTone = "neutral" | "positive" | "negative" | "deduct";
const PL_TONE: Record<PLTone, string> = {
  neutral:  "text-slate-900",
  positive: "text-success",
  negative: "text-destructive",
  deduct:   "text-slate-500",
};

function PLRow({
  label,
  value,
  tone,
  strong,
  sub,
  size,
  href,
}: {
  label: string;
  value: number;
  tone: PLTone;
  strong?: boolean;
  sub?: string;
  size?: "lg";
  href?: string;
}) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <span className="flex items-center gap-1.5 min-w-0">
        <span
          className={cn(
            "text-sm",
            strong ? "font-bold text-slate-900" : "text-slate-600"
          )}
        >
          {label}
        </span>
        {sub && <span className="text-[11px] text-slate-500 truncate">{sub}</span>}
        {href && (
          <Link
            href={href}
            className="text-[11px] text-slate-400 hover:text-slate-700 flex items-center transition-colors"
            aria-label={`Open ${label}`}
          >
            <ArrowRight className="w-3 h-3" />
          </Link>
        )}
      </span>
      <span
        className={cn(
          "tabular-nums shrink-0",
          PL_TONE[tone],
          size === "lg" ? "text-2xl sm:text-3xl font-display-black" : "text-base",
          strong && size !== "lg" && "font-bold",
          !strong && "font-semibold"
        )}
      >
        {formatCurrency(value)}
      </span>
    </div>
  );
}

// ─── Empty state block ───────────────────────────────────────────────────────

function EmptyBlock({
  height,
  icon: Icon,
  title,
  hint,
}: {
  height: number;
  icon: React.ElementType;
  title: string;
  hint: string;
}) {
  return (
    <div
      style={{ minHeight: height }}
      className="flex flex-col items-center justify-center text-center px-4 py-6 gap-3"
    >
      <div className="w-11 h-11 rounded-xl bg-slate-100 flex items-center justify-center">
        <Icon className="w-5 h-5 text-slate-400" strokeWidth={STROKE_MUTED} />
      </div>
      <div>
        <p className="text-sm font-semibold text-slate-900">{title}</p>
        <p className="text-xs text-slate-500 mt-1">{hint}</p>
      </div>
    </div>
  );
}
