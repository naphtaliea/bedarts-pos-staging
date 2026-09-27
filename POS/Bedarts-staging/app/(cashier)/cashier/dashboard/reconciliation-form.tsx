"use client";

import { useState } from "react";
import { X, Wallet, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { saveReconciliation } from "./actions";

interface ReconciliationFormProps {
  onClose: () => void;
  onSuccess: () => void;
}

export function ReconciliationForm({ onClose, onSuccess }: ReconciliationFormProps) {
  const [cashCounted, setCashCounted] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const cashCountedNum = parseFloat(cashCounted) || 0;
  const canSubmit = cashCounted !== "" && cashCountedNum >= 0;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (cashCountedNum < 0) {
      setError("Cash counted cannot be negative.");
      return;
    }

    if (!navigator.onLine) {
      setError("You're offline — please reconnect to submit.");
      return;
    }

    setSaving(true);
    let res: { error?: string };
    try {
      res = await saveReconciliation({ cash_counted: cashCountedNum, expenses: [] });
    } catch {
      setSaving(false);
      setError("Network error — check your connection and try again.");
      return;
    }
    setSaving(false);

    if (res.error) {
      setError(res.error);
      return;
    }

    onSuccess();
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm px-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="w-full max-w-sm bg-card rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-border">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center">
              <Wallet className="w-4 h-4 text-primary" aria-hidden />
            </div>
            <div>
              <h2 className="text-sm font-bold text-foreground">Cash Count</h2>
              <p className="text-[11px] text-muted-foreground">End of shift</p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="rounded-lg p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-5 py-5 space-y-4">
          <p className="text-sm text-muted-foreground">
            Count the physical cash in your drawer and enter the total below. Your shift will close after submission.
          </p>

          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.15em] block">
              Cash in drawer (GHS) <span className="text-destructive">*</span>
            </label>
            <Input
              required
              type="number"
              min={0}
              step={0.01}
              placeholder="0.00"
              value={cashCounted}
              onChange={(e) => setCashCounted(e.target.value)}
              autoFocus
              className="text-lg font-semibold h-12"
            />
          </div>

          {error && (
            <div role="alert" className={cn("rounded-xl bg-destructive/8 px-3 py-2.5 text-xs font-medium text-destructive")}>
              {error}
            </div>
          )}

          <div className="flex gap-2 pt-1">
            <Button type="button" variant="outline" onClick={onClose} disabled={saving} className="flex-1">
              Cancel
            </Button>
            <Button type="submit" disabled={saving || !canSubmit} className="flex-1 gap-2">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              {saving ? "Submitting…" : "Submit & End Shift"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
