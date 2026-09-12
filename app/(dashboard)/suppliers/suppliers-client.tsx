"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { SupplierTable } from "@/components/suppliers/supplier-table";
import { SupplierFormDialog } from "@/components/suppliers/supplier-form-dialog";
import { PurchaseTable } from "@/components/suppliers/purchase-table";
import { PurchaseFormDialog } from "@/components/suppliers/purchase-form-dialog";
import { PurchaseDetailDialog } from "@/components/suppliers/purchase-detail-dialog";
import {
  createSupplier,
  updateSupplier,
  deleteSupplier,
  createPurchase,
} from "./actions";
import type { Supplier, Product } from "@/lib/types";
import type { PurchaseRow } from "@/components/suppliers/purchase-table";

// ─── Props ─────────────────────────────────────────────────────────────────────

interface SuppliersClientProps {
  suppliers: Supplier[];
  products: Product[];
  purchases: PurchaseRow[];
}

// ─── Tab type ──────────────────────────────────────────────────────────────────

type Tab = "suppliers" | "purchases";

const TABS: { id: Tab; label: string }[] = [
  { id: "suppliers", label: "Suppliers" },
  { id: "purchases", label: "Purchases" },
];

// ─── Toast ─────────────────────────────────────────────────────────────────────

interface ToastState {
  type: "success" | "error";
  message: string;
}

// ─── Main client component ─────────────────────────────────────────────────────

export function SuppliersClient({
  suppliers,
  products,
  purchases,
}: SuppliersClientProps) {
  const router = useRouter();

  // — Tab state
  const [activeTab, setActiveTab] = useState<Tab>("suppliers");

  // — Dialog state
  const [showSupplierForm, setShowSupplierForm] = useState<
    null | "create" | Supplier
  >(null);
  const [showPurchaseForm, setShowPurchaseForm] = useState(false);
  const [selectedPurchase, setSelectedPurchase] = useState<PurchaseRow | null>(
    null
  );

  // — Toast
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
      showSupplierForm === "create"
        ? "Supplier added successfully."
        : "Supplier updated."
    );
    router.refresh();
  }

  async function handleDeleteSupplier(supplier: Supplier) {
    const confirmed = window.confirm(
      `Delete supplier "${supplier.name}"? This cannot be undone.`
    );
    if (!confirmed) return;

    const result = await deleteSupplier(supplier.id);
    if (result.error) {
      showToast("error", result.error);
    } else {
      showToast("success", "Supplier deleted.");
      router.refresh();
    }
  }

  async function handleSavePurchase(data: {
    supplier_id: string;
    notes: string | null;
    items: Array<{
      product_id: string;
      quantity: number;
      cost_price: number;
      expiry_date: string | null;
    }>;
  }) {
    const result = await createPurchase(data);
    if (result.error) throw new Error(result.error);
    showToast("success", "Purchase recorded.");
    setShowPurchaseForm(false);
    router.refresh();
  }

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
    if (activeTab === "purchases") {
      return (
        <button
          onClick={() => setShowPurchaseForm(true)}
          className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          <Plus className="h-3.5 w-3.5" />
          New Purchase
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

    return null;
  }

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col h-full">
      {/* Page header */}
      <div className="px-6 py-4 border-b border-border bg-card flex items-center justify-between shrink-0 gap-4 flex-wrap">
        {/* Left: title + tabs */}
        <div className="flex items-center gap-6">
          <h1 className="text-lg font-bold text-foreground shrink-0">
            Suppliers
          </h1>

          {/* Pill tabs */}
          <nav className="flex items-center gap-1" aria-label="Suppliers tabs">
            {TABS.map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`relative px-3 py-1.5 text-sm font-medium transition-colors rounded-t ${
                    isActive
                      ? "text-primary after:absolute after:bottom-0 after:inset-x-0 after:h-0.5 after:bg-primary"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Right: action button */}
        <div className="shrink-0">{renderActionButton()}</div>
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-auto p-6">{renderTabContent()}</div>

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
          supplier={
            showSupplierForm === "create" ? null : (showSupplierForm as Supplier)
          }
          onClose={() => setShowSupplierForm(null)}
          onSave={handleSaveSupplier}
        />
      )}

      {/* Purchase form dialog */}
      {showPurchaseForm && (
        <PurchaseFormDialog
          suppliers={suppliers}
          products={products}
          onClose={() => setShowPurchaseForm(false)}
          onSave={handleSavePurchase}
        />
      )}

      {/* Purchase detail dialog */}
      {selectedPurchase && (
        <PurchaseDetailDialog
          purchase={selectedPurchase}
          onClose={() => setSelectedPurchase(null)}
        />
      )}
    </div>
  );
}
