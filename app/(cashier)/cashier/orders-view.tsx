"use client";

import { useState, useEffect, useCallback } from "react";
import { Printer, RefreshCw, WifiOff } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { PosTopBar } from "@/components/pos/pos-topbar";
import { formatCurrency } from "@/lib/utils";
import { cn } from "@/lib/utils";
import type { Profile, PaymentMethod } from "@/lib/types";

const METHOD_LABELS: Record<PaymentMethod, string> = {
  cash: "Cash",
  momo: "MoMo",
  pos_machine: "POS",
};

const METHOD_BADGE: Record<PaymentMethod | "split" | "pending_sync", string> = {
  cash: "bg-success/12 text-success",
  momo: "bg-accent/12 text-accent",
  pos_machine: "bg-secondary text-muted-foreground",
  split: "bg-primary/10 text-primary",
  pending_sync: "bg-warning/15 text-warning",
};

type OrderRow = {
  id: string;
  created_at: string;
  total_amount: number;
  status: string;
  payments: { method: PaymentMethod; amount: number }[];
  sale_items: { quantity: number }[];
};

interface OrdersViewProps {
  cashier: Profile;
  onBack: () => void;
  onViewReceipt: (saleId: string) => void;
}

export function OrdersView({ cashier, onBack, onViewReceipt }: OrdersViewProps) {
  const canSeeRevenue = cashier.role === "admin" || cashier.role === "manager";
  const [isYesterday, setIsYesterday] = useState(false);
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [isOffline, setIsOffline] = useState(false);

  const fetchOrders = useCallback(async () => {
    setLoading(true);

    if (!navigator.onLine) {
      setIsOffline(true);
      const { getOfflineSales } = await import("@/lib/sync-queue");
      const offlineSales = await getOfflineSales();

      const dayStart = new Date();
      if (isYesterday) dayStart.setDate(dayStart.getDate() - 1);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(dayStart);
      dayEnd.setHours(23, 59, 59, 999);

      const mapped: OrderRow[] = offlineSales
        .filter(s => s.timestamp >= dayStart.getTime() && s.timestamp <= dayEnd.getTime())
        .map(s => ({
          id: s.id,
          created_at: new Date(s.timestamp).toISOString(),
          total_amount: s.payload.total,
          status: "pending_sync",
          payments: s.payload.payments,
          sale_items: s.payload.items.map(i => ({ quantity: i.quantity })),
        }))
        .sort((a, b) => b.created_at.localeCompare(a.created_at));

      setOrders(mapped);
      setLoading(false);
      return;
    }

    setIsOffline(false);
    try {
      const supabase = createClient();

      const start = new Date();
      if (isYesterday) start.setDate(start.getDate() - 1);
      start.setHours(0, 0, 0, 0);
      const end = new Date(start);
      end.setHours(23, 59, 59, 999);

      const { data } = await supabase
        .from("sales")
        .select("id, created_at, total_amount, status, payments(method, amount), sale_items(quantity)")
        .gte("created_at", start.toISOString())
        .lte("created_at", end.toISOString())
        .eq("status", "completed")
        .order("created_at", { ascending: false });

      setOrders((data ?? []) as OrderRow[]);
    } catch {
      setOrders([]);
    } finally {
      setLoading(false);
    }
  }, [isYesterday]);

  useEffect(() => { fetchOrders(); }, [fetchOrders]);

  useEffect(() => {
    const handleOnline  = () => fetchOrders();
    const handleOffline = () => fetchOrders();
    window.addEventListener("online",  handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online",  handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [fetchOrders]);

  const totalRevenue = orders
    .filter(o => o.status !== "pending_sync")
    .reduce((s, o) => s + o.total_amount, 0);

  const dateLabel = isYesterday
    ? new Date(Date.now() - 86400000).toLocaleDateString("en-GH", { dateStyle: "full" })
    : new Date().toLocaleDateString("en-GH", { dateStyle: "full" });

  return (
    <div className="flex flex-col h-dvh bg-background overflow-hidden animate-page-enter">
      <PosTopBar
        cashierName={cashier.full_name}
        avatarUrl={cashier.avatar_url}
        title="Orders"
        showBack
        onBack={onBack}
        hideDashboardLink
      />

      <div className="shrink-0 border-b border-border px-4 lg:px-6 py-2 flex items-center justify-between gap-3 flex-wrap bg-white">
        <div className="flex items-center gap-2">
          <p className="text-sm text-muted-foreground">{dateLabel}</p>
          {isOffline && (
            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-warning bg-warning/10 px-2 py-0.5 rounded-full">
              <WifiOff className="w-3 h-3" aria-hidden="true" />
              Offline
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <div className="flex items-center gap-3 px-3 py-1.5 rounded-lg bg-secondary border border-border text-sm">
            {canSeeRevenue && !isOffline && (
              <>
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] text-muted-foreground uppercase tracking-wide font-bold">Revenue</span>
                  <span className="font-bold text-foreground tabular-nums">{formatCurrency(totalRevenue)}</span>
                </div>
                <div className="w-px h-3.5 bg-border" aria-hidden="true" />
              </>
            )}
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] text-muted-foreground uppercase tracking-wide font-bold">Orders</span>
              <span className="font-bold text-foreground tabular-nums">{orders.length}</span>
            </div>
          </div>
          <button
            onClick={fetchOrders}
            className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-sm font-medium text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
            aria-label="Refresh orders"
          >
            <RefreshCw className={cn("w-3.5 h-3.5", loading && "animate-spin")} aria-hidden="true" />
            <span className="hidden sm:inline">Refresh</span>
          </button>
          <div className="flex rounded-lg border border-border overflow-hidden text-xs font-medium">
            <button
              onClick={() => setIsYesterday(false)}
              className={cn("px-3 py-1.5 transition-colors", !isYesterday ? "bg-foreground text-background" : "text-muted-foreground hover:bg-secondary")}
            >
              Today
            </button>
            <button
              onClick={() => setIsYesterday(true)}
              className={cn("px-3 py-1.5 border-l border-border transition-colors", isYesterday ? "bg-foreground text-background" : "text-muted-foreground hover:bg-secondary")}
            >
              Yesterday
            </button>
          </div>
        </div>
      </div>

      <div className="flex-1 flex flex-col min-h-0 px-5 py-3 max-w-5xl mx-auto w-full gap-3">
        <div className="flex-1 min-h-0 rounded-xl border border-border bg-card overflow-hidden flex flex-col">
          {loading ? (
            <div className="flex-1 flex items-center justify-center">
              <RefreshCw className="w-5 h-5 text-muted-foreground animate-spin" aria-hidden="true" />
            </div>
          ) : orders.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center gap-2 text-muted-foreground text-sm">
              {isOffline ? (
                <>
                  <WifiOff className="w-6 h-6 text-muted-foreground/40" aria-hidden="true" />
                  <p>You&apos;re offline — no orders to show</p>
                  <p className="text-xs text-muted-foreground/60">Pending sales will appear here once synced</p>
                </>
              ) : (
                <p>No completed orders {isYesterday ? "yesterday" : "today"}</p>
              )}
            </div>
          ) : (
            <div className="flex-1 min-h-0 overflow-y-auto overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="sticky top-0 z-10">
                  <tr className="border-b border-border bg-secondary/70 backdrop-blur-sm">
                    <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Receipt #</th>
                    <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Time</th>
                    <th className="text-center px-4 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Items</th>
                    <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Method</th>
                    <th className="text-right px-4 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Total</th>
                    <th className="px-4 py-2.5" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {orders.map((order) => {
                    const isPending = order.status === "pending_sync";
                    const isSplit = order.payments.length > 1;
                    const primaryPayment = order.payments[0];
                    const payMethod: PaymentMethod | "split" | "pending_sync" = isPending
                      ? "pending_sync"
                      : isSplit
                        ? "split"
                        : (primaryPayment?.method ?? "cash");
                    const receiptRef = `#${order.id.slice(0, 8).toUpperCase()}`;
                    return (
                      <tr
                        key={order.id}
                        onClick={() => !isPending && onViewReceipt(order.id)}
                        tabIndex={isPending ? undefined : 0}
                        onKeyDown={(e) => { if (!isPending && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); onViewReceipt(order.id); } }}
                        className={cn(
                          "transition-colors",
                          isPending ? "cursor-default" : "hover:bg-secondary/40 cursor-pointer focus-visible:outline-none focus-visible:bg-secondary/40"
                        )}
                      >
                        <td className="px-4 py-2.5 font-mono font-medium text-foreground">{receiptRef}</td>
                        <td className="px-4 py-2.5 text-muted-foreground">
                          {new Date(order.created_at).toLocaleTimeString("en-GH", { hour: "2-digit", minute: "2-digit", hour12: true })}
                        </td>
                        <td className="px-4 py-2.5 text-center tabular-nums text-muted-foreground">{order.sale_items.length}</td>
                        <td className="px-4 py-2.5">
                          <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${METHOD_BADGE[payMethod]}`}>
                            {isPending ? "Pending Sync" : payMethod === "split" ? "Split" : METHOD_LABELS[payMethod as PaymentMethod]}
                          </span>
                        </td>
                        <td className="px-4 py-2.5 text-right font-semibold tabular-nums text-foreground">{formatCurrency(order.total_amount)}</td>
                        <td className="px-4 py-2.5" onClick={(e) => e.stopPropagation()}>
                          {!isPending && (
                            <button
                              onClick={() => onViewReceipt(order.id)}
                              className="inline-flex items-center gap-1.5 rounded-lg border border-border px-2.5 py-1 text-xs font-medium text-foreground hover:bg-secondary transition-colors"
                            >
                              <Printer className="w-3.5 h-3.5" aria-hidden="true" />
                              Receipt
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
