import { Snowflake } from "lucide-react";
import { cn } from "@/lib/utils";

// Shared thaw-guide UI. Consumed by both the manager dashboard (as one panel
// among many) and the butcher shop-floor page (as the entire body). The data
// shape comes from the `get_thaw_targets_v1` RPC — see the migration for the
// algorithm (p75 of per-day sold over 14 days, rounded up).

export interface ThawTarget {
  name: string;
  unit: string;
  suggested: number;
  todaySold: number;
  activeDays: number;
}

export function ThawGuide({ thawTargets }: { thawTargets: ThawTarget[] }) {
  const started = thawTargets.filter((t) => t.todaySold > 0).length;
  const hit = thawTargets.filter(
    (t) => t.suggested > 0 && t.todaySold >= t.suggested
  ).length;

  return (
    <section className="rounded-2xl bg-white border border-slate-200 p-4 sm:p-5">
      <div className="flex items-start justify-between gap-3 mb-4">
        <div className="flex items-start gap-2 min-w-0">
          <Snowflake className="w-4 h-4 text-accent shrink-0 mt-0.5" strokeWidth={2} />
          <div className="min-w-0">
            <p className="text-[10px] sm:text-[11px] font-black uppercase tracking-[0.15em] text-slate-400">
              Daily thaw guide
            </p>
            <h3 className="text-slate-900 text-base sm:text-lg mt-0.5 font-display-heading leading-tight">
              Bring out today
            </h3>
            <p className="text-[11px] text-slate-500 mt-1 leading-snug hidden sm:block">
              Suggested from the last 14 days. Top up mid-day — better than defrosting too much.
            </p>
          </div>
        </div>

        {thawTargets.length > 0 && (
          <div className="text-right shrink-0 tabular-nums">
            <p className="text-slate-900 text-lg sm:text-xl font-display-black leading-none">
              {started}
              <span className="text-slate-400 text-sm font-semibold">/{thawTargets.length}</span>
            </p>
            <p className="text-[10px] text-slate-500 mt-1 uppercase tracking-wider font-bold">
              moving · {hit} hit
            </p>
          </div>
        )}
      </div>

      {thawTargets.length === 0 ? (
        <ThawEmpty />
      ) : (
        <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {thawTargets.map((t) => (
            <ThawCard key={t.name} target={t} />
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
        <p className="text-xs text-slate-500 mt-1">Suggestions appear as sales come in</p>
      </div>
    </div>
  );
}

function ThawCard({ target: t }: { target: ThawTarget }) {
  const unit = t.unit === "kg" ? "kg" : "pcs";
  const ratio = t.suggested > 0 ? t.todaySold / t.suggested : 0;
  const pct = Math.min(1, Math.max(0, ratio));
  const state: "idle" | "progress" | "hit" | "over" =
    t.todaySold === 0
      ? "idle"
      : ratio >= 1.5
        ? "over"
        : ratio >= 1
          ? "hit"
          : "progress";
  // How far past target we've already sold. 0.5-kg precision for weight,
  // integer for pieces — matches the target rounding so the two numbers line up.
  const overageRaw = Math.max(0, t.todaySold - t.suggested);
  const overage =
    t.unit === "kg"
      ? Math.round(overageRaw * 10) / 10
      : Math.round(overageRaw);
  const showOver = overage > 0;

  const barBg =
    state === "hit"
      ? "bg-emerald-500"
      : state === "over"
        ? "bg-amber-500"
        : state === "progress"
          ? "bg-accent"
          : "bg-slate-200";

  const chipColor =
    state === "hit"
      ? "text-emerald-700 bg-emerald-50 ring-emerald-200"
      : state === "over"
        ? "text-amber-700 bg-amber-50 ring-amber-200"
        : state === "progress"
          ? "text-accent bg-accent/8 ring-blue-200"
          : "text-slate-500 bg-slate-100 ring-slate-200";

  const chipLabel =
    state === "hit"
      ? "hit"
      : state === "over"
        ? `${Math.round(ratio * 100)}%`
        : state === "progress"
          ? `${Math.round(ratio * 100)}%`
          : "—";

  return (
    <li className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 flex flex-col gap-2 break-inside-avoid">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-semibold text-slate-900 truncate min-w-0" title={t.name}>
          {t.name}
        </p>
        <span
          className={cn(
            "text-[10px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-md ring-1 ring-inset tabular-nums shrink-0",
            chipColor
          )}
        >
          {chipLabel}
        </span>
      </div>

      <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden">
        <div
          className={cn("h-full rounded-full transition-[width] duration-500 ease-out", barBg)}
          style={{ width: `${pct * 100}%` }}
        />
      </div>

      <div className="flex items-baseline justify-between gap-2 text-[11px] tabular-nums">
        <span
          className={cn(
            "font-semibold",
            state === "idle" ? "text-slate-400" : "text-slate-900"
          )}
        >
          {t.todaySold}
          <span className="text-slate-400 font-normal"> {unit} sold</span>
          {showOver && (
            <span
              className={cn(
                "ml-1.5 font-semibold",
                state === "over" ? "text-amber-600" : "text-emerald-600"
              )}
            >
              +{overage} over
            </span>
          )}
        </span>
        <span className="text-slate-500">
          {t.suggested} {unit} <span className="text-slate-400">target</span>
        </span>
      </div>
    </li>
  );
}
