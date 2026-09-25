"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  LineChart, Line, CartesianGrid,
} from "recharts";
import { cn, formatCurrency } from "@/lib/utils";
import { Download } from "lucide-react";
import { SnowflakePattern } from "@/components/snowflake-pattern";

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
  { id: "overview", label: "Overview" },
  { id: "sales", label: "Sales" },
  { id: "products", label: "Products" },
  { id: "inventory", label: "Inventory & Waste" },
  { id: "cashiers", label: "Cashiers" },
  { id: "payments", label: "Payments" },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatShortDate(d: string) {
  return new Date(d).toLocaleDateString("en-GH", { month: "short", day: "numeric" });
}

function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-border bg-card shadow-md px-3 py-2 text-xs">
      <p className="font-medium text-foreground mb-1">{label}</p>
      {payload.map((p: any, i: number) => (
        <p key={i} style={{ color: p.color }}>
          {p.name}: {typeof p.value === "number" && p.value > 100 ? formatCurrency(p.value) : p.value}
        </p>
      ))}
    </div>
  );
}

function StatCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-2xl border border-border bg-card px-5 py-4 shadow-card">
      <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2">{label}</p>
      <p
        className="text-3xl text-foreground tabular-nums leading-none"
        style={{ fontFamily: "var(--font-display)", fontWeight: 900 }}
      >
        {value}
      </p>
      {sub && <p className="text-xs text-muted-foreground mt-2">{sub}</p>}
    </div>
  );
}

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-card">
      <div className="px-5 py-4 border-b border-border">
        <h3 className="text-lg text-foreground" style={{ fontFamily: "var(--font-display)", fontWeight: 900 }}>{title}</h3>
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

// ── Export CSV helper ─────────────────────────────────────────────────────────

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
    if (isNaN(from.getTime()) || isNaN(to.getTime())) {
      setDateError("Both dates are required.");
      return;
    }
    if (from > to) {
      setDateError("Start date must be on or before end date.");
      return;
    }
    router.push(`/reports?from=${localFrom}&to=${localTo}`);
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="relative bg-white overflow-hidden shrink-0">
        <div className="absolute inset-0 pointer-events-none">
          <SnowflakePattern opacity={0.06} rows={2} tileSize={52} onLight />
        </div>
        <div className="relative z-10 border-b border-border">
          {/* Title + date filter row */}
          <div className="px-4 lg:px-6 pt-3 lg:pt-4 pb-2 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <h1 className="text-lg font-bold text-foreground shrink-0">Reports</h1>
            </div>
            <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto">
              <input
                type="date"
                value={localFrom}
                onChange={(e) => setLocalFrom(e.target.value)}
                className="h-9 rounded-lg border border-border bg-white px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-accent/30"
              />
              <span className="text-muted-foreground text-sm">–</span>
              <input
                type="date"
                value={localTo}
                onChange={(e) => setLocalTo(e.target.value)}
                className="h-9 rounded-lg border border-border bg-white px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-accent/30"
              />
              <button
                onClick={applyDateFilter}
                className="h-9 px-4 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
              >
                Apply
              </button>
            </div>
          </div>
          {dateError && (
            <div className="px-4 lg:px-6 pb-2">
              <p className="text-xs text-destructive">{dateError}</p>
            </div>
          )}
          {/* Tabs row */}
          <div className="flex gap-1 px-4 lg:px-6 pb-2 overflow-x-auto no-scrollbar">
            {TABS.map((t) => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={cn(
                  "shrink-0 px-4 py-1.5 rounded-lg text-sm font-medium transition-colors",
                  tab === t.id ? "bg-secondary text-foreground" : "text-muted-foreground hover:text-foreground hover:bg-secondary"
                )}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-y-auto p-4 lg:p-6">
        {tab === "overview" && <OverviewTab sales={completedSales} expenses={expenses} fromDate={fromDate} toDate={toDate} />}
        {tab === "sales" && <SalesTab sales={completedSales} />}
        {tab === "products" && <ProductsTab sales={completedSales} />}
        {tab === "inventory" && <InventoryTab adjustments={adjustments} />}
        {tab === "cashiers" && <CashiersTab sales={completedSales} />}
        {tab === "payments" && <PaymentsTab sales={completedSales} />}
      </div>
    </div>
  );
}

// ── Overview Tab ──────────────────────────────────────────────────────────────

function OverviewTab({ sales, expenses, fromDate, toDate }: { sales: any[]; expenses: any[]; fromDate: string; toDate: string }) {
  const round2 = (n: number) => Math.round(n * 100) / 100;

  const totalRevenue = round2(sales.reduce((s, x) => s + Number(x.total_amount), 0));
  const totalDiscount = round2(sales.reduce((s, x) => s + Number(x.discount_amount), 0));
  const avgOrderValue = sales.length > 0 ? totalRevenue / sales.length : 0;
  const totalItems = sales.reduce((s, x) => s + (x.sale_items ?? []).length, 0);

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
  const grossProfit = round2(totalRevenue - totalCogs);
  const totalExpenses = round2(expenses.reduce((s, e) => s + Number(e.amount), 0));
  const netProfit = round2(grossProfit - totalExpenses);
  const grossMargin = totalRevenue > 0 ? (grossProfit / totalRevenue) * 100 : 0;
  const netMargin = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0;

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
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Revenue" value={formatCurrency(totalRevenue)} sub={`${sales.length} sales`} />
        <StatCard label="Avg Order Value" value={formatCurrency(avgOrderValue)} />
        <StatCard label="Total Discount" value={formatCurrency(totalDiscount)} />
        <StatCard label="Items Sold" value={String(totalItems)} />
      </div>

      {/* ── Profit & Loss ─────────────────────────────────────────────── */}
      <div className="rounded-2xl border border-border bg-card overflow-hidden">
        <div className="px-5 py-4 border-b border-border">
          <h3 className="text-lg text-foreground" style={{ fontFamily: "var(--font-display)", fontWeight: 900 }}>
            Profit & Loss
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            {new Date(fromDate).toLocaleDateString("en-GH", { dateStyle: "medium" })}
            {" – "}
            {new Date(toDate).toLocaleDateString("en-GH", { dateStyle: "medium" })}
          </p>
        </div>
        <div className="p-5 space-y-2.5">
          <PLLine label="Revenue"          value={totalRevenue} />
          <PLLine label="− Cost of goods sold" value={totalCogs} deduct />
          <PLLine label="= Gross Profit"   value={grossProfit} bold positive sub={`${grossMargin.toFixed(1)}% gross margin`} />
          <PLLine label="− Operating expenses" value={totalExpenses} deduct />
          <div className="pt-3 mt-2 border-t-2 border-border">
            <PLLine
              label="= Net Profit"
              value={netProfit}
              bold
              positive={netProfit >= 0}
              negative={netProfit < 0}
              size="lg"
              sub={`${netMargin.toFixed(1)}% net margin`}
            />
          </div>
        </div>
      </div>

      <SectionCard title="Revenue over period">
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={revenueByDay}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
            <XAxis dataKey="day" tick={{ fontSize: 11, fill: "#6B7280" }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 11, fill: "#6B7280" }} axisLine={false} tickLine={false} width={60}
              tickFormatter={(v) => `₵${(v / 1000).toFixed(0)}k`} />
            <Tooltip content={<ChartTooltip />} />
            <Line type="monotone" dataKey="revenue" stroke="#CC1B14" strokeWidth={2} dot={false} name="Revenue" />
          </LineChart>
        </ResponsiveContainer>
      </SectionCard>
    </div>
  );
}

function PLLine({
  label, value, deduct, positive, negative, bold, size, sub,
}: {
  label: string;
  value: number;
  deduct?: boolean;
  positive?: boolean;
  negative?: boolean;
  bold?: boolean;
  size?: "lg";
  sub?: string;
}) {
  const amountCls = cn(
    "tabular-nums shrink-0",
    size === "lg" ? "text-2xl" : "text-base",
    bold ? "font-bold" : "font-medium",
    positive ? "text-success" : negative ? "text-destructive" : deduct ? "text-muted-foreground" : "text-foreground",
    bold && size === "lg" && "font-display font-black"
  );
  return (
    <div className="flex items-baseline justify-between gap-3">
      <span className="flex flex-col sm:flex-row sm:items-baseline sm:gap-2 min-w-0">
        <span className={cn("text-sm", bold ? "font-semibold text-foreground" : "text-muted-foreground")}>{label}</span>
        {sub && <span className="text-[11px] text-muted-foreground">{sub}</span>}
      </span>
      <span className={amountCls}>{formatCurrency(value)}</span>
    </div>
  );
}

// ── Sales Tab ─────────────────────────────────────────────────────────────────

function SalesTab({ sales }: { sales: any[] }) {
  const rows = sales.map((s) => ({
    date: new Date(s.created_at).toLocaleDateString("en-GH"),
    time: new Date(s.created_at).toLocaleTimeString("en-GH", { hour: "2-digit", minute: "2-digit" }),
    cashier: s.cashier?.full_name ?? "—",
    items: (s.sale_items ?? []).length,
    subtotal: formatCurrency(s.subtotal),
    discount: formatCurrency(s.discount_amount),
    total: formatCurrency(s.total_amount),
  }));

  return (
    <div className="space-y-4 max-w-5xl">
      <div className="flex justify-end">
        <button
          onClick={() => exportCSV(rows, "sales-report.csv")}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <Download className="w-4 h-4" /> Export CSV
        </button>
      </div>
      <div className="rounded-2xl border border-border bg-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-secondary/50">
                {["Date", "Time", "Cashier", "Items", "Subtotal", "Discount", "Total"].map((h) => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {rows.map((r, i) => (
                <tr key={i} className="hover:bg-secondary/30 transition-colors">
                  <td className="px-4 py-3 text-foreground">{r.date}</td>
                  <td className="px-4 py-3 text-muted-foreground">{r.time}</td>
                  <td className="px-4 py-3 text-foreground">{r.cashier}</td>
                  <td className="px-4 py-3 text-foreground tabular-nums">{r.items}</td>
                  <td className="px-4 py-3 tabular-nums">{r.subtotal}</td>
                  <td className="px-4 py-3 tabular-nums text-amber-600">{r.discount}</td>
                  <td className="px-4 py-3 tabular-nums font-semibold text-foreground">{r.total}</td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr><td colSpan={7} className="px-4 py-8 text-center text-muted-foreground text-sm">No sales in this period</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
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
      productMap[name].units += item.quantity;
      productMap[name].cost += item.quantity * unitCost;
    }
  }

  const rows = Object.entries(productMap)
    .map(([name, v]) => ({
      name,
      revenue: v.revenue,
      units: v.units,
      cost: v.cost,
      margin: v.revenue > 0 ? ((v.revenue - v.cost) / v.revenue) * 100 : 0,
    }))
    .sort((a, b) => b.revenue - a.revenue);

  const top10 = rows.slice(0, 10);

  return (
    <div className="space-y-6 max-w-4xl">
      <SectionCard title="Top Products by Revenue">
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={top10} layout="vertical" margin={{ left: 0, right: 20 }}>
            <XAxis type="number" tick={{ fontSize: 11, fill: "#6B7280" }} axisLine={false} tickLine={false}
              tickFormatter={(v) => `₵${v.toFixed(0)}`} />
            <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: "#6B7280" }} axisLine={false}
              tickLine={false} width={120} />
            <Tooltip content={<ChartTooltip />} />
            <Bar dataKey="revenue" name="Revenue" fill="#AB1509" radius={[0, 4, 4, 0]} barSize={16} />
          </BarChart>
        </ResponsiveContainer>
      </SectionCard>

      <div className="rounded-2xl border border-border bg-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-secondary/50">
                {["Product", "Units Sold", "Revenue", "Est. Cost", "Margin %"].map((h) => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {rows.map((r, i) => (
                <tr key={i} className="hover:bg-secondary/30 transition-colors">
                  <td className="px-4 py-3 text-foreground font-medium">{r.name}</td>
                  <td className="px-4 py-3 tabular-nums">{r.units.toFixed(2)}</td>
                  <td className="px-4 py-3 tabular-nums font-semibold">{formatCurrency(r.revenue)}</td>
                  <td className="px-4 py-3 tabular-nums text-muted-foreground">{formatCurrency(r.cost)}</td>
                  <td className="px-4 py-3 tabular-nums">
                    <span className={cn("font-medium", r.margin >= 20 ? "text-success" : r.margin >= 0 ? "text-warning" : "text-destructive")}>
                      {r.margin.toFixed(1)}%
                    </span>
                  </td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr><td colSpan={5} className="px-4 py-8 text-center text-muted-foreground text-sm">No product data</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ── Inventory & Waste Tab ─────────────────────────────────────────────────────

function InventoryTab({ adjustments }: { adjustments: any[] }) {
  const writeOffs = adjustments.filter((a) => a.reason === "write_off");
  const corrections = adjustments.filter((a) => a.reason === "correction");
  const returns = adjustments.filter((a) => a.reason === "return");

  const totalWrittenOff = writeOffs.reduce((s, a) => s + Math.abs(a.quantity_change), 0);

  const productWriteoffs: Record<string, number> = {};
  for (const a of writeOffs) {
    const name = a.product?.name ?? "Unknown";
    productWriteoffs[name] = (productWriteoffs[name] ?? 0) + Math.abs(a.quantity_change);
  }
  const writeoffRows = Object.entries(productWriteoffs)
    .map(([name, qty]) => ({ name, qty }))
    .sort((a, b) => b.qty - a.qty);

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="grid grid-cols-3 gap-4">
        <StatCard label="Total Written Off" value={totalWrittenOff.toFixed(2)} sub="units" />
        <StatCard label="Corrections" value={String(corrections.length)} sub="adjustments" />
        <StatCard label="Returns" value={String(returns.length)} sub="adjustments" />
      </div>

      <SectionCard title="Write-offs by Product">
        {writeoffRows.length === 0 ? (
          <p className="text-sm text-muted-foreground">No write-offs in this period</p>
        ) : (
          <div className="space-y-3">
            {writeoffRows.map((r) => (
              <div key={r.name} className="flex items-center justify-between">
                <span className="text-sm text-foreground">{r.name}</span>
                <span className="text-sm font-semibold text-destructive tabular-nums">{r.qty.toFixed(2)} units</span>
              </div>
            ))}
          </div>
        )}
      </SectionCard>

      <SectionCard title="All Stock Adjustments">
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
                  <td className="py-2.5 pr-4 text-muted-foreground">{new Date(a.created_at).toLocaleDateString("en-GH")}</td>
                  <td className="py-2.5 pr-4 font-medium">{a.product?.name ?? "—"}</td>
                  <td className={cn("py-2.5 pr-4 tabular-nums font-semibold", a.quantity_change < 0 ? "text-destructive" : "text-success")}>
                    {a.quantity_change > 0 ? "+" : ""}{a.quantity_change}
                  </td>
                  <td className="py-2.5 capitalize text-muted-foreground">{a.reason.replace("_", " ")}</td>
                </tr>
              ))}
              {adjustments.length === 0 && (
                <tr><td colSpan={4} className="py-8 text-center text-muted-foreground text-sm">No adjustments in this period</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </SectionCard>
    </div>
  );
}

// ── Cashiers Tab ──────────────────────────────────────────────────────────────

function CashiersTab({ sales }: { sales: any[] }) {
  const cashierMap: Record<string, { revenue: number; sales: number; discount: number }> = {};
  for (const sale of sales) {
    const name = sale.cashier?.full_name ?? "Unknown";
    if (!cashierMap[name]) cashierMap[name] = { revenue: 0, sales: 0, discount: 0 };
    cashierMap[name].revenue += sale.total_amount;
    cashierMap[name].sales++;
    cashierMap[name].discount += sale.discount_amount;
  }

  const rows = Object.entries(cashierMap)
    .map(([name, v]) => ({ name, ...v, avg: v.sales > 0 ? v.revenue / v.sales : 0 }))
    .sort((a, b) => b.revenue - a.revenue);

  return (
    <div className="space-y-6 max-w-4xl">
      <SectionCard title="Revenue by Cashier">
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={rows} barSize={32}>
            <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#6B7280" }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 11, fill: "#6B7280" }} axisLine={false} tickLine={false}
              tickFormatter={(v) => `₵${(v / 1000).toFixed(0)}k`} />
            <Tooltip content={<ChartTooltip />} />
            <Bar dataKey="revenue" name="Revenue" fill="#1B50C0" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </SectionCard>

      <div className="rounded-2xl border border-border bg-card overflow-hidden">
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
                <td className="px-4 py-3 font-medium">{r.name}</td>
                <td className="px-4 py-3 tabular-nums">{r.sales}</td>
                <td className="px-4 py-3 tabular-nums font-semibold">{formatCurrency(r.revenue)}</td>
                <td className="px-4 py-3 tabular-nums">{formatCurrency(r.avg)}</td>
                <td className="px-4 py-3 tabular-nums text-amber-600">{formatCurrency(r.discount)}</td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-muted-foreground text-sm">No data</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Payments Tab ──────────────────────────────────────────────────────────────

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

  const METHOD_LABELS: Record<string, string> = { cash: "Cash", momo: "Mobile Money", pos_machine: "POS Machine" };
  const totalRevenue = Object.values(methodMap).reduce((s, v) => s + v.total, 0);

  const rows = Object.entries(methodMap)
    .map(([method, v]) => ({ method, label: METHOD_LABELS[method] ?? method, ...v, pct: totalRevenue > 0 ? (v.total / totalRevenue) * 100 : 0 }))
    .sort((a, b) => b.total - a.total);

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="grid grid-cols-3 gap-4">
        {rows.map((r) => (
          <StatCard key={r.method} label={r.label} value={formatCurrency(r.total)} sub={`${r.count} transactions`} />
        ))}
      </div>

      <SectionCard title="Payment Method Breakdown">
        {rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">No payment data</p>
        ) : (
          <div className="space-y-3">
            {rows.map((r) => (
              <div key={r.method}>
                <div className="flex justify-between mb-1">
                  <span className="text-sm text-foreground">{r.label}</span>
                  <span className="text-sm font-semibold tabular-nums">{r.pct.toFixed(1)}% · {formatCurrency(r.total)}</span>
                </div>
                <div className="h-2 rounded-full bg-secondary overflow-hidden">
                  <div className="h-full rounded-full bg-primary" style={{ width: `${r.pct}%` }} />
                </div>
              </div>
            ))}
          </div>
        )}
      </SectionCard>
    </div>
  );
}

