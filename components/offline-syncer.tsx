"use client";

import { useEffect, useState, useCallback } from "react";
import { CloudOff, CloudUpload, CheckCircle2, AlertTriangle, Trash2 } from "lucide-react";
import { getOfflineSales, removeOfflineSale } from "@/lib/sync-queue";
import { submitSale } from "@/app/(dashboard)/pos/actions";
import { cn } from "@/lib/utils";

export function OfflineSyncer() {
  const [isOnline, setIsOnline] = useState(true);
  const [pendingCount, setPendingCount] = useState(0);
  const [failedIds, setFailedIds] = useState<Set<string>>(new Set());
  const [isSyncing, setIsSyncing] = useState(false);

  const checkPending = async () => {
    try {
      const sales = await getOfflineSales();
      setPendingCount(sales.length);
    } catch {
      // ignore idb errors
    }
  };

  const syncSales = useCallback(async () => {
    if (!navigator.onLine) return;

    setIsSyncing(true);
    const newFailed = new Set<string>();
    try {
      const sales = await getOfflineSales();
      for (const sale of sales) {
        if (!navigator.onLine) break;
        try {
          await submitSale(sale.payload);
          await removeOfflineSale(sale.id);
        } catch (e) {
          // Network drop: stop, retry next reconnect
          if (!navigator.onLine) break;
          // Server rejection (stock error, validation, etc.): mark as permanently failed
          console.error("Failed to sync offline sale", sale.id, e);
          newFailed.add(sale.id);
        }
      }
    } finally {
      setFailedIds(newFailed);
      await checkPending();
      setIsSyncing(false);
    }
  }, []);

  const dismissFailed = useCallback(async () => {
    for (const id of failedIds) {
      await removeOfflineSale(id);
    }
    setFailedIds(new Set());
    await checkPending();
  }, [failedIds]);

  useEffect(() => {
    setIsOnline(navigator.onLine);
    checkPending();

    if (navigator.onLine) syncSales();

    const handleOnline  = () => { setIsOnline(true);  syncSales(); };
    const handleOffline = () => { setIsOnline(false); };

    window.addEventListener("online",  handleOnline);
    window.addEventListener("offline", handleOffline);
    const intervalId = setInterval(checkPending, 10_000);

    return () => {
      window.removeEventListener("online",  handleOnline);
      window.removeEventListener("offline", handleOffline);
      clearInterval(intervalId);
    };
  }, [syncSales]);

  const hasFailed = failedIds.size > 0;

  if (pendingCount === 0 && isOnline && !hasFailed) return null;

  return (
    <div className={cn(
      "fixed bottom-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-4 py-2 rounded-full shadow-lg border text-sm font-medium transition-all",
      hasFailed
        ? "bg-destructive/10 text-destructive border-destructive/30"
        : !isOnline
          ? "bg-warning/12 text-warning border-amber-200"
          : "bg-accent/12 text-accent border-blue-200"
    )}>
      {hasFailed ? (
        <>
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{failedIds.size} sale{failedIds.size > 1 ? "s" : ""} could not sync — record manually</span>
          <button
            onClick={dismissFailed}
            aria-label="Dismiss failed sales"
            className="ml-1 p-1 rounded-full hover:bg-destructive/10 transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </>
      ) : !isOnline ? (
        <>
          <CloudOff className="w-4 h-4" />
          Offline mode ({pendingCount} pending)
        </>
      ) : isSyncing ? (
        <>
          <CloudUpload className="w-4 h-4 animate-bounce" />
          Syncing {pendingCount} sales…
        </>
      ) : pendingCount > 0 ? (
        <>
          <CloudOff className="w-4 h-4" />
          {pendingCount} sales waiting to sync
        </>
      ) : (
        <>
          <CheckCircle2 className="w-4 h-4 text-success" />
          All synced
        </>
      )}
    </div>
  );
}
