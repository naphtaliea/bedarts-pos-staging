"use client";

import { useState } from "react";
import { X, Calculator } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { saveReconciliation } from "./actions";

interface ReconciliationFormProps {
  onClose: () => void;
  onSuccess: () => void;
}

const LABEL_CLASS =
  "text-xs font-bold text-muted-foreground uppercase tracking-widest";

export function ReconciliationForm({
  onClose,
  onSuccess,
}: ReconciliationFormProps) {
  const [cashCounted, setCashCounted] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const cashCountedNum = parseFloat(cashCounted) || 0;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (cashCountedNum < 0) {
      setError("Cash counted cannot be negative.");
      return;
    }

    if (!navigator.onLine) {
      setError("You're offline — please reconnect to submit your reconciliation.");
      return;
    }

    setSaving(true);
    let res: { error?: string };
    try {
      res = await saveReconciliation({ cash_counted: cashCountedNum });
    } catch {
      setSaving(false);
      setError("Network error — please check your connection and try again.");
      return;
    }
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
          className="flex-1 overflow-y-auto px-6 py-5 space-y-4"
        >
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
              autoFocus
            />
            <p className="text-xs text-muted-foreground">
              Total cash in the drawer right now
            </p>
          </div>

          {error && (
            <p className={cn(
              "rounded-lg bg-destructive/10 px-3 py-2 text-xs font-medium text-destructive"
            )}>
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
