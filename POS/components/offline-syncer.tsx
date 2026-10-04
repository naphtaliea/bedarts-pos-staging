"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { AlertTriangle, CheckCircle2, CloudOff, CloudUpload, RefreshCw, X } from "lucide-react";
import {
  getOfflineSales,
  removeOfflineSale,
  updateOfflineSale,
  type OfflineSale,
} from "@/lib/sync-queue";
import { submitSale } from "@/app/(dashboard)/pos/actions";
import { attemptSync, type SyncOutcome } from "@/lib/sync-core";
import { OVERRIDE_REASONS } from "@/lib/override-reasons";
import { reloadForUpdate } from "@/lib/reload-for-update";
import { cn, formatCurrency } from "@/lib/utils";

const AUTO_RETRY_MS = 30_000;

function saleSummary(s: OfflineSale): string {
  const items = s.payload.items ?? [];
  const parts = items.slice(0, 3).map((i) => {
    const qty = i.product.unit === "kg" ? `${i.quantity}kg` : `${i.quantity}×`;
    return `${qty} ${i.product.name}`;
  });
  return parts.join(" · ") + (items.length > 3 ? ` +${items.length - 3} more` : "");
}

function saleDetails(s: OfflineSale): string {
  const when = new Date(s.timestamp).toLocaleString("en-GH");
  const lines = (s.payload.items ?? []).map(
    (i) => `  ${i.quantity} ${i.product.unit} ${i.product.name} @ ${i.unit_price}`
  );
  const pays = (s.payload.payments ?? []).map((p) => `${p.method} ${p.amount}`).join(", ");
  return [
    `Offline sale ${s.id}`,
    `Made: ${when}`,
    `Total: ${s.payload.total}`,
    `Paid: ${pays}`,
    ...(s.payload.stockOverrideReason ? [`Override reason: ${s.payload.stockOverrideReason}`] : []),
    `Items:`,
    ...lines,
    ...(s.lastError ? [`Problem: ${s.lastError}`] : []),
  ].join("\n");
}

export function OfflineSyncer() {
  const [isOnline, setIsOnline] = useState(true);
  const [sales, setSales] = useState<OfflineSale[]>([]);
  const [syncing, setSyncing] = useState(false);
  const [open, setOpen] = useState(false);
  const [reasons, setReasons] = useState<Record<string, string>>({});
  const [note, setNote] = useState<string | null>(null);
  const busy = useRef(false);

  const refresh = useCallback(async () => {
    try {
      const all = await getOfflineSales();
      setSales([...all].sort((a, b) => a.timestamp - b.timestamp));
    } catch {
      /* IndexedDB unavailable — nothing to show */
    }
  }, []);

  // Record what happened to one sale. Only "synced" removes it from the device.
  const applyOutcome = useCallback(async (sale: OfflineSale, o: SyncOutcome) => {
    const now = Date.now();
    switch (o.kind) {
      case "synced":
        await removeOfflineSale(sale.id);
        break;
      case "network":
        await updateOfflineSale(sale.id, { status: "pending", lastError: "Couldn't reach the server yet", lastAttemptAt: now });
        break;
      case "stale":
        await updateOfflineSale(sale.id, { status: "pending", lastError: "Updating the till…", lastAttemptAt: now });
        break;
      case "needs_reason":
        await updateOfflineSale(sale.id, { status: "needs_reason", shortItems: o.items, lastError: undefined, lastAttemptAt: now });
        break;
      case "needs_pin":
        await updateOfflineSale(sale.id, { status: "needs_pin", lastError: "PIN session ended", lastAttemptAt: now });
        break;
      case "failed":
        await updateOfflineSale(sale.id, { status: "failed", lastError: o.error, lastAttemptAt: now });
        break;
    }
  }, []);

  const syncAll = useCallback(
    async (manual: boolean) => {
      if (busy.current || !navigator.onLine) return;
      busy.current = true;
      setSyncing(true);
      if (manual) setNote(null);
      try {
        const queue = [...(await getOfflineSales())].sort((a, b) => a.timestamp - b.timestamp);
        for (const sale of queue) {
          if (!navigator.onLine) break;
          const status = sale.status ?? "pending";
          // A sale waiting for a reason waits for the cashier. Automatic passes also
          // leave refused / PIN sales alone; "Sync now" retries them.
          if (status === "needs_reason") continue;
          if (!manual && (status === "failed" || status === "needs_pin")) continue;
          const outcome = await attemptSync(sale, submitSale);
          await applyOutcome(sale, outcome);
          if (outcome.kind === "stale") {
            // This page is older than the server. Reload onto the new build; the
            // queue is on the device and syncs again straight after.
            const reloaded = await reloadForUpdate();
            if (!reloaded) setNote("The till needs updating. Close and reopen the app.");
            break;
          }
        }
      } finally {
        busy.current = false;
        setSyncing(false);
        await refresh();
      }
    },
    [applyOutcome, refresh]
  );

  const recordWithReason = useCallback(
    async (sale: OfflineSale) => {
      const reason = reasons[sale.id] ?? OVERRIDE_REASONS[0];
      if (busy.current || !navigator.onLine) return;
      busy.current = true;
      setSyncing(true);
      try {
        const outcome = await attemptSync(sale, submitSale, { overrideReason: reason });
        await applyOutcome(sale, outcome);
      } finally {
        busy.current = false;
        setSyncing(false);
        await refresh();
      }
    },
    [applyOutcome, reasons, refresh]
  );

  const removeSale = useCallback(
    async (sale: OfflineSale) => {
      const ok = window.confirm(
        `Remove this sale from the till?\n\n${formatCurrency(sale.payload.total)} · ${new Date(sale.timestamp).toLocaleString("en-GH")}\n${saleSummary(sale)}\n\nIt has NOT been saved on the server. Only remove it after you have recorded it another way.`
      );
      if (!ok) return;
      await removeOfflineSale(sale.id);
      await refresh();
    },
    [refresh]
  );

  const copyDetails = useCallback(async (sale: OfflineSale) => {
    try {
      await navigator.clipboard.writeText(saleDetails(sale));
      setNote("Sale details copied.");
    } catch {
      setNote("Couldn't copy — read the details from the list.");
    }
  }, []);

  useEffect(() => {
    setIsOnline(navigator.onLine);
    refresh();
    if (navigator.onLine) syncAll(false);

    const onOnline = () => { setIsOnline(true); syncAll(false); };
    const onOffline = () => setIsOnline(false);
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    const id = setInterval(() => {
      refresh();
      if (navigator.onLine) syncAll(false);
    }, AUTO_RETRY_MS);
    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
      clearInterval(id);
    };
  }, [refresh, syncAll]);

  const attention = sales.filter((s) => s.status === "failed" || s.status === "needs_reason" || s.status === "needs_pin").length;
  const waiting = sales.length - attention;

  if (sales.length === 0 && isOnline && !syncing) return null;

  const label = syncing
    ? `Syncing ${sales.length} sale${sales.length === 1 ? "" : "s"}…`
    : attention > 0
      ? `${attention} sale${attention === 1 ? "" : "s"} need${attention === 1 ? "s" : ""} attention`
      : !isOnline
        ? `Offline · ${sales.length} waiting`
        : `${waiting} sale${waiting === 1 ? "" : "s"} waiting to sync`;

  return (
    <>
      <div
        className={cn(
          "fixed bottom-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-1 rounded-full shadow-lg border text-sm font-medium",
          attention > 0
            ? "bg-destructive/10 text-destructive border-destructive/30"
            : !isOnline
              ? "bg-warning/12 text-warning border-amber-200"
              : "bg-accent/12 text-accent border-blue-200"
        )}
      >
        <button
          onClick={() => setOpen(true)}
          className="flex items-center gap-2 pl-4 pr-3 py-2 min-h-11"
          aria-label="Show pending sales"
        >
          {syncing ? (
            <CloudUpload className="w-4 h-4 animate-bounce shrink-0" />
          ) : attention > 0 ? (
            <AlertTriangle className="w-4 h-4 shrink-0" />
          ) : !isOnline ? (
            <CloudOff className="w-4 h-4 shrink-0" />
          ) : (
            <CloudUpload className="w-4 h-4 shrink-0" />
          )}
          <span>{label}</span>
        </button>
        {isOnline && !syncing && sales.length > 0 && (
          <button
            onClick={() => syncAll(true)}
            className="mr-1.5 my-1 px-3 min-h-9 rounded-full bg-white/70 hover:bg-white text-xs font-bold"
          >
            Sync now
          </button>
        )}
      </div>

      {open && (
        <div className="fixed inset-0 z-[60] flex flex-col justify-end">
          <div className="absolute inset-0 bg-black/40" onClick={() => setOpen(false)} />
          <div className="relative bg-white rounded-t-2xl shadow-2xl max-h-[85dvh] flex flex-col">
            <div className="shrink-0 flex items-center justify-between gap-3 px-4 pt-4 pb-3 border-b border-slate-200">
              <div className="min-w-0">
                <p className="text-sm font-bold text-slate-900">Sales not yet saved</p>
                <p className="text-xs text-slate-500">
                  {isOnline ? "Connected" : "No internet"} · they send automatically when the connection is back
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => syncAll(true)}
                  disabled={!isOnline || syncing || sales.length === 0}
                  className="inline-flex items-center gap-1.5 h-10 px-3 rounded-lg bg-primary text-white text-sm font-bold disabled:opacity-40"
                >
                  <RefreshCw className={cn("w-4 h-4", syncing && "animate-spin")} />
                  Sync now
                </button>
                <button onClick={() => setOpen(false)} aria-label="Close" className="h-10 w-10 flex items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100">
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {note && <p className="shrink-0 px-4 py-2 text-xs text-slate-600 bg-slate-50 border-b border-slate-200">{note}</p>}

            <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
              {sales.length === 0 ? (
                <div className="flex flex-col items-center gap-2 py-10 text-center">
                  <CheckCircle2 className="w-6 h-6 text-emerald-500" />
                  <p className="text-sm font-semibold text-slate-900">All sales are saved</p>
                </div>
              ) : (
                sales.map((s) => {
                  const status = s.status ?? "pending";
                  return (
                    <div key={s.id} className="px-4 py-3.5 space-y-2">
                      <div className="flex items-baseline justify-between gap-3">
                        <p className="text-base font-bold text-slate-900 tabular-nums">{formatCurrency(s.payload.total)}</p>
                        <p className="text-xs text-slate-500 tabular-nums">
                          {new Date(s.timestamp).toLocaleString("en-GH", { dateStyle: "short", timeStyle: "short" })}
                        </p>
                      </div>
                      <p className="text-xs text-slate-600 leading-snug">{saleSummary(s)}</p>

                      {status === "pending" && (
                        <p className="text-xs font-medium text-slate-500">
                          {isOnline ? s.lastError ?? "Waiting to send" : "Waiting for internet"}
                        </p>
                      )}

                      {status === "needs_reason" && (
                        <div className="rounded-xl bg-amber-50 border border-amber-200 p-3 space-y-2">
                          <p className="text-xs text-amber-800">
                            The server is short of stock for {(s.shortItems ?? []).join(", ") || "an item"}. Pick a reason to record this sale.
                          </p>
                          <select
                            value={reasons[s.id] ?? OVERRIDE_REASONS[0]}
                            onChange={(e) => setReasons((r) => ({ ...r, [s.id]: e.target.value }))}
                            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                          >
                            {OVERRIDE_REASONS.map((r) => (
                              <option key={r} value={r}>{r}</option>
                            ))}
                          </select>
                          <button
                            onClick={() => recordWithReason(s)}
                            disabled={!isOnline || syncing}
                            className="w-full h-10 rounded-lg bg-primary text-white text-sm font-bold disabled:opacity-40"
                          >
                            Record sale
                          </button>
                        </div>
                      )}

                      {status === "needs_pin" && (
                        <div className="rounded-xl bg-amber-50 border border-amber-200 p-3 space-y-2">
                          <p className="text-xs text-amber-800">The PIN session ended. Sign in with your PIN, then tap Sync now.</p>
                          <Link href="/cashier/pin" className="inline-flex items-center h-10 px-3 rounded-lg bg-primary text-white text-sm font-bold">
                            Enter PIN
                          </Link>
                        </div>
                      )}

                      {status === "failed" && (
                        <div className="rounded-xl bg-destructive/5 border border-destructive/20 p-3 space-y-2">
                          <p className="text-xs text-destructive">
                            The server refused this sale: {s.lastError ?? "unknown reason"}
                          </p>
                          <div className="flex flex-wrap gap-2">
                            <button onClick={() => syncAll(true)} disabled={!isOnline || syncing} className="h-9 px-3 rounded-lg border border-slate-300 text-xs font-semibold disabled:opacity-40">
                              Try again
                            </button>
                            <button onClick={() => copyDetails(s)} className="h-9 px-3 rounded-lg border border-slate-300 text-xs font-semibold">
                              Copy details
                            </button>
                            <button onClick={() => removeSale(s)} className="h-9 px-3 rounded-lg border border-destructive/40 text-destructive text-xs font-semibold">
                              Remove…
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
