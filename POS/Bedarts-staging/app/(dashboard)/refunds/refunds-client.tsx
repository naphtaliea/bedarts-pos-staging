"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ReceiptText, CheckCircle2, AlertTriangle, ChevronRight, ChevronLeft,
  Minus, Plus, X, Search, Loader2, PackageX,
  History, Banknote, Smartphone, CreditCard,
} from "lucide-react";

const PAGE_SIZE = 50;
import { cn, formatCurrency, formatSaleRef } from "@/lib/utils";
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
  sale_number: number | null;
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

// ─── Constants ────────────────────────────────────────────────────────────────

const METHOD_LABELS: Record<string, string> = { cash: "Cash", momo: "MoMo", pos_machine: "POS" };
const METHOD_ICONS: Record<string, React.ElementType> = {
  cash: Banknote,
  momo: Smartphone,
  pos_machine: CreditCard,
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
function hasPartialRefund(sale: Sale) {
  return sale.refunds.length > 0 && sale.status !== "voided";
}

// ─── Item row ─────────────────────────────────────────────────────────────────

function ItemRow({ item, qty, onChange }: { item: SaleItem; qty: number; onChange: (q: number) => void }) {
  const isKg = item.product.unit === "kg";
  const step = isKg ? 0.5 : 1;
  const max = item.quantity;
  const subtotal = qty * item.unit_price;
  const isActive = qty > 0;

  return (
    <div className={cn("flex items-center gap-3 px-4 py-3 transition-colors", isActive && "bg-primary/[0.04]")}>
      <div className="flex-1 min-w-0">
        <p className={cn("text-sm font-semibold leading-snug", isActive ? "text-foreground" : "text-foreground/60")}>
          {item.product.name}
        </p>
        <p className="text-xs text-muted-foreground mt-0.5">
          {isKg
            ? `${item.quantity.toFixed(2)} kg · ${formatCurrency(item.unit_price)}/kg`
            : `${item.quantity} pcs · ${formatCurrency(item.unit_price)} each`}
        </p>
      </div>

      <div className="flex items-center gap-2.5 shrink-0">
        <div className="flex items-center rounded-xl border border-border overflow-hidden">
          <button
            onClick={() => onChange(Math.max(0, parseFloat((qty - step).toFixed(2))))}
            disabled={qty <= 0}
            aria-label="Decrease quantity"
            className="h-11 w-11 flex items-center justify-center text-muted-foreground hover:bg-secondary disabled:opacity-30 transition-colors"
          >
            <Minus className="w-3.5 h-3.5" />
          </button>
          <span className={cn("w-10 text-center text-sm font-bold tabular-nums", isActive ? "text-primary" : "text-muted-foreground")}>
            {isKg ? qty.toFixed(1) : qty}
          </span>
          <button
            onClick={() => onChange(Math.min(max, parseFloat((qty + step).toFixed(2))))}
            disabled={qty >= max}
            aria-label="Increase quantity"
            className="h-11 w-11 flex items-center justify-center text-muted-foreground hover:bg-secondary disabled:opacity-30 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
        </div>
        <span className={cn("w-20 text-right text-sm font-semibold tabular-nums", isActive ? "text-foreground" : "text-muted-foreground/25")}>
          {formatCurrency(subtotal)}
        </span>
      </div>
    </div>
  );
}

// ─── Void modal ───────────────────────────────────────────────────────────────

function VoidModal({ sale, onCancel, onConfirm, loading, error }: {
  sale: Sale; onCancel: () => void; onConfirm: (r: string) => void; loading: boolean; error: string | null;
}) {
  const [reason, setReason] = useState("");
  const ref = useRef<HTMLTextAreaElement>(null);
  useEffect(() => { setTimeout(() => ref.current?.focus(), 50); }, []);

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="w-full max-w-sm bg-card rounded-2xl shadow-2xl overflow-hidden">
        <div className="flex items-start gap-3 px-5 py-4 bg-destructive/5 border-b border-destructive/15">
          <div className="w-9 h-9 rounded-full bg-destructive/10 flex items-center justify-center shrink-0 mt-0.5">
            <PackageX className="w-4 h-4 text-destructive" aria-hidden />
          </div>
          <div>
            <p className="text-sm font-bold text-foreground">Void entire sale?</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {formatCurrency(sale.total_amount)} · {formatSaleRef(sale.sale_number, sale.id)} · All stock returned.
            </p>
          </div>
        </div>

        <div className="px-5 py-4 space-y-3">
          <div>
            <label className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.15em] block mb-1.5">
              Reason <span className="text-destructive">*</span>
            </label>
            <textarea
              ref={ref}
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Wrong sale, customer refused goods…"
              className="w-full rounded-xl border border-border bg-secondary/40 px-3 py-2.5 text-sm placeholder:text-muted-foreground resize-none focus:outline-none focus:ring-2 focus:ring-destructive/40 focus:border-destructive/40 transition-all"
            />
            <p className="text-[10px] text-muted-foreground mt-1 text-right">{reason.trim().length} / 5 min</p>
          </div>
          {error && (
            <div role="alert" className="flex items-start gap-2 rounded-xl bg-destructive/8 px-3 py-2">
              <AlertTriangle className="w-3.5 h-3.5 text-destructive shrink-0 mt-0.5" />
              <p className="text-xs text-destructive">{error}</p>
            </div>
          )}
        </div>

        <div className="flex gap-2 px-5 pb-5">
          <button
            onClick={onCancel}
            disabled={loading}
            className="flex-1 h-11 rounded-xl border border-border text-sm font-semibold hover:bg-secondary transition-colors disabled:opacity-40"
          >
            Cancel
          </button>
          <button
            onClick={() => onConfirm(reason)}
            disabled={loading || reason.trim().length < 5}
            className="flex-1 h-11 rounded-xl bg-destructive text-white text-sm font-bold hover:bg-destructive/90 transition-colors disabled:opacity-40 flex items-center justify-center gap-2"
          >
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            {loading ? "Voiding…" : "Void sale"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Refund panel ─────────────────────────────────────────────────────────────

function RefundPanel({ sale, onClose, onDone }: { sale: Sale; onClose: () => void; onDone: (msg: string) => void }) {
  const alreadyRefunded = totalRefunded(sale);
  const [quantities, setQuantities] = useState<Record<string, number>>(
    Object.fromEntries(sale.sale_items.map((i) => [i.id, 0]))
  );
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showVoidModal, setShowVoidModal] = useState(false);
  const [voidLoading, setVoidLoading] = useState(false);
  const [voidError, setVoidError] = useState<string | null>(null);

  const refundTotal = sale.sale_items.reduce((s, i) => s + (quantities[i.id] ?? 0) * i.unit_price, 0);
  const someSelected = refundTotal > 0;
  const canSubmit = someSelected && reason.trim().length >= 3 && !loading;

  function selectAll() { setQuantities(Object.fromEntries(sale.sale_items.map((i) => [i.id, i.quantity]))); }
  function clearAll() { setQuantities(Object.fromEntries(sale.sale_items.map((i) => [i.id, 0]))); }

  async function handleRefund() {
    if (!canSubmit) return;
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
        subtotal: quantities[i.id]! * i.unit_price,
        cost_at_sale: i.cost_at_sale,
      }));
    const res = await processRefund(sale.id, items, reason);
    setLoading(false);
    if (res.error) { setError(res.error); return; }
    onDone(`Refunded ${formatCurrency(refundTotal)} — stock returned`);
  }

  async function handleVoid(voidReason: string) {
    setVoidLoading(true);
    setVoidError(null);
    const res = await voidSale(sale.id, voidReason);
    setVoidLoading(false);
    if (res.error) { setVoidError(res.error); return; }
    setShowVoidModal(false);
    onDone(`Sale voided · ${formatCurrency(sale.total_amount)} and all stock returned`);
  }

  return (
    <>
      {showVoidModal && (
        <VoidModal
          sale={sale}
          onCancel={() => { setShowVoidModal(false); setVoidError(null); }}
          onConfirm={handleVoid}
          loading={voidLoading}
          error={voidError}
        />
      )}

      <div className="flex flex-col h-full bg-card">
        {/* Panel header */}
        <div className="shrink-0 px-5 pt-4 pb-3 border-b border-border">
          <div className="flex items-start justify-between gap-3 mb-1.5">
            <div className="min-w-0 flex-1">
              <p className="text-2xl font-bold text-foreground tabular-nums leading-none">
                {formatCurrency(sale.total_amount)}
              </p>
              {alreadyRefunded > 0 && (
                <p className="text-xs text-destructive tabular-nums mt-1 font-semibold">
                  −{formatCurrency(alreadyRefunded)} already refunded
                </p>
              )}
            </div>
            <button
              onClick={onClose}
              aria-label="Close panel"
              className="h-9 w-9 rounded-xl flex items-center justify-center text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors shrink-0 mt-0.5"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-muted-foreground">
            <span className="font-mono font-bold text-[11px] bg-secondary px-1.5 py-0.5 rounded">
              {formatSaleRef(sale.sale_number, sale.id)}
            </span>
            {sale.cashier?.full_name && <span>{sale.cashier.full_name}</span>}
            <span>{formatDateTime(sale.created_at)}</span>
          </div>

          {sale.payments.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-2">
              {sale.payments.map((p, i) => {
                const Icon = METHOD_ICONS[p.method] ?? Banknote;
                return (
                  <span key={i} className="inline-flex items-center gap-1 text-[11px] font-medium text-muted-foreground bg-secondary px-2 py-0.5 rounded-full">
                    <Icon className="w-3 h-3" aria-hidden />
                    {METHOD_LABELS[p.method] ?? p.method} {formatCurrency(p.amount)}
                  </span>
                );
              })}
            </div>
          )}
        </div>

        {/* Previous refunds */}
        {sale.refunds.length > 0 && (
          <div className="shrink-0 border-b border-border bg-warning/[0.05] px-5 py-3">
            <div className="flex items-center gap-1.5 mb-2">
              <History className="w-3.5 h-3.5 text-warning" aria-hidden />
              <p className="text-[10px] font-black text-warning uppercase tracking-[0.12em]">Previous refunds</p>
            </div>
            <div className="space-y-1">
              {sale.refunds.map((r) => (
                <div key={r.id} className="flex justify-between text-xs">
                  <span className="text-muted-foreground">{formatShortDate(r.created_at)}</span>
                  <span className="font-semibold text-warning tabular-nums">−{formatCurrency(r.refund_amount)}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Items header */}
        <div className="shrink-0 flex items-center justify-between px-5 py-2.5 border-b border-border bg-secondary/30">
          <p className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.12em]">Items to refund</p>
          <div className="flex items-center gap-3">
            <button onClick={selectAll} className="text-xs text-primary hover:text-primary/70 font-semibold transition-colors">All</button>
            <button onClick={clearAll} className="text-xs text-muted-foreground hover:text-foreground transition-colors">None</button>
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
        <div className="shrink-0 border-t border-border px-5 pt-3 pb-4 space-y-2 bg-card">
          {/* Reason */}
          <div>
            <label className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.15em] block mb-1.5">
              Reason <span className="text-destructive">*</span>
            </label>
            <textarea
              rows={1}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Customer return, wrong item…"
              className="w-full rounded-xl border border-border bg-secondary/40 px-3 py-2.5 text-sm placeholder:text-muted-foreground resize-none focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 transition-all"
            />
          </div>

          {error && (
            <div role="alert" className="flex items-start gap-2 rounded-xl bg-destructive/8 px-3 py-2.5">
              <AlertTriangle className="w-3.5 h-3.5 text-destructive shrink-0 mt-0.5" />
              <p className="text-xs text-destructive">{error}</p>
            </div>
          )}

          <button
            onClick={handleRefund}
            disabled={!canSubmit}
            className="w-full h-11 rounded-xl bg-primary text-white font-bold text-sm hover:bg-primary/90 active:scale-[0.98] transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading
              ? <><Loader2 className="w-4 h-4 animate-spin" aria-hidden /> Processing…</>
              : someSelected
              ? `Process refund · ${formatCurrency(refundTotal)}`
              : "Select items to refund"
            }
          </button>

          {/* Void — demoted to a text action, not a full button */}
          <button
            onClick={() => { setShowVoidModal(true); setVoidError(null); }}
            className="w-full flex items-center justify-center gap-1.5 h-10 text-xs font-semibold text-muted-foreground hover:text-destructive transition-colors"
          >
            <PackageX className="w-3.5 h-3.5" aria-hidden />
            Void entire sale instead
          </button>
        </div>
      </div>
    </>
  );
}

// ─── Sale card ────────────────────────────────────────────────────────────────

function SaleCard({ sale, isSelected, onSelect }: { sale: Sale; isSelected: boolean; onSelect: () => void }) {
  const refunded = totalRefunded(sale);
  const isPartiallyRefunded = hasPartialRefund(sale);
  const isVoided = sale.status === "voided";
  const canRefund = !isVoided;

  // Left border color encodes status at a glance — the signature element
  const leftBorder = isSelected
    ? "border-l-primary"
    : isVoided
    ? "border-l-destructive/30"
    : isPartiallyRefunded
    ? "border-l-amber-400"
    : "border-l-emerald-400";

  return (
    <div
      onClick={canRefund ? onSelect : undefined}
      role={canRefund ? "button" : undefined}
      tabIndex={canRefund ? 0 : undefined}
      onKeyDown={canRefund ? (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onSelect(); } } : undefined}
      aria-pressed={canRefund ? isSelected : undefined}
      className={cn(
        "rounded-xl border bg-card border-l-[3px] overflow-hidden transition-all",
        leftBorder,
        isSelected
          ? "border-border/60 ring-1 ring-primary/20 shadow-sm"
          : isVoided
          ? "border-border opacity-60"
          : "border-border",
        canRefund && !isSelected && "hover:shadow-sm hover:border-border/70 cursor-pointer active:scale-[0.995]",
        isSelected && "cursor-pointer"
      )}
    >
      <div className="px-4 py-3.5">
        {/* Top row: status + ID (left) | amount + chevron (right) */}
        <div className="flex items-start gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              {isVoided ? (
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-destructive/10 text-destructive uppercase tracking-wide">Voided</span>
              ) : isPartiallyRefunded ? (
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-amber-50 text-amber-600 uppercase tracking-wide">Refunded</span>
              ) : (
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-50 text-emerald-600 uppercase tracking-wide">Completed</span>
              )}
              <span className="text-[10px] font-mono text-muted-foreground/50">
                {formatSaleRef(sale.sale_number, sale.id)}
              </span>
            </div>

            <p className="text-xs text-muted-foreground mt-1.5 leading-snug">
              {sale.cashier?.full_name && (
                <span className="font-medium text-foreground/70">{sale.cashier.full_name}</span>
              )}
              {sale.cashier?.full_name ? " · " : ""}
              {formatDateTime(sale.created_at)}
            </p>
          </div>

          {/* Amount block */}
          <div className="shrink-0 flex items-center gap-1.5">
            <div className="text-right">
              <p className={cn("text-base font-bold tabular-nums leading-tight", isVoided ? "line-through text-muted-foreground" : "text-foreground")}>
                {formatCurrency(sale.total_amount)}
              </p>
              {isPartiallyRefunded && (
                <p className="text-[11px] text-amber-500 tabular-nums mt-0.5 font-semibold">−{formatCurrency(refunded)}</p>
              )}
            </div>
            {canRefund && (
              <ChevronRight className={cn("w-4 h-4 shrink-0 transition-colors", isSelected ? "text-primary" : "text-muted-foreground/30")} />
            )}
          </div>
        </div>

        {/* Items preview */}
        {sale.sale_items.length > 0 && (
          <p className="text-[11px] text-muted-foreground mt-2 leading-relaxed">
            {sale.sale_items.slice(0, 3).map((item, i) => (
              <span key={i}>
                {i > 0 && <span className="mx-1.5 opacity-30">·</span>}
                {item.product?.unit === "kg" ? `${item.quantity}kg` : `${item.quantity}×`} {item.product?.name}
              </span>
            ))}
            {sale.sale_items.length > 3 && (
              <span className="opacity-40"> +{sale.sale_items.length - 3} more</span>
            )}
          </p>
        )}

        {/* Payment chips */}
        {sale.payments.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-2">
            {sale.payments.map((p, i) => {
              const Icon = METHOD_ICONS[p.method] ?? Banknote;
              return (
                <span key={i} className="inline-flex items-center gap-1 text-[10px] font-medium text-muted-foreground/70 bg-secondary px-2 py-0.5 rounded-full">
                  <Icon className="w-2.5 h-2.5" aria-hidden />
                  {METHOD_LABELS[p.method] ?? p.method}
                </span>
              );
            })}
          </div>
        )}

        {/* Void reason */}
        {isVoided && sale.void_reason && (
          <p className="text-[11px] text-destructive/60 mt-2 leading-snug">
            <span className="font-semibold">{sale.voider?.full_name ?? "Manager"}:</span> {sale.void_reason}
          </p>
        )}
      </div>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export function RefundsClient({ sales }: { sales: any[] }) {
  const router = useRouter();
  const [filter, setFilter] = useState<"all" | "completed" | "refunded" | "voided">("completed");
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(0);
  const [toast, setToast] = useState<{ msg: string; type: "success" | "warning" } | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => { if (toastTimer.current) clearTimeout(toastTimer.current); }, []);
  // Reset to first page whenever filter or search changes
  useEffect(() => { setCurrentPage(0); setSelectedId(null); }, [filter, search]);

  const typedSales = sales as Sale[];

  const counts = {
    all: typedSales.length,
    completed: typedSales.filter((s) => s.status === "completed").length,
    refunded: typedSales.filter((s) => s.refunds.length > 0).length,
    voided: typedSales.filter((s) => s.status === "voided").length,
  };

  const totalRefundedAmount = typedSales.reduce((s, sale) => s + totalRefunded(sale), 0);
  const searchTrimmed = search.trim().toLowerCase();
  // Digit-only form of the query, so '053', '#00914-053-0155', and '9140530155'
  // all match the same padded 12-digit sale_number.
  const searchDigits = search.replace(/\D/g, "");

  const filtered = typedSales.filter((s) => {
    if (filter === "completed" && s.status !== "completed") return false;
    if (filter === "refunded" && s.refunds.length === 0) return false;
    if (filter === "voided" && s.status !== "voided") return false;
    if (searchTrimmed) {
      const paddedRef = s.sale_number != null ? String(s.sale_number).padStart(12, "0") : "";
      const inSaleNumber = searchDigits.length > 0 && paddedRef.includes(searchDigits);
      const inId = s.id.toLowerCase().includes(searchTrimmed);
      const inCashier = s.cashier?.full_name?.toLowerCase().includes(searchTrimmed);
      const inItems = s.sale_items.some((i: SaleItem) => i.product.name.toLowerCase().includes(searchTrimmed));
      if (!inSaleNumber && !inId && !inCashier && !inItems) return false;
    }
    return true;
  });

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const pagedSales = filtered.slice(currentPage * PAGE_SIZE, (currentPage + 1) * PAGE_SIZE);
  const selectedSale = selectedId ? typedSales.find((s) => s.id === selectedId) ?? null : null;

  function handleSelect(sale: Sale) {
    setSelectedId(sale.id === selectedId ? null : sale.id);
  }

  function showToast(msg: string, type: "success" | "warning" = "success") {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast({ msg, type });
    toastTimer.current = setTimeout(() => setToast(null), 5000);
    setSelectedId(null);
    router.refresh();
  }

  const FILTERS: { key: "all" | "completed" | "refunded" | "voided"; label: string }[] = [
    { key: "all", label: "All" },
    { key: "completed", label: "Completed" },
    { key: "refunded", label: "Refunded" },
    { key: "voided", label: "Voided" },
  ];

  return (
    <div className="flex flex-col h-full">
      {/* Page header */}
      <div className="bg-card shrink-0 border-b border-border">
        <div className="px-4 lg:px-6 pt-4 pb-3 space-y-3">
          {/* Title + summary */}
          <div className="flex items-baseline justify-between gap-4">
            <h1 className="text-base font-bold text-foreground">Refunds & Voids</h1>
            <p className="text-xs text-muted-foreground tabular-nums shrink-0">
              {counts.all} sales{totalRefundedAmount > 0 ? ` · ${formatCurrency(totalRefundedAmount)} refunded` : ""}
            </p>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" aria-hidden />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by receipt #, cashier name, or item…"
              className="w-full h-10 rounded-xl border border-border bg-secondary/40 pl-9 pr-9 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/25 focus:border-primary/40 transition-all"
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                aria-label="Clear search"
                className="absolute right-2.5 top-1/2 -translate-y-1/2 h-7 w-7 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Filter tabs — their own row so they never compete with search */}
          <div className="flex gap-1 overflow-x-auto pb-0.5">
            {FILTERS.map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setFilter(key)}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors shrink-0",
                  filter === key
                    ? "bg-primary text-white"
                    : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                )}
              >
                {label}
                <span className={cn(
                  "text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[1.25rem] text-center",
                  filter === key ? "bg-white/20 text-white" : "bg-secondary text-muted-foreground"
                )}>
                  {counts[key]}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Body: list + optional panel */}
      <div className="flex-1 overflow-hidden flex flex-col lg:flex-row relative">
        {/* Sale list */}
        <div className={cn(
          "overflow-y-auto p-4 lg:p-6 space-y-2",
          selectedSale
            ? "flex-1 lg:w-[55%] lg:flex-none lg:border-r lg:border-border pb-[60vh] lg:pb-6"
            : "flex-1"
        )}>
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="w-14 h-14 rounded-2xl bg-secondary flex items-center justify-center mb-4">
                <ReceiptText className="w-6 h-6 text-muted-foreground/40" aria-hidden />
              </div>
              <p className="text-sm font-semibold text-foreground">
                {searchTrimmed
                  ? "No matching sales"
                  : filter === "voided"
                  ? "No voided sales"
                  : filter === "refunded"
                  ? "No refunds yet"
                  : filter === "completed"
                  ? "No completed sales"
                  : "No sales"}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {searchTrimmed ? `Nothing matched "${search}"` : "Try a different filter"}
              </p>
              {searchTrimmed && (
                <button onClick={() => setSearch("")} className="mt-3 text-xs text-primary hover:underline font-medium">
                  Clear search
                </button>
              )}
            </div>
          ) : (
            <>
              <p className="text-[10px] text-muted-foreground/40 font-bold uppercase tracking-[0.12em] pb-1">
                {filtered.length} {filtered.length === 1 ? "sale" : "sales"}
                {searchTrimmed ? ` for "${search}"` : ""}
                {totalPages > 1 && (
                  <span> · {currentPage * PAGE_SIZE + 1}–{Math.min((currentPage + 1) * PAGE_SIZE, filtered.length)}</span>
                )}
              </p>
              {pagedSales.map((sale) => (
                <SaleCard
                  key={sale.id}
                  sale={sale}
                  isSelected={selectedId === sale.id}
                  onSelect={() => handleSelect(sale)}
                />
              ))}
              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between gap-2 pt-3 pb-1">
                  <button
                    onClick={() => { setCurrentPage((p) => p - 1); setSelectedId(null); }}
                    disabled={currentPage === 0}
                    aria-label="Previous page"
                    className="flex items-center gap-1.5 h-11 px-4 rounded-xl border border-border text-sm font-semibold text-muted-foreground hover:bg-secondary hover:text-foreground disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  >
                    <ChevronLeft className="w-4 h-4" aria-hidden />
                    Prev
                  </button>
                  <span className="text-xs text-muted-foreground tabular-nums">
                    {currentPage + 1} / {totalPages}
                  </span>
                  <button
                    onClick={() => { setCurrentPage((p) => p + 1); setSelectedId(null); }}
                    disabled={currentPage >= totalPages - 1}
                    aria-label="Next page"
                    className="flex items-center gap-1.5 h-11 px-4 rounded-xl border border-border text-sm font-semibold text-muted-foreground hover:bg-secondary hover:text-foreground disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  >
                    Next
                    <ChevronRight className="w-4 h-4" aria-hidden />
                  </button>
                </div>
              )}
            </>
          )}
        </div>

        {/* Refund panel */}
        {selectedSale && (
          <>
            {/* Desktop: right column */}
            <div className="hidden lg:flex lg:flex-col lg:w-[45%] lg:overflow-hidden">
              <RefundPanel
                sale={selectedSale}
                onClose={() => setSelectedId(null)}
                onDone={showToast}
              />
            </div>

            {/* Mobile: bottom sheet */}
            <div className="lg:hidden fixed inset-0 z-40 flex flex-col justify-end">
              <div
                className="absolute inset-0 bg-black/40 backdrop-blur-sm"
                onClick={() => setSelectedId(null)}
              />
              <div className="relative z-50 bg-card rounded-t-2xl shadow-2xl flex flex-col max-h-[88dvh]">
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
          aria-live="polite"
          className={cn(
            "fixed bottom-5 left-1/2 -translate-x-1/2 z-[100] flex items-center gap-2.5 rounded-2xl px-5 py-3 text-sm font-semibold shadow-xl animate-page-enter whitespace-nowrap",
            toast.type === "success" ? "bg-success text-white" : "bg-warning text-white"
          )}
        >
          <CheckCircle2 className="w-4 h-4 shrink-0" aria-hidden />
          {toast.msg}
        </div>
      )}
    </div>
  );
}
