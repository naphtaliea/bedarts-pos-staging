"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Banknote, Smartphone, CreditCard, AlertCircle, Loader2, Delete, X, PackageX } from "lucide-react";
import { useCartStore } from "@/lib/pos-store";
import { PosTopBar } from "@/components/pos/pos-topbar";
import { submitSale } from "@/app/(dashboard)/pos/actions";
import { formatCurrency } from "@/lib/utils";
import { cn } from "@/lib/utils";
import type { PaymentMethod, PaymentEntry, Sale } from "@/lib/types";
import { OVERRIDE_REASONS, TRACKED_REASON } from "@/lib/override-reasons";
import { isStaleDeployError } from "@/lib/sync-core";
import { reloadForUpdate } from "@/lib/reload-for-update";

const METHOD_OPTIONS: { value: PaymentMethod; label: string; icon: React.ElementType }[] = [
  { value: "cash",        label: "Cash",       icon: Banknote   },
  { value: "momo",        label: "MTN MoMo",   icon: Smartphone },
  { value: "pos_machine", label: "Visa / POS", icon: CreditCard },
];

const METHOD_LABELS: Record<string, string> = {
  cash: "Cash", momo: "MTN MoMo", pos_machine: "Visa / POS",
};

const CASH_ROWS: [string, string, string, string][] = [
  ["1", "2", "3", "+10"],
  ["4", "5", "6", "+20"],
  ["7", "8", "9", "+50"],
  ["00", "0", ".", "⌫"],
];

const DIGIT_ROWS: [string, string, string][] = [
  ["1", "2", "3"],
  ["4", "5", "6"],
  ["7", "8", "9"],
  ["00", "0", "."],
];

interface Split {
  id: string;
  method: PaymentMethod;
  amount: number;
}

interface PaymentClientProps {
  cashierName: string;
  avatarUrl?: string | null;
  onBack?: () => void;
  onComplete?: (saleId: string) => void;
  onOfflineComplete?: (sale: Sale) => void;
}

export function PaymentClient({ cashierName, avatarUrl, onBack, onComplete, onOfflineComplete }: PaymentClientProps) {
  const router = useRouter();
  const { items, subtotal, total, discount, clearCart, preorderMode, preorderNote } = useCartStore();
  const subtotalVal = subtotal();
  const totalVal    = total();

  const [splits,       setSplits]       = useState<Split[]>([]);
  const [method,       setMethod]       = useState<PaymentMethod>("cash");
  const [tendered,     setTendered]     = useState("");
  // Tracks whether the current tendered value was placed there by the Cash auto-fill
  // convenience (true) vs typed by the cashier (false). Only user-typed amounts
  // should be committed as a split when switching payment methods.
  const [tenderedAutoFilled, setTenderedAutoFilled] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error,        setError]        = useState<string | null>(null);
  const [offlineSaved, setOfflineSaved] = useState(false);
  const [overrideModal, setOverrideModal] = useState<{ items: string[] } | null>(null);
  const [overrideReason, setOverrideReason] = useState<string>(OVERRIDE_REASONS[0]);
  const pendingPayloadRef = useRef<Parameters<typeof submitSale>[0] | null>(null);
  const leavingForReceipt = useRef(false);

  useEffect(() => {
    if (items.length === 0 && !leavingForReceipt.current) {
      if (onBack) onBack(); else router.replace("/cashier");
    }
  }, [items.length, onBack, router]);

  const splitsTotal = splits.reduce((s, p) => s + p.amount, 0);
  const remaining   = Math.max(0, totalVal - splitsTotal);

  const tenderedNum = parseFloat(tendered) || 0;
  const entryAmount = method === "cash"
    ? tenderedNum
    : tenderedNum > 0 ? tenderedNum : remaining;

  const totalCovered = splitsTotal + entryAmount;
  const change       = Math.max(0, totalCovered - totalVal);
  const discountVal  = subtotalVal - totalVal;

  const showSplitButton = entryAmount > 0 && entryAmount < remaining - 0.001;

  const pressTender = (key: string) => {
    // Any keypress means the cashier is actively editing the value —
    // clear the auto-fill flag so a subsequent method change treats it as user-typed.
    setTenderedAutoFilled(false);
    if (key === "⌫") return setTendered(t => t.slice(0, -1));
    if (key.startsWith("+")) {
      const add = parseFloat(key.slice(1));
      return setTendered(t => String((parseFloat(t) || 0) + add));
    }
    if (key === ".")  return setTendered(t => t.includes(".") ? t : (t || "0") + ".");
    if (key === "00") return setTendered(t => (t === "" || t === "0") ? "0" : t + "00");
    setTendered(t => t === "0" ? key : t + key);
  };

  const addSplit = () => {
    if (entryAmount <= 0) return;
    setSplits(prev => [...prev, { id: crypto.randomUUID(), method, amount: entryAmount }]);
    setTendered("");
    setTenderedAutoFilled(false);
  };

  const removeSplit = (id: string) => setSplits(prev => prev.filter(p => p.id !== id));

  const canConfirm = items.length > 0 && totalCovered >= totalVal;

  const doSubmit = async (payload: Parameters<typeof submitSale>[0]) => {
    const result = await submitSale(payload);
    if (!result.ok) {
      if ("stockInsufficient" in result) {
        pendingPayloadRef.current = payload;
        setIsProcessing(false);
        setOverrideReason(OVERRIDE_REASONS[0]);
        setOverrideModal({ items: result.stockInsufficient });
        return;
      }
      // The server refused the sale — say why instead of a generic failure.
      setIsProcessing(false);
      setError(result.code === "pin" ? "Your PIN session ended. Enter your PIN again." : result.error);
      return;
    }
    leavingForReceipt.current = true;
    clearCart();
    if (onComplete) onComplete(result.saleId);
    else router.push(`/cashier/receipt?sale=${result.saleId}`);
  };

  // Stock the till last knew about. Offline there is no server to say stock is
  // short, so check locally; sums quantities per product across all lines.
  const localStockShortfall = (cartItems: typeof items): string[] => {
    const byProduct = new Map<string, { name: string; qty: number; stock: number | undefined }>();
    for (const i of cartItems) {
      const cur = byProduct.get(i.product.id) ?? { name: i.product.name, qty: 0, stock: i.product.stock_quantity };
      cur.qty += i.quantity;
      byProduct.set(i.product.id, cur);
    }
    return [...byProduct.values()].filter((p) => p.stock !== undefined && p.qty > p.stock).map((p) => p.name);
  };

  // Save the sale on the device to send when the connection is back.
  const queueOffline = async (queued: Parameters<typeof submitSale>[0]) => {
    const { saveOfflineSale } = await import("@/lib/sync-queue");
    await saveOfflineSale(queued);
    clearCart();
    if (onOfflineComplete) {
      const now = new Date().toISOString();
      const offlineSale: Sale = {
        id: crypto.randomUUID(),
        cashier_id: "",
        cashier: { id: "", full_name: cashierName, avatar_url: avatarUrl ?? null, role: "cashier", is_active: true, created_at: now, pin: null },
        subtotal: queued.subtotal,
        discount_amount: queued.discount,
        total_amount: queued.total,
        status: "completed",
        voided_by: null,
        void_reason: null,
        created_at: now,
        sale_items: queued.items.map((item) => ({
          id: crypto.randomUUID(),
          sale_id: "",
          product_id: item.product.id,
          product: item.product,
          quantity: item.quantity,
          unit_price: item.unit_price,
          discount_amount: item.discount_amount,
          total_price: item.quantity * item.unit_price - item.discount_amount,
          cost_at_sale: null,
          package_label: item.packageLabel ?? null,
        })),
        payments: queued.payments.map((p) => ({
          id: crypto.randomUUID(),
          sale_id: "",
          method: p.method,
          amount: p.amount,
          reference: p.reference ?? "",
          created_at: now,
        })),
      };
      onOfflineComplete(offlineSale);
    } else {
      setOfflineSaved(true);
      setTimeout(() => { if (onBack) onBack(); else router.push("/cashier"); }, 3000);
    }
  };

  // Offline (or the request never reached the server): if the till thinks stock
  // is short, ask for the override reason now — same as online — then queue.
  const finishOffline = async (payload: Parameters<typeof submitSale>[0]) => {
    const short = localStockShortfall(payload.items);
    if (short.length > 0 && !payload.stockOverrideReason) {
      pendingPayloadRef.current = payload;
      setIsProcessing(false);
      setOverrideReason(OVERRIDE_REASONS[0]);
      setOverrideModal({ items: short });
      return;
    }
    await queueOffline(payload);
  };

  const handleSubmitError = async (e: unknown, payload: Parameters<typeof submitSale>[0]) => {
    const msg = e instanceof Error ? e.message : "";
    // This page is older than the server (the till was updated). Reload onto
    // the new build — the cart is saved on the device and comes back.
    if (isStaleDeployError(msg)) {
      setError("The till was just updated. Reloading…");
      const reloaded = await reloadForUpdate();
      if (!reloaded) {
        setIsProcessing(false);
        setError("The till needs updating. Close and reopen the app, then try again.");
      }
      return;
    }
    const isOffline = !navigator.onLine || msg === "OFFLINE_MODE" || msg.includes("fetch");
    if (isOffline) {
      await finishOffline(payload);
      return;
    }
    setIsProcessing(false);
    setError(msg || "Payment failed. Please try again.");
  };

  const handleConfirm = async () => {
    if (!canConfirm || isProcessing) return;
    setIsProcessing(true);
    setError(null);

    // For cash, record only what the store keeps (net of change) as `amount` so
    // reconciliation stays correct. Capture the tendered value separately so the
    // receipt can show cash given + change.
    const netAmount = method === "cash" ? Math.min(entryAmount, remaining) : entryAmount;
    const lastEntry: PaymentEntry = { method, amount: netAmount, reference: "" };
    if (method === "cash" && entryAmount > netAmount) lastEntry.tendered = entryAmount;
    const payments: PaymentEntry[] = [
      ...splits.map(p => ({ method: p.method, amount: p.amount, reference: "" })),
      lastEntry,
    ].filter(p => p.amount > 0);

    const payload = {
      items,
      payments,
      subtotal: subtotalVal,
      discount,
      total: totalVal,
      pendingPickup: preorderMode,
      pickupNote: preorderMode ? preorderNote.trim() : undefined,
    };
    try {
      if (!navigator.onLine) {
        if (preorderMode) throw new Error("Pre-orders require an internet connection.");
        throw new Error("OFFLINE_MODE");
      }
      if (preorderMode && !preorderNote.trim()) {
        throw new Error("Customer name/phone is required for a pre-order.");
      }
      await doSubmit(payload);
    } catch (e) {
      await handleSubmitError(e, payload);
    }
  };

  const handleOverrideConfirm = async () => {
    const base = pendingPayloadRef.current;
    if (!base) return;
    const payload = { ...base, stockOverrideReason: overrideReason };
    setOverrideModal(null);
    setIsProcessing(true);
    setError(null);
    // Offline: the reason travels with the queued sale and is sent when it syncs.
    if (!navigator.onLine) {
      await queueOffline(payload);
      return;
    }
    try {
      await doSubmit(payload);
    } catch (e) {
      await handleSubmitError(e, payload);
    }
  };

  const kbRef = useRef<(e: KeyboardEvent) => void>(() => {});
  kbRef.current = (e: KeyboardEvent) => {
    if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    if (/^[0-9]$/.test(e.key)) { e.preventDefault(); pressTender(e.key); }
    else if (e.key === ".") { e.preventDefault(); pressTender("."); }
    else if (e.key === "Backspace") { e.preventDefault(); pressTender("⌫"); }
    if (e.key === "Enter" && canConfirm && !isProcessing) { e.preventDefault(); handleConfirm(); }
  };
  useEffect(() => {
    const h = (e: KeyboardEvent) => kbRef.current(e);
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, []);

  if (!onComplete && items.length === 0) return null;

  return (
    <div className="flex flex-col h-dvh bg-white select-none overflow-hidden animate-page-enter">
      <PosTopBar cashierName={cashierName} avatarUrl={avatarUrl} showBack backHref="/cashier" onBack={onBack} showTabs />

      {/* ── Stock override modal ── */}
      {overrideModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-sm bg-white rounded-2xl shadow-xl overflow-hidden">
            <div className="flex items-start gap-3 bg-warning/10 border-b border-warning/20 px-5 py-4">
              <PackageX className="w-5 h-5 text-warning shrink-0 mt-0.5" aria-hidden="true" />
              <div>
                <p className="font-bold text-foreground text-sm">Stock shows zero</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {overrideModal.items.length === 1
                    ? overrideModal.items[0]
                    : overrideModal.items.map((n, i) => <span key={i} className="block">{n}</span>)}
                </p>
              </div>
            </div>
            <div className="px-5 py-4 space-y-3">
              <div>
                <label className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.15em] block mb-1.5">
                  Reason <span className="text-destructive">*</span>
                </label>
                <select
                  value={overrideReason}
                  onChange={(e) => setOverrideReason(e.target.value)}
                  className="w-full rounded-xl border border-border bg-white px-3 py-2.5 text-sm font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                >
                  {OVERRIDE_REASONS.map((r) => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </select>
              </div>
              <p className="text-[11px] text-muted-foreground">
                {overrideReason === TRACKED_REASON
                  ? "This shortfall will be recorded and auto-deducted from the next stock delivery for these products."
                  : "This override will be logged for manager review. Stock is not adjusted."}
              </p>
            </div>
            <div className="flex gap-2 px-5 pb-5">
              <button
                onClick={() => { setOverrideModal(null); setIsProcessing(false); }}
                className="flex-1 h-12 rounded-xl border border-border text-sm font-semibold text-foreground hover:bg-secondary transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleOverrideConfirm}
                className="flex-1 h-12 rounded-xl bg-warning text-white text-sm font-bold hover:bg-warning/90 transition-colors"
              >
                Proceed anyway
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-col lg:flex-row flex-1 min-h-0">

        {/* ── LEFT: Total, splits, method — full width on mobile, 35% on lg+ ── */}
        <aside className="w-full lg:w-[35%] border-b lg:border-b-0 lg:border-r border-border flex flex-col bg-white shrink-0">

          {/* Pre-order banner */}
          {preorderMode && (
            <div className="shrink-0 bg-warning text-white px-5 py-2.5">
              <p className="text-[10px] font-black uppercase tracking-widest leading-none">Pre-paid pickup</p>
              <p className="text-[11px] mt-1 opacity-90 truncate">
                {preorderNote.trim() || "⚠ Enter customer name in the cart panel"}
              </p>
            </div>
          )}

          {/* Total Due */}
          <div className="shrink-0 px-5 pt-5 pb-4 border-b border-border">
            <p className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.15em] mb-1">
              {splits.length > 0 ? "Remaining" : "Total Due"}
            </p>
            <p className="font-display font-black text-4xl text-foreground tabular-nums leading-none">
              {formatCurrency(splits.length > 0 ? remaining : totalVal)}
            </p>
            {discountVal > 0 && (
              <p className="text-[11px] text-warning mt-2 tabular-nums">
                −{formatCurrency(discountVal)} discount applied
              </p>
            )}
          </div>

          {/* Committed split payments */}
          {splits.length > 0 && (
            <div className="shrink-0 border-b border-border">
              <div className="px-4 pt-3 pb-1.5">
                <p className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.15em]">Split</p>
              </div>
              {splits.map(p => (
                <div key={p.id} className="flex items-center justify-between px-4 py-2.5 border-b border-border/50 text-sm">
                  <span className="font-semibold text-foreground">{METHOD_LABELS[p.method]}</span>
                  <div className="flex items-center gap-2">
                    <span className="tabular-nums font-bold text-foreground">{formatCurrency(p.amount)}</span>
                    <button
                      onClick={() => removeSplit(p.id)}
                      aria-label="Remove split"
                      className="text-muted-foreground hover:text-destructive transition-colors rounded min-w-[44px] min-h-[44px] flex items-center justify-center -my-2 -mr-2"
                    >
                      <X className="w-4 h-4" aria-hidden="true" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Payment method selector — pushed to bottom */}
          <div className="mt-auto shrink-0">
            <div className="px-4 pt-3 pb-1 border-t border-border">
              <p className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.15em]">Method</p>
            </div>
            {METHOD_OPTIONS.map(opt => {
              const Icon = opt.icon;
              const active = method === opt.value;
              return (
                <button
                  key={opt.value}
                  onClick={() => {
                    let postSplitRemaining = remaining;
                    // Only commit a split when the value in `tendered` was actually typed
                    // by the cashier — never when it was placed by the Cash auto-fill.
                    const shouldCommitSplit = opt.value !== method && tenderedNum > 0 && !tenderedAutoFilled;
                    if (shouldCommitSplit) {
                      setSplits(prev => [...prev, { id: crypto.randomUUID(), method, amount: tenderedNum }]);
                      postSplitRemaining = Math.max(0, remaining - tenderedNum);
                    }
                    setMethod(opt.value);
                    const willAutoFill = opt.value === "cash" && postSplitRemaining > 0;
                    setTendered(willAutoFill ? String(postSplitRemaining) : "");
                    setTenderedAutoFilled(willAutoFill);
                    setError(null);
                  }}
                  className={cn(
                    "flex items-center gap-3 px-4 py-3 text-sm font-semibold border-b border-border/50 border-l-[3px] transition-all text-left w-full",
                    active
                      ? "border-l-primary bg-primary/[0.04] text-foreground"
                      : "border-l-transparent text-muted-foreground hover:bg-secondary hover:text-foreground"
                  )}
                >
                  <Icon className={cn("w-4 h-4 shrink-0", active && "text-primary")} aria-hidden="true" />
                  {opt.label}
                </button>
              );
            })}
          </div>
        </aside>

        {/* ── RIGHT: Tendered display + numpad + confirm (65%) ── */}
        <main className="flex-1 flex flex-col min-h-0 bg-secondary/30">

          {/* Tendered display */}
          <div className="shrink-0 px-6 pt-6 pb-3 text-center">
            <p className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] mb-2">
              {method === "cash" ? "Cash Tendered" : `${METHOD_LABELS[method]} Amount`}
            </p>
            <p
              className={cn(
                "font-display font-black tabular-nums leading-none tracking-tight",
                entryAmount > 0 ? "text-primary" : "text-foreground/10"
              )}
              style={{ fontSize: "clamp(2rem, 10vw, 4rem)" }}
            >
              {formatCurrency(entryAmount > 0 ? entryAmount : 0)}
            </p>

            {/* Change strip */}
            {change > 0 ? (
              <div className="inline-flex items-baseline gap-2 mt-3 rounded-full bg-success/10 border border-success/20 px-4 py-1.5">
                <span className="text-[10px] font-black text-success/80 uppercase tracking-[0.15em]">Change</span>
                <span className="font-display font-black text-lg text-success tabular-nums">{formatCurrency(change)}</span>
              </div>
            ) : (
              <div className="h-8 mt-3" />
            )}
          </div>

          {/* Numpad + confirm */}
          <div className="flex-1 flex flex-col items-center justify-center px-6 pb-6 gap-2.5 overflow-y-auto">
            <div className="w-full max-w-md space-y-2.5">

              {method === "cash" ? (
                <div className="flex flex-col gap-2">
                  {CASH_ROWS.map(([k1, k2, k3, k4], ri) => (
                    <div key={ri} className="grid grid-cols-4 gap-2">
                      {([k1, k2, k3] as string[]).map(key => (
                        <button key={key} onClick={() => pressTender(key)}
                          className="h-14 rounded-xl btn-tactile active:btn-tactile-active font-display text-2xl font-black text-foreground">
                          {key}
                        </button>
                      ))}
                      {k4 === "⌫" ? (
                        <button onClick={() => pressTender("⌫")} aria-label="Backspace"
                          className="h-14 rounded-xl btn-tactile active:btn-tactile-active text-muted-foreground hover:text-destructive flex items-center justify-center">
                          <Delete className="w-5 h-5" aria-hidden="true" />
                        </button>
                      ) : (
                        <button onClick={() => pressTender(k4)}
                          className="h-14 rounded-xl btn-tactile active:btn-tactile-active font-display text-xl font-black text-primary">
                          {k4}
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  {DIGIT_ROWS.map((row, ri) => (
                    <div key={ri} className="grid grid-cols-4 gap-2">
                      {row.map(key => (
                        <button key={key} onClick={() => pressTender(key)}
                          className="h-14 rounded-xl btn-tactile active:btn-tactile-active font-display text-2xl font-black text-foreground">
                          {key}
                        </button>
                      ))}
                      <button onClick={() => pressTender("⌫")} aria-label="Backspace"
                        className="h-14 rounded-xl btn-tactile active:btn-tactile-active text-muted-foreground hover:text-destructive flex items-center justify-center">
                        <Delete className="w-5 h-5" aria-hidden="true" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {offlineSaved && (
                <div role="alert" className="flex items-start gap-3 rounded-xl border border-success/30 bg-success/5 px-4 py-3 text-sm text-success">
                  <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" aria-hidden="true" />
                  <span>You&apos;re offline — sale saved and will sync automatically when connection returns.</span>
                </div>
              )}

              {error && (
                <div role="alert" className="flex items-start gap-3 rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
                  <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" aria-hidden="true" />
                  <span>{error}</span>
                </div>
              )}

              {showSplitButton && (
                <button onClick={addSplit}
                  className="w-full h-11 rounded-xl btn-tactile active:btn-tactile-active text-foreground text-sm font-semibold flex items-center justify-center gap-2">
                  Add {formatCurrency(entryAmount)} {METHOD_LABELS[method]} · pay rest separately
                </button>
              )}

              <button
                onClick={handleConfirm}
                disabled={!canConfirm || isProcessing}
                className={cn(
                  "w-full h-16 rounded-2xl font-display font-black text-xl uppercase tracking-wider flex items-center justify-center gap-3",
                  "btn-tactile-primary active:btn-tactile-primary-active",
                  "disabled:opacity-40 disabled:pointer-events-none"
                )}
              >
                {isProcessing ? (
                  <><Loader2 className="w-5 h-5 animate-spin" aria-hidden="true" /> Processing…</>
                ) : (
                  `Confirm · ${formatCurrency(totalVal)}`
                )}
              </button>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
