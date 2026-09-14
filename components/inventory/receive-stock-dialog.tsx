"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Product, Supplier } from "@/lib/types";
import { cn } from "@/lib/utils";

interface ReceiveStockData {
  product_id: string;
  supplier_id: string | null;
  quantity_received: number;
  cost_price: number;
  expiry_date: string | null;
  received_date: string;
  notes: string | null;
}

interface ReceiveStockDialogProps {
  products: Product[];
  suppliers: Pick<Supplier, "id" | "name">[];
  onClose: () => void;
  onSave: (data: ReceiveStockData) => Promise<void>;
  defaultProductId?: string;
}

const TODAY = new Date().toISOString().split("T")[0];

const SELECT_CLASS = cn(
  "flex h-10 w-full rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground",
  "focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent",
  "disabled:cursor-not-allowed disabled:opacity-50"
);

function getDefaultForm(defaultProductId?: string): ReceiveStockData {
  return {
    product_id: defaultProductId ?? "",
    supplier_id: null,
    quantity_received: 0,
    cost_price: 0,
    expiry_date: null,
    received_date: TODAY,
    notes: null,
  };
}

export function ReceiveStockDialog({
  products,
  suppliers,
  onClose,
  onSave,
  defaultProductId,
}: ReceiveStockDialogProps) {
  const [form, setForm] = useState<ReceiveStockData>(() =>
    getDefaultForm(defaultProductId)
  );
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const activeProducts = products.filter((p) => p.is_active);

  function set<K extends keyof ReceiveStockData>(key: K, value: ReceiveStockData[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await onSave(form);
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
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={handleBackdropClick}
    >
      <div className="w-full max-w-md mx-4 bg-card rounded-2xl shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-border">
          <h2 className="text-base font-semibold text-foreground">Receive Stock</h2>
          <button
            onClick={onClose}
            aria-label="Close dialog"
            className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Form body — scrollable */}
        <form
          id="receive-stock-form"
          onSubmit={handleSubmit}
          className="flex-1 overflow-y-auto px-6 py-5 space-y-4"
        >
          {/* Product */}
          <div className="space-y-1.5">
            <label className="block text-xs font-medium text-muted-foreground">
              Product <span className="text-destructive">*</span>
            </label>
            <select
              required
              value={form.product_id}
              onChange={(e) => set("product_id", e.target.value)}
              className={SELECT_CLASS}
            >
              <option value="" disabled>Select a product…</option>
              {activeProducts.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>

          {/* Supplier */}
          <div className="space-y-1.5">
            <label className="block text-xs font-medium text-muted-foreground">
              Supplier
            </label>
            <select
              value={form.supplier_id ?? ""}
              onChange={(e) => set("supplier_id", e.target.value || null)}
              className={SELECT_CLASS}
            >
              <option value="">No supplier / walk-in purchase</option>
              {suppliers.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>

          {/* Quantity Received */}
          <div className="space-y-1.5">
            <label className="block text-xs font-medium text-muted-foreground">
              Quantity Received <span className="text-destructive">*</span>
            </label>
            <Input
              required
              type="number"
              min={0.001}
              step={0.001}
              value={form.quantity_received === 0 ? "" : form.quantity_received}
              onChange={(e) => set("quantity_received", parseFloat(e.target.value) || 0)}
              placeholder="0.000"
            />
          </div>

          {/* Cost Price per Unit */}
          <div className="space-y-1.5">
            <label className="block text-xs font-medium text-muted-foreground">
              Cost Price per Unit (GH₵) <span className="text-destructive">*</span>
            </label>
            <Input
              required
              type="number"
              min={0}
              step={0.01}
              value={form.cost_price === 0 ? "" : form.cost_price}
              onChange={(e) => set("cost_price", parseFloat(e.target.value) || 0)}
              placeholder="0.00"
            />
          </div>

          {/* Received Date */}
          <div className="space-y-1.5">
            <label className="block text-xs font-medium text-muted-foreground">
              Received Date <span className="text-destructive">*</span>
            </label>
            <Input
              required
              type="date"
              value={form.received_date}
              onChange={(e) => set("received_date", e.target.value)}
            />
          </div>

          {/* Expiry Date (optional) */}
          <div className="space-y-1.5">
            <label className="block text-xs font-medium text-muted-foreground">
              Expiry Date (optional)
            </label>
            <Input
              type="date"
              value={form.expiry_date ?? ""}
              onChange={(e) => set("expiry_date", e.target.value || null)}
            />
          </div>

          {/* Notes (optional) */}
          <div className="space-y-1.5">
            <label className="block text-xs font-medium text-muted-foreground">
              Notes (optional)
            </label>
            <textarea
              rows={3}
              value={form.notes ?? ""}
              onChange={(e) => set("notes", e.target.value || null)}
              placeholder="e.g. Supplier invoice #1234"
              className={cn(
                "flex w-full rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground resize-none",
                "focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent",
                "disabled:cursor-not-allowed disabled:opacity-50"
              )}
            />
          </div>

          {/* Error */}
          {error && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-xs font-medium text-red-600">
              {error}
            </p>
          )}
        </form>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-border">
          <Button type="button" variant="outline" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button type="submit" form="receive-stock-form" disabled={submitting}>
            {submitting ? "Saving…" : "Receive Stock"}
          </Button>
        </div>
      </div>
    </div>
  );
}
