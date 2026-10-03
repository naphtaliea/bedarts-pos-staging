"use client";

import { useState, useRef, useTransition } from "react";
import { Snowflake, Check, Plus, Minus, Pencil, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { RelativeTime } from "@/components/relative-time";
import { setThawBroughtOut } from "@/app/(butcher)/butcher/actions";
import { ThawHeader, type ThawTarget } from "@/components/thaw-guide";

const STALE_AFTER_HOUR_ACCRA = 9;

// ─── Interactive guide (butcher view) ────────────────────────────────────────
// Full-row tap to enter edit mode. Optimistic update on save — the row
// flips to confirmed state instantly; server write runs in background.

export function ThawGuideInteractive({ thawTargets }: { thawTargets: ThawTarget[] }) {
  const renderedAt = new Date().toISOString();
  const pastStaleThreshold = new Date().getUTCHours() >= STALE_AFTER_HOUR_ACCRA;

  return (
    <section className="rounded-2xl bg-white border border-slate-200 overflow-hidden">
      <ThawHeader
        thawTargets={thawTargets}
        pastStaleThreshold={pastStaleThreshold}
        renderedAt={renderedAt}
      />
      {thawTargets.length === 0 ? (
        <div className="flex flex-col items-center justify-center text-center px-4 py-10 gap-3">
          <div className="w-11 h-11 rounded-xl bg-slate-100 flex items-center justify-center">
            <Snowflake className="w-5 h-5 text-slate-400" strokeWidth={1.75} />
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-900">No sales data yet</p>
            <p className="text-xs text-slate-500 mt-1">Suggestions appear as sales come in</p>
          </div>
        </div>
      ) : (
        <ul className="divide-y divide-slate-100">
          {thawTargets.map((t) => (
            <ThawRowInteractive
              key={t.productId}
              target={t}
              pastStaleThreshold={pastStaleThreshold}
            />
          ))}
        </ul>
      )}
    </section>
  );
}

// ─── Interactive row ──────────────────────────────────────────────────────────

function ThawRowInteractive({
  target: t,
  pastStaleThreshold,
}: {
  target: ThawTarget;
  pastStaleThreshold: boolean;
}) {
  const unit          = t.unit === "kg" ? "kg" : "pcs";
  const noHistory     = t.activeDays === 0;
  const lowConfidence = !noHistory && t.activeDays < 3;
  const outOfStock    = t.stockTotal === 0 && t.demand > 0;
  const canEdit       = !outOfStock;

  // Optimistic state — show the butcher's value immediately on save
  const [optimisticBroughtOut, setOptimisticBroughtOut] = useState<number | null>(t.broughtOut);
  const isSet = optimisticBroughtOut != null;

  // New/no-history products: default stepper to 1 so butcher can set a quantity
  const openDefault = isSet
    ? Math.round(optimisticBroughtOut!)
    : t.suggested > 0 ? Math.round(t.suggested)
    : t.demand > 0 ? Math.round(t.demand)
    : 1;

  const [editing,   setEditing]   = useState(false);
  const [value,     setValue]     = useState(openDefault);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);

  function openEdit() {
    if (!canEdit) return;
    setValue(isSet ? Math.round(optimisticBroughtOut!) : t.suggested > 0 ? Math.round(t.suggested) : t.demand > 0 ? Math.round(t.demand) : 1);
    setSaveError(null);
    setEditing(true);
    setTimeout(() => inputRef.current?.focus(), 80);
  }

  function closeEdit() {
    setEditing(false);
    setSaveError(null);
  }

  function confirm() {
    setSaveError(null);
    // Optimistic: close immediately and show new value
    const newVal = value;
    setOptimisticBroughtOut(newVal);
    setEditing(false);

    startTransition(async () => {
      const res = await setThawBroughtOut(t.productId, newVal);
      if (res.error) {
        // Revert and reopen on failure
        setOptimisticBroughtOut(t.broughtOut);
        setSaveError(res.error);
        setEditing(true);
      }
    });
  }

  // ── Display-mode state ────────────────────────────────────────────────────
  const fresh          = t.todaySold === 0;
  const stale          = fresh && pastStaleThreshold;
  const limitedByStock = !isSet && !noHistory && t.stockTotal > 0 && t.suggested < t.demand;
  const effective      = isSet ? optimisticBroughtOut! : noHistory ? 0 : t.suggested;
  const soldOut        = !noHistory && t.remaining === 0 && effective > 0;
  const overSold       = t.todaySold > effective;
  const over           = Math.max(0, Math.round(t.todaySold - effective));
  const lowRemaining   = !fresh && !noHistory && t.remaining > 0 && t.remaining <= 2;
  const soldPct        = effective > 0 ? Math.min(1, t.todaySold / effective) : 0;

  const stripeColor = outOfStock || soldOut
    ? "border-l-destructive"
    : noHistory
      ? (t.todaySold > 0 ? "border-l-accent" : "border-l-slate-200")
      : limitedByStock || stale || lowRemaining
        ? "border-l-amber-400"
        : isSet
          ? "border-l-emerald-400"
          : fresh
            ? "border-l-accent"
            : "border-l-slate-200";

  const heroText = outOfStock
    ? "Out of stock"
    : noHistory
      ? (isSet ? `${t.remaining} ${unit} left` : t.todaySold > 0 ? `${t.todaySold} ${unit} sold today` : "No history — set quantity")
      : soldOut
        ? overSold ? `+${over} ${unit} over` : "Sold out — bring more"
        : isSet
          ? `${t.remaining} ${unit} left`
          : fresh
            ? stale ? "No sales yet" : `Bring out ${t.suggested || t.demand} ${unit}`
            : `${t.remaining} ${unit} left`;

  const heroColor = outOfStock || soldOut
    ? "text-destructive"
    : noHistory
      ? (t.todaySold > 0 ? "text-slate-900" : "text-slate-400")
      : isSet && !soldOut
        ? "text-emerald-600"
        : limitedByStock || stale
          ? "text-amber-600"
          : fresh
            ? "text-accent"
            : "text-slate-900";

  const barWidth = outOfStock ? 0 : soldPct * 100;
  const barColor = outOfStock || soldOut
    ? "bg-destructive"
    : isSet
      ? "bg-emerald-400"
      : limitedByStock
        ? "bg-amber-400"
        : "bg-accent";

  // ── Row interactive props (for full-row tap) ───────────────────────────────
  const rowInteractiveProps = canEdit && !editing
    ? {
        role: "button" as const,
        tabIndex: 0,
        onClick: openEdit,
        onKeyDown: (e: React.KeyboardEvent) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); openEdit(); } },
        className: cn("px-4 sm:px-5 pt-4 pb-3.5 cursor-pointer select-none active:bg-slate-50 transition-colors"),
      }
    : { className: "px-4 sm:px-5 pt-4 pb-3.5" };

  return (
    <li className={cn("border-l-4", stripeColor)}>
      {/* ── Tappable / display area ─────────────────────────────────────── */}
      <div {...rowInteractiveProps}>
        {/* Name + right-side action chip */}
        <div className="flex items-center justify-between gap-3 min-w-0">
          <p className="text-sm font-black uppercase tracking-[0.08em] text-slate-700 truncate flex-1 min-w-0" title={t.name}>
            {t.name}
          </p>

          {!editing && (
            outOfStock ? (
              <span className="shrink-0 inline-flex items-center gap-1 text-[11px] font-bold text-destructive bg-destructive/8 border border-destructive/15 px-2 py-0.5 rounded-full">
                <AlertCircle className="w-3 h-3" aria-hidden />
                Needs reorder
              </span>
            ) : isSet ? (
              <span className="shrink-0 inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                <Pencil className="w-2.5 h-2.5" aria-hidden />
                {optimisticBroughtOut} {unit}
              </span>
            ) : (
              <span className="shrink-0 text-[11px] font-semibold text-accent bg-accent/8 px-2 py-0.5 rounded-full">
                Set actual →
              </span>
            )
          )}

          {editing && (
            <button
              onClick={(e) => { e.stopPropagation(); closeEdit(); }}
              aria-label="Cancel edit"
              className="shrink-0 text-[11px] font-semibold text-slate-400 hover:text-slate-600 px-2 py-0.5 rounded-full hover:bg-slate-100 transition-colors touch-manipulation"
            >
              Cancel
            </button>
          )}
        </div>

        {/* Hero */}
        <div className="flex items-center gap-2 mt-0.5">
          {lowRemaining && (
            <span className="w-2 h-2 rounded-full bg-amber-400 shrink-0 motion-safe:animate-pulse" aria-hidden />
          )}
          <p className={cn("text-2xl sm:text-3xl font-display-black tabular-nums leading-[1.1]", heroColor)}>
            {heroText}
          </p>
        </div>

        {/* Progress bar */}
        <div className="mt-2.5 h-1.5 rounded-full bg-slate-100 overflow-hidden">
          <div
            className={cn("h-full rounded-full transition-[width] duration-500 ease-out", barColor)}
            style={{ width: `${barWidth}%` }}
          />
        </div>

        {/* Supporting line */}
        {noHistory ? (
          <p className="mt-1.5 text-[11px] text-slate-400">
            {t.stockTotal > 0
              ? <><span className="text-slate-600 font-semibold">{Math.floor(t.stockTotal)}</span> {unit} in freezer · no data for this day</>
              : "No stock on record"
            }
          </p>
        ) : (
          <p className="mt-1.5 text-[11px] text-slate-400 tabular-nums">
            <span className="text-slate-600 font-semibold">{t.todaySold}</span>
            {" / "}
            <span className="text-slate-600 font-semibold">{effective || t.demand}</span>
            {" "}{unit} sold
            {limitedByStock && (
              <span className="text-amber-600 font-semibold"> · only {Math.floor(t.stockTotal)} {unit} in freezer</span>
            )}
            {!isSet && !limitedByStock && !outOfStock && (
              <span className="text-slate-400"> · suggested</span>
            )}
          </p>
        )}

        {/* Status pills */}
        {limitedByStock && (
          <span className="mt-2 inline-flex items-center gap-1 text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
            Only {Math.floor(t.stockTotal)} {unit} in freezer · needs {t.demand} {unit}
          </span>
        )}
        {lowConfidence && (
          <span className="mt-2 inline-flex items-center gap-1 text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
            ~ {t.activeDays} {t.activeDays === 1 ? "matching day" : "matching days"} — rough estimate
          </span>
        )}

        {/* Error (shown below display area, above stepper) */}
        {saveError && !editing && (
          <p role="alert" className="mt-2 text-xs text-destructive font-medium">{saveError}</p>
        )}
      </div>

      {/* ── Stepper — animates in below the row ────────────────────────── */}
      <div
        className={cn(
          "overflow-hidden transition-[max-height,opacity] duration-200 ease-out",
          editing ? "max-h-40 opacity-100" : "max-h-0 opacity-0 pointer-events-none"
        )}
        aria-hidden={!editing}
      >
        <div className="px-4 sm:px-5 pb-4 pt-1">
          <div className="flex items-center gap-2">
            {/* Decrement */}
            <button
              onClick={() => setValue((v) => Math.max(0, v - 1))}
              disabled={value <= 0}
              aria-label="Decrease by 1"
              className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center text-slate-600 hover:bg-slate-200 active:scale-95 disabled:opacity-30 transition-all touch-manipulation"
            >
              <Minus className="w-4 h-4" strokeWidth={2.5} aria-hidden />
            </button>

            {/* Number input */}
            <div className="flex-1 relative">
              <input
                ref={inputRef}
                type="number"
                inputMode="numeric"
                min={0}
                step={1}
                value={value}
                onChange={(e) => {
                  const n = parseInt(e.target.value, 10);
                  if (!isNaN(n) && n >= 0) setValue(n);
                  else if (e.target.value === "") setValue(0);
                }}
                aria-label={`Quantity in ${unit}`}
                className="w-full h-12 rounded-xl border-2 border-accent bg-accent/5 text-center text-xl font-black text-slate-900 tabular-nums focus:outline-none focus:ring-2 focus:ring-accent/25 transition-all [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-400 pointer-events-none">
                {unit}
              </span>
            </div>

            {/* Increment */}
            <button
              onClick={() => setValue((v) => v + 1)}
              aria-label="Increase by 1"
              className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center text-slate-600 hover:bg-slate-200 active:scale-95 transition-all touch-manipulation"
            >
              <Plus className="w-4 h-4" strokeWidth={2.5} aria-hidden />
            </button>

            {/* Save */}
            <button
              onClick={confirm}
              disabled={isPending}
              aria-label={`Save ${value} ${unit}`}
              className="w-12 h-12 rounded-xl bg-emerald-500 flex items-center justify-center text-white hover:bg-emerald-600 active:scale-95 disabled:opacity-50 transition-all touch-manipulation shadow-sm"
            >
              <Check className="w-4 h-4" strokeWidth={2.5} aria-hidden />
            </button>
          </div>

          {saveError && editing && (
            <p role="alert" className="mt-2 text-xs text-destructive font-medium">{saveError}</p>
          )}
        </div>
      </div>
    </li>
  );
}
