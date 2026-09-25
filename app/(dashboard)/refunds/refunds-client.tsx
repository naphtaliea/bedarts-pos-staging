"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ReceiptText, AlertTriangle, CheckCircle2 } from "lucide-react";
import { SnowflakePattern } from "@/components/snowflake-pattern";
import { cn, formatCurrency } from "@/lib/utils";
import { voidSale } from "./actions";

interface RefundsClientProps {
  sales: any[];
}

const METHOD_LABELS: Record<string, string> = {
  cash: "Cash",
  momo: "MoMo",
  pos_machine: "POS",
};

function formatDateTime(d: string) {
  return new Date(d).toLocaleString("en-GH", { dateStyle: "medium", timeStyle: "short" });
}

export function RefundsClient({ sales }: RefundsClientProps) {
  const router = useRouter();
  const [filter, setFilter] = useState<"all" | "completed" | "voided">("all");
  const [voidModal, setVoidModal] = useState<{ id: string; total: number } | null>(null);
  const [reason, setReason] = useState("");
  const [voiding, setVoiding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => { if (toastTimer.current) clearTimeout(toastTimer.current); }, []);

  const filtered = sales.filter((s) => filter === "all" || s.status === filter);

  async function handleVoid() {
    if (!voidModal) return;
    const trimmed = reason.trim();
    if (trimmed.length < 10) {
      setError("Please provide a reason of at least 10 characters — this creates the audit trail.");
      return;
    }
    setVoiding(true);
    setError(null);
    const voidedTotal = voidModal.total;
    const res = await voidSale(voidModal.id, trimmed);
    setVoiding(false);
    if (res.error) { setError(res.error); return; }
    setVoidModal(null);
    setReason("");
    setToast(`Sale voided · ${formatCurrency(voidedTotal)} refunded and stock returned`);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 3200);
    router.refresh();
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="relative bg-white overflow-hidden shrink-0">
        <div className="absolute inset-0 pointer-events-none">
          <SnowflakePattern opacity={0.06} rows={2} tileSize={52} onLight />
        </div>
        <div className="relative z-10 border-b border-border px-4 lg:px-6 py-3 lg:py-4 flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <div>
              <h1 className="text-base font-semibold text-foreground">Refund Log</h1>
              <p className="text-xs text-muted-foreground mt-0.5">Void completed sales and view voided history</p>
            </div>
          </div>
          <div className="flex gap-1">
            {(["all", "completed", "voided"] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-sm font-medium transition-colors capitalize",
                  filter === f ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                )}
              >
                {f}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto p-4 lg:p-6">
        <div className="max-w-4xl space-y-3">
          {filtered.length === 0 && (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <ReceiptText className="w-10 h-10 text-muted-foreground/30 mb-3" />
              <p className="text-sm text-muted-foreground">No sales found</p>
            </div>
          )}
          {filtered.map((sale) => (
            <div
              key={sale.id}
              className={cn(
                "rounded-2xl border bg-card overflow-hidden",
                sale.status === "voided" ? "border-destructive/20 bg-destructive/5" : "border-border"
              )}
            >
              <div className="px-5 py-4 flex items-center justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-mono text-muted-foreground">#{sale.id.slice(0, 8).toUpperCase()}</span>
                    <span
                      className={cn(
                        "text-xs px-2 py-0.5 rounded-full font-medium",
                        sale.status === "voided"
                          ? "bg-destructive/10 text-destructive"
                          : "bg-success/10 text-success"
                      )}
                    >
                      {sale.status}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {formatDateTime(sale.created_at)} · {sale.cashier?.full_name ?? "—"}
                    {" · "}
                    {(sale.payments ?? []).map((p: any) => METHOD_LABELS[p.method] ?? p.method).join(", ")}
                  </p>
                  {sale.status === "voided" && sale.void_reason && (
                    <p className="text-xs text-destructive mt-1">
                      Voided by {sale.voider?.full_name ?? "admin"}: {sale.void_reason}
                    </p>
                  )}

                  {/* Items summary */}
                  <div className="mt-2 flex flex-wrap gap-x-3 gap-y-0.5">
                    {(sale.sale_items ?? []).map((item: any, i: number) => (
                      <span key={i} className="text-xs text-muted-foreground">
                        {item.quantity}× {item.product?.name ?? "?"}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="shrink-0 text-right">
                  <p className="text-base font-bold text-foreground tabular-nums">{formatCurrency(sale.total_amount)}</p>
                  {sale.status === "completed" && (
                    <button
                      onClick={() => { setVoidModal({ id: sale.id, total: sale.total_amount }); setReason(""); setError(null); }}
                      className="mt-2 text-xs text-destructive hover:underline"
                    >
                      Void Sale
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Void Modal */}
      {voidModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
          onClick={(e) => e.target === e.currentTarget && setVoidModal(null)}
        >
          <div className="bg-card rounded-2xl p-6 w-96 shadow-2xl space-y-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
              <div>
                <h4 className="text-sm font-semibold text-foreground">Void Sale</h4>
                <p className="text-xs text-muted-foreground mt-0.5">
                  This will void {formatCurrency(voidModal.total)} and return stock. This action cannot be undone.
                </p>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-muted-foreground">Void Reason *</label>
              <textarea
                rows={3}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="e.g. Customer returned item, wrong item sold"
                className="flex w-full rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground resize-none focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              />
            </div>

            {error && (
              <p className="rounded-lg bg-destructive/8 px-3 py-2 text-xs font-medium text-destructive">{error}</p>
            )}

            <div className="flex gap-2">
              <button
                onClick={() => setVoidModal(null)}
                className="flex-1 h-10 rounded-lg border border-border text-sm font-medium text-foreground hover:bg-secondary transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleVoid}
                disabled={voiding || !reason.trim()}
                className="flex-1 h-10 rounded-lg bg-destructive text-destructive-foreground text-sm font-medium hover:bg-destructive/90 transition-colors disabled:opacity-40"
              >
                {voiding ? "Voiding…" : "Confirm Void"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Success toast */}
      {toast && (
        <div
          role="status"
          className="fixed top-5 right-5 z-[100] flex items-center gap-2 rounded-xl bg-success text-white px-4 py-3 text-sm font-medium shadow-lg"
        >
          <CheckCircle2 className="w-4 h-4 shrink-0" aria-hidden="true" />
          {toast}
        </div>
      )}
    </div>
  );
}
