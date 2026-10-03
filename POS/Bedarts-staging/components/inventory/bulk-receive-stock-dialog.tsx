"use client";

import { useState } from "react";
import { X, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Product, Supplier } from "@/lib/types";
import { cn } from "@/lib/utils";

const WALKIN_SUPPLIER_ID = "00000000-0000-4000-8000-000000000001";

const PAYMENT_METHODS = [
  { value: "cash", label: "Cash" },
  { value: "momo", label: "MoMo" },
  { value: "pos_machine", label: "POS Machine" },
  { value: "bank_transfer", label: "Bank Transfer" },
] as const;

interface LineItem {
  key: string;
  product_id: string;
  boxes: number;
  box_size: number;   // units per box for THIS delivery (may differ from product default)
  cost_per_box: number;
}

export interface BulkReceiveData {
  supplier_id: string;
  payment_method: string;
  received_date: string;
  notes: string | null;
  items: Array<{
    product_id: string;
    quantity_received: number; // total units (boxes × box_size)
    cost_price: number;        // GH₵ per unit (cost_per_box ÷ box_size)
  }>;
}

interface Props {
  products: Product[];
  suppliers: Pick<Supplier, "id" | "name">[];
  onClose: () => void;
  onSave: (data: BulkReceiveData) => Promise<void>;
  pickupSummary?: Record<string, { alreadyDeducted: number; awaiting: number }>;
}

const SELECT_CLASS = cn(
  "flex h-10 w-full rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground",
  "focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent",
  "disabled:cursor-not-allowed disabled:opacity-50"
);

function newLine(): LineItem {
  return { key: crypto.randomUUID(), product_id: "", boxes: 0, box_size: 10, cost_per_box: 0 };
}

export function BulkReceiveStockDialog({ products, suppliers, onClose, onSave, pickupSummary = {} }: Props) {
  const today = new Date().toISOString().split("T")[0];
  const [supplierId, setSupplierId] = useState(WALKIN_SUPPLIER_ID);
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [receivedDate, setReceivedDate] = useState(today);
  const [notes, setNotes] = useState("");
  const [lines, setLines] = useState<LineItem[]>([newLine()]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const activeProducts = products.filter((p) => p.is_active);

  function getProduct(id: string): Product | undefined {
    return activeProducts.find((p) => p.id === id);
  }

  function updateLine<K extends keyof LineItem>(key: string, field: K, value: LineItem[K]) {
    setLines((prev) => prev.map((l) => (l.key === key ? { ...l, [field]: value } : l)));
  }

  function selectProduct(lineKey: string, productId: string) {
    const product = activeProducts.find((p) => p.id === productId);
    setLines((prev) =>
      prev.map((l) =>
        l.key === lineKey
          ? { ...l, product_id: productId, box_size: product?.units_per_box ?? l.box_size }
          : l
      )
    );
  }

  function addLine() {
    setLines((prev) => [...prev, newLine()]);
  }

  function removeLine(key: string) {
    if (lines.length === 1) return;
    setLines((prev) => prev.filter((l) => l.key !== key));
  }

  // Derived totals — all calculations use the per-line box_size, not the product default
  const lineStats = lines.map((l) => {
    const product = getProduct(l.product_id);
    const unit = product?.unit ?? "kg";
    const unitLabel = unit === "kg" ? "kg" : "pcs";
    const totalUnits = l.boxes * l.box_size;
    const costPerUnit = l.box_size > 0 ? l.cost_per_box / l.box_size : 0;
    const totalCost = l.boxes * l.cost_per_box;
    return { unit, unitLabel, totalUnits, costPerUnit, totalCost };
  });

  const grandTotal = lineStats.reduce((s, r) => s + r.totalCost, 0);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    for (let i = 0; i < lines.length; i++) {
      const l = lines[i];
      const label = lines.length > 1 ? `Line ${i + 1}` : "Product";
      if (!l.product_id) { setError(`${label}: select a product.`); return; }
      if (l.boxes <= 0) { setError(`${label}: number of boxes must be greater than 0.`); return; }
      if (l.box_size <= 0) { setError(`${label}: box size must be greater than 0.`); return; }
      if (l.cost_per_box <= 0) { setError(`${label}: cost per box must be greater than 0.`); return; }
    }

    setSubmitting(true);
    try {
      await onSave({
        supplier_id: supplierId,
        payment_method: paymentMethod,
        received_date: receivedDate,
        notes: notes.trim() || null,
        items: lines.map((l, i) => ({
          product_id: l.product_id,
          quantity_received: lineStats[i].totalUnits,
          cost_price: lineStats[i].costPerUnit,
        })),
      });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Try again.");
    } finally {
      setSubmitting(false);
    }
  }

  function handleBackdropClick(e: React.MouseEvent<HTMLDivElement>) {
    if (e.target === e.currentTarget) onClose();
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/50 overflow-y-auto py-8 px-4"
      onClick={handleBackdropClick}
    >
      <div className="w-full max-w-3xl bg-card rounded-2xl shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-border shrink-0">
          <h2 className="text-base font-semibold text-foreground">Receive Stock</h2>
          <button onClick={onClose} aria-label="Close" className="rounded-lg p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>

        <form id="bulk-receive-form" onSubmit={handleSubmit}>
          {/* Delivery header */}
          <div className="px-6 py-5 grid grid-cols-1 sm:grid-cols-3 gap-4 border-b border-border">
            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-muted-foreground">Supplier <span className="text-destructive">*</span></label>
              <select value={supplierId} onChange={(e) => setSupplierId(e.target.value)} className={SELECT_CLASS}>
                {suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-muted-foreground">Payment Method <span className="text-destructive">*</span></label>
              <select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)} className={SELECT_CLASS}>
                {PAYMENT_METHODS.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-muted-foreground">Received Date <span className="text-destructive">*</span></label>
              <Input type="date" value={receivedDate} onChange={(e) => setReceivedDate(e.target.value)} />
            </div>
            <div className="space-y-1.5 sm:col-span-3">
              <label className="block text-xs font-medium text-muted-foreground">Notes (optional)</label>
              <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="e.g. Invoice #1234" />
            </div>
          </div>

          {/* Line items */}
          <div className="px-6 py-5 space-y-3">
            {/* Column headers — desktop only */}
            <div className="hidden sm:grid grid-cols-[1fr_72px_80px_110px_108px_36px] gap-3 px-1">
              <span className="text-xs font-medium text-muted-foreground">Product</span>
              <span className="text-xs font-medium text-muted-foreground">Boxes</span>
              <span className="text-xs font-medium text-muted-foreground">Box size</span>
              <span className="text-xs font-medium text-muted-foreground">Cost / box (GH₵)</span>
              <span className="text-xs font-medium text-muted-foreground">Summary</span>
              <span />
            </div>

            {lines.map((line, idx) => {
              const { unitLabel, totalUnits, costPerUnit, totalCost } = lineStats[idx];
              const pu = line.product_id ? pickupSummary[line.product_id] : undefined;
              return (
                <div key={line.key} className="space-y-2">
                  {pu && pu.alreadyDeducted > 0 && (
                    <div className="rounded-lg border border-warning/30 bg-warning/5 px-3 py-2 text-xs text-foreground">
                      <span className="font-bold text-warning">⚠ {pu.alreadyDeducted}{unitLabel} pre-paid pickup</span>{" "}
                      already deducted from stock. If this line will fulfill it, enter only what&apos;s new to shop.
                    </div>
                  )}
                  {pu && pu.awaiting > 0 && (
                    <div className="rounded-lg border border-accent/30 bg-accent/5 px-3 py-2 text-xs text-foreground">
                      <span className="font-bold text-accent">i {pu.awaiting}{unitLabel} pending pickup</span>{" "}
                      will deduct on delivery — enter full received quantity here.
                    </div>
                  )}

                  {/* Mobile card layout */}
                  <div className="sm:hidden rounded-xl border border-border bg-secondary/30 p-3 space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <select
                        aria-label={`Product for line ${idx + 1}`}
                        value={line.product_id}
                        onChange={(e) => selectProduct(line.key, e.target.value)}
                        className={cn(SELECT_CLASS, "flex-1")}
                      >
                        <option value="" disabled>Select product…</option>
                        {activeProducts.map((p) => (
                          <option key={p.id} value={p.id}>{p.name}</option>
                        ))}
                      </select>
                      <button
                        type="button"
                        onClick={() => removeLine(line.key)}
                        disabled={lines.length === 1}
                        aria-label="Remove line"
                        className="flex items-center justify-center h-10 w-9 rounded-lg text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors disabled:opacity-30 disabled:cursor-not-allowed shrink-0"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      <div className="space-y-1">
                        <label className="text-xs font-medium text-muted-foreground">Boxes</label>
                        <Input
                          type="number" min={1} step={1}
                          aria-label={`Boxes for line ${idx + 1}`}
                          value={line.boxes === 0 ? "" : line.boxes}
                          onChange={(e) => updateLine(line.key, "boxes", parseInt(e.target.value) || 0)}
                          placeholder="0"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-medium text-muted-foreground">Box size</label>
                        <Input
                          type="number" min={1} step={1}
                          aria-label={`Box size for line ${idx + 1}`}
                          value={line.box_size === 0 ? "" : line.box_size}
                          onChange={(e) => updateLine(line.key, "box_size", parseFloat(e.target.value) || 0)}
                          placeholder="10"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-medium text-muted-foreground">Cost / box</label>
                        <Input
                          type="number" min={0} step={0.01}
                          aria-label={`Cost per box for line ${idx + 1}`}
                          value={line.cost_per_box === 0 ? "" : line.cost_per_box}
                          onChange={(e) => updateLine(line.key, "cost_per_box", parseFloat(e.target.value) || 0)}
                          placeholder="0.00"
                        />
                      </div>
                    </div>
                    {line.product_id && line.boxes > 0 && line.cost_per_box > 0 && (
                      <div className="flex items-center gap-3 rounded-lg bg-primary/5 border border-primary/10 px-3 py-2 text-xs">
                        <span className="font-semibold text-foreground">{totalUnits} {unitLabel}</span>
                        <span className="text-muted-foreground">GH₵{costPerUnit.toFixed(2)}/{unitLabel}</span>
                        <span className="ml-auto font-semibold text-foreground">GH₵{totalCost.toLocaleString("en-GH")}</span>
                      </div>
                    )}
                  </div>

                  {/* Desktop table row */}
                  <div className="hidden sm:grid grid-cols-[1fr_72px_80px_110px_108px_36px] gap-3 items-center">
                    <select
                      aria-label={`Product for line ${idx + 1}`}
                      value={line.product_id}
                      onChange={(e) => selectProduct(line.key, e.target.value)}
                      className={SELECT_CLASS}
                    >
                      <option value="" disabled>Select product…</option>
                      {activeProducts.map((p) => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                      ))}
                    </select>

                    <Input
                      type="number" min={1} step={1}
                      aria-label={`Boxes for line ${idx + 1}`}
                      value={line.boxes === 0 ? "" : line.boxes}
                      onChange={(e) => updateLine(line.key, "boxes", parseInt(e.target.value) || 0)}
                      placeholder="0"
                    />

                    <Input
                      type="number" min={1} step={1}
                      aria-label={`Box size for line ${idx + 1}`}
                      value={line.box_size === 0 ? "" : line.box_size}
                      onChange={(e) => updateLine(line.key, "box_size", parseFloat(e.target.value) || 0)}
                      placeholder="10"
                    />

                    <Input
                      type="number" min={0} step={0.01}
                      aria-label={`Cost per box for line ${idx + 1}`}
                      value={line.cost_per_box === 0 ? "" : line.cost_per_box}
                      onChange={(e) => updateLine(line.key, "cost_per_box", parseFloat(e.target.value) || 0)}
                      placeholder="0.00"
                    />

                    {/* Computed summary */}
                    <div className="text-xs text-muted-foreground leading-snug">
                      {line.product_id && line.boxes > 0 && line.cost_per_box > 0 ? (
                        <>
                          <span className="block font-medium text-foreground">{totalUnits} {unitLabel} total</span>
                          <span>GH₵{costPerUnit.toFixed(2)}/{unitLabel} · GH₵{totalCost.toLocaleString("en-GH")}</span>
                        </>
                      ) : (
                        <span>—</span>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => removeLine(line.key)}
                      disabled={lines.length === 1}
                      aria-label="Remove line"
                      className="flex items-center justify-center h-10 w-9 rounded-lg text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              );
            })}

            <button
              type="button"
              onClick={addLine}
              className="flex items-center gap-1.5 text-xs font-medium text-primary hover:text-primary/80 transition-colors mt-1"
            >
              <Plus className="h-3.5 w-3.5" />
              Add product
            </button>
          </div>

          {error && (
            <div className="px-6 pb-4">
              <p className="rounded-lg bg-destructive/8 px-3 py-2 text-xs font-medium text-destructive">{error}</p>
            </div>
          )}
        </form>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-border shrink-0">
          <p className="text-sm text-muted-foreground">
            Total: <span className="font-semibold text-foreground">GH₵ {grandTotal.toLocaleString("en-GH", { minimumFractionDigits: 2 })}</span>
            <span className="ml-2 text-xs">({lines.length} line{lines.length !== 1 ? "s" : ""})</span>
          </p>
          <div className="flex items-center gap-2">
            <Button type="button" variant="outline" onClick={onClose} disabled={submitting}>Cancel</Button>
            <Button type="submit" form="bulk-receive-form" disabled={submitting}>
              {submitting ? "Saving…" : "Receive Stock"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
