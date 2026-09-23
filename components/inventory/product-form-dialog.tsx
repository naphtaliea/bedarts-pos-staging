"use client";

import { useEffect, useRef, useState } from "react";
import { X, Upload, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Category, Product, ProductPackage } from "@/lib/types";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { upsertBoxPackages } from "@/app/(dashboard)/inventory/actions";

interface ProductFormData {
  name: string;
  category_id: string | null;
  unit: string;
  units_per_box: number;
  selling_price: number;
  wholesale_price: number | null;
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
  onToggleActive?: (product: Product) => Promise<void> | void;
  onDelete?: (product: Product) => Promise<void> | void;
}


function getDefaultForm(product: Product | null): ProductFormData {
  if (product) {
    return {
      name: product.name,
      category_id: product.category_id ?? null,
      unit: product.unit === "kg" ? "kg" : "pieces",
      units_per_box: product.units_per_box,
      selling_price: product.selling_price,
      wholesale_price: product.wholesale_price ?? null,
      low_stock_threshold: product.low_stock_threshold,
      image_url: product.image_url ?? null,
    };
  }
  return {
    name: "",
    category_id: null,
    unit: "kg",
    units_per_box: 10,
    selling_price: 0,
    wholesale_price: null,
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
  onToggleActive,
  onDelete,
}: ProductFormDialogProps) {
  const isEdit = product !== null;
  const [confirmDelete, setConfirmDelete] = useState(false);
  const confirmDeleteTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const [form, setForm] = useState<ProductFormData>(() =>
    getDefaultForm(product)
  );
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Box-package pricing — Full and Half. Prices are initialized from existing packages
  // (or defaulted from selling_price × qty when creating new), and saved with the form.
  const initialFullPrice = packages.find((p) => p.label === "Full Box")?.price ?? "";
  const initialHalfPrice = packages.find((p) => p.label === "Half Box")?.price ?? "";
  const [fullBoxPrice, setFullBoxPrice] = useState<string>(String(initialFullPrice ?? ""));
  const [halfBoxPrice, setHalfBoxPrice] = useState<string>(String(initialHalfPrice ?? ""));
  const [pkgError, setPkgError] = useState<string | null>(null);

  // Re-sync if the product prop changes (e.g. parent swaps which product to edit)
  useEffect(() => {
    setForm(getDefaultForm(product));
    setError(null);
    const full = packages.find((p) => p.label === "Full Box")?.price;
    const half = packages.find((p) => p.label === "Half Box")?.price;
    setFullBoxPrice(full != null ? String(full) : "");
    setHalfBoxPrice(half != null ? String(half) : "");
  }, [product, packages]);

  function set<K extends keyof ProductFormData>(
    key: K,
    value: ProductFormData[K]
  ) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!form.name.trim()) {
      setError("Product name is required.");
      return;
    }
    if (form.selling_price <= 0) {
      setError("Selling price must be greater than 0.");
      return;
    }
    setSubmitting(true);
    try {
      await onSave(form);

      // Persist box package prices (only meaningful when editing — createProduct
      // auto-provisions Full/Half packages with defaults on the server)
      if (isEdit && product?.id) {
        const full = parseFloat(fullBoxPrice) || 0;
        const half = parseFloat(halfBoxPrice) || 0;
        if (full > 0 || half > 0) {
          const res = await upsertBoxPackages(product.id, full, half);
          if (res.error) {
            setPkgError(res.error);
            setSubmitting(false);
            return;
          }
        }
        onPackagesChange?.();
      }

      onClose();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Something went wrong. Try again."
      );
    } finally {
      setSubmitting(false);
    }
  }

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setError(null);
    try {
      const supabase = createClient();
      const ext = file.name.split(".").pop() ?? "jpg";
      const path = `${crypto.randomUUID()}.${ext}`;
      const { error: uploadErr } = await supabase.storage
        .from("product-images")
        .upload(path, file, { upsert: true });
      if (uploadErr) throw uploadErr;
      const { data } = supabase.storage.from("product-images").getPublicUrl(path);
      set("image_url", data.publicUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Image upload failed.");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
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
            <select
              value={form.unit}
              onChange={(e) => set("unit", e.target.value)}
              className={cn(
                "flex h-10 w-full rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground",
                "focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              )}
            >
              <option value="kg">kg — sold by weight</option>
              <option value="pieces">pieces — sold by count</option>
            </select>
          </div>

          {/* Box size */}
          <div className="space-y-1.5">
            <label className="block text-xs font-medium text-muted-foreground">
              {form.unit === "kg" ? "Box Size (kg per box)" : "Units per box"}
            </label>
            <select
              value={form.units_per_box}
              onChange={(e) => set("units_per_box", parseInt(e.target.value))}
              className={cn(
                "flex h-10 w-full rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground",
                "focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              )}
            >
              {[10, 12, 15, 20, 24, 30].map((n) => (
                <option key={n} value={n}>{n}</option>
              ))}
            </select>
          </div>

          {/* Prices — two-column grid */}
          <div className="grid grid-cols-2 gap-3">
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
          </div>

          {/* Image */}
          <div className="space-y-2">
            <label className="block text-xs font-medium text-muted-foreground">
              Product Image <span className="font-normal text-muted-foreground/70">(optional)</span>
            </label>

            {/* Hidden file input */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              className="sr-only"
              onChange={handleImageUpload}
            />

            {/* Upload button */}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="flex items-center gap-2 px-3 h-9 rounded-lg border border-border text-sm text-muted-foreground hover:bg-secondary transition-colors disabled:opacity-50"
            >
              {uploading
                ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                : <Upload className="h-3.5 w-3.5" />}
              {uploading ? "Uploading…" : "Upload image"}
            </button>

            {/* URL input */}
            <div className="flex items-center gap-2">
              <div className="h-px flex-1 bg-border" />
              <span className="text-xs text-muted-foreground/60">or paste URL</span>
              <div className="h-px flex-1 bg-border" />
            </div>
            <Input
              type="url"
              value={form.image_url ?? ""}
              onChange={(e) => set("image_url", e.target.value.trim() || null)}
              placeholder="https://…"
            />

            {/* Preview */}
            {form.image_url && (
              <div className="flex items-center gap-3">
                <img
                  src={form.image_url}
                  alt="Preview"
                  className="h-16 w-24 rounded-lg object-cover border border-border"
                  onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                />
                <button
                  type="button"
                  onClick={() => set("image_url", null)}
                  className="text-xs text-muted-foreground hover:text-destructive transition-colors"
                >
                  Remove
                </button>
              </div>
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

          {/* Box package prices — edit mode only */}
          {isEdit && product?.id && (
            <div className="space-y-3 border-t border-border pt-4">
              <div>
                <label className="block text-xs font-medium text-muted-foreground">
                  Box Prices
                </label>
                <p className="text-[11px] text-muted-foreground/70 mt-0.5">
                  Prices shown to the cashier when they select Full Box or Half Box at checkout
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="block text-xs text-muted-foreground">
                    Full Box <span className="text-muted-foreground/60">({form.units_per_box} {form.unit === "kg" ? "kg" : "pcs"})</span>
                  </label>
                  <Input
                    type="number"
                    min={0}
                    step={0.01}
                    value={fullBoxPrice}
                    onChange={(e) => setFullBoxPrice(e.target.value)}
                    placeholder="0.00"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="block text-xs text-muted-foreground">
                    Half Box <span className="text-muted-foreground/60">({form.units_per_box / 2} {form.unit === "kg" ? "kg" : "pcs"})</span>
                  </label>
                  <Input
                    type="number"
                    min={0}
                    step={0.01}
                    value={halfBoxPrice}
                    onChange={(e) => setHalfBoxPrice(e.target.value)}
                    placeholder="0.00"
                  />
                </div>
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
        <div className="flex items-center justify-between gap-2 px-6 py-4 border-t border-border">
          {/* Left: destructive/status actions — only in edit mode */}
          <div className="flex items-center gap-2">
            {isEdit && onToggleActive && product && (
              <button
                type="button"
                onClick={async () => {
                  await onToggleActive(product);
                  onClose();
                }}
                disabled={submitting}
                className="text-xs font-medium text-muted-foreground hover:text-foreground transition-colors px-2 py-1"
              >
                {product.is_active ? "Deactivate" : "Activate"}
              </button>
            )}
            {isEdit && onDelete && product && (
              confirmDelete ? (
                <button
                  type="button"
                  onClick={async () => {
                    clearTimeout(confirmDeleteTimer.current);
                    setConfirmDelete(false);
                    await onDelete(product);
                    onClose();
                  }}
                  className="rounded-lg px-3 py-1.5 text-xs font-semibold text-destructive bg-destructive/10 hover:bg-destructive/15 transition-colors"
                >
                  Confirm delete?
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setConfirmDelete(true);
                    clearTimeout(confirmDeleteTimer.current);
                    confirmDeleteTimer.current = setTimeout(() => setConfirmDelete(false), 3000);
                  }}
                  disabled={submitting}
                  className="text-xs font-medium text-muted-foreground hover:text-destructive transition-colors px-2 py-1"
                >
                  Delete
                </button>
              )
            )}
          </div>

          {/* Right: cancel / save */}
          <div className="flex items-center gap-2">
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
    </div>
  );
}
