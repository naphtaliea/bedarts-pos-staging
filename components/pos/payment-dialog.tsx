"use client";

import { useState } from "react";
import { X, Plus, Trash2, CreditCard, Smartphone, Banknote, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatCurrency } from "@/lib/utils";
import type { PaymentMethod, PaymentEntry } from "@/lib/types";

interface PaymentDialogProps {
  total: number;
  onConfirm: (payments: PaymentEntry[]) => Promise<void>;
  onClose: () => void;
}

const METHODS: { key: PaymentMethod; label: string; icon: React.ElementType; needsRef: boolean }[] = [
  { key: "cash", label: "Cash", icon: Banknote, needsRef: false },
  { key: "momo", label: "Mobile Money", icon: Smartphone, needsRef: true },
  { key: "pos_machine", label: "POS Machine", icon: CreditCard, needsRef: true },
];

export function PaymentDialog({ total, onConfirm, onClose }: PaymentDialogProps) {
  const [payments, setPayments] = useState<PaymentEntry[]>([
    { method: "cash", amount: total, reference: "" },
  ]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const totalPaid = payments.reduce((s, p) => s + (p.amount || 0), 0);
  const change = totalPaid - total;
  const isValid = totalPaid >= total;

  const addPayment = () => {
    const remaining = Math.max(0, total - totalPaid);
    setPayments((p) => [...p, { method: "cash", amount: remaining, reference: "" }]);
  };

  const update = (i: number, field: keyof PaymentEntry, value: string | number) => {
    setPayments((p) => p.map((entry, idx) => idx === i ? { ...entry, [field]: value } : entry));
  };

  const remove = (i: number) => setPayments((p) => p.filter((_, idx) => idx !== i));

  const handleConfirm = async () => {
    if (!isValid) { setError("Payment amount is less than total."); return; }
    for (const p of payments) {
      if (p.amount <= 0) { setError("All payment amounts must be greater than 0."); return; }
      const method = METHODS.find((m) => m.key === p.method);
      if (method?.needsRef && !p.reference.trim()) {
        setError(`Reference number is required for ${method.label}.`);
        return;
      }
    }
    setError("");
    setSubmitting(true);
    try {
      await onConfirm(payments);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to process sale.");
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
          <h2 className="text-lg font-semibold text-slate-900">Payment</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-6 py-4 space-y-4">
          {/* Total */}
          <div className="bg-slate-50 rounded-xl px-4 py-3 flex justify-between items-center">
            <span className="text-sm text-slate-600">Amount due</span>
            <span className="text-2xl font-bold text-slate-900">{formatCurrency(total)}</span>
          </div>

          {/* Payment rows */}
          <div className="space-y-3">
            {payments.map((p, i) => {
              const method = METHODS.find((m) => m.key === p.method)!;
              const Icon = method.icon;
              return (
                <div key={i} className="border border-slate-200 rounded-xl p-3 space-y-2">
                  <div className="flex items-center gap-2">
                    {/* Method selector */}
                    <div className="flex gap-1">
                      {METHODS.map((m) => {
                        const MIcon = m.icon;
                        return (
                          <button
                            key={m.key}
                            onClick={() => update(i, "method", m.key)}
                            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                              p.method === m.key
                                ? "bg-[#AB1509] text-white"
                                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                            }`}
                          >
                            <MIcon className="w-3.5 h-3.5" />
                            {m.label}
                          </button>
                        );
                      })}
                    </div>
                    {payments.length > 1 && (
                      <button onClick={() => remove(i)} className="ml-auto text-slate-300 hover:text-red-500">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  <div className="flex gap-2">
                    <div className="flex-1">
                      <label className="text-xs text-slate-500 mb-1 block">Amount (GH₵)</label>
                      <Input
                        type="number"
                        min={0}
                        step="0.01"
                        value={p.amount || ""}
                        onChange={(e) => update(i, "amount", parseFloat(e.target.value) || 0)}
                        className="h-9 text-sm"
                      />
                    </div>
                    {method.needsRef && (
                      <div className="flex-1">
                        <label className="text-xs text-slate-500 mb-1 block">
                          {p.method === "momo" ? "MoMo reference" : "Approval code"}
                        </label>
                        <Input
                          type="text"
                          value={p.reference}
                          onChange={(e) => update(i, "reference", e.target.value)}
                          placeholder={p.method === "momo" ? "e.g. 1234567890" : "e.g. 123456"}
                          className="h-9 text-sm"
                        />
                      </div>
                    )}
                  </div>

                  {/* Cash change */}
                  {p.method === "cash" && payments.length === 1 && p.amount > total && (
                    <div className="flex justify-between text-sm bg-green-50 rounded-lg px-3 py-2">
                      <span className="text-green-700">Change to give</span>
                      <span className="font-bold text-green-700">{formatCurrency(p.amount - total)}</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Split payment */}
          {payments.length < 3 && (
            <button
              onClick={addPayment}
              className="flex items-center gap-2 text-sm text-[#AB1509] hover:text-red-800 font-medium"
            >
              <Plus className="w-4 h-4" />
              Add payment method (split)
            </button>
          )}

          {/* Totals */}
          {payments.length > 1 && (
            <div className="bg-slate-50 rounded-xl px-4 py-3 space-y-1">
              <div className="flex justify-between text-sm text-slate-600">
                <span>Total paid</span>
                <span>{formatCurrency(totalPaid)}</span>
              </div>
              {change >= 0 && (
                <div className="flex justify-between text-sm font-medium text-green-700">
                  <span>Change</span>
                  <span>{formatCurrency(change)}</span>
                </div>
              )}
              {change < 0 && (
                <div className="flex justify-between text-sm font-medium text-red-600">
                  <span>Still owed</span>
                  <span>{formatCurrency(Math.abs(change))}</span>
                </div>
              )}
            </div>
          )}

          {error && (
            <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-3 px-6 py-4 border-t border-slate-200">
          <Button variant="outline" onClick={onClose} className="flex-1">Cancel</Button>
          <Button
            onClick={handleConfirm}
            disabled={submitting || !isValid}
            className="flex-1"
            size="lg"
          >
            {submitting ? "Processing…" : (
              <span className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4" />
                Confirm Sale
              </span>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
