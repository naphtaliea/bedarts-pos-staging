"use client";

import {
  AlertTriangle,
  Eye,
  EyeOff,
  Package,
  Pencil,
  Snowflake,
  Thermometer,
} from "lucide-react";
import { Category, Product } from "@/lib/types";
import { cn, formatCurrency } from "@/lib/utils";

interface ProductTableProps {
  products: Product[];
  categories: Category[];
  onEdit: (product: Product) => void;
  onToggleActive: (product: Product) => void;
}

function ZoneBadge({ zone }: { zone: Product["temperature_zone"] }) {
  if (zone === "frozen") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-700">
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
    <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-700">
      <Package className="h-3 w-3" />
      Ambient
    </span>
  );
}

function StockCell({ product }: { product: Product }) {
  const qty = product.stock_quantity ?? 0;

  if (qty === 0) {
    return (
      <span className="inline-flex items-center gap-1 text-sm font-medium text-red-600">
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
        isLow ? "font-medium text-red-600" : "text-slate-700"
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
}: ProductTableProps) {
  if (products.length === 0) {
    return (
      <div className="flex items-center justify-center py-20 text-sm text-slate-400">
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
                className="sticky top-0 bg-white px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-400 first:pl-5 last:pr-5"
              >
                {heading}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {products.map((product) => (
            <tr
              key={product.id}
              className="hover:bg-slate-50 transition-colors"
            >
              {/* Name */}
              <td className="whitespace-nowrap px-4 py-3 pl-5">
                <span className="text-sm font-medium text-slate-900">
                  {product.name}
                </span>
              </td>

              {/* Category */}
              <td className="whitespace-nowrap px-4 py-3 text-sm text-slate-500">
                {product.category?.name ?? "—"}
              </td>

              {/* Zone */}
              <td className="whitespace-nowrap px-4 py-3">
                <ZoneBadge zone={product.temperature_zone} />
              </td>

              {/* Selling Price */}
              <td className="whitespace-nowrap px-4 py-3 text-sm tabular-nums text-slate-700">
                {formatCurrency(product.selling_price)}
              </td>

              {/* Cost Price */}
              <td className="whitespace-nowrap px-4 py-3 text-sm tabular-nums text-slate-500">
                {formatCurrency(product.cost_price)}
              </td>

              {/* Stock */}
              <td className="whitespace-nowrap px-4 py-3">
                <StockCell product={product} />
              </td>

              {/* Status */}
              <td className="whitespace-nowrap px-4 py-3">
                {product.is_active ? (
                  <span className="inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-700">
                    Active
                  </span>
                ) : (
                  <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-500">
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
                    className="rounded-lg p-1.5 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => onToggleActive(product)}
                    aria-label={
                      product.is_active
                        ? `Deactivate ${product.name}`
                        : `Activate ${product.name}`
                    }
                    className="rounded-lg p-1.5 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700"
                  >
                    {product.is_active ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
