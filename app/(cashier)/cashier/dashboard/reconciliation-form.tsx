"use client";

import { useState } from "react";
import { X, Calculator } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn, formatCurrency } from "@/lib/utils";
import { saveReconciliation } from "./actions";

interface ReconciliationFormProps {
  /** Today's cash sales total (pre-calculated on the server and passed as a prop) */
  cashSalesTotal: number;
  onClose: () => void;
  onSuccess: () => void;
}

const LABEL_CLASS =
  "text-xs font-bold text-muted-foreground uppercase tracking-widest";

const TEXTAREA_CLASS = cn(
  "flex w-full rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground resize-none",
  "focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent",
  "disabled:cursor-not-allowed disabled:opacity-50"
);

export function ReconciliationForm({
  cashSalesTotal,
  onClose,
  onSuccess,
}: ReconciliationFormProps) {
  const [openingFloat, setOpeningFloat] = useState("");
  const [cashCounted, setCashCounted] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const cashCountedNum = parseFloat(cashCounted) || 0;
  const openingFloatNum = parseFloat(openingFloat) || 0;
  // Expected = cash from sales (does not include opening float in variance calc)
  const expectedCash = cashSalesTotal;
  const variance = cashCountedNum - expectedCash;
  const hasValues = cashCounted !== "" && openingFloat !== "";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (openingFloatNum < 0) {
      setError("Opening float cannot be negative.");
      return;
    }
    if (cashCountedNum < 0) {
      setError("Cash counted cannot be negative.");
      return;
    }

    setSaving(true);
    const res = await saveReconciliation({
      opening_float: openingFloatNum,
      cash_counted: cashCountedNum,
      notes,
    });
    setSaving(false);

    if (res.error) {
      setError(res.error);
      return;
    }

    onSuccess();
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
          <div className="flex items-center gap-2">
            <Calculator className="h-4 w-4 text-primary" aria-hidden />
            <h2 className="text-base font-semibold text-foreground">
              End of Day Reconciliation
            </h2>
          </div>
          <button
            onClick={onClose}
            aria-label="Close dialog"
            className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Form body */}
        <form
          id="reconciliation-form"
          onSubmit={handleSubmit}
          className="flex-1 overflow-y-auto px-6 py-5 space-y-5"
        >
          {/* Opening Float */}
          <div className="space-y-1.5">
            <label className={LABEL_CLASS}>Opening Float (GHS)</label>
            <Input
              required
              type="number"
              min={0}
              step={0.01}
              placeholder="0.00"
              value={openingFloat}
              onChange={(e) => setOpeningFloat(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Cash in the drawer at the start of your shift
            </p>
          </div>

          {/* Cash Counted */}
          <div className="space-y-1.5">
            <label className={LABEL_CLASS}>Cash Counted (GHS)</label>
            <Input
              required
              type="number"
              min={0}
              step={0.01}
              placeholder="0.00"
              value={cashCounted}
              onChange={(e) => setCashCounted(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Actual cash in the drawer right now
            </p>
          </div>

          {/* Auto-calculated summary */}
          <div className="rounded-xl border border-border bg-secondary/40 px-4 py-3 space-y-2">
            <p className={LABEL_CLASS}>Summary</p>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Expected cash (sales)</span>
              <span className="font-semibold tabular-nums text-foreground">
                {formatCurrency(expectedCash)}
              </span>
            </div>
            {hasValues && (
              <>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Cash counted</span>
                  <span className="font-semibold tabular-nums text-foreground">
                    {formatCurrency(cashCountedNum)}
                  </span>
                </div>
                <div className="flex justify-between text-sm border-t border-border pt-2 mt-1">
                  <span className="font-semibold text-foreground">Variance</span>
                  <span
                    className={cn(
                      "font-bold tabular-nums",
                      variance === 0
                        ? "text-success"
                        : variance > 0
                        ? "text-success"
                        : "text-destructive"
                    )}
                  >
                    {variance >= 0 ? "+" : ""}
                    {formatCurrency(variance)}
                  </span>
                </div>
              </>
            )}
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <label className={LABEL_CLASS}>Notes (optional)</label>
            <textarea
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Float was short due to change given"
              className={TEXTAREA_CLASS}
            />
          </div>

          {/* Error */}
          {error && (
            <p className="rounded-lg bg-destructive/8 px-3 py-2 text-xs font-medium text-destructive">
              {error}
            </p>
          )}
        </form>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-border">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={saving}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            form="reconciliation-form"
            disabled={saving}
          >
            {saving ? "Saving…" : "Submit EOD"}
          </Button>
        </div>
      </div>
    </div>
  );
}
