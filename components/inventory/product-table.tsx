"use client";

import { useRef, useState } from "react";
import {
  AlertTriangle,
  Eye,
  EyeOff,
  Package,
  Pencil,
  Snowflake,
  Thermometer,
  Trash2,
} from "lucide-react";
import { Category, Product } from "@/lib/types";
import { cn, formatCurrency } from "@/lib/utils";

interface ProductTableProps {
  products: Product[];
  categories: Category[];
  onEdit: (product: Product) => void;
  onToggleActive: (product: Product) => void;
  onDelete: (product: Product) => void;
}

function ZoneBadge({ zone }: { zone: Product["temperature_zone"] }) {
  if (zone === "frozen") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-accent/12 px-2.5 py-0.5 text-xs font-medium text-accent">
        <Snowflake className="h-3 w-3" />
        Frozen
      </span>
    );
  }
  if (zone === "chilled") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-cyan-100 px-2.5 py-0.5 text-xs font-medium text-cyan-700">
        <Thermometer className="h-3 w-3" />
        Chilled
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-warning/12 px-2.5 py-0.5 text-xs font-medium text-warning">
      <Package className="h-3 w-3" />
      Ambient
    </span>
  );
}

function StockCell({ product }: { product: Product }) {
  const qty = product.stock_quantity ?? 0;

  if (qty === 0) {
    return (
      <span className="inline-flex items-center gap-1 text-sm font-medium text-destructive">
        <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
        Out
      </span>
    );
  }

  const isLow = qty <= product.low_stock_threshold;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 text-sm",
        isLow ? "font-medium text-destructive" : "text-foreground"
      )}
    >
      {isLow && <AlertTriangle className="h-3.5 w-3.5 shrink-0" />}
      {qty} {product.unit}
    </span>
  );
}

export function ProductTable({
  products,
  categories: _categories,
  onEdit,
  onToggleActive,
  onDelete,
}: ProductTableProps) {
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const confirmTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  if (products.length === 0) {
    return (
      <div className="flex items-center justify-center py-20 text-sm text-muted-foreground">
        No products yet
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full border-separate border-spacing-0">
        <thead>
          <tr>
            {[
              "Name",
              "Category",
              "Zone",
              "Selling Price",
              "Cost Price",
              "Stock",
              "Status",
              "Actions",
            ].map((heading) => (
              <th
                key={heading}
                className="sticky top-0 bg-card px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground first:pl-5 last:pr-5"
              >
                {heading}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {products.map((product) => (
            <tr
              key={product.id}
              className="hover:bg-secondary transition-colors"
            >
              {/* Name */}
              <td className="whitespace-nowrap px-4 py-3 pl-5">
                <span className="text-sm font-medium text-foreground">
                  {product.name}
                </span>
              </td>

              {/* Category */}
              <td className="whitespace-nowrap px-4 py-3 text-sm text-muted-foreground">
                {product.category?.name ?? "—"}
              </td>

              {/* Zone */}
              <td className="whitespace-nowrap px-4 py-3">
                <ZoneBadge zone={product.temperature_zone} />
              </td>

              {/* Selling Price */}
              <td className="whitespace-nowrap px-4 py-3 text-sm tabular-nums text-foreground">
                {formatCurrency(product.selling_price)}
              </td>

              {/* Cost Price */}
              <td className="whitespace-nowrap px-4 py-3 text-sm tabular-nums text-muted-foreground">
                {formatCurrency(product.cost_price)}
              </td>

              {/* Stock */}
              <td className="whitespace-nowrap px-4 py-3">
                <StockCell product={product} />
              </td>

              {/* Status */}
              <td className="whitespace-nowrap px-4 py-3">
                {product.is_active ? (
                  <span className="inline-flex items-center rounded-full bg-success/12 px-2.5 py-0.5 text-xs font-medium text-success">
                    Active
                  </span>
                ) : (
                  <span className="inline-flex items-center rounded-full bg-secondary px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
                    Inactive
                  </span>
                )}
              </td>

              {/* Actions */}
              <td className="whitespace-nowrap px-4 py-3 pr-5">
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => onEdit(product)}
                    aria-label={`Edit ${product.name}`}
                    className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => onToggleActive(product)}
                    aria-label={product.is_active ? `Deactivate ${product.name}` : `Activate ${product.name}`}
                    className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                  >
                    {product.is_active ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                  {confirmDeleteId === product.id ? (
                    <button
                      onClick={() => {
                        clearTimeout(confirmTimer.current);
                        setConfirmDeleteId(null);
                        onDelete(product);
                      }}
                      aria-label="Confirm delete"
                      className="rounded-lg px-2 py-1 text-xs font-semibold text-destructive bg-destructive/8 hover:bg-destructive/15 transition-colors"
                    >
                      Confirm?
                    </button>
                  ) : (
                    <button
                      onClick={() => {
                        setConfirmDeleteId(product.id);
                        clearTimeout(confirmTimer.current);
                        confirmTimer.current = setTimeout(() => setConfirmDeleteId(null), 3000);
                      }}
                      aria-label={`Delete ${product.name}`}
                      className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-destructive/8 hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
