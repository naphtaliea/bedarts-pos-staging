"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ReceiptText, CheckCircle2, AlertTriangle, ChevronRight,
  Minus, Plus, X, RotateCcw,
} from "lucide-react";

import { cn, formatCurrency } from "@/lib/utils";
import { voidSale, processRefund } from "./actions";
import type { RefundItem } from "./actions";

// ─── Types ────────────────────────────────────────────────────────────────────

interface SaleItem {
  id: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  cost_at_sale: number | null;
  discount_amount: number;
  product: { id: string; name: string; unit: string };
}

interface Sale {
  id: string;
  total_amount: number;
  discount_amount: number;
  status: "completed" | "voided";
  created_at: string;
  void_reason: string | null;
  cashier: { full_name: string } | null;
  voider: { full_name: string } | null;
  sale_items: SaleItem[];
  payments: { method: string; amount: number }[];
  refunds: { id: string; refund_amount: number; created_at: string }[];
}

// ─── Constants ─────────────────────────────────────────────────────────────────

const METHOD_LABELS: Record<string, string> = {
  cash: "Cash",
  momo: "MoMo",
  pos_machine: "POS",
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDateTime(d: string) {
  return new Date(d).toLocaleString("en-GH", { dateStyle: "medium", timeStyle: "short" });
}

function formatShortDate(d: string) {
  return new Date(d).toLocaleString("en-GH", { dateStyle: "short", timeStyle: "short" });
}

function totalRefunded(sale: Sale) {
  return sale.refunds.reduce((s, r) => s + r.refund_amount, 0);
}

// ─── Item row in the refund panel ────────────────────────────────────────────

interface ItemRowProps {
  item: SaleItem;
  qty: number;
  onChange: (qty: number) => void;
}

function ItemRow({ item, qty, onChange }: ItemRowProps) {
  const isKg = item.product.unit === "kg";
  const step = isKg ? 0.5 : 1;
  const max = item.quantity;
  const subtotal = qty * item.unit_price;

  function decrement() {
    const next = Math.max(0, parseFloat((qty - step).toFixed(2)));
    onChange(next);
  }
  function increment() {
    const next = Math.min(max, parseFloat((qty + step).toFixed(2)));
    onChange(next);
  }

  return (
    <div className={cn(
      "px-4 py-3 transition-colors",
      qty > 0 ? "bg-primary/[0.04]" : ""
    )}>
      <div className="flex items-start gap-3">
        {/* Product info */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-foreground leading-snug">
            {item.product.name}
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">
            {isKg
              ? `${item.quantity.toFixed(2)} kg × ${formatCurrency(item.unit_price)}/kg`
              : `${item.quantity} × ${formatCurrency(item.unit_price)}`}
          </p>
        </div>

        {/* Stepper + amount */}
        <div className="flex items-center gap-2 shrink-0">
          <div className="flex items-center gap-1">
            <button
              onClick={decrement}
              disabled={qty <= 0}
              aria-label="Decrease quantity"
              className="h-8 w-8 rounded-lg flex items-center justify-center border border-border text-muted-foreground hover:bg-secondary hover:text-foreground disabled:opacity-30 transition-colors"
            >
              <Minus className="w-3.5 h-3.5" />
            </button>
            <span className={cn(
              "w-12 text-center text-sm font-bold tabular-nums",
              qty > 0 ? "text-primary" : "text-muted-foreground"
            )}>
              {isKg ? qty.toFixed(2) : qty}
            </span>
            <button
              onClick={increment}
              disabled={qty >= max}
              aria-label="Increase quantity"
              className="h-8 w-8 rounded-lg flex items-center justify-center border border-border text-muted-foreground hover:bg-secondary hover:text-foreground disabled:opacity-30 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>
          <span className={cn(
            "w-16 text-right text-sm tabular-nums font-semibold",
            qty > 0 ? "text-foreground" : "text-muted-foreground/40"
          )}>
            {formatCurrency(subtotal)}
          </span>
        </div>
      </div>
    </div>
  );
}

// ─── Refund panel (right side on desktop / bottom sheet on mobile) ────────────

interface RefundPanelProps {
  sale: Sale;
  onClose: () => void;
  onDone: (msg: string) => void;
}

function RefundPanel({ sale, onClose, onDone }: RefundPanelProps) {
  const alreadyRefunded = totalRefunded(sale);
  const netRemaining = sale.total_amount - alreadyRefunded;

  const [quantities, setQuantities] = useState<Record<string, number>>(
    Object.fromEntries(sale.sale_items.map((i) => [i.id, i.quantity]))
  );
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showVoid, setShowVoid] = useState(false);
  const [voidReason, setVoidReason] = useState("");

  const refundTotal = sale.sale_items.reduce(
    (s, item) => s + (quantities[item.id] ?? 0) * item.unit_price,
    0
  );

  function selectAll() {
    setQuantities(Object.fromEntries(sale.sale_items.map((i) => [i.id, i.quantity])));
  }
  function clearAll() {
    setQuantities(Object.fromEntries(sale.sale_items.map((i) => [i.id, 0])));
  }

  async function handleRefund() {
    if (refundTotal <= 0) { setError("Select at least one item to refund."); return; }
    if (reason.trim().length < 3) { setError("Provide a reason (at least 3 characters)."); return; }
    setLoading(true);
    setError(null);

    const items: RefundItem[] = sale.sale_items
      .filter((i) => (quantities[i.id] ?? 0) > 0)
      .map((i) => ({
        sale_item_id: i.id,
        product_id: i.product.id,
        product_name: i.product.name,
        quantity: quantities[i.id]!,
        unit_price: i.unit_price,
        subtotal: (quantities[i.id]!) * i.unit_price,
        cost_at_sale: i.cost_at_sale,
      }));

    const res = await processRefund(sale.id, items, reason);
    setLoading(false);
    if (res.error) { setError(res.error); return; }
    onDone(`Refunded ${formatCurrency(refundTotal)} — stock returned`);
  }

  async function handleVoid() {
    if (voidReason.trim().length < 5) { setError("Provide a void reason (at least 5 characters)."); return; }
    setLoading(true);
    setError(null);
    const res = await voidSale(sale.id, voidReason);
    setLoading(false);
    if (res.error) { setError(res.error); return; }
    onDone(`Sale voided · ${formatCurrency(sale.total_amount)} and all stock returned`);
  }

  return (
    <div className="flex flex-col h-full bg-card">
      {/* Panel header */}
      <div className="shrink-0 flex items-center justify-between gap-3 px-4 py-3 border-b border-border">
        <div className="min-w-0">
          <p className="text-xs font-mono text-muted-foreground">#{sale.id.slice(0, 8).toUpperCase()}</p>
          <p className="text-sm font-semibold text-foreground">{formatShortDate(sale.created_at)}</p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <div className="text-right">
            <p className="text-base font-bold text-foreground tabular-nums">{formatCurrency(sale.total_amount)}</p>
            {alreadyRefunded > 0 && (
              <p className="text-[11px] text-destructive tabular-nums">−{formatCurrency(alreadyRefunded)} refunded</p>
            )}
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="h-8 w-8 rounded-lg flex items-center justify-center text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Already refunded history */}
      {sale.refunds.length > 0 && (
        <div className="shrink-0 bg-secondary/60 px-4 py-2 border-b border-border space-y-0.5">
          {sale.refunds.map((r) => (
            <p key={r.id} className="text-[11px] text-muted-foreground">
              Refunded {formatCurrency(r.refund_amount)} on {formatShortDate(r.created_at)}
            </p>
          ))}
        </div>
      )}

      {!showVoid ? (
        <>
          {/* Select all / clear */}
          <div className="shrink-0 flex items-center justify-between px-4 py-2 border-b border-border bg-secondary/40">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              Items to refund
            </p>
            <div className="flex items-center gap-3">
              <button onClick={selectAll} className="text-xs text-accent hover:underline font-medium">All</button>
              <button onClick={clearAll} className="text-xs text-muted-foreground hover:text-foreground">None</button>
            </div>
          </div>

          {/* Item list */}
          <div className="flex-1 overflow-y-auto divide-y divide-border">
            {sale.sale_items.map((item) => (
              <ItemRow
                key={item.id}
                item={item}
                qty={quantities[item.id] ?? 0}
                onChange={(qty) => setQuantities((prev) => ({ ...prev, [item.id]: qty }))}
              />
            ))}
          </div>

          {/* Footer */}
          <div className="shrink-0 border-t border-border px-4 pt-3 pb-4 space-y-3 bg-card">
            {/* Refund total */}
            <div className="flex items-baseline justify-between">
              <span className="text-sm text-muted-foreground">Refund total</span>
              <span className={cn(
                "text-xl font-bold tabular-nums",
                refundTotal > 0 ? "text-foreground" : "text-muted-foreground/40"
              )}>
                {formatCurrency(refundTotal)}
              </span>
            </div>

            {/* Reason */}
            <textarea
              rows={2}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Reason for refund (e.g. wrong item, customer return)…"
              className="w-full rounded-xl border border-border bg-secondary/40 px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground resize-none focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            />

            {error && (
              <p className="rounded-xl bg-destructive/8 px-3 py-2 text-xs font-medium text-destructive">{error}</p>
            )}

            <button
              onClick={handleRefund}
              disabled={loading || refundTotal <= 0 || reason.trim().length < 3}
              className="w-full h-12 rounded-xl bg-primary text-primary-foreground font-semibold text-sm hover:bg-primary/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {loading ? "Processing…" : `Refund ${refundTotal > 0 ? formatCurrency(refundTotal) : ""}`}
            </button>

            {/* Void option */}
            <button
              onClick={() => { setShowVoid(true); setError(null); }}
              className="w-full text-center text-xs text-muted-foreground hover:text-destructive transition-colors py-1"
            >
              Void entire sale instead
            </button>
          </div>
        </>
      ) : (
        /* Void sub-panel */
        <div className="flex flex-col flex-1">
          <div className="shrink-0 flex items-center gap-2 px-4 py-3 border-b border-border bg-destructive/5">
            <AlertTriangle className="w-4 h-4 text-destructive shrink-0" />
            <p className="text-sm font-semibold text-destructive">Void entire sale</p>
          </div>
          <div className="flex-1 px-4 py-4 space-y-3">
            <p className="text-sm text-muted-foreground">
              This will void {formatCurrency(sale.total_amount)} and return all stock. Cannot be undone.
            </p>
            <textarea
              rows={3}
              value={voidReason}
              onChange={(e) => setVoidReason(e.target.value)}
              placeholder="Reason for voiding this sale…"
              className="w-full rounded-xl border border-border bg-secondary/40 px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground resize-none focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            />
            {error && (
              <p className="rounded-xl bg-destructive/8 px-3 py-2 text-xs font-medium text-destructive">{error}</p>
            )}
          </div>
          <div className="shrink-0 px-4 pb-5 space-y-2">
            <button
              onClick={handleVoid}
              disabled={loading || voidReason.trim().length < 5}
              className="w-full h-12 rounded-xl bg-destructive text-white font-semibold text-sm hover:bg-destructive/90 transition-colors disabled:opacity-40"
            >
              {loading ? "Voiding…" : "Confirm Void"}
            </button>
            <button
              onClick={() => { setShowVoid(false); setError(null); }}
              className="w-full h-10 rounded-xl border border-border text-sm font-medium text-foreground hover:bg-secondary transition-colors"
            >
              Back to Refund
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Sale card ────────────────────────────────────────────────────────────────

interface SaleCardProps {
  sale: Sale;
  isSelected: boolean;
  onSelect: () => void;
}

function SaleCard({ sale, isSelected, onSelect }: SaleCardProps) {
  const refunded = totalRefunded(sale);
  const hasRefunds = refunded > 0;
  const isVoided = sale.status === "voided";
  const paymentLabel = (sale.payments ?? [])
    .map((p) => METHOD_LABELS[p.method] ?? p.method)
    .join(" + ");

  return (
    <div
      className={cn(
        "rounded-2xl border bg-card overflow-hidden transition-all",
        isSelected
          ? "border-primary/40 shadow-md"
          : isVoided
          ? "border-destructive/20 bg-destructive/5"
          : hasRefunds
          ? "border-warning/30"
          : "border-border hover:border-border/80 hover:shadow-sm"
      )}
    >
      <div className="px-4 py-4 flex items-start justify-between gap-3">
        {/* Left: sale info */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span className="text-xs font-mono text-muted-foreground">
              #{sale.id.slice(0, 8).toUpperCase()}
            </span>
            {isVoided ? (
              <span className="text-[11px] px-2 py-0.5 rounded-full font-semibold bg-destructive/10 text-destructive">
                Voided
              </span>
            ) : hasRefunds ? (
              <span className="text-[11px] px-2 py-0.5 rounded-full font-semibold bg-warning/10 text-warning">
                Refunded −{formatCurrency(refunded)}
              </span>
            ) : (
              <span className="text-[11px] px-2 py-0.5 rounded-full font-semibold bg-success/10 text-success">
                Completed
              </span>
            )}
          </div>

          <p className="text-xs text-muted-foreground">
            {formatDateTime(sale.created_at)}
            {sale.cashier?.full_name ? ` · ${sale.cashier.full_name}` : ""}
            {paymentLabel ? ` · ${paymentLabel}` : ""}
          </p>

          {/* Item summary */}
          <div className="mt-1.5 flex flex-wrap gap-x-2 gap-y-0.5">
            {(sale.sale_items ?? []).slice(0, 4).map((item, i) => (
              <span key={i} className="text-xs text-muted-foreground">
                {item.product?.unit === "kg"
                  ? `${item.quantity}kg`
                  : `${item.quantity}×`} {item.product?.name ?? "?"}
              </span>
            ))}
            {sale.sale_items.length > 4 && (
              <span className="text-xs text-muted-foreground">
                +{sale.sale_items.length - 4} more
              </span>
            )}
          </div>

          {isVoided && sale.void_reason && (
            <p className="text-xs text-destructive mt-1 truncate">
              {sale.voider?.full_name ?? "Admin"}: {sale.void_reason}
            </p>
          )}
        </div>

        {/* Right: total + action */}
        <div className="shrink-0 flex flex-col items-end gap-2">
          <p className="text-base font-bold text-foreground tabular-nums">
            {formatCurrency(sale.total_amount)}
          </p>
          {!isVoided && (
            <button
              onClick={onSelect}
              className={cn(
                "flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all",
                isSelected
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-foreground hover:bg-primary/10 hover:text-primary"
              )}
            >
              <RotateCcw className="w-3 h-3" />
              Refund
              {!isSelected && <ChevronRight className="w-3 h-3" />}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

interface RefundsClientProps {
  sales: any[];
}

export function RefundsClient({ sales }: RefundsClientProps) {
  const router = useRouter();
  const [filter, setFilter] = useState<"all" | "completed" | "voided">("completed");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => () => { if (toastTimer.current) clearTimeout(toastTimer.current); }, []);

  const typedSales = sales as Sale[];

  const filtered = typedSales.filter((s) => {
    if (filter === "completed") return s.status === "completed";
    if (filter === "voided") return s.status === "voided";
    return true;
  });

  const selectedSale = selectedId ? typedSales.find((s) => s.id === selectedId) ?? null : null;

  function handleSelect(sale: Sale) {
    setSelectedId(sale.id === selectedId ? null : sale.id);
  }

  function showToast(msg: string) {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast(msg);
    toastTimer.current = setTimeout(() => setToast(null), 4000);
    setSelectedId(null);
    router.refresh();
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="bg-white shrink-0">
        <div className="border-b border-border px-4 lg:px-6 py-3 lg:py-4 flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-base font-semibold text-foreground">Refunds</h1>
            <p className="text-xs text-muted-foreground mt-0.5">Select a sale to issue a partial or full refund</p>
          </div>
          <div className="flex gap-1">
            {(["completed", "all", "voided"] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-sm font-medium transition-colors capitalize",
                  filter === f
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                )}
              >
                {f}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Body: list + optional refund panel */}
      <div className="flex-1 overflow-hidden flex flex-col lg:flex-row relative">

        {/* Sale list */}
        <div className={cn(
          "overflow-y-auto p-4 lg:p-6 space-y-3",
          selectedSale
            ? "flex-1 lg:w-[55%] lg:flex-none lg:border-r lg:border-border pb-[60vh] lg:pb-6"
            : "flex-1"
        )}>
          {filtered.length === 0 && (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <ReceiptText className="w-10 h-10 text-muted-foreground/30 mb-3" />
              <p className="text-sm text-muted-foreground">
                {filter === "completed" ? "No completed sales" : filter === "voided" ? "No voided sales" : "No sales found"}
              </p>
            </div>
          )}
          {filtered.map((sale) => (
            <SaleCard
              key={sale.id}
              sale={sale}
              isSelected={selectedId === sale.id}
              onSelect={() => handleSelect(sale)}
            />
          ))}
        </div>

        {/* Refund panel — desktop: right column; mobile: slide-up sheet */}
        {selectedSale && (
          <>
            {/* Desktop panel */}
            <div
              ref={panelRef}
              className="hidden lg:flex lg:flex-col lg:w-[45%] lg:overflow-hidden"
            >
              <RefundPanel
                sale={selectedSale}
                onClose={() => setSelectedId(null)}
                onDone={showToast}
              />
            </div>

            {/* Mobile: backdrop + bottom sheet */}
            <div className="lg:hidden fixed inset-0 z-40 flex flex-col justify-end">
              {/* Dim backdrop */}
              <div
                className="absolute inset-0 bg-black/40"
                onClick={() => setSelectedId(null)}
              />
              {/* Sheet */}
              <div className="relative z-50 bg-card rounded-t-2xl shadow-2xl flex flex-col max-h-[85dvh]">
                {/* Drag handle */}
                <div className="shrink-0 flex justify-center pt-3 pb-1">
                  <div className="w-10 h-1 rounded-full bg-border" />
                </div>
                <RefundPanel
                  sale={selectedSale}
                  onClose={() => setSelectedId(null)}
                  onDone={showToast}
                />
              </div>
            </div>
          </>
        )}
      </div>

      {/* Toast */}
      {toast && (
        <div
          role="status"
          className="fixed top-5 right-5 z-[100] flex items-center gap-2 rounded-xl bg-success text-white px-4 py-3 text-sm font-medium shadow-lg"
        >
          <CheckCircle2 className="w-4 h-4 shrink-0" aria-hidden="true" />
          {toast}
        </div>
      )}
    </div>
  );
}
