"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  PackageCheck,
  Clock,
  User,
  CheckCircle2,
  X,
  Loader2,
  Plus,
  AlertCircle,
} from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  markPickupDelivered,
  markSaleForPickup,
  undoPickupDelivered,
  clearPickupFlag,
} from "./actions";

interface SaleItemLite {
  id: string;
  quantity: number;
  package_label: string | null;
  unit_price: number;
  total_price: number;
  product: { id: string; name: string; unit: string } | { id: string; name: string; unit: string }[] | null;
}

interface PickupSale {
  id: string;
  total_amount: number;
  created_at: string;
  pickup_note: string | null;
  pending_pickup?: boolean;
  picked_up_at?: string | null;
  cashier: { full_name: string } | { full_name: string }[] | null;
  picker?: { full_name: string } | { full_name: string }[] | null;
  sale_items: SaleItemLite[];
  payments: { method: string; amount: number }[];
}

interface PickupsClientProps {
  pending: PickupSale[];
  delivered: PickupSale[];
  canEdit: boolean;
}

function firstName(field: { full_name: string } | { full_name: string }[] | null | undefined): string {
  if (!field) return "—";
  if (Array.isArray(field)) return field[0]?.full_name ?? "—";
  return field.full_name;
}

function productName(field: SaleItemLite["product"]): string {
  if (!field) return "Unknown";
  if (Array.isArray(field)) return field[0]?.name ?? "Unknown";
  return field.name;
}

function productUnit(field: SaleItemLite["product"]): string {
  if (!field) return "";
  if (Array.isArray(field)) return field[0]?.unit ?? "";
  return field.unit;
}

function fmtDate(d: string) {
  return new Date(d).toLocaleString("en-GH", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function receiptRef(id: string) {
  return `#${id.slice(0, 8).toUpperCase()}`;
}

export function PickupsClient({ pending, delivered, canEdit }: PickupsClientProps) {
  const router = useRouter();
  const [tab, setTab] = useState<"pending" | "delivered">("pending");
  const [showAdd, setShowAdd] = useState(false);
  const [confirmDeliver, setConfirmDeliver] = useState<PickupSale | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const activeList = tab === "pending" ? pending : delivered;

  function handleDeliver(sale: PickupSale) {
    setError(null);
    setBusyId(sale.id);
    startTransition(async () => {
      const res = await markPickupDelivered(sale.id);
      setBusyId(null);
      if (res.error) {
        setError(res.error);
        return;
      }
      setConfirmDeliver(null);
      router.refresh();
    });
  }

  function handleUndo(sale: PickupSale) {
    setError(null);
    setBusyId(sale.id);
    startTransition(async () => {
      const res = await undoPickupDelivered(sale.id);
      setBusyId(null);
      if (res.error) {
        setError(res.error);
        return;
      }
      router.refresh();
    });
  }

  function handleClearFlag(sale: PickupSale) {
    setError(null);
    setBusyId(sale.id);
    startTransition(async () => {
      const res = await clearPickupFlag(sale.id);
      setBusyId(null);
      if (res.error) {
        setError(res.error);
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="bg-white shrink-0">
        <div className="border-b border-border px-4 lg:px-6 py-3 lg:py-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-accent/10 flex items-center justify-center shrink-0">
              <PackageCheck className="w-4 h-4 text-accent" aria-hidden />
            </div>
            <div className="w-1 self-stretch rounded-full bg-accent shrink-0" />
            <div className="min-w-0 flex-1">
              <p className="text-muted-foreground text-[10px] font-bold uppercase tracking-widest mb-0.5">
                Fulfillment
              </p>
              <h1 className="text-foreground text-lg lg:text-xl font-bold leading-none truncate">
                Pre-paid pickups
              </h1>
            </div>
            {canEdit && (
              <Button size="sm" onClick={() => setShowAdd(true)} className="shrink-0">
                <Plus className="w-4 h-4 mr-1" aria-hidden />
                Log pickup
              </Button>
            )}
          </div>

          {/* Tabs */}
          <div className="flex items-center gap-1 mt-4">
            <button
              onClick={() => setTab("pending")}
              className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition-colors ${
                tab === "pending"
                  ? "bg-sidebar text-white"
                  : "text-muted-foreground hover:bg-secondary hover:text-foreground"
              }`}
            >
              Pending{" "}
              <span
                className={`ml-1 px-1.5 py-0.5 rounded-full text-[10px] font-black tabular-nums ${
                  tab === "pending" ? "bg-primary text-white" : "bg-secondary text-muted-foreground"
                }`}
              >
                {pending.length}
              </span>
            </button>
            <button
              onClick={() => setTab("delivered")}
              className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition-colors ${
                tab === "delivered"
                  ? "bg-sidebar text-white"
                  : "text-muted-foreground hover:bg-secondary hover:text-foreground"
              }`}
            >
              Recently delivered{" "}
              <span
                className={`ml-1 px-1.5 py-0.5 rounded-full text-[10px] font-black tabular-nums ${
                  tab === "delivered" ? "bg-primary text-white" : "bg-secondary text-muted-foreground"
                }`}
              >
                {delivered.length}
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto p-4 lg:p-6 max-w-4xl w-full mx-auto">
        {error && (
          <div className="mb-4 rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive flex items-start gap-2">
            <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" aria-hidden />
            <span>{error}</span>
          </div>
        )}

        {activeList.length === 0 ? (
          <div className="rounded-2xl border border-border bg-card p-12 text-center">
            <div className="w-14 h-14 rounded-2xl bg-secondary flex items-center justify-center mx-auto mb-4">
              <PackageCheck className="w-6 h-6 text-muted-foreground" aria-hidden />
            </div>
            <p className="text-sm font-semibold text-foreground">
              {tab === "pending"
                ? "No pending pickups"
                : "No recently delivered pickups"}
            </p>
            <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
              {tab === "pending"
                ? "Sales flagged as pre-paid pickups will appear here so you can hand them over when the stock arrives."
                : "Once you mark a pickup as delivered, it will show up here for the next 50 records."}
            </p>
          </div>
        ) : (
          <ul className="space-y-3">
            {activeList.map((sale) => (
              <li
                key={sale.id}
                className="rounded-xl border border-border bg-card overflow-hidden"
              >
                <div className="flex flex-wrap items-start gap-3 justify-between px-4 py-3 border-b border-border bg-secondary/30">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                      <PackageCheck className="w-4 h-4 text-primary" aria-hidden />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-mono font-bold text-foreground">
                        {receiptRef(sale.id)}
                      </p>
                      <p className="text-[11px] text-muted-foreground flex items-center gap-2 mt-0.5 flex-wrap">
                        <span className="inline-flex items-center gap-1">
                          <Clock className="w-3 h-3" aria-hidden />
                          Paid {fmtDate(sale.created_at)}
                        </span>
                        <span aria-hidden>·</span>
                        <span className="inline-flex items-center gap-1">
                          <User className="w-3 h-3" aria-hidden />
                          Rung by {firstName(sale.cashier)}
                        </span>
                        {sale.picked_up_at && (
                          <>
                            <span aria-hidden>·</span>
                            <span className="inline-flex items-center gap-1 text-success">
                              <CheckCircle2 className="w-3 h-3" aria-hidden />
                              Delivered {fmtDate(sale.picked_up_at)}
                              {sale.picker && ` by ${firstName(sale.picker)}`}
                            </span>
                          </>
                        )}
                      </p>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="font-display font-black text-lg text-primary tabular-nums leading-none">
                      {formatCurrency(sale.total_amount)}
                    </p>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wide font-bold mt-1">
                      Total paid
                    </p>
                  </div>
                </div>

                {/* Items */}
                <div className="px-4 py-3 space-y-1.5">
                  {sale.sale_items.map((item) => {
                    const unit = productUnit(item.product);
                    const isKg = unit === "kg";
                    return (
                      <div key={item.id} className="flex items-baseline justify-between gap-3 text-sm">
                        <span className="text-foreground font-medium">
                          {productName(item.product)}
                          {item.package_label && (
                            <span className="ml-2 text-xs text-muted-foreground">({item.package_label})</span>
                          )}
                        </span>
                        <span className="tabular-nums text-muted-foreground shrink-0">
                          {item.quantity}
                          {isKg ? "kg" : ""} @ {formatCurrency(item.unit_price)} ={" "}
                          <span className="text-foreground font-semibold">
                            {formatCurrency(item.total_price)}
                          </span>
                        </span>
                      </div>
                    );
                  })}
                </div>

                {sale.pickup_note && (
                  <div className="px-4 py-2.5 border-t border-border bg-warning/5">
                    <p className="text-[10px] text-warning font-bold uppercase tracking-widest mb-1">
                      Customer / note
                    </p>
                    <p className="text-sm text-foreground">{sale.pickup_note}</p>
                  </div>
                )}

                {/* Actions */}
                {canEdit && (
                  <div className="px-4 py-2.5 border-t border-border flex items-center justify-end gap-2 flex-wrap">
                    {tab === "pending" ? (
                      <>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleClearFlag(sale)}
                          disabled={busyId === sale.id}
                        >
                          Remove flag
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => setConfirmDeliver(sale)}
                          disabled={busyId === sale.id}
                        >
                          {busyId === sale.id && isPending ? (
                            <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" aria-hidden />
                          ) : (
                            <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" aria-hidden />
                          )}
                          Mark as delivered
                        </Button>
                      </>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleUndo(sale)}
                        disabled={busyId === sale.id}
                      >
                        Undo delivery
                      </Button>
                    )}
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Confirm-deliver dialog */}
      {confirmDeliver && (
        <Backdrop onClose={() => !isPending && setConfirmDeliver(null)}>
          <div className="w-full max-w-sm bg-card rounded-2xl shadow-2xl p-5">
            <div className="flex items-start gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-success/10 flex items-center justify-center shrink-0">
                <CheckCircle2 className="w-5 h-5 text-success" aria-hidden />
              </div>
              <div className="min-w-0">
                <h3 className="text-base font-semibold text-foreground">
                  Confirm delivery
                </h3>
                <p className="text-xs text-muted-foreground mt-1">
                  Hand the goods to the customer, then confirm. This only updates the pickup log — inventory was already deducted at sale time.
                </p>
              </div>
            </div>

            <div className="rounded-xl border border-border bg-secondary/30 px-3 py-2.5 mb-4 text-sm">
              <p className="font-mono font-bold">{receiptRef(confirmDeliver.id)}</p>
              <p className="text-xs text-muted-foreground">
                {formatCurrency(confirmDeliver.total_amount)} · {fmtDate(confirmDeliver.created_at)}
              </p>
              {confirmDeliver.pickup_note && (
                <p className="text-xs text-foreground mt-1">{confirmDeliver.pickup_note}</p>
              )}
            </div>

            <div className="flex items-center justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setConfirmDeliver(null)}
                disabled={isPending}
              >
                Cancel
              </Button>
              <Button onClick={() => handleDeliver(confirmDeliver)} disabled={isPending}>
                {isPending ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" aria-hidden />
                    Confirming…
                  </>
                ) : (
                  "Confirm delivery"
                )}
              </Button>
            </div>
          </div>
        </Backdrop>
      )}

      {/* Add-pickup dialog */}
      {showAdd && (
        <AddPickupDialog
          onClose={() => setShowAdd(false)}
          onSuccess={() => {
            setShowAdd(false);
            router.refresh();
          }}
        />
      )}
    </div>
  );
}

function Backdrop({ onClose, children }: { onClose: () => void; children: React.ReactNode }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      {children}
    </div>
  );
}

function AddPickupDialog({
  onClose,
  onSuccess,
}: {
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [ref, setRef] = useState("");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const cleaned = ref.trim().replace(/^#/, "").toLowerCase();
    if (cleaned.length < 6) {
      setError("Enter the receipt reference (at least 6 characters).");
      return;
    }

    setSaving(true);
    try {
      // Look up sale by short id prefix via a lightweight fetch to /api/lookup-sale
      const res = await fetch(`/api/lookup-sale?ref=${encodeURIComponent(cleaned)}`, {
        cache: "no-store",
      });
      if (!res.ok) {
        setError("Could not find a sale matching that reference.");
        setSaving(false);
        return;
      }
      const { saleId } = (await res.json()) as { saleId: string };
      const mark = await markSaleForPickup(saleId, note);
      setSaving(false);
      if (mark.error) {
        setError(mark.error);
        return;
      }
      onSuccess();
    } catch {
      setSaving(false);
      setError("Network error — try again.");
    }
  }

  return (
    <Backdrop onClose={() => !saving && onClose()}>
      <div className="w-full max-w-sm bg-card rounded-2xl shadow-2xl">
        <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-border">
          <h3 className="text-base font-semibold text-foreground">Log a pre-paid pickup</h3>
          <button
            onClick={onClose}
            aria-label="Close"
            disabled={saving}
            className="rounded-lg p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors disabled:opacity-50"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div className="space-y-1.5">
            <label htmlFor="pickup-ref" className="text-xs font-bold text-muted-foreground uppercase tracking-widest">
              Receipt reference
            </label>
            <Input
              id="pickup-ref"
              placeholder="e.g. 4D253C8A"
              value={ref}
              onChange={(e) => setRef(e.target.value)}
              required
              autoFocus
              disabled={saving}
              className="font-mono uppercase"
            />
            <p className="text-xs text-muted-foreground">
              Short reference printed at the top of the customer&apos;s receipt.
            </p>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="pickup-note" className="text-xs font-bold text-muted-foreground uppercase tracking-widest">
              Customer / note
            </label>
            <Input
              id="pickup-note"
              placeholder="e.g. Ama Serwaa · 054-123-4567 · full box chicken"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              disabled={saving}
            />
          </div>

          {error && (
            <p className="rounded-lg bg-destructive/10 px-3 py-2 text-xs font-medium text-destructive">
              {error}
            </p>
          )}

          <div className="flex items-center justify-end gap-2 pt-1">
            <Button type="button" variant="outline" onClick={onClose} disabled={saving}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" aria-hidden />
                  Saving…
                </>
              ) : (
                "Add to pickups"
              )}
            </Button>
          </div>
        </form>
      </div>
    </Backdrop>
  );
}
