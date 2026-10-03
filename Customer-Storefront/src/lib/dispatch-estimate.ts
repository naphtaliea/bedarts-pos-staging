import type { StoreSettings } from "@/src/lib/types";

// Africa/Accra is UTC+0 year-round (no DST). We use the browser's own clock as
// a proxy for Accra time when the visitor is likely in Ghana. If they're in
// another timezone, we compute Accra local time via Intl.

export interface DispatchEstimate {
  /** True if the customer is ordering during store operating hours AND before cutoff. */
  isSameDay: boolean;
  /** Human-readable message to show on checkout/confirmation. */
  message: string;
  /** Short label for the CTA — e.g. "Pay & schedule for tomorrow". */
  ctaSuffix: string | null;
}

function accraNow(): { hours: number; minutes: number; weekday: number } {
  const fmt = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Africa/Accra",
    hour: "2-digit",
    minute: "2-digit",
    weekday: "short",
    hour12: false,
  });
  const parts = fmt.formatToParts(new Date());
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  const hours = parseInt(get("hour"), 10);
  const minutes = parseInt(get("minute"), 10);
  const weekdayShort = get("weekday");
  const weekdayIndex: Record<string, number> = {
    Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6,
  };
  return { hours, minutes, weekday: weekdayIndex[weekdayShort] ?? 0 };
}

function parseTimeStr(t: string | null | undefined): { h: number; m: number } | null {
  if (!t) return null;
  const m = t.match(/^(\d{1,2}):(\d{2})/);
  if (!m) return null;
  return { h: parseInt(m[1], 10), m: parseInt(m[2], 10) };
}

/**
 * Estimate whether an order placed right now will ship same-day or next
 * business day. Cutoff comes from store_settings; hours strings are the
 * unstructured "7:30am - 6pm" fields we already show.
 */
export function computeDispatch(settings: StoreSettings | null): DispatchEstimate {
  const now = accraNow();
  const isSunday = now.weekday === 0;

  const cutoff = parseTimeStr(settings?.online_order_cutoff_time) ?? { h: 17, m: 50 };
  const cutoffMinutes = cutoff.h * 60 + cutoff.m;
  const nowMinutes = now.hours * 60 + now.minutes;

  const cutoffHuman = formatTime(cutoff.h, cutoff.m);
  const beforeCutoff = nowMinutes < cutoffMinutes;

  if (beforeCutoff && !isSunday) {
    return {
      isSameDay: true,
      message: `Same-day dispatch. Orders placed before ${cutoffHuman} ship today.`,
      ctaSuffix: null,
    };
  }

  if (beforeCutoff && isSunday) {
    return {
      isSameDay: true,
      message: `Sunday hours: ${settings?.sunday_hours ?? "9:30am – 6pm"}. Orders before ${cutoffHuman} ship today.`,
      ctaSuffix: null,
    };
  }

  return {
    isSameDay: false,
    message: `It's past our ${cutoffHuman} cutoff. Your order will ship first thing tomorrow.`,
    ctaSuffix: "for tomorrow",
  };
}

function formatTime(h: number, m: number): string {
  const period = h >= 12 ? "pm" : "am";
  const hour12 = ((h + 11) % 12) + 1;
  return m === 0 ? `${hour12}${period}` : `${hour12}:${String(m).padStart(2, "0")}${period}`;
}
