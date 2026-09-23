"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Tag, X } from "lucide-react";
import { SnowflakePattern } from "@/components/snowflake-pattern";
import { ProductTable } from "@/components/inventory/product-table";
import { ProductFormDialog } from "@/components/inventory/product-form-dialog";
import { StockTable } from "@/components/inventory/stock-table";
import { BulkReceiveStockDialog } from "@/components/inventory/bulk-receive-stock-dialog";
import type { BulkReceiveData } from "@/components/inventory/bulk-receive-stock-dialog";
import { AdjustmentDialog } from "@/components/inventory/adjustment-dialog";
import { AlertsPanel } from "@/components/inventory/alerts-panel";
import {
  createProduct,
  updateProduct,
  deleteProduct,
  toggleProductActive,
  createCategory,
  deleteCategory,
  receiveBulkStock,
  adjustStock,
} from "./actions";
import { formatDate } from "@/lib/utils";
import type { AdjustmentReason, Category, Product, ProductPackage, Profile, StockAdjustment, Supplier } from "@/lib/types";
import type { StockBatch } from "@/lib/types";

// ─── Local row types ───────────────────────────────────────────────────────────

type StockBatchRow = Omit<StockBatch, "product"> & {
  product: { name: string; unit: string };
};

type AdjustmentRow = Omit<StockAdjustment, "product" | "adjuster"> & {
  product: { name: string };
  adjuster: { full_name: string };
};

// ─── Props ─────────────────────────────────────────────────────────────────────

interface InventoryClientProps {
  profile: Profile;
  products: Product[];
  categories: Category[];
  batches: StockBatchRow[];
  adjustments: AdjustmentRow[];
  suppliers: Pick<Supplier, "id" | "name">[];
  packages: ProductPackage[];
}

// ─── Tab type ──────────────────────────────────────────────────────────────────

type Tab = "products" | "stock" | "adjustments" | "alerts";

const TABS: { id: Tab; label: string }[] = [
  { id: "products", label: "Products" },
  { id: "stock", label: "Stock" },
  { id: "adjustments", label: "Adjustments" },
  { id: "alerts", label: "Alerts" },
];

// ─── Toast ─────────────────────────────────────────────────────────────────────

interface ToastState {
  type: "success" | "error";
  message: string;
}

// ─── Reason badge ──────────────────────────────────────────────────────────────

const REASON_BADGE_MAP: Record<
  AdjustmentReason,
  { label: string; cls: string }
> = {
  write_off:  { label: "Write-off",  cls: "bg-orange-100 text-orange-700" },
  waste:      { label: "Waste",      cls: "bg-orange-100 text-orange-700" },
  theft:      { label: "Theft",      cls: "bg-red-100 text-red-700" },
  damaged:    { label: "Damaged",    cls: "bg-amber-100 text-amber-700" },
  correction: { label: "Correction", cls: "bg-accent/12 text-accent" },
  return:     { label: "Return",     cls: "bg-blue-100 text-blue-700" },
  found:      { label: "Found",      cls: "bg-success/12 text-success" },
};

function ReasonBadge({ reason }: { reason: StockAdjustment["reason"] }) {
  const badge = REASON_BADGE_MAP[reason] ?? { label: reason, cls: "bg-secondary text-foreground" };
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${badge.cls}`}>
      {badge.label}
    </span>
  );
}

// ─── Category Manager Dialog ───────────────────────────────────────────────────

interface CategoryManagerProps {
  categories: Category[];
  onClose: () => void;
  onAdd: (name: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}

function CategoryManagerDialog({
  categories,
  onClose,
  onAdd,
  onDelete,
}: CategoryManagerProps) {
  const [newName, setNewName] = useState("");
  const [adding, setAdding] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  function handleBackdropClick(e: React.MouseEvent<HTMLDivElement>) {
    if (e.target === e.currentTarget) onClose();
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = newName.trim();
    if (!trimmed) return;
    setError(null);
    setAdding(true);
    try {
      await onAdd(trimmed);
      setNewName("");
      inputRef.current?.focus();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add category.");
    } finally {
      setAdding(false);
    }
  }

  async function handleDelete(id: string) {
    setError(null);
    setDeletingId(id);
    try {
      await onDelete(id);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to delete category."
      );
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={handleBackdropClick}
    >
      <div className="w-full max-w-sm mx-4 bg-card rounded-2xl shadow-2xl flex flex-col max-h-[80vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-border">
          <h2 className="text-base font-semibold text-foreground">
            Manage Categories
          </h2>
          <button
            onClick={onClose}
            aria-label="Close dialog"
            className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Category list — scrollable */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {categories.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">
              No categories yet
            </p>
          ) : (
            <ul className="space-y-1">
              {categories.map((cat) => (
                <li
                  key={cat.id}
                  className="flex items-center justify-between rounded-lg px-3 py-2 hover:bg-secondary group"
                >
                  <span className="text-sm text-foreground">{cat.name}</span>
                  <button
                    onClick={() => handleDelete(cat.id)}
                    disabled={deletingId === cat.id}
                    aria-label={`Delete ${cat.name}`}
                    className="rounded p-1 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity hover:bg-destructive/8 hover:text-destructive disabled:opacity-40"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </li>
              ))}
            </ul>
          )}

          {error && (
            <p className="mt-3 rounded-lg bg-destructive/8 px-3 py-2 text-xs font-medium text-destructive">
              {error}
            </p>
          )}
        </div>

        {/* Add category footer */}
        <div className="border-t border-border px-6 py-4">
          <form onSubmit={handleAdd} className="flex gap-2">
            <input
              ref={inputRef}
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="New category name"
              className="flex-1 h-9 rounded-lg border border-border bg-card px-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            />
            <button
              type="submit"
              disabled={adding || !newName.trim()}
              className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors"
            >
              <Plus className="h-3.5 w-3.5" />
              Add
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

// ─── Main client component ─────────────────────────────────────────────────────

export function InventoryClient({
  profile: _profile,
  products,
  categories,
  batches,
  adjustments,
  suppliers,
  packages,
}: InventoryClientProps) {
  const router = useRouter();

  // — Tab state
  const [activeTab, setActiveTab] = useState<Tab>("products");

  // — Dialog visibility
  const [showProductForm, setShowProductForm] = useState<
    null | "create" | Product
  >(null);
  const [showReceiveStock, setShowReceiveStock] = useState(false);
  const [showAdjustment, setShowAdjustment] = useState(false);
  const [showCategoryManager, setShowCategoryManager] = useState(false);

  // — Filter state
  const [search, setSearch] = useState("");
  const [productFilter, setProductFilter] = useState("");

  // — Toast
  const [toast, setToast] = useState<ToastState | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function showToast(type: ToastState["type"], message: string) {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast({ type, message });
    toastTimer.current = setTimeout(() => setToast(null), 2000);
  }

  // Clear timer on unmount
  useEffect(() => {
    return () => {
      if (toastTimer.current) clearTimeout(toastTimer.current);
    };
  }, []);

  // — Derived data
  const filteredProducts = products.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase())
  );

  // — Action handlers

  async function handleSaveProduct(data: {
    name: string;
    category_id: string | null;
    unit: string;
    units_per_box: number;
    selling_price: number;
    wholesale_price: number | null;
    low_stock_threshold: number;
    image_url: string | null;
  }) {
    let result: { error?: string };
    if (showProductForm === "create") {
      result = await createProduct(data);
    } else if (showProductForm && typeof showProductForm === "object") {
      result = await updateProduct(showProductForm.id, data);
    } else {
      return;
    }
    if (result.error) throw new Error(result.error);
    showToast(
      "success",
      showProductForm === "create"
        ? "Product created successfully."
        : "Product updated."
    );
    router.refresh();
  }

  async function handleToggleActive(product: Product) {
    const result = await toggleProductActive(product.id, !product.is_active);
    if (result.error) {
      showToast("error", result.error);
    } else {
      showToast(
        "success",
        product.is_active ? "Product deactivated." : "Product activated."
      );
      router.refresh();
    }
  }

  async function handleDeleteProduct(product: Product) {
    const result = await deleteProduct(product.id);
    if (result.error) {
      showToast("error", result.error.includes("foreign key")
        ? `"${product.name}" has sales history and cannot be deleted. Deactivate it instead.`
        : result.error);
    } else {
      showToast("success", `"${product.name}" deleted.`);
      router.refresh();
    }
  }

  async function handleReceiveStock(data: BulkReceiveData) {
    const result = await receiveBulkStock(data);
    if (result.error) throw new Error(result.error);
    showToast("success", "Stock received.");
    router.refresh();
  }

  async function handleAdjustStock(data: {
    product_id: string;
    quantity_change: number;
    reason: AdjustmentReason;
    notes: string | null;
  }) {
    const result = await adjustStock(data);
    if (result.error) throw new Error(result.error);
    showToast("success", "Adjustment logged.");
    router.refresh();
  }

  async function handleAddCategory(name: string) {
    const result = await createCategory(name);
    if ("error" in result) throw new Error(result.error);
    showToast("success", `Category "${result.name}" added.`);
    router.refresh();
  }

  async function handleDeleteCategory(id: string) {
    const result = await deleteCategory(id);
    if (result.error) throw new Error(result.error);
    showToast("success", "Category deleted.");
    router.refresh();
  }

  // ─── Action button per tab ───────────────────────────────────────────────

  function renderActionButton() {
    if (activeTab === "products") {
      return (
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowCategoryManager(true)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-secondary transition-colors"
          >
            <Tag className="h-3.5 w-3.5" />
            Manage Categories
          </button>
          <button
            onClick={() => setShowProductForm("create")}
            className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            <Plus className="h-3.5 w-3.5" />
            Add Product
          </button>
        </div>
      );
    }
    if (activeTab === "stock") {
      return (
        <button
          onClick={() => setShowReceiveStock(true)}
          className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          <Plus className="h-3.5 w-3.5" />
          Receive Stock
        </button>
      );
    }
    if (activeTab === "adjustments") {
      return (
        <button
          onClick={() => setShowAdjustment(true)}
          className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          <Plus className="h-3.5 w-3.5" />
          Log Adjustment
        </button>
      );
    }
    return null;
  }

  // ─── Tab content ─────────────────────────────────────────────────────────

  function renderTabContent() {
    if (activeTab === "products") {
      return (
        <div className="space-y-4">
          {/* Search */}
          <div className="flex items-center gap-3">
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search products…"
              className="h-9 w-full max-w-xs rounded-lg border border-border bg-card px-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            />
          </div>

          {/* Table */}
          <div className="rounded-xl border border-border bg-card overflow-hidden">
            <ProductTable
              products={filteredProducts}
              categories={categories}
              onEdit={(p) => setShowProductForm(p)}
              onToggleActive={handleToggleActive}
              onDelete={handleDeleteProduct}
            />
          </div>
        </div>
      );
    }

    if (activeTab === "stock") {
      return (
        <div className="space-y-4">
          {/* Product filter */}
          <div>
            <select
              value={productFilter}
              onChange={(e) => setProductFilter(e.target.value)}
              className="h-9 rounded-lg border border-border bg-card px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            >
              <option value="">All Products</option>
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          {/* Table */}
          <div className="rounded-xl border border-border bg-card overflow-hidden">
            <StockTable batches={batches} productFilter={productFilter} />
          </div>
        </div>
      );
    }

    if (activeTab === "adjustments") {
      return (
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          {adjustments.length === 0 ? (
            <div className="flex items-center justify-center py-20 text-sm text-muted-foreground">
              No adjustments logged yet
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full border-separate border-spacing-0">
                <thead>
                  <tr>
                    {["Date", "Product", "Change", "Reason", "Notes", "Adjusted By"].map(
                      (heading) => (
                        <th
                          key={heading}
                          className="sticky top-0 bg-card px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground first:pl-5 last:pr-5"
                        >
                          {heading}
                        </th>
                      )
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {adjustments.map((adj) => {
                    const isPositive = adj.quantity_change > 0;
                    return (
                      <tr
                        key={adj.id}
                        className="hover:bg-secondary transition-colors"
                      >
                        {/* Date */}
                        <td className="whitespace-nowrap px-4 py-3 pl-5 text-sm text-muted-foreground">
                          {formatDate(adj.created_at)}
                        </td>

                        {/* Product */}
                        <td className="whitespace-nowrap px-4 py-3 text-sm font-medium text-foreground">
                          {adj.product.name}
                        </td>

                        {/* Change */}
                        <td className="whitespace-nowrap px-4 py-3">
                          <span
                            className={`text-sm font-semibold tabular-nums ${
                              isPositive ? "text-success" : "text-destructive"
                            }`}
                          >
                            {isPositive ? "+" : ""}
                            {adj.quantity_change}
                          </span>
                        </td>

                        {/* Reason */}
                        <td className="whitespace-nowrap px-4 py-3">
                          <ReasonBadge reason={adj.reason} />
                        </td>

                        {/* Notes */}
                        <td className="px-4 py-3 text-sm text-muted-foreground max-w-xs truncate">
                          {adj.notes ?? (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </td>

                        {/* Adjusted By */}
                        <td className="whitespace-nowrap px-4 py-3 pr-5 text-sm text-muted-foreground">
                          {adj.adjuster.full_name}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      );
    }

    if (activeTab === "alerts") {
      return (
        <AlertsPanel
          products={products as (Product & { stock_quantity: number })[]}
          batches={batches}
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
          {/* Left: strip + title + tabs */}
          <div className="flex items-center gap-3 lg:gap-6 overflow-x-auto no-scrollbar">
            <div className="w-1 self-stretch rounded-full bg-accent shrink-0" />
            <h1 className="text-lg font-bold text-foreground shrink-0">
              Inventory
            </h1>

            {/* Pill tabs */}
            <nav className="flex items-center gap-1" aria-label="Inventory tabs">
              {TABS.map((tab) => {
                const isActive = activeTab === tab.id;
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
                    {tab.label}
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

      {/* Dialogs */}
      {showProductForm !== null && (
        <ProductFormDialog
          product={
            showProductForm === "create" ? null : (showProductForm as Product)
          }
          categories={categories}
          packages={
            showProductForm !== "create" && showProductForm !== null
              ? packages.filter((p) => p.product_id === (showProductForm as Product).id)
              : []
          }
          onClose={() => setShowProductForm(null)}
          onSave={handleSaveProduct}
          onPackagesChange={() => router.refresh()}
        />
      )}

      {showReceiveStock && (
        <BulkReceiveStockDialog
          products={products}
          suppliers={suppliers}
          onClose={() => setShowReceiveStock(false)}
          onSave={handleReceiveStock}
        />
      )}

      {showAdjustment && (
        <AdjustmentDialog
          products={products}
          onClose={() => setShowAdjustment(false)}
          onSave={handleAdjustStock}
        />
      )}

      {showCategoryManager && (
        <CategoryManagerDialog
          categories={categories}
          onClose={() => setShowCategoryManager(false)}
          onAdd={handleAddCategory}
          onDelete={handleDeleteCategory}
        />
      )}
    </div>
  );
}
