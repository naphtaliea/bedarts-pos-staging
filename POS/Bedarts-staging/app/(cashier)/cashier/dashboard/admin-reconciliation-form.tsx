"use client";

import { useEffect, useState } from "react";
import { X, Calculator, Plus, Trash2, Loader2, UserCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn, formatCurrency } from "@/lib/utils";
import { saveReconciliation, getTodayCashierSubmissions } from "./actions";
import type { CashierSubmission } from "./actions";

interface ExpenseLine {
  key: string;
  description: string;
  amount: string;
}

interface Props {
  onClose: () => void;
  onSuccess: () => void;
  grossSales: number;
  cashSales: number;
  momoSales: number;
  posSales: number;
  todayExpenses: number;
}

function newLine(): ExpenseLine {
  return { key: crypto.randomUUID(), description: "", amount: "" };
}

const LABEL = "text-[10px] font-black text-muted-foreground uppercase tracking-[0.15em]";

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("en-GH", { hour: "2-digit", minute: "2-digit" });
}

export function AdminReconciliationForm({ onClose, onSuccess, grossSales, cashSales, momoSales, posSales, todayExpenses }: Props) {
  const [lines, setLines] = useState<ExpenseLine[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Cashier submissions
  const [submissions, setSubmissions] = useState<CashierSubmission[]>([]);
  const [loadingSubmissions, setLoadingSubmissions] = useState(true);

  useEffect(() => {
    getTodayCashierSubmissions().then((res) => {
      setSubmissions(res.submissions);
      setLoadingSubmissions(false);
    });
  }, []);

  const expensesTotal = lines.reduce((s, l) => s + (parseFloat(l.amount) || 0), 0);
  const netRevenue = grossSales - expensesTotal - todayExpenses;

  // Use the cashier's submitted values for the admin reconciliation record
  const lastSubmission = submissions.length > 0 ? submissions[submissions.length - 1] : null;
  const cashCountedForRecord = lastSubmission?.cash_counted ?? 0;
  const momoChangeForRecord = lastSubmission?.momo_change ?? 0;

  function updateLine(key: string, field: keyof ExpenseLine, value: string) {
    setLines(prev => prev.map(l => l.key === key ? { ...l, [field]: value } : l));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    for (const l of lines) {
      if (l.description.trim() && !l.amount) {
        setError("Enter an amount for every expense line."); return;
      }
      if (l.amount && !l.description.trim()) {
        setError("Enter a description for every expense line."); return;
      }
    }

    if (!navigator.onLine) {
      setError("You're offline — reconnect to submit."); return;
    }

    setSaving(true);
    const validLines = lines.filter(l => l.description.trim() && parseFloat(l.amount) > 0);
    const res = await saveReconciliation({
      cash_counted: cashCountedForRecord,
      momo_change: momoChangeForRecord,
      expenses: validLines.map(l => ({ description: l.description.trim(), amount: parseFloat(l.amount) })),
    }).catch(() => ({ error: "Network error — try again." }));
    setSaving(false);

    if (res.error) { setError(res.error); return; }
    onSuccess();
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/50 backdrop-blur-sm overflow-y-auto py-6 px-4"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="w-full max-w-md bg-card rounded-2xl shadow-2xl flex flex-col my-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-border shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center">
              <Calculator className="h-4 w-4 text-primary" aria-hidden />
            </div>
            <div>
              <h2 className="text-sm font-bold text-foreground">End of Day</h2>
              <p className="text-[11px] text-muted-foreground">Review cashier count, add expenses, confirm</p>
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

        <form id="admin-recon-form" onSubmit={handleSubmit}>
          {/* Cashier cash count — read-only */}
          <div className="px-5 py-4 border-b border-border space-y-2.5">
            <div className="flex items-center gap-1.5">
              <UserCheck className="w-3.5 h-3.5 text-muted-foreground" aria-hidden />
              <p className={LABEL}>Cashier Cash Count</p>
            </div>

            {loadingSubmissions ? (
              <div className="flex items-center gap-2 text-xs text-muted-foreground py-1">
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                Loading submissions…
              </div>
            ) : submissions.length === 0 ? (
              <div className="rounded-xl bg-warning/8 border border-warning/25 px-3 py-3">
                <p className="text-xs text-warning font-semibold">No cashier submission yet</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">The cashier must count cash and submit before you confirm.</p>
              </div>
            ) : (
              <div className="space-y-1.5">
                {submissions.map((s) => {
                  const variance = s.cash_counted - s.cash_expected;
                  return (
                    <div
                      key={s.cashier_id}
                      className="rounded-xl bg-success/8 border border-success/20 px-3 py-3"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-bold text-foreground">{s.cashier_name}</p>
                          <p className="text-[11px] text-muted-foreground mt-0.5">Submitted {formatTime(s.submitted_at)}</p>
                          {s.momo_change > 0 && (
                            <p className="text-[11px] text-muted-foreground mt-0.5">
                              MoMo change: <span className="tabular-nums font-semibold text-foreground">−{formatCurrency(s.momo_change)}</span>
                            </p>
                          )}
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-base font-bold tabular-nums text-foreground">{formatCurrency(s.cash_counted)}</p>
                          <p className={cn(
                            "text-[11px] tabular-nums font-semibold mt-0.5",
                            variance >= 0 ? "text-success" : "text-destructive"
                          )}>
                            {variance >= 0 ? "+" : ""}{formatCurrency(variance)} vs expected {formatCurrency(s.cash_expected)}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Today's revenue */}
          <div className="px-5 py-4 border-b border-border space-y-2">
            <p className={LABEL}>Today&apos;s Revenue</p>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="rounded-xl bg-secondary/60 px-3 py-2.5">
                <p className="text-[11px] text-muted-foreground">Cash expected</p>
                <p className="font-semibold tabular-nums mt-0.5">{formatCurrency(cashSales)}</p>
              </div>
              <div className="rounded-xl bg-secondary/60 px-3 py-2.5">
                <p className="text-[11px] text-muted-foreground">MoMo</p>
                <p className="font-semibold tabular-nums mt-0.5">{formatCurrency(momoSales)}</p>
              </div>
              <div className="rounded-xl bg-secondary/60 px-3 py-2.5">
                <p className="text-[11px] text-muted-foreground">POS Machine</p>
                <p className="font-semibold tabular-nums mt-0.5">{formatCurrency(posSales)}</p>
              </div>
              <div className="rounded-xl bg-primary/10 px-3 py-2.5">
                <p className="text-[11px] text-muted-foreground">Gross Total</p>
                <p className="font-bold tabular-nums text-primary mt-0.5">{formatCurrency(grossSales)}</p>
              </div>
            </div>
          </div>

          {/* Additional expenses */}
          <div className="px-5 py-4 space-y-3">
            <div className="flex items-center justify-between">
              <p className={LABEL}>Additional Expenses</p>
              {todayExpenses > 0 && (
                <span className="text-[11px] text-muted-foreground">{formatCurrency(todayExpenses)} already recorded</span>
              )}
            </div>

            {lines.length > 0 && (
              <div className="space-y-2">
                {lines.map((line) => (
                  <div key={line.key} className="flex gap-2 items-center">
                    <Input
                      placeholder="Description"
                      value={line.description}
                      onChange={e => updateLine(line.key, "description", e.target.value)}
                      className="flex-1 text-sm"
                    />
                    <Input
                      type="number"
                      min={0}
                      step={0.01}
                      placeholder="0.00"
                      value={line.amount}
                      onChange={e => updateLine(line.key, "amount", e.target.value)}
                      className="w-24 text-sm"
                    />
                    <button
                      type="button"
                      onClick={() => setLines(prev => prev.filter(l => l.key !== line.key))}
                      className="shrink-0 h-10 w-9 flex items-center justify-center rounded-xl text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <button
              type="button"
              onClick={() => setLines(prev => [...prev, newLine()])}
              className="flex items-center gap-1.5 text-xs font-medium text-primary hover:text-primary/80 transition-colors"
            >
              <Plus className="h-3.5 w-3.5" />
              Add expense
            </button>
          </div>

          {/* Net revenue summary */}
          <div className="mx-5 mb-4 rounded-xl bg-secondary/50 px-4 py-3 space-y-1.5 text-sm">
            <div className="flex justify-between text-muted-foreground">
              <span>Gross sales</span>
              <span className="tabular-nums">{formatCurrency(grossSales)}</span>
            </div>
            {todayExpenses > 0 && (
              <div className="flex justify-between text-muted-foreground">
                <span>Expenses (recorded)</span>
                <span className="tabular-nums text-destructive">−{formatCurrency(todayExpenses)}</span>
              </div>
            )}
            {expensesTotal > 0 && (
              <div className="flex justify-between text-muted-foreground">
                <span>Expenses (this form)</span>
                <span className="tabular-nums text-destructive">−{formatCurrency(expensesTotal)}</span>
              </div>
            )}
            <div className="flex justify-between font-semibold text-foreground pt-1.5 border-t border-border">
              <span>Net Revenue</span>
              <span className="tabular-nums">{formatCurrency(netRevenue)}</span>
            </div>
          </div>

          {error && (
            <div className="px-5 pb-4">
              <p className="rounded-xl bg-destructive/8 px-3 py-2.5 text-xs font-medium text-destructive">{error}</p>
            </div>
          )}
        </form>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-5 py-4 border-t border-border shrink-0">
          <Button type="button" variant="outline" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button
            type="submit"
            form="admin-recon-form"
            disabled={saving || submissions.length === 0}
            className="gap-2"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            {saving ? "Saving…" : "Confirm & Close Day"}
          </Button>
        </div>
      </div>
    </div>
  );
}
