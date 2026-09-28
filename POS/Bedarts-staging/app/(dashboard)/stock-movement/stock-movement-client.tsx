"use client";

import { TrendingUp, TrendingDown } from "lucide-react";
import { formatCurrency, cn } from "@/lib/utils";

export interface DailyRow {
  date: string;
  opening: number;
  received: number;
  sales: number;
  adjusted: number;
  closing: number;
}

function formatDayLabel(dateStr: string, todayStr: string) {
  const [y, m, d] = dateStr.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  const todayParts = todayStr.split("-").map(Number);
  const today = new Date(todayParts[0], todayParts[1] - 1, todayParts[2]);
  const diffDays = Math.round((today.getTime() - dt.getTime()) / 86400000);
  if (diffDays === 0) return {
    primary: "Today",
    secondary: dt.toLocaleDateString("en-GH", { weekday: "long", day: "numeric", month: "long", year: "numeric" }),
    short: dt.toLocaleDateString("en-GH", { weekday: "short", day: "numeric", month: "short" }),
  };
  if (diffDays === 1) return {
    primary: "Yesterday",
    secondary: dt.toLocaleDateString("en-GH", { weekday: "long", day: "numeric", month: "long", year: "numeric" }),
    short: dt.toLocaleDateString("en-GH", { weekday: "short", day: "numeric", month: "short" }),
  };
  return {
    primary: dt.toLocaleDateString("en-GH", { weekday: "long", day: "numeric" }),
    secondary: dt.toLocaleDateString("en-GH", { month: "long", year: "numeric" }),
    short: dt.toLocaleDateString("en-GH", { weekday: "short", day: "numeric", month: "short" }),
  };
}

export function StockMovementClient({
  closingValue,
  dailyRows,
  todayStr,
}: {
  closingValue: number;
  dailyRows: DailyRow[];
  todayStr: string;
}) {
  return (
    <div className="min-h-full p-5 lg:p-8 space-y-5">

      {/* ── Page header ────────────────────────────────────── */}
      <div className="flex items-end justify-between gap-6 pb-2">
        <div>
          <h1 className="font-display text-xl lg:text-2xl font-black text-foreground tracking-tight">
            Stock Value
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Valued at selling price</p>
        </div>
        <div className="text-right shrink-0">
          <p className="font-display text-2xl lg:text-3xl font-black tabular-nums leading-none text-foreground">
            {formatCurrency(closingValue)}
          </p>
        </div>
      </div>

      {/* ── Day cards ──────────────────────────────────────── */}
      <div className="space-y-4">
        {dailyRows.map((day) => {
          const isToday = day.date === todayStr;
          const dayDelta = day.closing - day.opening;
          const label = formatDayLabel(day.date, todayStr);

          return isToday
            ? <TodayCard key={day.date} day={day} label={label} dayDelta={dayDelta} />
            : <PastDayCard key={day.date} day={day} label={label} dayDelta={dayDelta} />;
        })}
      </div>
    </div>
  );
}

/* ── Today: navy hero card ─────────────────────────────────────── */
function TodayCard({
  day,
  label,
  dayDelta,
}: {
  day: DailyRow;
  label: { primary: string; secondary: string; short: string };
  dayDelta: number;
}) {
  return (
    <div className="rounded-2xl bg-sidebar overflow-hidden shadow-lg">
      {/* Header */}
      <div className="px-6 lg:px-8 pt-6 pb-5 flex items-start justify-between gap-4">
        <div>
          <p className="font-display text-xl lg:text-2xl font-black text-white leading-none">
            {label.primary}
          </p>
          <p className="text-sm text-white/55 mt-1.5 hidden sm:block">{label.secondary}</p>
          <p className="text-sm text-white/55 mt-1.5 sm:hidden">{label.short}</p>
        </div>
        <div className="text-right shrink-0">
          <p className="font-display text-2xl lg:text-3xl font-black tabular-nums text-white leading-none">
            {formatCurrency(day.closing)}
          </p>
          {dayDelta !== 0 && (
            <p className={cn(
              "text-xs font-bold tabular-nums mt-2 flex items-center justify-end gap-1",
              dayDelta > 0 ? "text-emerald-400" : "text-red-400"
            )}>
              {dayDelta > 0
                ? <TrendingUp className="w-3 h-3" aria-hidden />
                : <TrendingDown className="w-3 h-3" aria-hidden />
              }
              {dayDelta > 0 ? "+" : "−"}{formatCurrency(Math.abs(dayDelta))}
            </p>
          )}
        </div>
      </div>

      {/* Stats — below lg: stacked */}
      <div className="lg:hidden border-t border-white/10 px-6 py-4 space-y-3">
        <NavyStat label="Opening" value={day.opening} />
        {day.received > 0 && <NavyStat label="Received" value={day.received} sign="+" tone="success" />}
        {day.sales > 0 && <NavyStat label="Sales" value={day.sales} sign="−" tone="destructive" />}
        {day.adjusted !== 0 && (
          <NavyStat
            label="Adjustment"
            value={Math.abs(day.adjusted)}
            sign={day.adjusted > 0 ? "+" : "−"}
            tone="adjusted"
          />
        )}
        <div className="pt-2 border-t border-white/10">
          <NavyStat label="Closing" value={day.closing} isTotal />
        </div>
      </div>

      {/* Stats — lg+: horizontal grid */}
      <div className="hidden lg:grid lg:grid-cols-5 border-t border-white/10 divide-x divide-white/10">
        <NavyStatCell label="Opening"    value={day.opening}              />
        <NavyStatCell label="Received"   value={day.received}  sign="+"   tone="success"     empty={day.received === 0} />
        <NavyStatCell label="Sales"      value={day.sales}     sign="−"   tone="destructive"  empty={day.sales === 0} />
        <NavyStatCell label="Adj."       value={Math.abs(day.adjusted)} sign={day.adjusted > 0 ? "+" : "−"} tone="adjusted" empty={day.adjusted === 0} />
        <NavyStatCell label="Closing"    value={day.closing}              isClosing />
      </div>
    </div>
  );
}

function NavyStat({
  label, value, sign, tone, isTotal,
}: {
  label: string; value: number; sign?: "+" | "−";
  tone?: "success" | "destructive" | "adjusted"; isTotal?: boolean;
}) {
  const valueClass =
    tone === "success"     ? "text-emerald-400" :
    tone === "destructive" ? "text-red-400" :
    tone === "adjusted"    ? "text-white/60" :
    isTotal                ? "text-white font-black" :
                             "text-white/75";
  return (
    <div className="flex items-center justify-between">
      <span className="text-xs font-semibold uppercase tracking-widest text-white/50">{label}</span>
      <span className={cn("text-sm tabular-nums font-semibold", valueClass)}>
        {sign}{formatCurrency(value)}
      </span>
    </div>
  );
}

function NavyStatCell({
  label, value, sign, tone, empty, isClosing,
}: {
  label: string; value: number; sign?: "+" | "−";
  tone?: "success" | "destructive" | "adjusted"; empty?: boolean; isClosing?: boolean;
}) {
  const valueClass =
    tone === "success"     ? "text-emerald-400" :
    tone === "destructive" ? "text-red-400" :
    tone === "adjusted"    ? "text-white/55" :
    isClosing              ? "text-white" :
                             "text-white/70";
  return (
    <div className={cn("px-4 py-4 flex flex-col gap-1.5", isClosing && "bg-white/[0.04]")}>
      <span className="text-[10px] font-bold uppercase tracking-widest text-white/50">{label}</span>
      {empty
        ? <span className="text-base text-white/20 tabular-nums">—</span>
        : <span className={cn("tabular-nums font-black leading-none", isClosing ? "text-base lg:text-lg" : "text-sm lg:text-base", valueClass)}>
            {sign}{formatCurrency(value)}
          </span>
      }
    </div>
  );
}

/* ── Past days: white cards ────────────────────────────────────── */
function PastDayCard({
  day,
  label,
  dayDelta,
}: {
  day: DailyRow;
  label: { primary: string; secondary: string; short: string };
  dayDelta: number;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-sm">
      {/* Header */}
      <div className="px-6 lg:px-8 py-5 flex items-start justify-between gap-4 border-b border-border">
        <div>
          <p className="font-display text-lg lg:text-xl font-black text-foreground leading-none">
            {label.primary}
          </p>
          <p className="text-xs text-muted-foreground mt-1.5 hidden sm:block">{label.secondary}</p>
          <p className="text-xs text-muted-foreground mt-1.5 sm:hidden">{label.short}</p>
        </div>
        <div className="text-right shrink-0">
          <p className="font-display text-xl lg:text-2xl font-black tabular-nums leading-none text-foreground">
            {formatCurrency(day.closing)}
          </p>
          {dayDelta !== 0 && (
            <p className={cn(
              "text-xs font-bold tabular-nums mt-1.5 flex items-center justify-end gap-0.5",
              dayDelta > 0 ? "text-success" : "text-destructive"
            )}>
              {dayDelta > 0
                ? <TrendingUp className="w-3 h-3" aria-hidden />
                : <TrendingDown className="w-3 h-3" aria-hidden />
              }
              {dayDelta > 0 ? "+" : "−"}{formatCurrency(Math.abs(dayDelta))}
            </p>
          )}
        </div>
      </div>

      {/* Stats — below lg: stacked */}
      <div className="lg:hidden px-6 py-4 space-y-3">
        <LightStat label="Opening" value={day.opening} />
        {day.received > 0 && <LightStat label="Received" value={day.received} sign="+" tone="success" />}
        {day.sales > 0 && <LightStat label="Sales" value={day.sales} sign="−" tone="destructive" />}
        {day.adjusted !== 0 && (
          <LightStat
            label="Adjustment"
            value={Math.abs(day.adjusted)}
            sign={day.adjusted > 0 ? "+" : "−"}
            tone="adjusted"
          />
        )}
        <div className="pt-2 border-t border-border">
          <LightStat label="Closing" value={day.closing} isTotal />
        </div>
      </div>

      {/* Stats — lg+: horizontal grid */}
      <div className="hidden lg:grid lg:grid-cols-5 divide-x divide-border">
        <LightStatCell label="Opening"   value={day.opening}              />
        <LightStatCell label="Received"  value={day.received}  sign="+"   tone="success"    empty={day.received === 0} />
        <LightStatCell label="Sales"     value={day.sales}     sign="−"   tone="destructive" empty={day.sales === 0} />
        <LightStatCell label="Adj."      value={Math.abs(day.adjusted)} sign={day.adjusted > 0 ? "+" : "−"} tone="adjusted" empty={day.adjusted === 0} />
        <LightStatCell label="Closing"   value={day.closing}              isClosing />
      </div>
    </div>
  );
}

function LightStat({
  label, value, sign, tone, isTotal,
}: {
  label: string; value: number; sign?: "+" | "−";
  tone?: "success" | "destructive" | "adjusted"; isTotal?: boolean;
}) {
  const valueClass =
    tone === "success"     ? "text-success font-semibold" :
    tone === "destructive" ? "text-destructive font-semibold" :
    tone === "adjusted"    ? "text-muted-foreground" :
    isTotal                ? "text-foreground font-black" :
                             "text-muted-foreground";
  return (
    <div className="flex items-center justify-between">
      <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">{label}</span>
      <span className={cn("text-sm tabular-nums", valueClass)}>{sign}{formatCurrency(value)}</span>
    </div>
  );
}

function LightStatCell({
  label, value, sign, tone, empty, isClosing,
}: {
  label: string; value: number; sign?: "+" | "−";
  tone?: "success" | "destructive" | "adjusted"; empty?: boolean; isClosing?: boolean;
}) {
  const valueClass =
    tone === "success"     ? "text-success" :
    tone === "destructive" ? "text-destructive" :
    tone === "adjusted"    ? "text-muted-foreground" :
    isClosing              ? "text-foreground" :
                             "text-muted-foreground";
  return (
    <div className={cn("px-4 py-4 flex flex-col gap-1.5", isClosing && "bg-secondary/40")}>
      <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{label}</span>
      {empty
        ? <span className="text-base text-muted-foreground/25 tabular-nums">—</span>
        : <span className={cn("tabular-nums font-bold leading-none", isClosing ? "text-base lg:text-lg font-black" : "text-sm lg:text-base", valueClass)}>
            {sign}{formatCurrency(value)}
          </span>
      }
    </div>
  );
}
