import { Snowflake } from "lucide-react";
import { cn } from "@/lib/utils";
import { RelativeTime } from "@/components/relative-time";

// Daily thaw guide — redesigned as a mobile-first ledger.
// Each row's hero number is "X kg left" (what the butcher most needs to
// know); sold / brought-out are supporting detail. Sold-out rows push to
// the top via the SQL RPC's ORDER BY. Design intent: typography carries
// the status; chips/badges removed; one calm colour for in-stock, one
// urgent colour for sold-out.

export interface ThawTarget {
  name: string;
  unit: string;
  suggested: number;   // amount to bring out for the day
  todaySold: number;   // cumulative sold today
  remaining: number;   // max(0, suggested - todaySold)
  stockTotal: number;  // total unexpired stock across all batches (freezer + counter)
}

// After this hour (Africa/Accra), a product that hasn't sold today flips from
// the morning "Bring out X" call-to-action to a muted "No sales yet" warning.
// Catches the real failure mode: a high-mover sitting idle because the butcher
// forgot it, or it's on the counter defrosting with no takers.
const STALE_AFTER_HOUR_ACCRA = 9;

export function ThawGuide({ thawTargets }: { thawTargets: ThawTarget[] }) {
  // Out of stock = freezer + counter are both empty. Needs reorder, not refill.
  const outOfStockCount = thawTargets.filter(
    (t) => t.stockTotal === 0 && t.suggested > 0
  ).length;
  // Needs refill = today's bring-out plan is done but freezer still has reserves.
  const needsRefillCount = thawTargets.filter(
    (t) => t.remaining === 0 && t.suggested > 0 && t.stockTotal > 0
  ).length;
  const freshCount = thawTargets.filter((t) => t.todaySold === 0).length;
  const allFresh = thawTargets.length > 0 && freshCount === thawTargets.length;

  const renderedAt = new Date().toISOString();
  // Ghana is UTC+0 year-round, so UTC hour == Africa/Accra hour.
  const hourAccra = new Date().getUTCHours();
  const pastStaleThreshold = hourAccra >= STALE_AFTER_HOUR_ACCRA;

  return (
    <section className="rounded-2xl bg-white border border-slate-200 overflow-hidden">
      <header className="px-4 sm:px-5 pt-4 sm:pt-5 pb-3 border-b border-slate-100">
        <div className="flex items-start gap-2 min-w-0">
          <Snowflake className="w-4 h-4 text-accent shrink-0 mt-0.5" strokeWidth={2} />
          <div className="min-w-0 flex-1">
            <p className="text-[10px] sm:text-[11px] font-black uppercase tracking-[0.15em] text-slate-400">
              Daily thaw guide
            </p>
            <h3 className="text-slate-900 text-base sm:text-lg mt-0.5 font-display-heading leading-tight">
              Bring out today
            </h3>
          </div>
        </div>

        {thawTargets.length > 0 && (
          <div className="mt-2.5 flex items-baseline justify-between gap-3 flex-wrap">
            <p
              className={cn(
                "text-sm sm:text-base font-semibold leading-tight",
                outOfStockCount > 0 || needsRefillCount > 0
                  ? "text-destructive"
                  : allFresh
                    ? pastStaleThreshold
                      ? "text-amber-600"
                      : "text-accent"
                    : "text-slate-500"
              )}
            >
              {outOfStockCount > 0 && needsRefillCount > 0
                ? `${outOfStockCount} out of stock · ${needsRefillCount} need more`
                : outOfStockCount > 0
                  ? `${outOfStockCount} out of stock — reorder soon`
                  : needsRefillCount > 0
                    ? `${needsRefillCount} ${needsRefillCount === 1 ? "needs" : "need"} more from the freezer`
                    : allFresh
                      ? pastStaleThreshold
                        ? "No sales yet today — check if products need to come out."
                        : "Morning setup — start bringing products out."
                      : "All on track — keep selling."}
            </p>
            <p className="text-[11px] text-slate-400 tabular-nums shrink-0">
              <RelativeTime iso={renderedAt} />
            </p>
          </div>
        )}
      </header>

      {thawTargets.length === 0 ? (
        <ThawEmpty />
      ) : (
        <ul className="divide-y divide-slate-100">
          {thawTargets.map((t) => (
            <ThawRow key={t.name} target={t} pastStaleThreshold={pastStaleThreshold} />
          ))}
        </ul>
      )}
    </section>
  );
}

function ThawEmpty() {
  return (
    <div className="flex flex-col items-center justify-center text-center px-4 py-10 gap-3">
      <div className="w-11 h-11 rounded-xl bg-slate-100 flex items-center justify-center">
        <Snowflake className="w-5 h-5 text-slate-400" strokeWidth={1.75} />
      </div>
      <div>
        <p className="text-sm font-semibold text-slate-900">No sales yet</p>
        <p className="text-xs text-slate-500 mt-1">
          Suggestions appear as sales come in
        </p>
      </div>
    </div>
  );
}

function ThawRow({
  target: t,
  pastStaleThreshold,
}: {
  target: ThawTarget;
  pastStaleThreshold: boolean;
}) {
  const unit = t.unit === "kg" ? "kg" : "pcs";
  const fresh = t.todaySold === 0;
  // Stale = still fresh but we're past the morning threshold. Signal: either
  // the butcher hasn't brought it out, or it's on the counter not moving.
  const stale = fresh && pastStaleThreshold;
  const soldOut = t.remaining === 0 && t.suggested > 0;
  const overSold = t.todaySold > t.suggested;
  // Highest-priority state: literally nothing left anywhere. Overrides every
  // other hero line because 'bring more' is impossible.
  const outOfStock = t.stockTotal === 0 && t.suggested > 0;
  // Overage rounded to the same precision as the target (0.5 for kg, 1 for pcs).
  const overRaw = Math.max(0, t.todaySold - t.suggested);
  const over =
    t.unit === "kg" ? Math.round(overRaw * 10) / 10 : Math.round(overRaw);
  // Low-stock = part-way sold, close to running out. Threshold: 2 pcs for
  // piece-counted items, 2 kg for weight. Does NOT apply to fresh rows.
  const lowStock = !fresh && t.remaining > 0 && t.remaining <= 2;

  // Progress bar fills with sold %. Empty on fresh rows (nothing sold yet),
  // red once sold out.
  const soldPct =
    t.suggested > 0 ? Math.min(1, t.todaySold / t.suggested) : 0;

  // Hero line, in priority order:
  // - out of stock:  "Out of stock"           (freezer empty, reorder — red)
  // - fresh morning: "Bring out 30 kg"        (call-to-action, blue)
  // - fresh stale:   "No sales yet"           (soft warning, amber)
  // - sold out:      "Sold out — bring more"  (hit target, freezer has more — red)
  // - over:          "Sold +5 kg over plan"   (reserves drawn, red)
  // - partial:       "17 kg left"             (counting down, slate)
  const heroText = outOfStock
    ? "Out of stock"
    : fresh
      ? stale
        ? "No sales yet"
        : `Bring out ${t.suggested} ${unit}`
      : soldOut
        ? overSold
          ? `Sold +${over} ${unit} over plan`
          : "Sold out — bring more"
        : `${t.remaining} ${unit} left`;

  return (
    <li className="px-4 sm:px-5 py-3.5">
      {/* Product name — stays secondary to the hero number below, but needs
         to be scannable at a glance so the butcher can find a specific row. */}
      <p
        className="text-sm sm:text-base font-black uppercase tracking-[0.08em] text-slate-900 truncate"
        title={t.name}
      >
        {t.name}
      </p>

      {/* Hero colour mirrors the state ladder in heroText above. Red for
         "cannot sell more" states (out of stock, sold out, over), amber for
         stale, accent-blue for the morning CTA, slate for the counting-down
         default. */}
      <p
        className={cn(
          "mt-0.5 text-2xl sm:text-3xl font-display-black tabular-nums leading-[1.1]",
          outOfStock || soldOut
            ? "text-destructive"
            : stale
              ? "text-amber-600"
              : fresh
                ? "text-accent"
                : "text-slate-900",
          lowStock && "motion-safe:animate-pulse"
        )}
      >
        {heroText}
      </p>

      {/* Progress bar: fills with sold %. Red when sold out or out of stock;
         out-of-stock bar is forced full so the row reads as "done" visually
         even if today's sales didn't reach target. */}
      <div className="mt-2.5 h-1.5 rounded-full bg-slate-100 overflow-hidden">
        <div
          className={cn(
            "h-full rounded-full transition-[width] duration-500 ease-out",
            outOfStock || soldOut ? "bg-destructive" : "bg-accent"
          )}
          style={{ width: `${(outOfStock ? 1 : soldPct) * 100}%` }}
        />
      </div>

      {/* Supporting line: the raw sold / brought-out numbers. */}
      <p className="mt-2 text-[11px] text-slate-500 tabular-nums">
        <span className="text-slate-700 font-semibold">{t.todaySold}</span>
        <span className="text-slate-400"> of </span>
        <span className="text-slate-700 font-semibold">{t.suggested}</span>
        <span className="text-slate-400"> {unit} sold</span>
      </p>
    </li>
  );
}
