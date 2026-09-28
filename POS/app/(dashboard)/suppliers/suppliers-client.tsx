"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, Plus, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";

import { SupplierTable } from "@/components/suppliers/supplier-table";
import { SupplierFormDialog } from "@/components/suppliers/supplier-form-dialog";
import { PurchaseTable } from "@/components/suppliers/purchase-table";
import { PurchaseDetailDialog } from "@/components/suppliers/purchase-detail-dialog";
import {
  createSupplier,
  updateSupplier,
  deleteSupplier,
  markPurchasePaid,
} from "./actions";
import { formatCurrency, formatDate } from "@/lib/utils";
import type { Supplier } from "@/lib/types";
import type { PurchaseRow } from "@/components/suppliers/purchase-table";

// ─── Types ─────────────────────────────────────────────────────────────────────

interface SuppliersClientProps {
  suppliers: Supplier[];
  purchases: PurchaseRow[];
}

type Tab = "suppliers" | "purchases" | "payables";

const TABS: { id: Tab; label: string }[] = [
  { id: "suppliers", label: "Suppliers" },
  { id: "purchases", label: "Purchases" },
  { id: "payables", label: "Payables" },
];

interface ToastState {
  type: "success" | "error";
  message: string;
}

const PAYMENT_METHODS = [
  { value: "cash", label: "Cash" },
  { value: "momo", label: "MoMo" },
  { value: "bank_transfer", label: "Bank Transfer" },
  { value: "cheque", label: "Cheque" },
] as const;

const METHOD_LABELS: Record<string, string> = {
  cash: "Cash",
  momo: "MoMo",
  bank_transfer: "Bank Transfer",
  cheque: "Cheque",
};

// ─── Age pill ─────────────────────────────────────────────────────────────────

function AgePill({ days }: { days: number }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-bold tabular-nums shrink-0",
        days >= 30
          ? "bg-destructive/10 text-destructive"
          : days >= 14
          ? "bg-warning/10 text-warning"
          : "bg-success/10 text-success"
      )}
    >
      {days}d
    </span>
  );
}

function ageDays(dateStr: string) {
  return Math.floor((Date.now() - new Date(dateStr).getTime()) / 86400000);
}

// ─── Confirm Delete Dialog ────────────────────────────────────────────────────

function ConfirmDeleteDialog({
  supplierName,
  onClose,
  onConfirm,
}: {
  supplierName: string;
  onClose: () => void;
  onConfirm: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60">
      <div className="bg-card rounded-2xl shadow-2xl w-full max-w-sm mx-4 p-6 space-y-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-destructive/10">
            <Trash2 className="h-5 w-5 text-destructive" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-foreground">Delete supplier?</h2>
            <p className="text-sm text-muted-foreground mt-0.5">
              &ldquo;{supplierName}&rdquo; will be permanently removed.
            </p>
          </div>
        </div>
        <div className="flex items-center justify-end gap-2 pt-1">
          <button
            onClick={onClose}
            className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-secondary transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="rounded-lg bg-destructive px-4 py-2 text-sm font-semibold text-white hover:bg-destructive/90 transition-colors"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Mark Paid Dialog ──────────────────────────────────────────────────────────

function MarkPaidDialog({
  purchase,
  onClose,
  onConfirm,
}: {
  purchase: PurchaseRow;
  onClose: () => void;
  onConfirm: (method: string, reference: string) => Promise<void>;
}) {
  const [method, setMethod] = useState("cash");
  const [reference, setReference] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await onConfirm(method, reference);
    } catch (err: any) {
      setError(err.message ?? "Something went wrong");
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60">
      <div className="bg-card rounded-2xl shadow-2xl w-full max-w-sm mx-4">
        <div className="px-6 pt-6 pb-5">
          <h2 className="text-base font-semibold text-foreground mb-0.5">Mark as Paid</h2>
          <p className="text-sm text-muted-foreground">
            {purchase.supplier.name} · {formatCurrency(purchase.total_amount)}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="px-6 pb-6 space-y-4">
          {error && (
            <div className="flex items-center gap-2 rounded-lg bg-destructive/10 border border-destructive/20 px-3 py-2 text-sm text-destructive">
              <AlertCircle className="w-4 h-4 shrink-0" />
              {error}
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1.5">
              Payment Method
            </label>
            <select
              value={method}
              onChange={(e) => setMethod(e.target.value)}
              disabled={loading}
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-accent disabled:opacity-50"
            >
              {PAYMENT_METHODS.map((m) => (
                <option key={m.value} value={m.value}>{m.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1.5">
              Reference <span className="font-normal normal-case">(optional)</span>
            </label>
            <input
              type="text"
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              disabled={loading}
              placeholder="Cheque #, MoMo txn ID, etc."
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent disabled:opacity-50"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-secondary transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="rounded-lg bg-success px-4 py-2 text-sm font-semibold text-white hover:bg-success/90 transition-colors disabled:opacity-50"
            >
              {loading ? "Saving…" : "Confirm Payment"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Payables Tab ──────────────────────────────────────────────────────────────

function PayablesTab({
  purchases,
  onMarkPaid,
}: {
  purchases: PurchaseRow[];
  onMarkPaid: (purchase: PurchaseRow) => void;
}) {
  const unpaid = purchases
    .filter((p) => p.payment_status === "unpaid")
    .sort((a, b) => a.created_at.localeCompare(b.created_at));

  const paid = purchases.filter((p) => p.payment_status === "paid").slice(0, 50);
  const totalOutstanding = unpaid.reduce((s, p) => s + p.total_amount, 0);

  return (
    <div className="space-y-4 lg:space-y-6">
      {/* Outstanding summary card */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="px-5 py-4 border-b border-border flex items-center justify-between gap-4 flex-wrap">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-0.5">
              Outstanding Payables
            </p>
            <p className="text-2xl font-bold tabular-nums text-foreground">
              {formatCurrency(totalOutstanding)}
            </p>
          </div>
          {unpaid.length > 0 ? (
            <span className="inline-flex items-center rounded-full bg-warning/10 px-3 py-1 text-sm font-semibold text-warning">
              {unpaid.length} unpaid invoice{unpaid.length !== 1 ? "s" : ""}
            </span>
          ) : (
            <span className="inline-flex items-center rounded-full bg-success/10 px-3 py-1 text-sm font-semibold text-success">
              All clear
            </span>
          )}
        </div>

        {unpaid.length === 0 ? (
          <div className="flex items-center justify-center py-10 text-sm text-muted-foreground">
            No outstanding payables
          </div>
        ) : (
          <>
            {/* ── Mobile: cards ──────────────────────────────────── */}
            <div className="lg:hidden divide-y divide-border">
              {unpaid.map((purchase) => {
                const days = ageDays(purchase.created_at);
                const itemCount = purchase.purchase_items?.length ?? 0;
                return (
                  <div key={purchase.id} className="px-4 py-4">
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-foreground truncate">
                          {purchase.supplier.name}
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {formatDate(purchase.created_at)}
                          {itemCount > 0 && ` · ${itemCount === 1 ? "1 item" : `${itemCount} items`}`}
                        </p>
                      </div>
                      <AgePill days={days} />
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-xl font-bold tabular-nums text-foreground">
                        {formatCurrency(purchase.total_amount)}
                      </p>
                      <button
                        onClick={() => onMarkPaid(purchase)}
                        className="rounded-lg bg-success px-4 py-2 text-sm font-semibold text-white hover:bg-success/90 transition-colors shrink-0"
                      >
                        Mark Paid
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* ── Desktop: table ─────────────────────────────────── */}
            <div className="hidden lg:block overflow-x-auto">
              <table className="min-w-full border-separate border-spacing-0">
                <thead>
                  <tr>
                    {["Date", "Supplier", "Age", "Items", "Amount", "Action"].map((h) => (
                      <th
                        key={h}
                        className="bg-card px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground first:pl-5 last:pr-5"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {unpaid.map((purchase) => {
                    const days = ageDays(purchase.created_at);
                    const itemCount = purchase.purchase_items?.length ?? 0;
                    return (
                      <tr key={purchase.id} className="hover:bg-secondary transition-colors">
                        <td className="whitespace-nowrap px-4 py-3 pl-5 text-sm text-muted-foreground">
                          {formatDate(purchase.created_at)}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-sm font-medium text-foreground">
                          {purchase.supplier.name}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-sm">
                          <AgePill days={days} />
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-sm text-muted-foreground">
                          {itemCount === 1 ? "1 item" : `${itemCount} items`}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-sm tabular-nums font-semibold text-foreground">
                          {formatCurrency(purchase.total_amount)}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 pr-5">
                          <button
                            onClick={() => onMarkPaid(purchase)}
                            className="rounded-lg bg-success/10 border border-success/20 px-3 py-1.5 text-xs font-semibold text-success hover:bg-success hover:text-white transition-colors"
                          >
                            Mark Paid
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      {/* Payment history */}
      {paid.length > 0 && (
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <div className="px-5 py-3 border-b border-border">
            <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
              Payment History
            </p>
          </div>

          {/* ── Mobile: compact rows ─────────────────────────────── */}
          <div className="lg:hidden divide-y divide-border">
            {paid.map((purchase) => (
              <div key={purchase.id} className="flex items-start justify-between gap-3 px-4 py-3.5">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{purchase.supplier.name}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {purchase.paid_at ? formatDate(purchase.paid_at) : formatDate(purchase.created_at)}
                    {purchase.payment_method && ` · ${METHOD_LABELS[purchase.payment_method] ?? purchase.payment_method}`}
                  </p>
                </div>
                <span className="text-sm font-semibold tabular-nums text-foreground shrink-0">
                  {formatCurrency(purchase.total_amount)}
                </span>
              </div>
            ))}
          </div>

          {/* ── Desktop: table ─────────────────────────────────────── */}
          <div className="hidden lg:block overflow-x-auto">
            <table className="min-w-full border-separate border-spacing-0">
              <thead>
                <tr>
                  {["Received", "Paid On", "Supplier", "Method", "Reference", "Amount"].map((h) => (
                    <th
                      key={h}
                      className="bg-card px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground first:pl-5 last:pr-5"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {paid.map((purchase) => (
                  <tr key={purchase.id} className="hover:bg-secondary transition-colors">
                    <td className="whitespace-nowrap px-4 py-3 pl-5 text-sm text-muted-foreground">
                      {formatDate(purchase.created_at)}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-muted-foreground">
                      {purchase.paid_at ? formatDate(purchase.paid_at) : "—"}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm font-medium text-foreground">
                      {purchase.supplier.name}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-muted-foreground">
                      {purchase.payment_method
                        ? (METHOD_LABELS[purchase.payment_method] ?? purchase.payment_method)
                        : "—"}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-muted-foreground">
                      {purchase.payment_reference ?? "—"}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 pr-5 text-sm tabular-nums font-medium text-foreground">
                      {formatCurrency(purchase.total_amount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main client ──────────────────────────────────────────────────────────────

export function SuppliersClient({ suppliers, purchases }: SuppliersClientProps) {
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<Tab>("suppliers");
  const [showSupplierForm, setShowSupplierForm] = useState<null | "create" | Supplier>(null);
  const [selectedPurchase, setSelectedPurchase] = useState<PurchaseRow | null>(null);
  const [markPaidTarget, setMarkPaidTarget] = useState<PurchaseRow | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Supplier | null>(null);
  const [toast, setToast] = useState<ToastState | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function showToast(type: ToastState["type"], message: string) {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast({ type, message });
    toastTimer.current = setTimeout(() => setToast(null), 2000);
  }

  useEffect(() => () => { if (toastTimer.current) clearTimeout(toastTimer.current); }, []);

  // ─── Handlers ─────────────────────────────────────────────────────────────

  async function handleSaveSupplier(data: {
    name: string;
    phone: string | null;
    email: string | null;
    address: string | null;
  }) {
    let result: { error?: string };
    if (showSupplierForm === "create") {
      result = await createSupplier(data);
    } else if (showSupplierForm && typeof showSupplierForm === "object") {
      result = await updateSupplier(showSupplierForm.id, data);
    } else {
      return;
    }
    if (result.error) throw new Error(result.error);
    showToast("success", showSupplierForm === "create" ? "Supplier added." : "Supplier updated.");
    router.refresh();
  }

  async function confirmDeleteSupplier() {
    if (!deleteTarget) return;
    const result = await deleteSupplier(deleteTarget.id);
    setDeleteTarget(null);
    if (result.error) showToast("error", result.error);
    else { showToast("success", "Supplier deleted."); router.refresh(); }
  }

  async function handleConfirmPayment(method: string, reference: string) {
    if (!markPaidTarget) return;
    const result = await markPurchasePaid(markPaidTarget.id, method, reference);
    if (result.error) throw new Error(result.error);
    setMarkPaidTarget(null);
    showToast("success", `Payment recorded for ${markPaidTarget.supplier.name}.`);
    router.refresh();
  }

  // ─── Computed ─────────────────────────────────────────────────────────────

  const unpaidCount = purchases.filter((p) => p.payment_status === "unpaid").length;
  const totalOutstanding = purchases
    .filter((p) => p.payment_status === "unpaid")
    .reduce((s, p) => s + p.total_amount, 0);

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col h-full">
      {/* ── Page header ─────────────────────────────────────────────────── */}
      <div className="bg-white shrink-0">
        {/* Title row */}
        <div className="px-4 lg:px-6 pt-3 lg:pt-4 pb-0 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2 min-w-0">
            <h1 className="text-lg font-bold text-foreground shrink-0">Suppliers</h1>
            {/* Stats chips */}
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
              <span className="inline-flex items-center rounded-full bg-secondary px-2.5 py-0.5 text-[11px] font-semibold text-foreground shrink-0">
                {suppliers.length} supplier{suppliers.length !== 1 ? "s" : ""}
              </span>
              {totalOutstanding > 0 && (
                <span className="inline-flex items-center rounded-full bg-warning/10 px-2.5 py-0.5 text-[11px] font-semibold text-warning shrink-0">
                  {formatCurrency(totalOutstanding)} owed
                </span>
              )}
            </div>
          </div>

          {/* Add Supplier button (suppliers tab only) */}
          {activeTab === "suppliers" && (
            <button
              onClick={() => setShowSupplierForm("create")}
              className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              <Plus className="h-3.5 w-3.5" />
              Add
            </button>
          )}
        </div>

        {/* Tab row */}
        <div className="border-b border-border px-4 lg:px-6 mt-1 flex items-end gap-0.5 overflow-x-auto no-scrollbar">
          {TABS.map((tab) => {
            const isActive = activeTab === tab.id;
            const showBadge = tab.id === "payables" && unpaidCount > 0;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "relative shrink-0 px-3 py-2.5 text-sm font-medium transition-colors",
                  isActive
                    ? "text-foreground after:absolute after:bottom-0 after:inset-x-0 after:h-0.5 after:bg-primary"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <span className="flex items-center gap-1.5">
                  {tab.label}
                  {showBadge && (
                    <span className="inline-flex items-center justify-center h-4 min-w-4 rounded-full bg-warning text-[10px] font-bold text-white px-1">
                      {unpaidCount}
                    </span>
                  )}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Tab content ─────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-auto p-4 lg:p-6">
        {activeTab === "suppliers" && (
          <div className="rounded-xl border border-border bg-card overflow-hidden">
            <SupplierTable
              suppliers={suppliers}
              onEdit={(s) => setShowSupplierForm(s)}
              onDelete={(s) => setDeleteTarget(s)}
            />
          </div>
        )}

        {activeTab === "purchases" && (
          <div className="rounded-xl border border-border bg-card overflow-hidden">
            <PurchaseTable
              purchases={purchases}
              onViewDetail={(p) => setSelectedPurchase(p)}
            />
          </div>
        )}

        {activeTab === "payables" && (
          <PayablesTab
            purchases={purchases}
            onMarkPaid={(p) => setMarkPaidTarget(p)}
          />
        )}
      </div>

      {/* ── Toast ───────────────────────────────────────────────────────── */}
      {toast && (
        <div
          className={cn(
            "fixed top-5 right-5 z-[100] flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-medium shadow-lg transition-all",
            toast.type === "success" ? "bg-success text-white" : "bg-destructive text-destructive-foreground"
          )}
        >
          {toast.message}
        </div>
      )}

      {/* ── Dialogs ─────────────────────────────────────────────────────── */}
      {showSupplierForm !== null && (
        <SupplierFormDialog
          supplier={showSupplierForm === "create" ? null : (showSupplierForm as Supplier)}
          onClose={() => setShowSupplierForm(null)}
          onSave={handleSaveSupplier}
        />
      )}

      {selectedPurchase && (
        <PurchaseDetailDialog
          purchase={selectedPurchase}
          onClose={() => setSelectedPurchase(null)}
        />
      )}

      {deleteTarget && (
        <ConfirmDeleteDialog
          supplierName={deleteTarget.name}
          onClose={() => setDeleteTarget(null)}
          onConfirm={confirmDeleteSupplier}
        />
      )}

      {markPaidTarget && (
        <MarkPaidDialog
          purchase={markPaidTarget}
          onClose={() => setMarkPaidTarget(null)}
          onConfirm={handleConfirmPayment}
        />
      )}
    </div>
  );
}
