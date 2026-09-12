"use client";

import { useState } from "react";
import { Plus, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatCurrency } from "@/lib/utils";
import type { Supplier, Product } from "@/lib/types";

interface PurchaseFormDialogProps {
  suppliers: Supplier[];
  products: Product[];
  onClose: () => void;
  onSave: (data: PurchaseFormData) => Promise<void>;
}

interface PurchaseFormData {
  supplier_id: string;
  notes: string | null;
  items: Array<{
    product_id: string;
    quantity: number;
    cost_price: number;
    expiry_date: string | null;
  }>;
}

interface LineItem {
  product_id: string;
  quantity: number;
  cost_price: number;
  expiry_date: string | null;
}

const blankItem = (): LineItem => ({
  product_id: "",
  quantity: 1,
  cost_price: 0,
  expiry_date: null,
});

export function PurchaseFormDialog({
  suppliers,
  products,
  onClose,
  onSave,
}: PurchaseFormDialogProps) {
  const [supplierId, setSupplierId] = useState("");
  const [notes, setNotes] = useState("");
  const [items, setItems] = useState<LineItem[]>([blankItem()]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const activeProducts = products.filter((p) => p.is_active);

  const updateItem = <K extends keyof LineItem>(
    index: number,
    field: K,
    value: LineItem[K]
  ) => {
    setItems((prev) =>
      prev.map((item, i) => (i === index ? { ...item, [field]: value } : item))
    );
  };

  const addItem = () => setItems((prev) => [...prev, blankItem()]);

  const removeItem = (index: number) =>
    setItems((prev) => prev.filter((_, i) => i !== index));

  const lineTotal = (item: LineItem) => item.quantity * item.cost_price;

  const grandTotal = items.reduce((sum, item) => sum + lineTotal(item), 0);

  const handleSubmit = async () => {
    setError("");

    if (!supplierId) {
      setError("Please select a supplier.");
      return;
    }

    if (items.length === 0) {
      setError("Add at least one item.");
      return;
    }

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (!item.product_id) {
        setError(`Line ${i + 1}: please select a product.`);
        return;
      }
      if (item.quantity <= 0) {
        setError(`Line ${i + 1}: quantity must be greater than 0.`);
        return;
      }
    }

    setSubmitting(true);
    try {
      await onSave({
        supplier_id: supplierId,
        notes: notes.trim() || null,
        items: items.map((item) => ({
          product_id: item.product_id,
          quantity: item.quantity,
          cost_price: item.cost_price,
          expiry_date: item.expiry_date || null,
        })),
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to record purchase.");
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-card rounded-2xl shadow-2xl w-full max-w-2xl mx-4 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border shrink-0">
          <h2 className="text-lg font-semibold text-foreground">New Purchase</h2>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto flex-1 px-6 py-4 space-y-5">
          {/* Section 1 — Supplier & Notes */}
          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-muted-foreground">
                Supplier <span className="text-red-500">*</span>
              </label>
              <select
                value={supplierId}
                onChange={(e) => setSupplierId(e.target.value)}
                className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="">Select supplier…</option>
                {suppliers.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-muted-foreground">
                Notes
              </label>
              <textarea
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Optional notes…"
                className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground shadow-sm placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary resize-none"
              />
            </div>
          </div>

          {/* Section 2 — Line Items */}
          <div className="space-y-3">
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead>
                  <tr>
                    {[
                      "Product",
                      "Qty",
                      "Cost/Unit (GH₵)",
                      "Expiry",
                      "Total",
                      "",
                    ].map((heading) => (
                      <th
                        key={heading}
                        className="pb-2 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground pr-3 last:pr-0"
                      >
                        {heading}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {items.map((item, index) => (
                    <tr key={index} className="align-top">
                      {/* Product */}
                      <td className="py-2 pr-3 min-w-[160px]">
                        <select
                          value={item.product_id}
                          onChange={(e) =>
                            updateItem(index, "product_id", e.target.value)
                          }
                          className="w-full rounded-lg border border-border bg-card px-2.5 py-1.5 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                        >
                          <option value="">Select…</option>
                          {activeProducts.map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.name}
                            </option>
                          ))}
                        </select>
                      </td>

                      {/* Qty */}
                      <td className="py-2 pr-3 w-24">
                        <Input
                          type="number"
                          step="0.001"
                          min="0.001"
                          value={item.quantity}
                          onChange={(e) =>
                            updateItem(
                              index,
                              "quantity",
                              parseFloat(e.target.value) || 0
                            )
                          }
                          className="h-9 text-sm"
                        />
                      </td>

                      {/* Cost/Unit */}
                      <td className="py-2 pr-3 w-28">
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          value={item.cost_price}
                          onChange={(e) =>
                            updateItem(
                              index,
                              "cost_price",
                              parseFloat(e.target.value) || 0
                            )
                          }
                          className="h-9 text-sm"
                        />
                      </td>

                      {/* Expiry */}
                      <td className="py-2 pr-3 w-36">
                        <Input
                          type="date"
                          value={item.expiry_date ?? ""}
                          onChange={(e) =>
                            updateItem(
                              index,
                              "expiry_date",
                              e.target.value || null
                            )
                          }
                          className="h-9 text-sm"
                        />
                      </td>

                      {/* Total */}
                      <td className="py-2 pr-3 w-28">
                        <div className="flex h-9 items-center text-sm font-medium text-foreground tabular-nums">
                          {formatCurrency(lineTotal(item))}
                        </div>
                      </td>

                      {/* Remove */}
                      <td className="py-2 w-8">
                        {items.length > 1 && (
                          <button
                            onClick={() => removeItem(index)}
                            className="flex h-9 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-red-50 hover:text-red-500"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <button
              onClick={addItem}
              className="flex items-center gap-2 text-sm font-medium text-primary hover:text-primary/80 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Add Item
            </button>
          </div>

          {error && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
              {error}
            </p>
          )}
        </div>

        {/* Footer */}
        <div className="shrink-0 border-t border-border px-6 py-4 flex justify-between items-center">
          <div className="text-foreground">
            <span className="text-sm text-muted-foreground mr-2">Total:</span>
            <span className="text-xl font-bold tabular-nums">
              {formatCurrency(grandTotal)}
            </span>
          </div>
          <div className="flex gap-3">
            <Button variant="outline" onClick={onClose} disabled={submitting}>
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={submitting}
              className="bg-primary hover:bg-primary/90 text-primary-foreground"
            >
              {submitting ? "Saving…" : "Record Purchase"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
