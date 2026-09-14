"use client";

import { useEffect, useState, useCallback } from "react";
import { CloudOff, CloudUpload, CheckCircle2 } from "lucide-react";
import { getOfflineSales, removeOfflineSale } from "@/lib/sync-queue";
import { submitSale } from "@/app/(dashboard)/pos/actions";
import { cn } from "@/lib/utils";

export function OfflineSyncer() {
  const [isOnline, setIsOnline] = useState(true);
  const [pendingCount, setPendingCount] = useState(0);
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
    try {
      const sales = await getOfflineSales();
      for (const sale of sales) {
        try {
          await submitSale(sale.payload);
          await removeOfflineSale(sale.id);
        } catch (e) {
          console.error("Failed to sync offline sale", sale.id, e);
          // Stop syncing if the server is rejecting or we dropped offline again
          if (!navigator.onLine) break;
        }
      }
    } finally {
      await checkPending();
      setIsSyncing(false);
    }
  }, []);

  useEffect(() => {
    // Initial checks
    setIsOnline(navigator.onLine);
    checkPending();
    
    // Attempt sync on mount if online
    if (navigator.onLine) {
      syncSales();
    }

    const handleOnline = () => {
      setIsOnline(true);
      syncSales();
    };
    
    const handleOffline = () => {
      setIsOnline(false);
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    // Periodically check for pending sales to update the counter
    const intervalId = setInterval(checkPending, 10000);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      clearInterval(intervalId);
    };
  }, [syncSales]);

  if (pendingCount === 0 && isOnline) return null;

  return (
    <div className={cn(
      "fixed bottom-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-4 py-2 rounded-full shadow-lg border text-sm font-medium transition-all",
      !isOnline ? "bg-amber-100 text-amber-800 border-amber-200" : "bg-blue-100 text-blue-800 border-blue-200"
    )}>
      {!isOnline ? (
        <>
          <CloudOff className="w-4 h-4" />
          Offline mode ({pendingCount} pending)
        </>
      ) : isSyncing ? (
        <>
          <CloudUpload className="w-4 h-4 animate-bounce" />
          Syncing {pendingCount} sales...
        </>
      ) : pendingCount > 0 ? (
        <>
          <CloudOff className="w-4 h-4" />
          {pendingCount} sales waiting to sync
        </>
      ) : (
        <>
          <CheckCircle2 className="w-4 h-4 text-green-600" />
          All synced
        </>
      )}
    </div>
  );
}
