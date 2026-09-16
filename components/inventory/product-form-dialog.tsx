"use client";

import { useEffect, useState } from "react";
import { X, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Category, Product, ProductPackage } from "@/lib/types";
import { cn } from "@/lib/utils";
import { createProductPackage, deleteProductPackage } from "@/app/(dashboard)/inventory/actions";
import { formatCurrency } from "@/lib/utils";

interface ProductFormData {
  name: string;
  category_id: string | null;
  unit: string;
  selling_price: number;
  cost_price: number;
  wholesale_price: number | null;
  temperature_zone: "frozen" | "chilled" | "ambient";
  low_stock_threshold: number;
  image_url: string | null;
}

interface ProductFormDialogProps {
  product: Product | null;
  categories: Category[];
  packages?: ProductPackage[];
  onClose: () => void;
  onSave: (data: ProductFormData) => Promise<void>;
  onPackagesChange?: () => void;
}

const ZONE_OPTIONS: {
  value: ProductFormData["temperature_zone"];
  label: string;
}[] = [
  { value: "frozen", label: "Frozen" },
  { value: "chilled", label: "Chilled" },
  { value: "ambient", label: "Ambient" },
];

function getDefaultForm(product: Product | null): ProductFormData {
  if (product) {
    return {
      name: product.name,
      category_id: product.category_id ?? null,
      unit: product.unit,
      selling_price: product.selling_price,
      cost_price: product.cost_price,
      wholesale_price: product.wholesale_price ?? null,
      temperature_zone: product.temperature_zone,
      low_stock_threshold: product.low_stock_threshold,
      image_url: product.image_url ?? null,
    };
  }
  return {
    name: "",
    category_id: null,
    unit: "kg",
    selling_price: 0,
    cost_price: 0,
    wholesale_price: null,
    temperature_zone: "chilled",
    low_stock_threshold: 5,
    image_url: null,
  };
}

export function ProductFormDialog({
  product,
  categories,
  packages = [],
  onClose,
  onSave,
  onPackagesChange,
}: ProductFormDialogProps) {
  const isEdit = product !== null;

  const [form, setForm] = useState<ProductFormData>(() =>
    getDefaultForm(product)
  );
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [newPkg, setNewPkg] = useState({ label: "", quantity: "", price: "" });
  const [pkgSaving, setPkgSaving] = useState(false);
  const [pkgError, setPkgError] = useState<string | null>(null);

  // Re-sync if the product prop changes (e.g. parent swaps which product to edit)
  useEffect(() => {
    setForm(getDefaultForm(product));
    setError(null);
  }, [product]);

  function set<K extends keyof ProductFormData>(
    key: K,
    value: ProductFormData[K]
  ) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleAddPackage() {
    if (!product?.id) return;
    const qty = parseFloat(newPkg.quantity);
    const price = parseFloat(newPkg.price);
    if (!newPkg.label.trim() || !qty || !price) {
      setPkgError("Label, quantity, and price are required.");
      return;
    }
    setPkgError(null);
    setPkgSaving(true);
    const res = await createProductPackage({
      product_id: product.id,
      label: newPkg.label.trim(),
      quantity: qty,
      price,
    });
    setPkgSaving(false);
    if (res.error) { setPkgError(res.error); return; }
    setNewPkg({ label: "", quantity: "", price: "" });
    onPackagesChange?.();
  }

  async function handleDeletePackage(id: string) {
    const res = await deleteProductPackage(id);
    if (res.error) setPkgError(res.error);
    else onPackagesChange?.();
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await onSave(form);
      onClose();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Something went wrong. Try again."
      );
    } finally {
      setSubmitting(false);
    }
  }

  // Close on backdrop click
  function handleBackdropClick(e: React.MouseEvent<HTMLDivElement>) {
    if (e.target === e.currentTarget) onClose();
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={handleBackdropClick}
    >
      <div className="w-full max-w-lg mx-4 bg-card rounded-2xl shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-border">
          <h2 className="text-base font-semibold text-foreground">
            {isEdit ? "Edit Product" : "Add Product"}
          </h2>
          <button
            onClick={onClose}
            aria-label="Close dialog"
            className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-secondary hover:text-muted-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Form body — scrollable */}
        <form
          id="product-form"
          onSubmit={handleSubmit}
          className="flex-1 overflow-y-auto px-6 py-5 space-y-4"
        >
          {/* Name */}
          <div className="space-y-1.5">
            <label className="block text-xs font-medium text-muted-foreground">
              Name
            </label>
            <Input
              required
              value={form.name}
              onChange={(e) => set("name", e.target.value)}
              placeholder="e.g. Frozen Tilapia"
            />
          </div>

          {/* Category */}
          <div className="space-y-1.5">
            <label className="block text-xs font-medium text-muted-foreground">
              Category
            </label>
            <select
              value={form.category_id ?? ""}
              onChange={(e) =>
                set("category_id", e.target.value || null)
              }
              className={cn(
                "flex h-10 w-full rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground",
                "focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent",
                "disabled:cursor-not-allowed disabled:opacity-50"
              )}
            >
              <option value="">No Category</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>
          </div>

          {/* Unit */}
          <div className="space-y-1.5">
            <label className="block text-xs font-medium text-muted-foreground">
              Unit
            </label>
            <Input
              required
              value={form.unit}
              onChange={(e) => set("unit", e.target.value)}
              placeholder="e.g. kg, piece, box, bag"
            />
          </div>

          {/* Temperature Zone */}
          <div className="space-y-1.5">
            <label className="block text-xs font-medium text-muted-foreground">
              Temperature Zone
            </label>
            <div className="flex gap-2">
              {ZONE_OPTIONS.map(({ value, label }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => set("temperature_zone", value)}
                  className={cn(
                    "flex-1 py-1.5 rounded-lg text-xs font-semibold transition-colors",
                    form.temperature_zone === value
                      ? value === "frozen"
                        ? "bg-blue-700 text-white"
                        : value === "chilled"
                        ? "bg-cyan-600 text-white"
                        : "bg-amber-500 text-white"
                      : "bg-card border border-border text-muted-foreground hover:bg-secondary"
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Prices — three-column grid */}
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-muted-foreground">
                Selling Price (GH₵)
              </label>
              <Input
                required
                type="number"
                min={0}
                step={0.01}
                value={form.selling_price === 0 ? "" : form.selling_price}
                onChange={(e) =>
                  set("selling_price", parseFloat(e.target.value) || 0)
                }
                placeholder="0.00"
              />
            </div>
            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-muted-foreground">
                Wholesale Price (GH₵)
              </label>
              <Input
                type="number"
                min={0}
                step={0.01}
                value={form.wholesale_price == null ? "" : form.wholesale_price}
                onChange={(e) =>
                  set("wholesale_price", e.target.value === "" ? null : parseFloat(e.target.value) || 0)
                }
                placeholder="Optional"
              />
            </div>
            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-muted-foreground">
                Cost Price (GH₵)
              </label>
              <Input
                required
                type="number"
                min={0}
                step={0.01}
                value={form.cost_price === 0 ? "" : form.cost_price}
                onChange={(e) =>
                  set("cost_price", parseFloat(e.target.value) || 0)
                }
                placeholder="0.00"
              />
            </div>
          </div>

          {/* Image URL */}
          <div className="space-y-1.5">
            <label className="block text-xs font-medium text-muted-foreground">
              Image URL <span className="font-normal text-muted-foreground/70">(optional)</span>
            </label>
            <Input
              type="url"
              value={form.image_url ?? ""}
              onChange={(e) => set("image_url", e.target.value.trim() || null)}
              placeholder="https://…"
            />
            {form.image_url && (
              <img
                src={form.image_url}
                alt="Preview"
                className="h-16 w-24 rounded-lg object-cover border border-border mt-1"
                onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
              />
            )}
          </div>

          {/* Low Stock Alert */}
          <div className="space-y-1.5">
            <label className="block text-xs font-medium text-muted-foreground">
              Low Stock Alert
            </label>
            <Input
              required
              type="number"
              min={0}
              step={1}
              value={form.low_stock_threshold === 0 ? "" : form.low_stock_threshold}
              onChange={(e) =>
                set("low_stock_threshold", parseInt(e.target.value, 10) || 0)
              }
              placeholder="5"
            />
            <p className="text-xs text-muted-foreground">
              Alert when stock falls below this quantity
            </p>
          </div>

          {/* Packages — edit mode only */}
          {isEdit && product?.id && (
            <div className="space-y-3 border-t border-border pt-4">
              <label className="block text-xs font-medium text-muted-foreground">
                Box / Package Options
              </label>

              {/* Existing packages */}
              {packages.length > 0 && (
                <div className="space-y-1.5">
                  {packages.map((pkg) => (
                    <div
                      key={pkg.id}
                      className="flex items-center justify-between rounded-lg bg-secondary px-3 py-2"
                    >
                      <div className="text-sm text-foreground">
                        <span className="font-medium">{pkg.label}</span>
                        <span className="text-muted-foreground ml-2 text-xs">
                          {pkg.quantity} {form.unit} · {formatCurrency(pkg.price)}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleDeletePackage(pkg.id)}
                        className="rounded p-1 text-muted-foreground hover:text-destructive transition-colors"
                        aria-label="Delete package"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Add new package */}
              <div className="grid grid-cols-[1fr_80px_90px_auto] gap-2 items-end">
                <div>
                  <label className="block text-xs text-muted-foreground mb-1">Label</label>
                  <Input
                    value={newPkg.label}
                    onChange={(e) => setNewPkg((p) => ({ ...p, label: e.target.value }))}
                    placeholder="e.g. Box of 10"
                  />
                </div>
                <div>
                  <label className="block text-xs text-muted-foreground mb-1">Qty</label>
                  <Input
                    type="number"
                    min={0.01}
                    step={0.01}
                    value={newPkg.quantity}
                    onChange={(e) => setNewPkg((p) => ({ ...p, quantity: e.target.value }))}
                    placeholder="10"
                  />
                </div>
                <div>
                  <label className="block text-xs text-muted-foreground mb-1">Price (GH₵)</label>
                  <Input
                    type="number"
                    min={0}
                    step={0.01}
                    value={newPkg.price}
                    onChange={(e) => setNewPkg((p) => ({ ...p, price: e.target.value }))}
                    placeholder="0.00"
                  />
                </div>
                <button
                  type="button"
                  onClick={handleAddPackage}
                  disabled={pkgSaving}
                  className="flex items-center justify-center h-10 w-10 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors"
                  aria-label="Add package"
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>

              {pkgError && (
                <p className="text-xs text-destructive">{pkgError}</p>
              )}
            </div>
          )}

          {/* Error */}
          {error && (
            <p className="rounded-lg bg-destructive/8 px-3 py-2 text-xs font-medium text-destructive">
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
            disabled={submitting}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            form="product-form"
            disabled={submitting}
          >
            {submitting ? "Saving…" : "Save"}
          </Button>
        </div>
      </div>
    </div>
  );
}
