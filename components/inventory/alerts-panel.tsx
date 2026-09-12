"use client";

import { AlertTriangle, Package, PackageX } from "lucide-react";
import { Product, StockBatch } from "@/lib/types";
import { daysUntilExpiry, formatDateOnly } from "@/lib/utils";

// ---- Extended types --------------------------------------------------------

type ProductWithStock = Product & { stock_quantity: number };

interface StockBatchWithProduct extends Omit<StockBatch, "product"> {
  product: { name: string; unit: string };
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
  border: string;
  icon: string;
  label: string;
}

const EXPIRY_STYLES: Record<ExpiryUrgency, ExpiryStyle> = {
  expired: {
    card: "bg-red-50",
    border: "border-l-red-500",
    icon: "text-red-500",
    label: "text-red-700",
  },
  critical: {
    card: "bg-orange-50",
    border: "border-l-orange-400",
    icon: "text-orange-500",
    label: "text-orange-700",
  },
  warning: {
    card: "bg-yellow-50",
    border: "border-l-yellow-400",
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
  batch: StockBatchWithProduct;
  days: number;
}

function ExpiryCard({ batch, days }: ExpiryCardProps) {
  const urgency = getExpiryUrgency(days);
  const styles = EXPIRY_STYLES[urgency];

  return (
    <div
      className={`rounded-xl border-l-4 px-4 py-3 ${styles.card} ${styles.border}`}
    >
      <div className="flex items-start gap-3">
        <AlertTriangle
          className={`mt-0.5 h-4 w-4 shrink-0 ${styles.icon}`}
          aria-hidden
        />
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
            <span
              className={`text-xs font-semibold uppercase tracking-wide ${styles.label}`}
            >
              {expiryMessage(days)}
            </span>
          </div>
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
    <div
      className={`rounded-xl border-l-4 px-4 py-3 ${
        isOut
          ? "bg-red-50 border-l-red-500"
          : "bg-yellow-50 border-l-yellow-400"
      }`}
    >
      <div className="flex items-start gap-3">
        {isOut ? (
          <PackageX
            className="mt-0.5 h-4 w-4 shrink-0 text-red-500"
            aria-hidden
          />
        ) : (
          <Package
            className="mt-0.5 h-4 w-4 shrink-0 text-yellow-600"
            aria-hidden
          />
        )}
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-foreground truncate">
            {product.name}
          </p>
          {isOut ? (
            <p className="mt-0.5 text-xs font-semibold uppercase tracking-wide text-red-600">
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

  // --- Low stock: at or below threshold (not zero) -------------------------
  const lowStockProducts = products.filter(
    (p) =>
      p.stock_quantity > 0 && p.stock_quantity <= p.low_stock_threshold
  );

  // --- Out of stock: exactly zero ------------------------------------------
  const outOfStockProducts = products.filter((p) => p.stock_quantity === 0);

  const noStockAlerts =
    lowStockProducts.length === 0 && outOfStockProducts.length === 0;

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

      {/* ---- Section 2: Low Stock ---- */}
      <section>
        <h3 className="text-base font-semibold text-foreground mb-3">
          Low Stock
        </h3>
        {noStockAlerts ? (
          <EmptyCard message="All stock levels are healthy" />
        ) : (
          <div className="space-y-2">
            {outOfStockProducts.map((p) => (
              <StockCard key={p.id} product={p} />
            ))}
            {lowStockProducts.map((p) => (
              <StockCard key={p.id} product={p} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
