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
}

export function ThawGuide({ thawTargets }: { thawTargets: ThawTarget[] }) {
  const soldOutCount = thawTargets.filter(
    (t) => t.remaining === 0 && t.suggested > 0
  ).length;
  const freshCount = thawTargets.filter((t) => t.todaySold === 0).length;
  const allFresh = thawTargets.length > 0 && freshCount === thawTargets.length;

  const renderedAt = new Date().toISOString();

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
                soldOutCount > 0
                  ? "text-destructive"
                  : allFresh
                    ? "text-accent"
                    : "text-slate-500"
              )}
            >
              {soldOutCount > 0
                ? `${soldOutCount} ${soldOutCount === 1 ? "needs" : "need"} more from the freezer`
                : allFresh
                  ? "Morning setup — start bringing products out."
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
            <ThawRow key={t.name} target={t} />
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

function ThawRow({ target: t }: { target: ThawTarget }) {
  const unit = t.unit === "kg" ? "kg" : "pcs";
  const fresh = t.todaySold === 0;
  const soldOut = t.remaining === 0 && t.suggested > 0;
  const overSold = t.todaySold > t.suggested;
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

  // The hero line is contextual to where in the day this product is:
  // - fresh:    "Bring out 30 kg"        (morning action)
  // - partial:  "17 kg left"             (count-down)
  // - sold out: "Sold out — bring more"  (urgent)
  // - over:     "Sold +5 kg over plan"   (reserves drawn down)
  const heroText = fresh
    ? `Bring out ${t.suggested} ${unit}`
    : soldOut
      ? overSold
        ? `Sold +${over} ${unit} over plan`
        : "Sold out — bring more"
      : `${t.remaining} ${unit} left`;

  return (
    <li className="px-4 sm:px-5 py-3.5">
      {/* Eyebrow: product name, small and muted so the hero below pops. */}
      <p
        className="text-[10px] sm:text-[11px] font-black uppercase tracking-[0.15em] text-slate-500 truncate"
        title={t.name}
      >
        {t.name}
      </p>

      {/* Hero: what the butcher came here to see. Red for sold-out urgency,
         accent (brand blue) for the morning "bring out" call-to-action,
         slate once the row is counting down a partially-sold product. */}
      <p
        className={cn(
          "mt-0.5 text-2xl sm:text-3xl font-display-black tabular-nums leading-[1.1]",
          soldOut
            ? "text-destructive"
            : fresh
              ? "text-accent"
              : "text-slate-900",
          lowStock && "motion-safe:animate-pulse"
        )}
      >
        {heroText}
      </p>

      {/* Progress bar: fills with sold %. Red once sold out. */}
      <div className="mt-2.5 h-1.5 rounded-full bg-slate-100 overflow-hidden">
        <div
          className={cn(
            "h-full rounded-full transition-[width] duration-500 ease-out",
            soldOut ? "bg-destructive" : "bg-accent"
          )}
          style={{ width: `${soldPct * 100}%` }}
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
