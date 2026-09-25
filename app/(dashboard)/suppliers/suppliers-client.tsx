"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, AlertCircle, Trash2 } from "lucide-react";
import { SnowflakePattern } from "@/components/snowflake-pattern";
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

// ─── Props ─────────────────────────────────────────────────────────────────────

interface SuppliersClientProps {
  suppliers: Supplier[];
  purchases: PurchaseRow[];
}

// ─── Tab type ──────────────────────────────────────────────────────────────────

type Tab = "suppliers" | "purchases" | "payables";

const TABS: { id: Tab; label: string }[] = [
  { id: "suppliers", label: "Suppliers" },
  { id: "purchases", label: "Purchases" },
  { id: "payables", label: "Payables" },
];

// ─── Toast ─────────────────────────────────────────────────────────────────────

interface ToastState {
  type: "success" | "error";
  message: string;
}

// ─── Payment method options ────────────────────────────────────────────────────

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

// ─── Confirm Delete Dialog ────────────────────────────────────────────────────

interface ConfirmDeleteDialogProps {
  supplierName: string;
  onClose: () => void;
  onConfirm: () => void;
}

function ConfirmDeleteDialog({ supplierName, onClose, onConfirm }: ConfirmDeleteDialogProps) {
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

interface MarkPaidDialogProps {
  purchase: PurchaseRow;
  onClose: () => void;
  onConfirm: (method: string, reference: string) => Promise<void>;
}

function MarkPaidDialog({ purchase, onClose, onConfirm }: MarkPaidDialogProps) {
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

          {/* Payment method */}
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

          {/* Reference */}
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

          {/* Actions */}
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

interface PayablesTabProps {
  purchases: PurchaseRow[];
  onMarkPaid: (purchase: PurchaseRow) => void;
}

function ageDays(dateStr: string) {
  const ms = Date.now() - new Date(dateStr).getTime();
  return Math.floor(ms / 86400000);
}

function AgeLabel({ days }: { days: number }) {
  const cls =
    days >= 30
      ? "text-destructive font-semibold"
      : days >= 14
      ? "text-warning font-semibold"
      : "text-muted-foreground";
  return <span className={cls}>{days}d</span>;
}

function PayablesTab({ purchases, onMarkPaid }: PayablesTabProps) {
  const unpaid = purchases
    .filter((p) => p.payment_status === "unpaid")
    .sort((a, b) => a.created_at.localeCompare(b.created_at)); // oldest first

  const paid = purchases
    .filter((p) => p.payment_status === "paid")
    .slice(0, 50);

  const totalOutstanding = unpaid.reduce((s, p) => s + p.total_amount, 0);

  return (
    <div className="space-y-6">
      {/* Outstanding summary */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        {/* Summary header */}
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

        {/* Unpaid table */}
        {unpaid.length === 0 ? (
          <div className="flex items-center justify-center py-12 text-sm text-muted-foreground">
            No outstanding payables
          </div>
        ) : (
          <div className="overflow-x-auto">
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
                        <AgeLabel days={days} />
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
          <div className="overflow-x-auto">
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

// ─── Main client component ─────────────────────────────────────────────────────

export function SuppliersClient({
  suppliers,
  purchases,
}: SuppliersClientProps) {
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

  useEffect(() => {
    return () => {
      if (toastTimer.current) clearTimeout(toastTimer.current);
    };
  }, []);

  // ─── Action handlers ───────────────────────────────────────────────────────

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
    showToast(
      "success",
      showSupplierForm === "create" ? "Supplier added successfully." : "Supplier updated."
    );
    router.refresh();
  }

  async function handleDeleteSupplier(supplier: Supplier) {
    setDeleteTarget(supplier);
  }

  async function confirmDeleteSupplier() {
    if (!deleteTarget) return;
    const result = await deleteSupplier(deleteTarget.id);
    setDeleteTarget(null);
    if (result.error) {
      showToast("error", result.error);
    } else {
      showToast("success", "Supplier deleted.");
      router.refresh();
    }
  }

  async function handleConfirmPayment(method: string, reference: string) {
    if (!markPaidTarget) return;
    const result = await markPurchasePaid(markPaidTarget.id, method, reference);
    if (result.error) throw new Error(result.error);
    setMarkPaidTarget(null);
    showToast("success", `Payment recorded for ${markPaidTarget.supplier.name}.`);
    router.refresh();
  }

  // ─── Payables badge ────────────────────────────────────────────────────────

  const unpaidCount = purchases.filter((p) => p.payment_status === "unpaid").length;

  // ─── Toolbar per tab ───────────────────────────────────────────────────────

  function renderActionButton() {
    if (activeTab === "suppliers") {
      return (
        <button
          onClick={() => setShowSupplierForm("create")}
          className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          <Plus className="h-3.5 w-3.5" />
          Add Supplier
        </button>
      );
    }
    return null;
  }

  // ─── Tab content ──────────────────────────────────────────────────────────

  function renderTabContent() {
    if (activeTab === "suppliers") {
      return (
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <SupplierTable
            suppliers={suppliers}
            onEdit={(supplier) => setShowSupplierForm(supplier)}
            onDelete={handleDeleteSupplier}
          />
        </div>
      );
    }

    if (activeTab === "purchases") {
      return (
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <PurchaseTable
            purchases={purchases}
            onViewDetail={(purchase) => setSelectedPurchase(purchase)}
          />
        </div>
      );
    }

    if (activeTab === "payables") {
      return (
        <PayablesTab
          purchases={purchases}
          onMarkPaid={(purchase) => setMarkPaidTarget(purchase)}
        />
      );
    }

    return null;
  }

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col h-full">
      {/* Page header */}
      <div className="relative bg-white overflow-hidden shrink-0">
        <div className="absolute inset-0 pointer-events-none">
          <SnowflakePattern opacity={0.06} rows={2} tileSize={52} onLight />
        </div>
        <div className="relative z-10 border-b border-border px-4 lg:px-6 py-3 lg:py-4 flex items-center justify-between gap-4 flex-wrap">
          {/* Left: title + tabs */}
          <div className="flex items-center gap-3 lg:gap-6 overflow-x-auto no-scrollbar">
            <h1 className="text-lg font-bold text-foreground shrink-0">
              Suppliers
            </h1>

            <nav className="flex items-center gap-1" aria-label="Suppliers tabs">
              {TABS.map((tab) => {
                const isActive = activeTab === tab.id;
                const showBadge = tab.id === "payables" && unpaidCount > 0;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`relative px-3 py-1.5 text-sm font-medium transition-colors rounded-t ${
                      isActive
                        ? "text-foreground after:absolute after:bottom-0 after:inset-x-0 after:h-0.5 after:bg-primary"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
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
            </nav>
          </div>

          {/* Right: action button */}
          <div className="shrink-0">{renderActionButton()}</div>
        </div>
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-auto p-4 lg:p-6">{renderTabContent()}</div>

      {/* Toast */}
      {toast && (
        <div
          className={`fixed top-5 right-5 z-[100] flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-medium shadow-lg transition-all ${
            toast.type === "success"
              ? "bg-success text-white"
              : "bg-destructive text-destructive-foreground"
          }`}
        >
          {toast.message}
        </div>
      )}

      {/* Supplier form dialog */}
      {showSupplierForm !== null && (
        <SupplierFormDialog
          supplier={showSupplierForm === "create" ? null : (showSupplierForm as Supplier)}
          onClose={() => setShowSupplierForm(null)}
          onSave={handleSaveSupplier}
        />
      )}

      {/* Purchase detail dialog */}
      {selectedPurchase && (
        <PurchaseDetailDialog
          purchase={selectedPurchase}
          onClose={() => setSelectedPurchase(null)}
        />
      )}

      {/* Confirm Delete dialog */}
      {deleteTarget && (
        <ConfirmDeleteDialog
          supplierName={deleteTarget.name}
          onClose={() => setDeleteTarget(null)}
          onConfirm={confirmDeleteSupplier}
        />
      )}

      {/* Mark Paid dialog */}
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
