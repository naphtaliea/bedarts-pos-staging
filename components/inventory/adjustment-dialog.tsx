"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Product } from "@/lib/types";
import { cn } from "@/lib/utils";

interface AdjustmentData {
  product_id: string;
  quantity_change: number;
  reason: "write_off" | "correction" | "return";
  notes: string | null;
}

interface AdjustmentDialogProps {
  products: Product[];
  onClose: () => void;
  onSave: (data: AdjustmentData) => Promise<void>;
}

type Reason = AdjustmentData["reason"];

interface ReasonOption {
  value: Reason;
  label: string;
  description: string;
  selectedClass: string;
}

const REASON_OPTIONS: ReasonOption[] = [
  {
    value: "write_off",
    label: "Write-Off",
    description: "Removes stock",
    selectedClass: "bg-orange-500 text-white border-orange-500",
  },
  {
    value: "correction",
    label: "Correction",
    description: "Adds stock",
    selectedClass: "bg-blue-700 text-white border-blue-700",
  },
  {
    value: "return",
    label: "Return",
    description: "Adds stock back",
    selectedClass: "bg-green-600 text-white border-green-600",
  },
];

const SELECT_CLASS = cn(
  "flex h-10 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900",
  "focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent",
  "disabled:cursor-not-allowed disabled:opacity-50"
);

const TEXTAREA_CLASS = cn(
  "flex w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 resize-none",
  "focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent",
  "disabled:cursor-not-allowed disabled:opacity-50"
);

interface FormState {
  product_id: string;
  reason: Reason;
  quantity: number;
  notes: string;
}

function getDefaultForm(): FormState {
  return {
    product_id: "",
    reason: "write_off",
    quantity: 0,
    notes: "",
  };
}

export function AdjustmentDialog({
  products,
  onClose,
  onSave,
}: AdjustmentDialogProps) {
  const [form, setForm] = useState<FormState>(getDefaultForm);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const activeProducts = products.filter((p) => p.is_active);

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const qty = form.quantity;
    if (!qty || qty <= 0) {
      setError("Quantity must be greater than zero.");
      return;
    }

    const quantity_change = form.reason === "write_off" ? -qty : qty;

    setSubmitting(true);
    try {
      await onSave({
        product_id: form.product_id,
        quantity_change,
        reason: form.reason,
        notes: form.notes.trim() || null,
      });
      onClose();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Something went wrong. Try again."
      );
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
      <div className="w-full max-w-md mx-4 bg-white rounded-2xl shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-slate-100">
          <h2 className="text-base font-semibold text-slate-900">
            Stock Adjustment
          </h2>
          <button
            onClick={onClose}
            aria-label="Close dialog"
            className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Form body */}
        <form
          id="adjustment-form"
          onSubmit={handleSubmit}
          className="flex-1 overflow-y-auto px-6 py-5 space-y-4"
        >
          {/* Product */}
          <div className="space-y-1.5">
            <label className="block text-xs font-medium text-slate-600">
              Product
            </label>
            <select
              required
              value={form.product_id}
              onChange={(e) => set("product_id", e.target.value)}
              className={SELECT_CLASS}
            >
              <option value="" disabled>
                Select a product…
              </option>
              {activeProducts.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          {/* Reason toggle */}
          <div className="space-y-1.5">
            <label className="block text-xs font-medium text-slate-600">
              Reason
            </label>
            <div className="flex gap-2">
              {REASON_OPTIONS.map(({ value, label, selectedClass }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => set("reason", value)}
                  className={cn(
                    "flex-1 py-1.5 rounded-lg text-xs font-semibold border transition-colors",
                    form.reason === value
                      ? selectedClass
                      : "bg-white border-slate-300 text-slate-600 hover:bg-slate-50"
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Quantity */}
          <div className="space-y-1.5">
            <label className="block text-xs font-medium text-slate-600">
              Quantity
            </label>
            <Input
              required
              type="number"
              min={0.001}
              step={0.001}
              value={form.quantity === 0 ? "" : form.quantity}
              onChange={(e) =>
                set("quantity", parseFloat(e.target.value) || 0)
              }
              placeholder="0.000"
            />
            <p className="text-xs text-slate-400">
              For write-offs, stock will be deducted. For corrections/returns,
              stock will be added.
            </p>
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <label className="block text-xs font-medium text-slate-600">
              Notes (optional)
            </label>
            <textarea
              rows={3}
              value={form.notes}
              onChange={(e) => set("notes", e.target.value)}
              placeholder="e.g. Damaged during delivery"
              className={TEXTAREA_CLASS}
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
        <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-slate-100">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={submitting}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            form="adjustment-form"
            disabled={submitting}
          >
            {submitting ? "Saving…" : "Save Adjustment"}
          </Button>
        </div>
      </div>
    </div>
  );
}
