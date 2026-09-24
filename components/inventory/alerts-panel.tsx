"use client";

import { useState } from "react";
import { AlertTriangle, Package, PackageX, Tag } from "lucide-react";
import { Product, StockBatch } from "@/lib/types";
import { daysUntilExpiry, formatDateOnly, formatCurrency } from "@/lib/utils";
import { markdownProduct } from "@/app/(dashboard)/inventory/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

// ---- Extended types --------------------------------------------------------

type ProductWithStock = Product & { stock_quantity: number };

interface StockBatchWithProduct extends Omit<StockBatch, "product"> {
  product: { name: string; unit: string };
  product_id: string;
}

// ---- Props -----------------------------------------------------------------

interface AlertsPanelProps {
  products: ProductWithStock[];
  batches: StockBatchWithProduct[];
}

// ---- Helpers ---------------------------------------------------------------

type ExpiryUrgency = "expired" | "critical" | "warning";

function getExpiryUrgency(days: number): ExpiryUrgency {
  if (days <= 0) return "expired";
  if (days <= 3) return "critical";
  return "warning";
}

interface ExpiryStyle {
  card: string;
  iconBg: string;
  icon: string;
  label: string;
}

const EXPIRY_STYLES: Record<ExpiryUrgency, ExpiryStyle> = {
  expired: {
    card: "bg-destructive/8",
    iconBg: "bg-red-100",
    icon: "text-destructive",
    label: "text-red-700",
  },
  critical: {
    card: "bg-orange-50",
    iconBg: "bg-orange-100",
    icon: "text-orange-500",
    label: "text-orange-700",
  },
  warning: {
    card: "bg-yellow-50",
    iconBg: "bg-yellow-100",
    icon: "text-yellow-600",
    label: "text-yellow-700",
  },
};

function expiryMessage(days: number): string {
  if (days <= 0) return "EXPIRED";
  if (days === 1) return "Expires today";
  return `Expires in ${days} day${days === 1 ? "" : "s"}`;
}

// ---- Sub-components --------------------------------------------------------

function EmptyCard({ message }: { message: string }) {
  return (
    <div className="rounded-xl border border-border bg-secondary px-4 py-3 text-xs text-muted-foreground">
      {message}
    </div>
  );
}

interface ExpiryCardProps {
  batch: StockBatchWithProduct & { product_id: string };
  days: number;
}

function ExpiryCard({ batch, days }: ExpiryCardProps) {
  const urgency = getExpiryUrgency(days);
  const styles = EXPIRY_STYLES[urgency];

  const [showMarkdown, setShowMarkdown] = useState(false);
  const [newPrice, setNewPrice] = useState("");
  const [saving, setSaving] = useState(false);
  const [mdError, setMdError] = useState<string | null>(null);
  const [mdDone, setMdDone] = useState(false);

  async function handleMarkdown() {
    const price = parseFloat(newPrice);
    if (!price || price <= 0) { setMdError("Enter a valid price."); return; }
    setSaving(true);
    setMdError(null);
    const res = await markdownProduct(batch.product_id, price);
    setSaving(false);
    if (res.error) { setMdError(res.error); return; }
    setMdDone(true);
    setShowMarkdown(false);
  }

  return (
    <div className={`rounded-xl border border-border px-4 py-3 ${styles.card}`}>
      <div className="flex items-start gap-3">
        <div className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${styles.iconBg}`}>
          <AlertTriangle className={`h-3.5 w-3.5 ${styles.icon}`} aria-hidden />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-foreground truncate">
            {batch.product.name}
          </p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {batch.quantity_remaining} {batch.product.unit} remaining
          </p>
          <div className="mt-1 flex items-center gap-2 flex-wrap">
            <span className="text-xs text-muted-foreground">
              Expires {formatDateOnly(batch.expiry_date!)}
            </span>
            <span className={`text-xs font-semibold uppercase tracking-wide ${styles.label}`}>
              {expiryMessage(days)}
            </span>
          </div>

          {/* Mark Down inline form */}
          {!mdDone && !showMarkdown && (
            <button
              onClick={() => setShowMarkdown(true)}
              className="mt-2 flex items-center gap-1 text-xs font-semibold text-accent hover:underline"
            >
              <Tag className="h-3 w-3" aria-hidden /> Mark Down
            </button>
          )}
          {mdDone && (
            <p className="mt-2 text-xs font-semibold text-success">Price updated.</p>
          )}
          {showMarkdown && (
            <div className="mt-2 flex items-center gap-2">
              <Input
                type="number"
                min={0.01}
                step={0.01}
                placeholder="New selling price"
                value={newPrice}
                onChange={(e) => setNewPrice(e.target.value)}
                className="h-7 text-xs w-36"
              />
              <Button
                size="sm"
                disabled={saving}
                onClick={handleMarkdown}
                className="h-7 text-xs px-3"
              >
                {saving ? "Saving…" : "Confirm"}
              </Button>
              <button
                onClick={() => { setShowMarkdown(false); setMdError(null); }}
                className="text-xs text-muted-foreground hover:text-foreground"
              >
                Cancel
              </button>
            </div>
          )}
          {mdError && <p className="mt-1 text-xs text-destructive">{mdError}</p>}
        </div>
      </div>
    </div>
  );
}

interface StockCardProps {
  product: ProductWithStock;
}

function StockCard({ product }: StockCardProps) {
  const isOut = product.stock_quantity === 0;

  return (
    <div className={`rounded-xl border border-border px-4 py-3 ${isOut ? "bg-destructive/8" : "bg-yellow-50"}`}>
      <div className="flex items-start gap-3">
        <div className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${isOut ? "bg-red-100" : "bg-yellow-100"}`}>
          {isOut ? (
            <PackageX className="h-3.5 w-3.5 text-destructive" aria-hidden />
          ) : (
            <Package className="h-3.5 w-3.5 text-yellow-600" aria-hidden />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-foreground truncate">
            {product.name}
          </p>
          {isOut ? (
            <p className="mt-0.5 text-xs font-semibold uppercase tracking-wide text-destructive">
              Out of Stock
            </p>
          ) : (
            <p className="mt-0.5 text-xs text-muted-foreground">
              {product.stock_quantity} {product.unit} remaining &mdash; threshold{" "}
              {product.low_stock_threshold} {product.unit}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

// ---- Main component --------------------------------------------------------

export function AlertsPanel({ products, batches }: AlertsPanelProps) {
  // --- Expiring batches: has expiry_date, qty > 0, days <= 7 ---------------
  const expiringBatches = batches
    .filter(
      (b) =>
        b.expiry_date !== null &&
        b.quantity_remaining > 0 &&
        daysUntilExpiry(b.expiry_date) <= 7
    )
    .map((b) => ({ batch: b, days: daysUntilExpiry(b.expiry_date!) }))
    .sort((a, b) => a.days - b.days);

  // --- Low stock: above zero but at or below threshold ---------------------
  const lowStockProducts = products.filter(
    (p) => p.stock_quantity > 0 && p.stock_quantity <= p.low_stock_threshold
  );

  // --- Out of stock: exactly zero ------------------------------------------
  const outOfStockProducts = products.filter((p) => p.stock_quantity === 0);

  return (
    <div className="space-y-6">
      {/* ---- Section 1: Expiring Soon ---- */}
      <section>
        <h3 className="text-base font-semibold text-foreground mb-3">
          Expiring Soon (&le;&nbsp;7 days)
        </h3>
        {expiringBatches.length === 0 ? (
          <EmptyCard message="No batches expiring within 7 days" />
        ) : (
          <div className="space-y-2">
            {expiringBatches.map(({ batch, days }) => (
              <ExpiryCard key={batch.id} batch={batch} days={days} />
            ))}
          </div>
        )}
      </section>

      {/* ---- Section 2: Out of Stock ---- */}
      <section>
        <h3 className="text-base font-semibold text-foreground mb-3">
          Out of Stock
        </h3>
        {outOfStockProducts.length === 0 ? (
          <EmptyCard message="No products are out of stock" />
        ) : (
          <div className="space-y-2">
            {outOfStockProducts.map((p) => (
              <StockCard key={p.id} product={p} />
            ))}
          </div>
        )}
      </section>

      {/* ---- Section 3: Low Stock ---- */}
      <section>
        <h3 className="text-base font-semibold text-foreground mb-3">
          Low Stock
        </h3>
        {lowStockProducts.length === 0 ? (
          <EmptyCard message="All stock levels are healthy" />
        ) : (
          <div className="space-y-2">
            {lowStockProducts.map((p) => (
              <StockCard key={p.id} product={p} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
