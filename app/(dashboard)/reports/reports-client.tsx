"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  AreaChart, Area,
  BarChart, Bar,
  XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import { cn, formatCurrency } from "@/lib/utils";
import { Banknote, BarChart3, CreditCard, Download, PackageX, Smartphone, TrendingUp, Users } from "lucide-react";


// ── Types ─────────────────────────────────────────────────────────────────────

interface ReportsClientProps {
  fromDate: string;
  toDate: string;
  sales: any[];
  adjustments: any[];
  expenses?: any[];
}

type Tab = "overview" | "sales" | "products" | "inventory" | "cashiers" | "payments";

const TABS: { id: Tab; label: string }[] = [
  { id: "overview",  label: "Overview"   },
  { id: "sales",     label: "Sales"      },
  { id: "products",  label: "Products"   },
  { id: "inventory", label: "Inventory & Waste" },
  { id: "cashiers",  label: "Cashiers"   },
  { id: "payments",  label: "Payments"   },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatShortDate(d: string) {
  return new Date(d).toLocaleDateString("en-GH", { month: "short", day: "numeric" });
}

function todayStr() { return new Date().toISOString().split("T")[0]; }
function daysAgoStr(n: number) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().split("T")[0];
}
function thisMonthStr() {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().split("T")[0];
}

// ── Shared chart components ───────────────────────────────────────────────────

function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-border bg-card shadow-md px-3 py-2 text-xs">
      <p className="font-semibold text-foreground mb-1">{label}</p>
      {payload.map((p: any, i: number) => (
        <p key={i} style={{ color: p.color }}>
          {p.name}: {typeof p.value === "number" && p.value > 100 ? formatCurrency(p.value) : p.value}
        </p>
      ))}
    </div>
  );
}

// ── Stat card ─────────────────────────────────────────────────────────────────

function StatCard({
  label, value, sub, accent,
}: {
  label: string;
  value: string;
  sub?: string;
  accent?: "success" | "warning" | "destructive";
}) {
  return (
    <div className="rounded-2xl border border-border bg-card px-5 py-4 shadow-card">
      <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2">{label}</p>
      <p
        className={cn(
          "text-3xl tabular-nums leading-none",
          accent === "success" ? "text-success" : accent === "destructive" ? "text-destructive" : "text-foreground"
        )}
        style={{ fontFamily: "var(--font-display)", fontWeight: 900 }}
      >
        {value}
      </p>
      {sub && <p className="text-xs text-muted-foreground mt-2">{sub}</p>}
    </div>
  );
}

// ── Section card ──────────────────────────────────────────────────────────────

function SectionCard({ title, children, action }: { title: string; children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-card">
      <div className="px-5 py-4 border-b border-border flex items-center justify-between gap-3">
        <h3
          className="text-base text-foreground"
          style={{ fontFamily: "var(--font-display)", fontWeight: 900 }}
        >
          {title}
        </h3>
        {action}
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

// ── Empty state ───────────────────────────────────────────────────────────────

function EmptyState({ icon: Icon, title, sub }: { icon: React.ElementType; title: string; sub: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center px-4">
      <div className="h-12 w-12 rounded-full bg-secondary flex items-center justify-center mb-3">
        <Icon className="h-5 w-5 text-muted-foreground" aria-hidden="true" />
      </div>
      <p className="text-sm font-medium text-foreground mb-1">{title}</p>
      <p className="text-xs text-muted-foreground">{sub}</p>
    </div>
  );
}

// ── Export CSV ────────────────────────────────────────────────────────────────

function exportCSV(rows: Record<string, any>[], filename: string) {
  if (!rows.length) return;
  const headers = Object.keys(rows[0]);
  const csv = [
    headers.join(","),
    ...rows.map((r) => headers.map((h) => JSON.stringify(r[h] ?? "")).join(",")),
  ].join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

// ── Main component ────────────────────────────────────────────────────────────

export function ReportsClient({ fromDate, toDate, sales, adjustments, expenses = [] }: ReportsClientProps) {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("overview");
  const [localFrom, setLocalFrom] = useState(fromDate);
  const [localTo, setLocalTo] = useState(toDate);
  const [dateError, setDateError] = useState<string | null>(null);

  const completedSales = sales.filter((s) => s.status === "completed");

  function applyDateFilter() {
    setDateError(null);
    const from = new Date(localFrom);
    const to = new Date(localTo);
    if (isNaN(from.getTime()) || isNaN(to.getTime())) { setDateError("Both dates are required."); return; }
    if (from > to) { setDateError("Start date must be on or before end date."); return; }
    router.push(`/reports?from=${localFrom}&to=${localTo}`);
  }

  function applyPreset(from: string, to: string) {
    setLocalFrom(from);
    setLocalTo(to);
    router.push(`/reports?from=${from}&to=${to}`);
  }

  const PRESETS = [
    { label: "Today",      from: todayStr(),      to: todayStr()    },
    { label: "7 days",     from: daysAgoStr(6),   to: todayStr()    },
    { label: "30 days",    from: daysAgoStr(29),  to: todayStr()    },
    { label: "This month", from: thisMonthStr(),  to: todayStr()    },
  ];

  return (
    <div className="flex flex-col h-full">
      {/* ── Page header ─────────────────────────────────────────────────── */}
      <div className="bg-white shrink-0">
        <div className="border-b border-border">
          {/* Title + controls row */}
          <div className="px-4 lg:px-6 pt-3 lg:pt-4 pb-2 flex flex-col gap-2.5">
            {/* Top row: title + presets (lg) / title alone (mobile) */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <h1 className="text-lg font-bold text-foreground shrink-0">Reports</h1>

              {/* Quick presets */}
              <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-0.5">
                {PRESETS.map((p) => {
                  const isActive = localFrom === p.from && localTo === p.to;
                  return (
                    <button
                      key={p.label}
                      onClick={() => applyPreset(p.from, p.to)}
                      className={cn(
                        "shrink-0 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors",
                        isActive
                          ? "bg-sidebar text-white"
                          : "bg-secondary text-muted-foreground hover:text-foreground hover:bg-border"
                      )}
                    >
                      {p.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Date range row */}
            <div className="flex items-center gap-2 flex-wrap">
              <input
                type="date"
                value={localFrom}
                onChange={(e) => setLocalFrom(e.target.value)}
                className="h-9 flex-1 min-w-0 rounded-lg border border-border bg-white px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-accent/30"
              />
              <span className="text-muted-foreground text-sm shrink-0">–</span>
              <input
                type="date"
                value={localTo}
                onChange={(e) => setLocalTo(e.target.value)}
                className="h-9 flex-1 min-w-0 rounded-lg border border-border bg-white px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-accent/30"
              />
              <button
                onClick={applyDateFilter}
                className="h-9 shrink-0 px-4 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
              >
                Apply
              </button>
            </div>

            {dateError && (
              <p className="text-xs text-destructive -mt-1">{dateError}</p>
            )}
          </div>

          {/* Tabs */}
          <div className="flex gap-0.5 px-4 lg:px-6 overflow-x-auto no-scrollbar">
            {TABS.map((t) => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={cn(
                  "relative shrink-0 px-3 py-2.5 text-sm font-medium transition-colors",
                  tab === t.id
                    ? "text-foreground after:absolute after:bottom-0 after:inset-x-0 after:h-0.5 after:bg-primary"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Tab content ─────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto p-4 lg:p-6">
        {tab === "overview"  && <OverviewTab  sales={completedSales} expenses={expenses} fromDate={fromDate} toDate={toDate} />}
        {tab === "sales"     && <SalesTab     sales={completedSales} />}
        {tab === "products"  && <ProductsTab  sales={completedSales} />}
        {tab === "inventory" && <InventoryTab adjustments={adjustments} />}
        {tab === "cashiers"  && <CashiersTab  sales={completedSales} />}
        {tab === "payments"  && <PaymentsTab  sales={completedSales} />}
      </div>
    </div>
  );
}

// ── Overview Tab ──────────────────────────────────────────────────────────────

function OverviewTab({ sales, expenses, fromDate, toDate }: { sales: any[]; expenses: any[]; fromDate: string; toDate: string }) {
  const round2 = (n: number) => Math.round(n * 100) / 100;

  const totalRevenue   = round2(sales.reduce((s, x) => s + Number(x.total_amount),   0));
  const totalDiscount  = round2(sales.reduce((s, x) => s + Number(x.discount_amount), 0));
  const avgOrderValue  = sales.length > 0 ? totalRevenue / sales.length : 0;
  const totalItems     = sales.reduce((s, x) => s + (x.sale_items ?? []).length, 0);

  // COGS = Σ (quantity × per-unit cost) per sale item.
  // Uses cost_at_sale recorded at sale time (accurate historical cost from the
  // batches consumed via FEFO). Falls back to current product.cost_price only
  // for pre-migration rows where cost_at_sale is NULL.
  const totalCogs = round2(
    sales.reduce(
      (s, sale) =>
        s +
        (sale.sale_items ?? []).reduce((i: number, it: any) => {
          const unitCost = it.cost_at_sale != null
            ? Number(it.cost_at_sale)
            : Number(it.product?.cost_price ?? 0);
          return i + Number(it.quantity ?? 0) * unitCost;
        }, 0),
      0
    )
  );
  const grossProfit    = round2(totalRevenue - totalCogs);
  const totalExpenses  = round2(expenses.reduce((s, e) => s + Number(e.amount), 0));
  const netProfit      = round2(grossProfit - totalExpenses);
  const grossMargin    = totalRevenue > 0 ? (grossProfit / totalRevenue) * 100 : 0;
  const netMargin      = totalRevenue > 0 ? (netProfit   / totalRevenue) * 100 : 0;

  // Revenue by day
  const dayMap: Record<string, { revenue: number; count: number }> = {};
  for (const sale of sales) {
    const day = sale.created_at.split("T")[0];
    if (!dayMap[day]) dayMap[day] = { revenue: 0, count: 0 };
    dayMap[day].revenue += sale.total_amount;
    dayMap[day].count++;
  }
  const revenueByDay = Object.entries(dayMap)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([day, v]) => ({ day: formatShortDate(day), ...v }));

  return (
    <div className="space-y-6 max-w-5xl">
      {/* KPI grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Revenue"    value={formatCurrency(totalRevenue)}   sub={`${sales.length} completed sales`} />
        <StatCard label="Avg Order Value"  value={formatCurrency(avgOrderValue)} />
        <StatCard label="Total Discount"   value={formatCurrency(totalDiscount)}  accent="warning" />
        <StatCard label="Items Sold"       value={String(totalItems)} />
      </div>

      {/* ── P&L statement ────────────────────────────────────────────── */}
      <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-card">
        <div className="px-5 py-4 border-b border-border">
          <h3 className="text-base text-foreground" style={{ fontFamily: "var(--font-display)", fontWeight: 900 }}>
            Profit & Loss
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            {new Date(fromDate).toLocaleDateString("en-GH", { dateStyle: "medium" })}
            {" – "}
            {new Date(toDate).toLocaleDateString("en-GH", { dateStyle: "medium" })}
          </p>
        </div>

        <div className="p-5 space-y-0">
          <PLLine label="Revenue"               value={totalRevenue} />
          <PLLine label="Cost of goods sold"    value={totalCogs}    deduct indent />
          <div className="my-3 border-t border-border" />
          <PLLine label="Gross Profit"          value={grossProfit}  bold positive sub={`${grossMargin.toFixed(1)}% gross margin`} />
          <PLLine label="Operating expenses"    value={totalExpenses} deduct indent />
          <div className="my-3 border-t-2 border-border" />

          {/* Net profit callout */}
          <div
            className={cn(
              "rounded-xl px-4 py-3.5 mt-2",
              netProfit >= 0
                ? "bg-success/8 border border-success/20"
                : "bg-destructive/8 border border-destructive/20"
            )}
          >
            <div className="flex items-baseline justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-foreground">Net Profit</p>
                <p className="text-xs text-muted-foreground mt-0.5">{netMargin.toFixed(1)}% net margin</p>
              </div>
              <p
                className={cn(
                  "text-3xl tabular-nums shrink-0",
                  netProfit >= 0 ? "text-success" : "text-destructive"
                )}
                style={{ fontFamily: "var(--font-display)", fontWeight: 900 }}
              >
                {formatCurrency(netProfit)}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Revenue chart */}
      <SectionCard title="Revenue over period">
        {revenueByDay.length === 0 ? (
          <EmptyState icon={TrendingUp} title="No revenue data" sub="Sales will appear here once recorded in this period" />
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={revenueByDay} margin={{ left: 0, right: 4, top: 4, bottom: 0 }}>
              <defs>
                <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#CC1B14" stopOpacity={0.12} />
                  <stop offset="95%" stopColor="#CC1B14" stopOpacity={0}    />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
              <XAxis dataKey="day" tick={{ fontSize: 11, fill: "#6B7280" }} axisLine={false} tickLine={false} />
              <YAxis
                tick={{ fontSize: 11, fill: "#6B7280" }} axisLine={false} tickLine={false} width={60}
                tickFormatter={(v) => `₵${(v / 1000).toFixed(0)}k`}
              />
              <Tooltip content={<ChartTooltip />} />
              <Area
                type="monotone" dataKey="revenue" name="Revenue"
                stroke="#CC1B14" strokeWidth={2} fill="url(#revenueGradient)" dot={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </SectionCard>
    </div>
  );
}

function PLLine({
  label, value, deduct, positive, bold, size, sub, indent,
}: {
  label: string;
  value: number;
  deduct?: boolean;
  positive?: boolean;
  bold?: boolean;
  size?: "lg";
  sub?: string;
  indent?: boolean;
}) {
  return (
    <div className={cn("flex items-baseline justify-between gap-3 py-1.5", indent && "pl-4")}>
      <span className="flex flex-col sm:flex-row sm:items-baseline sm:gap-2 min-w-0">
        <span
          className={cn(
            "text-sm",
            bold ? "font-semibold text-foreground" : deduct ? "text-muted-foreground" : "text-foreground"
          )}
        >
          {deduct ? "− " : ""}{label}
        </span>
        {sub && <span className="text-[11px] text-muted-foreground">{sub}</span>}
      </span>
      <span
        className={cn(
          "tabular-nums shrink-0 font-medium",
          size === "lg" ? "text-2xl" : "text-sm",
          deduct ? "text-muted-foreground" : positive ? "text-success" : "text-foreground"
        )}
      >
        {formatCurrency(value)}
      </span>
    </div>
  );
}

// ── Sales Tab ─────────────────────────────────────────────────────────────────

function SalesTab({ sales }: { sales: any[] }) {
  const rows = sales.map((s) => ({
    date:     new Date(s.created_at).toLocaleDateString("en-GH"),
    time:     new Date(s.created_at).toLocaleTimeString("en-GH", { hour: "2-digit", minute: "2-digit" }),
    cashier:  s.cashier?.full_name ?? "—",
    items:    (s.sale_items ?? []).length,
    subtotal: formatCurrency(s.subtotal),
    discount: formatCurrency(s.discount_amount),
    total:    formatCurrency(s.total_amount),
    _total:   s.total_amount,
    _discount: s.discount_amount,
  }));

  return (
    <div className="space-y-4 max-w-5xl">
      {/* Export */}
      <div className="flex justify-end">
        <button
          onClick={() => exportCSV(rows.map(({ _total, _discount, ...r }) => r), "sales-report.csv")}
          className="flex items-center gap-2 rounded-lg border border-border px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
        >
          <Download className="w-3.5 h-3.5" aria-hidden="true" />
          Export CSV
        </button>
      </div>

      {rows.length === 0 ? (
        <div className="rounded-2xl border border-border bg-card">
          <EmptyState icon={BarChart3} title="No sales in this period" sub="Adjust the date range to see sales data" />
        </div>
      ) : (
        <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-card">
          {/* ── Mobile: card list ─────────────────────────────────── */}
          <div className="lg:hidden divide-y divide-border">
            {rows.map((r, i) => (
              <div key={i} className="flex items-start justify-between gap-3 px-4 py-3.5">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-foreground">{r.cashier}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {r.date} · {r.time} · {r.items} item{r.items !== 1 ? "s" : ""}
                  </p>
                  {r._discount > 0 && (
                    <p className="text-xs text-warning mt-0.5">Disc: {r.discount}</p>
                  )}
                </div>
                <p className="text-sm font-bold tabular-nums text-foreground shrink-0">{r.total}</p>
              </div>
            ))}
          </div>

          {/* ── Desktop: table ─────────────────────────────────────── */}
          <div className="hidden lg:block overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-secondary/50">
                  {["Date", "Time", "Cashier", "Items", "Subtotal", "Discount", "Total"].map((h) => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {rows.map((r, i) => (
                  <tr key={i} className="hover:bg-secondary/30 transition-colors">
                    <td className="px-4 py-3 text-foreground whitespace-nowrap">{r.date}</td>
                    <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">{r.time}</td>
                    <td className="px-4 py-3 text-foreground whitespace-nowrap">{r.cashier}</td>
                    <td className="px-4 py-3 tabular-nums">{r.items}</td>
                    <td className="px-4 py-3 tabular-nums">{r.subtotal}</td>
                    <td className="px-4 py-3 tabular-nums text-warning">{r.discount}</td>
                    <td className="px-4 py-3 tabular-nums font-semibold text-foreground">{r.total}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Products Tab ──────────────────────────────────────────────────────────────

function ProductsTab({ sales }: { sales: any[] }) {
  const productMap: Record<string, { revenue: number; units: number; cost: number }> = {};
  for (const sale of sales) {
    for (const item of sale.sale_items ?? []) {
      const name = item.product?.name ?? "Unknown";
      if (!productMap[name]) productMap[name] = { revenue: 0, units: 0, cost: 0 };
      const unitCost = item.cost_at_sale != null
        ? Number(item.cost_at_sale)
        : Number(item.product?.cost_price ?? 0);
      productMap[name].revenue += item.total_price;
      productMap[name].units   += item.quantity;
      productMap[name].cost    += item.quantity * unitCost;
    }
  }

  const rows = Object.entries(productMap)
    .map(([name, v]) => ({
      name,
      revenue: v.revenue,
      units:   v.units,
      cost:    v.cost,
      margin:  v.revenue > 0 ? ((v.revenue - v.cost) / v.revenue) * 100 : 0,
    }))
    .sort((a, b) => b.revenue - a.revenue);

  const top10 = rows.slice(0, 10);

  return (
    <div className="space-y-6 max-w-4xl">
      {rows.length === 0 ? (
        <div className="rounded-2xl border border-border bg-card">
          <EmptyState icon={BarChart3} title="No product data" sub="Product sales will appear here once transactions are recorded" />
        </div>
      ) : (
        <>
          <SectionCard title="Top Products by Revenue">
            <ResponsiveContainer width="100%" height={Math.max(160, top10.length * 28)}>
              <BarChart data={top10} layout="vertical" margin={{ left: 0, right: 24, top: 4, bottom: 0 }}>
                <XAxis type="number" tick={{ fontSize: 11, fill: "#6B7280" }} axisLine={false} tickLine={false}
                  tickFormatter={(v) => `₵${v.toFixed(0)}`} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: "#6B7280" }} axisLine={false}
                  tickLine={false} width={120} />
                <Tooltip content={<ChartTooltip />} />
                <Bar dataKey="revenue" name="Revenue" fill="#CC1B14" radius={[0, 4, 4, 0]} barSize={14} />
              </BarChart>
            </ResponsiveContainer>
          </SectionCard>

          <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-card">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-secondary/50">
                    {["#", "Product", "Units Sold", "Revenue", "Est. Cost", "Margin"].map((h) => (
                      <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide first:pl-5">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {rows.map((r, i) => (
                    <tr key={i} className="hover:bg-secondary/30 transition-colors">
                      <td className="px-4 py-3 pl-5 text-xs font-bold text-muted-foreground tabular-nums w-8">
                        {i + 1}
                      </td>
                      <td className="px-4 py-3 font-medium text-foreground">{r.name}</td>
                      <td className="px-4 py-3 tabular-nums text-muted-foreground">{r.units.toFixed(2)}</td>
                      <td className="px-4 py-3 tabular-nums font-semibold text-foreground">{formatCurrency(r.revenue)}</td>
                      <td className="px-4 py-3 tabular-nums text-muted-foreground">{formatCurrency(r.cost)}</td>
                      <td className="px-4 py-3">
                        <span
                          className={cn(
                            "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold tabular-nums",
                            r.margin >= 20
                              ? "bg-success/10 text-success"
                              : r.margin >= 0
                              ? "bg-warning/10 text-warning"
                              : "bg-destructive/10 text-destructive"
                          )}
                        >
                          {r.margin.toFixed(1)}%
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// ── Inventory & Waste Tab ─────────────────────────────────────────────────────

function InventoryTab({ adjustments }: { adjustments: any[] }) {
  const writeOffs   = adjustments.filter((a) => a.reason === "write_off");
  const corrections = adjustments.filter((a) => a.reason === "correction");
  const returns     = adjustments.filter((a) => a.reason === "return");

  const totalWrittenOff = writeOffs.reduce((s, a) => s + Math.abs(a.quantity_change), 0);

  const productWriteoffs: Record<string, number> = {};
  for (const a of writeOffs) {
    const name = a.product?.name ?? "Unknown";
    productWriteoffs[name] = (productWriteoffs[name] ?? 0) + Math.abs(a.quantity_change);
  }
  const writeoffRows = Object.entries(productWriteoffs)
    .map(([name, qty]) => ({ name, qty }))
    .sort((a, b) => b.qty - a.qty);

  const maxQty = writeoffRows[0]?.qty ?? 1;

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="grid grid-cols-3 gap-4">
        <StatCard label="Total Written Off" value={totalWrittenOff.toFixed(2)} sub="units" accent="destructive" />
        <StatCard label="Corrections"       value={String(corrections.length)}  sub="adjustments" />
        <StatCard label="Returns"           value={String(returns.length)}       sub="adjustments" />
      </div>

      <SectionCard title="Write-offs by Product">
        {writeoffRows.length === 0 ? (
          <EmptyState icon={PackageX} title="No write-offs" sub="No stock was written off in this period" />
        ) : (
          <div className="space-y-3">
            {writeoffRows.map((r) => (
              <div key={r.name}>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-sm text-foreground">{r.name}</span>
                  <span className="text-sm font-semibold text-destructive tabular-nums">{r.qty.toFixed(2)} units</span>
                </div>
                <div className="h-1.5 rounded-full bg-secondary overflow-hidden">
                  <div
                    className="h-full rounded-full bg-destructive/60 transition-all"
                    style={{ width: `${(r.qty / maxQty) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </SectionCard>

      <SectionCard title="All Stock Adjustments">
        {adjustments.length === 0 ? (
          <EmptyState icon={PackageX} title="No adjustments" sub="Stock adjustments will appear here once recorded" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  {["Date", "Product", "Change", "Reason"].map((h) => (
                    <th key={h} className="text-left pb-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {adjustments.slice(0, 50).map((a, i) => (
                  <tr key={i} className="hover:bg-secondary/30 transition-colors">
                    <td className="py-2.5 pr-4 text-muted-foreground whitespace-nowrap">
                      {new Date(a.created_at).toLocaleDateString("en-GH")}
                    </td>
                    <td className="py-2.5 pr-4 font-medium whitespace-nowrap">{a.product?.name ?? "—"}</td>
                    <td className={cn("py-2.5 pr-4 tabular-nums font-semibold whitespace-nowrap", a.quantity_change < 0 ? "text-destructive" : "text-success")}>
                      {a.quantity_change > 0 ? "+" : ""}{a.quantity_change}
                    </td>
                    <td className="py-2.5 capitalize text-muted-foreground whitespace-nowrap">
                      {a.reason.replace("_", " ")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>
    </div>
  );
}

// ── Cashiers Tab ──────────────────────────────────────────────────────────────

function getInitials(name: string) {
  return name.split(" ").slice(0, 2).map((w) => w[0] ?? "").join("").toUpperCase();
}

function CashiersTab({ sales }: { sales: any[] }) {
  const cashierMap: Record<string, { revenue: number; sales: number; discount: number }> = {};
  for (const sale of sales) {
    const name = sale.cashier?.full_name ?? "Unknown";
    if (!cashierMap[name]) cashierMap[name] = { revenue: 0, sales: 0, discount: 0 };
    cashierMap[name].revenue  += sale.total_amount;
    cashierMap[name].sales++;
    cashierMap[name].discount += sale.discount_amount;
  }

  const rows = Object.entries(cashierMap)
    .map(([name, v]) => ({ name, ...v, avg: v.sales > 0 ? v.revenue / v.sales : 0 }))
    .sort((a, b) => b.revenue - a.revenue);

  return (
    <div className="space-y-6 max-w-4xl">
      {rows.length === 0 ? (
        <div className="rounded-2xl border border-border bg-card">
          <EmptyState icon={Users} title="No cashier data" sub="Cashier performance will appear here once sales are recorded" />
        </div>
      ) : (
        <>
          <SectionCard title="Revenue by Cashier">
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={rows} barSize={32} margin={{ left: 0, right: 4, top: 4, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#6B7280" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: "#6B7280" }} axisLine={false} tickLine={false}
                  tickFormatter={(v) => `₵${(v / 1000).toFixed(0)}k`} />
                <Tooltip content={<ChartTooltip />} />
                <Bar dataKey="revenue" name="Revenue" fill="#1B50C0" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </SectionCard>

          <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-card">
            {/* Mobile: card list */}
            <div className="lg:hidden divide-y divide-border">
              {rows.map((r, i) => (
                <div key={i} className="flex items-center gap-3 px-4 py-3.5">
                  <div className="h-9 w-9 rounded-full bg-sidebar shrink-0 flex items-center justify-center text-[11px] font-bold text-white">
                    {getInitials(r.name)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground truncate">{r.name}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{r.sales} sales · avg {formatCurrency(r.avg)}</p>
                  </div>
                  <p className="text-sm font-bold tabular-nums text-foreground shrink-0">{formatCurrency(r.revenue)}</p>
                </div>
              ))}
            </div>

            {/* Desktop: table */}
            <div className="hidden lg:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-secondary/50">
                    {["Cashier", "Sales", "Revenue", "Avg Order", "Total Discount"].map((h) => (
                      <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {rows.map((r, i) => (
                    <tr key={i} className="hover:bg-secondary/30 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2.5">
                          <div className="h-7 w-7 rounded-full bg-sidebar shrink-0 flex items-center justify-center text-[10px] font-bold text-white">
                            {getInitials(r.name)}
                          </div>
                          <span className="font-medium">{r.name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 tabular-nums">{r.sales}</td>
                      <td className="px-4 py-3 tabular-nums font-semibold">{formatCurrency(r.revenue)}</td>
                      <td className="px-4 py-3 tabular-nums">{formatCurrency(r.avg)}</td>
                      <td className="px-4 py-3 tabular-nums text-warning">{formatCurrency(r.discount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// ── Payments Tab ──────────────────────────────────────────────────────────────

const METHOD_META: Record<string, { label: string; icon: React.ElementType }> = {
  cash:        { label: "Cash",          icon: Banknote    },
  momo:        { label: "Mobile Money",  icon: Smartphone  },
  pos_machine: { label: "POS Machine",   icon: CreditCard  },
};

function PaymentsTab({ sales }: { sales: any[] }) {
  const methodMap: Record<string, { total: number; count: number }> = {};
  for (const sale of sales) {
    for (const p of sale.payments ?? []) {
      const m = p.method as string;
      if (!methodMap[m]) methodMap[m] = { total: 0, count: 0 };
      methodMap[m].total += p.amount;
      methodMap[m].count++;
    }
  }

  const totalRevenue = Object.values(methodMap).reduce((s, v) => s + v.total, 0);

  const rows = Object.entries(methodMap)
    .map(([method, v]) => ({
      method,
      meta:  METHOD_META[method] ?? { label: method, icon: CreditCard },
      ...v,
      pct: totalRevenue > 0 ? (v.total / totalRevenue) * 100 : 0,
    }))
    .sort((a, b) => b.total - a.total);

  return (
    <div className="space-y-6 max-w-2xl">
      {rows.length === 0 ? (
        <div className="rounded-2xl border border-border bg-card">
          <EmptyState icon={CreditCard} title="No payment data" sub="Payment method breakdown will appear here once sales are recorded" />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {rows.map((r) => (
              <StatCard
                key={r.method}
                label={r.meta.label}
                value={formatCurrency(r.total)}
                sub={`${r.count} transaction${r.count !== 1 ? "s" : ""}`}
              />
            ))}
          </div>

          <SectionCard title="Payment Method Breakdown">
            <div className="space-y-5">
              {rows.map((r) => {
                const Icon = r.meta.icon;
                return (
                  <div key={r.method}>
                    <div className="flex items-center gap-2.5 mb-2">
                      <div className="h-7 w-7 rounded-lg bg-secondary flex items-center justify-center shrink-0">
                        <Icon className="h-3.5 w-3.5 text-muted-foreground" aria-hidden="true" />
                      </div>
                      <span className="text-sm font-medium text-foreground flex-1">{r.meta.label}</span>
                      <span className="text-sm font-semibold tabular-nums text-foreground">
                        {formatCurrency(r.total)}
                      </span>
                      <span className="text-xs font-bold tabular-nums text-muted-foreground w-10 text-right shrink-0">
                        {r.pct.toFixed(0)}%
                      </span>
                    </div>
                    <div className="h-2 rounded-full bg-secondary overflow-hidden">
                      <div
                        className="h-full rounded-full bg-primary transition-all"
                        style={{ width: `${r.pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </SectionCard>
        </>
      )}
    </div>
  );
}
