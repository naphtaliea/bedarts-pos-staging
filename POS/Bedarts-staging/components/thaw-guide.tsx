import { Snowflake, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { RelativeTime } from "@/components/relative-time";

export interface ThawTarget {
  productId: string;
  name: string;
  unit: string;
  demand: number;       // algorithmic p75 target (uncapped); 0 when no DOW history
  suggested: number;    // demand capped at stock; 0 when no history or out of stock
  todaySold: number;
  remaining: number;    // max(0, broughtOut ?? suggested − todaySold)
  stockTotal: number;   // total unexpired stock across all batches
  broughtOut: number | null; // butcher override; null = not set today
  activeDays: number;   // same-weekday sale days in past 10 weeks; 0 = no DOW history
}

const STALE_AFTER_HOUR_ACCRA = 9;

// ─── Shared header (used by both ThawGuide and ThawGuideInteractive) ─────────

export function ThawHeader({
  thawTargets,
  pastStaleThreshold,
  renderedAt,
}: {
  thawTargets: ThawTarget[];
  pastStaleThreshold: boolean;
  renderedAt: string;
}) {
  const outOfStockCount  = thawTargets.filter((t) => t.stockTotal === 0 && t.demand > 0).length;
  const lowStockCount    = thawTargets.filter((t) => t.stockTotal > 0 && t.suggested < t.demand).length;
  const needsRefillCount = thawTargets.filter((t) => t.remaining === 0 && t.suggested > 0 && t.stockTotal > 0).length;
  // Freshness tracking only considers products with DOW history — no-history
  // products always have todaySold=0 which would otherwise skew the summary.
  const withHistory      = thawTargets.filter((t) => t.activeDays > 0);
  const freshCount       = withHistory.filter((t) => t.todaySold === 0).length;
  const allFresh         = withHistory.length > 0 && freshCount === withHistory.length;
  const allGood          = outOfStockCount === 0 && lowStockCount === 0 && needsRefillCount === 0;

  return (
    <header className="px-4 sm:px-5 pt-4 sm:pt-5 pb-3.5 border-b border-slate-100">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <Snowflake className="w-4 h-4 text-accent shrink-0 mt-px" strokeWidth={2} aria-hidden />
          <div className="min-w-0">
            <p className="text-[10px] font-black uppercase tracking-[0.15em] text-slate-400">Daily thaw guide</p>
            <h3 className="text-slate-900 text-base font-display-heading leading-tight mt-px">Bring out today</h3>
          </div>
        </div>
        <p className="text-[11px] text-slate-400 tabular-nums shrink-0 mt-1">
          <RelativeTime iso={renderedAt} />
        </p>
      </div>

      {thawTargets.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-3" role="status" aria-atomic="true">
          {outOfStockCount > 0 && (
            <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-destructive/10 text-destructive">
              {outOfStockCount} out of stock
            </span>
          )}
          {needsRefillCount > 0 && (
            <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-destructive/10 text-destructive">
              {needsRefillCount} need refill
            </span>
          )}
          {lowStockCount > 0 && (
            <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-700">
              {lowStockCount} running low
            </span>
          )}
          {allGood && withHistory.length > 0 && (
            <span className={cn(
              "inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full",
              allFresh
                ? pastStaleThreshold
                  ? "bg-amber-100 text-amber-700"
                  : "bg-accent/10 text-accent"
                : "bg-emerald-100 text-emerald-700"
            )}>
              {allFresh
                ? pastStaleThreshold ? "No sales yet — check counter" : "Morning setup"
                : "All tracking"}
            </span>
          )}
        </div>
      )}
    </header>
  );
}

// ─── Read-only guide (manager / dashboard) ────────────────────────────────────

export function ThawGuide({ thawTargets }: { thawTargets: ThawTarget[] }) {
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
            <p className="text-sm font-semibold text-slate-900">No sales yet</p>
            <p className="text-xs text-slate-500 mt-1">Suggestions appear as sales come in</p>
          </div>
        </div>
      ) : (
        <ul className="divide-y divide-slate-100">
          {thawTargets.map((t) => (
            <ThawRow key={t.productId} target={t} pastStaleThreshold={pastStaleThreshold} />
          ))}
        </ul>
      )}
    </section>
  );
}

// ─── Read-only row ────────────────────────────────────────────────────────────

function ThawRow({
  target: t,
  pastStaleThreshold,
}: {
  target: ThawTarget;
  pastStaleThreshold: boolean;
}) {
  const unit          = t.unit === "kg" ? "kg" : "pcs";
  const noHistory     = t.activeDays === 0;
  const lowConfidence = !noHistory && t.activeDays < 3;

  // ── No-history variant (new product, or never sold on this weekday) ────────
  if (noHistory) {
    return (
      <li className={cn(
        "border-l-4 px-4 sm:px-5 py-4",
        t.todaySold > 0 ? "border-l-accent" : "border-l-slate-200"
      )}>
        <p className="text-sm font-black uppercase tracking-[0.08em] text-slate-700 truncate" title={t.name}>
          {t.name}
        </p>
        <p className={cn(
          "mt-0.5 text-2xl sm:text-3xl font-display-black leading-[1.1]",
          t.todaySold > 0 ? "text-slate-900 tabular-nums" : "text-slate-300"
        )}>
          {t.todaySold > 0 ? `${t.todaySold} ${unit} sold today` : "No history yet"}
        </p>
        <div className="mt-2.5 h-1.5 rounded-full bg-slate-100 overflow-hidden" />
        <p className="mt-1.5 text-[11px] text-slate-400">
          {t.stockTotal > 0
            ? <><span className="text-slate-600 font-semibold">{Math.floor(t.stockTotal)}</span> {unit} in freezer · no data for this day</>
            : "No stock on record"
          }
        </p>
      </li>
    );
  }

  // ── Normal variant ─────────────────────────────────────────────────────────
  const fresh        = t.todaySold === 0;
  const stale        = fresh && pastStaleThreshold;
  const outOfStock   = t.stockTotal === 0 && t.demand > 0;
  const limitedByStock = t.stockTotal > 0 && t.suggested < t.demand;
  const soldOut      = t.remaining === 0 && t.suggested > 0;
  const overSold     = t.todaySold > t.suggested;
  const overRaw      = Math.max(0, t.todaySold - t.suggested);
  const over         = t.unit === "kg" ? Math.round(overRaw * 10) / 10 : Math.round(overRaw);
  const lowRemaining = !fresh && t.remaining > 0 && t.remaining <= 2;
  const isConfirmed  = t.broughtOut != null;
  const soldPct      = t.suggested > 0 ? Math.min(1, t.todaySold / t.suggested) : 0;

  const stripeColor = outOfStock || soldOut
    ? "border-l-destructive"
    : limitedByStock || stale || lowRemaining
      ? "border-l-amber-400"
      : isConfirmed
        ? "border-l-emerald-400"
        : fresh
          ? "border-l-accent"
          : "border-l-slate-200";

  const heroText = outOfStock
    ? "Out of stock"
    : soldOut
      ? overSold ? `+${over} ${unit} over plan` : "Sold out — bring more"
      : fresh
        ? stale ? "No sales yet" : `Bring out ${t.suggested} ${unit}`
        : `${t.remaining} ${unit} left`;

  const heroColor = outOfStock || soldOut
    ? "text-destructive"
    : limitedByStock || stale
      ? "text-amber-600"
      : fresh
        ? "text-accent"
        : "text-slate-900";

  const barWidth = outOfStock ? 0 : soldPct * 100;
  const barColor = outOfStock || soldOut
    ? "bg-destructive"
    : limitedByStock
      ? "bg-amber-400"
      : isConfirmed
        ? "bg-emerald-400"
        : "bg-accent";

  return (
    <li className={cn("border-l-4 px-4 sm:px-5 py-4", stripeColor)}>
      <p className="text-sm font-black uppercase tracking-[0.08em] text-slate-700 truncate" title={t.name}>
        {t.name}
      </p>

      <div className="flex items-center gap-2 mt-0.5">
        {lowRemaining && (
          <span
            className="w-2 h-2 rounded-full bg-amber-400 shrink-0 motion-safe:animate-pulse"
            aria-hidden
          />
        )}
        <p className={cn("text-2xl sm:text-3xl font-display-black tabular-nums leading-[1.1]", heroColor)}>
          {heroText}
        </p>
      </div>

      <div className="mt-2.5 h-1.5 rounded-full bg-slate-100 overflow-hidden">
        <div
          className={cn("h-full rounded-full transition-[width] duration-500 ease-out", barColor)}
          style={{ width: `${barWidth}%` }}
        />
      </div>

      <p className="mt-1.5 text-[11px] text-slate-400 tabular-nums">
        <span className="text-slate-600 font-semibold">{t.todaySold}</span>
        {" / "}
        <span className="text-slate-600 font-semibold">{t.suggested || t.demand}</span>
        {" "}{unit} sold
        {isConfirmed && (
          <span className="text-emerald-600 font-semibold"> · {t.broughtOut} {unit} confirmed out</span>
        )}
      </p>

      {/* Status pills */}
      {limitedByStock && (
        <span className="mt-2 inline-flex items-center gap-1 text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
          Only {Math.floor(t.stockTotal)} {unit} in freezer · needs {t.demand} {unit}
        </span>
      )}
      {outOfStock && (
        <span className="mt-2 inline-flex items-center gap-1 text-[10px] font-bold text-destructive bg-destructive/8 border border-destructive/15 px-2 py-0.5 rounded-full">
          <AlertCircle className="w-3 h-3" aria-hidden />
          Needs reorder
        </span>
      )}
      {/* Low-confidence badge — same-weekday data is sparse */}
      {lowConfidence && (
        <span className="mt-2 inline-flex items-center gap-1 text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
          ~ {t.activeDays} {t.activeDays === 1 ? "matching day" : "matching days"} — rough estimate
        </span>
      )}
    </li>
  );
}
