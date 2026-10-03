"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import {
  AlertCircle,
  ArrowRight,
  ArrowUpRight,
  BarChart3,
  CalendarDays,
  ChevronDown,
  ChevronLeft,
  Clock,
  Package,
  Receipt,
  Snowflake,
  TrendingDown,
  TrendingUp,
  Wallet,
} from "lucide-react";
import { cn, formatCurrency } from "@/lib/utils";
import { PullToRefresh } from "@/components/pull-to-refresh";
import { fetchCustomDayStats } from "./actions";
import type { DayStats } from "./actions";

// ─── Types ────────────────────────────────────────────────────────────────────

// "today" | "d1"–"d6" = named day offsets | "7d" = aggregate | "custom" = arbitrary past date
type Range = "today" | "d1" | "d2" | "d3" | "d4" | "d5" | "d6" | "7d" | "custom";
type Tone = "neutral" | "warning" | "success" | "destructive";

interface DashboardClientProps {
  todayRevenue: number;
  todayCash: number;
  todayMomo: number;
  todayPos: number;
  todayTransactions: number;
  todayCogs: number;
  todayGrossProfit: number;
  todayExpenses: number;
  todayNetProfit: number;
  sevenDayRevenue: number;
  sevenDayCash: number;
  sevenDayMomo: number;
  sevenDayPos: number;
  sevenDayCogs: number;
  sevenDayGrossProfit: number;
  sevenDayExpenses: number;
  sevenDayNetProfit: number;
  thirtyDayRevenue: number;
  thirtyDayCash: number;
  thirtyDayMomo: number;
  thirtyDayPos: number;
  thirtyDayCogs: number;
  thirtyDayGrossProfit: number;
  thirtyDayExpenses: number;
  thirtyDayNetProfit: number;
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
  peakHours: { hour: number; label: string; count: number; revenue: number }[];
  topProducts: { name: string; revenue: number; units: number }[];
  outstandingPayablesTotal: number;
  outstandingPayablesCount: number;
  /** Per-day stats for the 7-day window; index 0 = today, 6 = 6 days ago. */
  perDayStats: DayStats[];
  /** Human-readable labels: index 0 = "Today", 1–6 = "Fri Oct 2" etc. */
  dayLabels: string[];
  /** YYYY-MM-DD date strings for each offset; used as date-input bounds. */
  dayDateStrs: string[];
}

// ─── Palette ──────────────────────────────────────────────────────────────────

const DONUT_COLORS = [
  "#1B50C0",
  "#0D9448",
  "#C07C00",
  "#7C3AED",
  "#0891B2",
  "#DB2777",
  "#475569",
];

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
  todayCash,
  todayMomo,
  todayPos,
  todayTransactions,
  todayCogs,
  todayGrossProfit,
  todayExpenses,
  todayNetProfit,
  sevenDayRevenue,
  sevenDayCash,
  sevenDayMomo,
  sevenDayPos,
  sevenDayCogs,
  sevenDayGrossProfit,
  sevenDayExpenses,
  sevenDayNetProfit,
  expensesByCategory,
  stockValue,
  activeProductCount,
  lowStockItems,
  revenueByDay,
  peakHours,
  topProducts,
  outstandingPayablesTotal,
  outstandingPayablesCount,
  perDayStats,
  dayLabels,
  dayDateStrs,
}: DashboardClientProps) {
  const [range, setRange] = useState<Range>("today");

  // Dropdown state
  const [dropOpen, setDropOpen] = useState(false);
  const [dropMode, setDropMode] = useState<"list" | "picker">("list");
  const dropRef = useRef<HTMLDivElement>(null);

  // Custom date state
  const [customDate, setCustomDate] = useState("");
  const [customStats, setCustomStats] = useState<DayStats | null>(null);
  const [customLoading, setCustomLoading] = useState(false);
  const [customError, setCustomError] = useState<string | null>(null);

  // Close dropdown on click-outside or Escape.
  // In picker mode the native date-picker overlay renders outside our DOM node,
  // so mousedown outside-click is disabled — only Escape or explicit Back/commit closes it.
  useEffect(() => {
    if (!dropOpen) return;
    function onDown(e: MouseEvent) {
      if (dropMode === "picker") return;
      if (!dropRef.current?.contains(e.target as Node)) {
        setDropOpen(false);
        setDropMode("list");
      }
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setDropOpen(false);
        setDropMode("list");
      }
    }
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [dropOpen, dropMode]);

  // ── Derive current period stats ──────────────────────────────────────────

  const isToday = range === "today";
  const isSevenDay = range === "7d";
  const isCustom = range === "custom";
  // dayIdx: 1–6 for d1–d6 named offsets; -1 otherwise
  const dayIdx = range.startsWith("d") && range.length === 2 ? parseInt(range[1]) : -1;
  const isDayOffset = dayIdx >= 1;

  const ds: DayStats | null = isDayOffset
    ? perDayStats[dayIdx]
    : isCustom
    ? customStats
    : null;

  const revenue     = isSevenDay ? sevenDayRevenue     : isToday ? todayRevenue     : ds?.revenue     ?? 0;
  const cogs        = isSevenDay ? sevenDayCogs        : isToday ? todayCogs        : ds?.cogs        ?? 0;
  const grossProfit = isSevenDay ? sevenDayGrossProfit : isToday ? todayGrossProfit : ds?.grossProfit ?? 0;
  const expenses    = isSevenDay ? sevenDayExpenses    : isToday ? todayExpenses    : ds?.expenses    ?? 0;
  const netProfit   = isSevenDay ? sevenDayNetProfit   : isToday ? todayNetProfit   : ds?.netProfit   ?? 0;

  const payBreakdown = isSevenDay
    ? { cash: sevenDayCash, momo: sevenDayMomo, pos: sevenDayPos }
    : isToday
    ? { cash: todayCash, momo: todayMomo, pos: todayPos }
    : { cash: ds?.cash ?? 0, momo: ds?.momo ?? 0, pos: ds?.pos ?? 0 };

  const grossMargin = revenue > 0 ? (grossProfit / revenue) * 100 : 0;
  const netMargin   = revenue > 0 ? (netProfit   / revenue) * 100 : 0;

  const sevenDaySalesCount = revenueByDay.reduce((s, d) => s + d.count, 0);
  const currentTransactions = isSevenDay
    ? sevenDaySalesCount
    : isToday
    ? todayTransactions
    : ds?.transactions ?? 0;

  const avgTicket = currentTransactions > 0 ? revenue / currentTransactions : 0;

  // ── Labels ───────────────────────────────────────────────────────────────

  // Human-readable label for the selected custom date (client-side, Accra tz)
  const customDateLabel = customDate
    ? new Date(`${customDate}T00:00:00Z`)
        .toLocaleDateString("en-US", {
          timeZone: "Africa/Accra",
          weekday: "short",
          month: "short",
          day: "numeric",
        })
        .replace(",", "")
    : "Custom";

  const selectedLabel = isSevenDay
    ? "Last 7 days"
    : isToday
    ? "Today"
    : isDayOffset
    ? dayLabels[dayIdx]
    : customDate
    ? customDateLabel
    : "Custom…";

  const periodLabel = isSevenDay
    ? "Last 7 days"
    : isToday
    ? "Today"
    : isDayOffset
    ? dayLabels[dayIdx]
    : customDateLabel;

  const rangeLabel = isSevenDay
    ? "7-day revenue"
    : isToday
    ? "Today's revenue"
    : isDayOffset
    ? dayLabels[dayIdx]
    : customDateLabel;

  const transactionsSub = isSevenDay
    ? `${sevenDaySalesCount} sales over 7 days`
    : isToday
    ? `${todayTransactions} sale${todayTransactions !== 1 ? "s" : ""} today`
    : `${currentTransactions} sale${currentTransactions !== 1 ? "s" : ""}`;

  const avgTicketSub = isSevenDay ? "7-day average" : isToday ? "per sale today" : "per sale";

  // ── Dropdown options ──────────────────────────────────────────────────────

  const namedOptions: { value: Range; label: string }[] = [
    { value: "today", label: "Today" },
    { value: "d1",   label: dayLabels[1] },
    { value: "d2",   label: dayLabels[2] },
    { value: "d3",   label: dayLabels[3] },
    { value: "d4",   label: dayLabels[4] },
    { value: "d5",   label: dayLabels[5] },
    { value: "d6",   label: dayLabels[6] },
    { value: "7d",   label: "Last 7 days" },
  ];

  // Yesterday's date string — used as max bound on custom date picker
  const yesterdayStr = dayDateStrs[1] ?? "";

  async function handleCustomDate(dateStr: string) {
    if (!dateStr) return;
    setCustomDate(dateStr);
    setCustomError(null);
    setCustomLoading(true);
    const result = await fetchCustomDayStats(dateStr);
    setCustomLoading(false);
    if ("error" in result) {
      setCustomError(result.error);
      return;
    }
    setCustomStats(result);
    setRange("custom");
    setDropOpen(false);
    setDropMode("list");
  }

  return (
    <PullToRefresh>
    <div className="min-h-full bg-slate-50">
      {/* ── Page header ─────────────────────────────────────────── */}
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

          {/* ── Period selector dropdown ────────────────────────── */}
          <div ref={dropRef} className="relative shrink-0">
            <button
              onClick={() => {
                setDropOpen((o) => !o);
                setDropMode("list");
              }}
              aria-haspopup="listbox"
              aria-expanded={dropOpen}
              aria-label="Select time period"
              className="h-11 min-w-[130px] max-w-[190px] px-3 rounded-lg bg-slate-100 text-xs font-bold text-slate-700 flex items-center justify-between gap-2 hover:bg-slate-200 transition-colors"
            >
              <span className="truncate">{selectedLabel}</span>
              <ChevronDown
                className={cn(
                  "w-3.5 h-3.5 shrink-0 transition-transform duration-150",
                  dropOpen && "rotate-180"
                )}
                strokeWidth={2.5}
              />
            </button>

            {dropOpen && (
              <div className="absolute right-0 top-[calc(100%+4px)] z-50 min-w-[170px] rounded-xl bg-white border border-slate-200 shadow-lg overflow-hidden">
                {dropMode === "list" ? (
                  <ul role="listbox" aria-label="Time period options" className="py-1">
                    {namedOptions.map((opt) => (
                      <li key={opt.value} role="option" aria-selected={range === opt.value}>
                        <button
                          onClick={() => {
                            setRange(opt.value);
                            setDropOpen(false);
                            setDropMode("list");
                          }}
                          className={cn(
                            "w-full text-left px-4 py-2.5 min-h-[44px] text-xs transition-colors",
                            range === opt.value
                              ? "bg-slate-100 text-slate-900 font-bold"
                              : "text-slate-700 font-medium hover:bg-slate-50"
                          )}
                        >
                          {opt.label}
                        </button>
                      </li>
                    ))}

                    <li role="separator" aria-hidden className="border-t border-slate-100 my-1" />

                    <li role="option" aria-selected={range === "custom"}>
                      <button
                        onClick={() => setDropMode("picker")}
                        className={cn(
                          "w-full text-left px-4 py-2.5 min-h-[44px] text-xs font-medium transition-colors flex items-center gap-2",
                          range === "custom"
                            ? "bg-slate-100 text-slate-900 font-bold"
                            : "text-slate-700 hover:bg-slate-50"
                        )}
                      >
                        <CalendarDays className="w-3.5 h-3.5 shrink-0 text-slate-400" strokeWidth={2} />
                        {range === "custom" && customDate ? customDateLabel : "Custom…"}
                      </button>
                    </li>
                  </ul>
                ) : (
                  /* ── Date picker panel ─── */
                  <div className="p-4 w-64">
                    <div className="flex items-center gap-2 mb-3">
                      <button
                        onClick={() => setDropMode("list")}
                        aria-label="Back to period list"
                        className="h-11 w-11 flex items-center justify-center rounded text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors shrink-0"
                      >
                        <ChevronLeft className="w-4 h-4" strokeWidth={2.5} />
                      </button>
                      <p className="text-xs font-semibold text-slate-700">Pick a date</p>
                    </div>

                    <input
                      type="date"
                      max={yesterdayStr}
                      value={customDate}
                      onChange={(e) => handleCustomDate(e.target.value)}
                      className={cn(
                        "w-full rounded-lg border border-slate-200 px-3 py-3 text-sm text-slate-900",
                        "focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent",
                        "disabled:opacity-50"
                      )}
                      disabled={customLoading}
                    />

                    {customLoading && (
                      <p className="text-xs text-slate-500 mt-2 text-center">Loading…</p>
                    )}
                    {customError && (
                      <p className="text-xs text-destructive mt-2">{customError}</p>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </header>

      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 py-4 sm:py-6 space-y-4 sm:space-y-6">

        {/* ── Hero: Revenue + Net profit ─────────────────────────── */}
        <RevenueHero
          rangeLabel={rangeLabel}
          revenue={revenue}
          transactionsSub={transactionsSub}
          netProfit={netProfit}
          netMargin={netMargin}
          paymentBreakdown={payBreakdown}
        />

        {/* ── Key metrics grid ───────────────────────────────────── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <MetricCard
            icon={Receipt}
            label="Avg Ticket"
            value={formatCurrency(avgTicket)}
            sub={avgTicketSub}
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

        {/* ── P&L breakdown ─────────────────────────────────────── */}
        <ProfitLossPanel
          periodLabel={periodLabel}
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

        {/* ── Revenue trend (always 7-day) ───────────────────────── */}
        <section className="rounded-2xl bg-white border border-slate-200 p-4 sm:p-5">
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

        {/* ── Peak hours + Top products ──────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
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

        {/* ── Low Stock ─────────────────────────────────────────── */}
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
                        <span className={cn("font-bold", critical ? "text-destructive" : "text-warning")}>
                          {item.stock_quantity.toFixed(2)}
                        </span>
                        <span className="text-slate-400"> / {item.low_stock_threshold} {item.unit}</span>
                      </p>
                    </div>
                    <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden">
                      <div
                        className={cn("h-full rounded-full transition-all", critical ? "bg-destructive" : "bg-warning")}
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
    </PullToRefresh>
  );
}

// ─── Revenue hero ────────────────────────────────────────────────────────────

function RevenueHero({
  rangeLabel,
  revenue,
  transactionsSub,
  netProfit,
  netMargin,
  paymentBreakdown,
}: {
  rangeLabel: string;
  revenue: number;
  transactionsSub: string;
  netProfit: number;
  netMargin: number;
  paymentBreakdown?: { cash: number; momo: number; pos: number };
}) {
  const netPositive = netProfit >= 0;
  const TrendIcon = netPositive ? TrendingUp : TrendingDown;

  return (
    <section className="rounded-2xl bg-white border border-slate-200 p-5 sm:p-6">
      <div className="grid grid-cols-1 sm:grid-cols-[3fr_2fr] gap-5 sm:gap-6 items-start">
        <div>
          <p className="text-[10px] sm:text-[11px] font-black uppercase tracking-[0.15em] text-slate-400 mb-2">
            {rangeLabel}
          </p>
          <p className="text-slate-900 tabular-nums leading-none text-4xl sm:text-5xl font-display-black">
            {formatCurrency(revenue)}
          </p>
          <p className="text-xs sm:text-sm text-slate-500 mt-3">{transactionsSub}</p>

          <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 mt-3 pt-3 border-t border-slate-100">
            <span className={cn("text-xs", paymentBreakdown && paymentBreakdown.cash > 0 ? "text-slate-500" : "text-slate-300")}>
              Cash <span className="font-bold tabular-nums">{formatCurrency(paymentBreakdown?.cash ?? 0)}</span>
            </span>
            <span className={cn("text-xs", paymentBreakdown && paymentBreakdown.momo > 0 ? "text-slate-500" : "text-slate-300")}>
              MoMo <span className="font-bold tabular-nums">{formatCurrency(paymentBreakdown?.momo ?? 0)}</span>
            </span>
            <span className={cn("text-xs", paymentBreakdown && paymentBreakdown.pos > 0 ? "text-slate-500" : "text-slate-300")}>
              POS <span className="font-bold tabular-nums">{formatCurrency(paymentBreakdown?.pos ?? 0)}</span>
            </span>
          </div>
        </div>

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
  periodLabel,
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
  periodLabel: string;
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
            {periodLabel}
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
        <span className={cn("text-sm", strong ? "font-bold text-slate-900" : "text-slate-600")}>
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
