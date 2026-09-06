"use client";

import { Snowflake, Thermometer, Package } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Product } from "@/lib/types";

interface ProductGridProps {
  products: Product[];
  onSelect: (product: Product) => void;
  loading?: boolean;
  recentlyAddedId?: string | null;
}

const zoneIcon = {
  frozen: Snowflake,
  chilled: Thermometer,
  ambient: Package,
};

const zoneColor = {
  frozen: "text-blue-500",
  chilled: "text-cyan-500",
  ambient: "text-amber-500",
};

export function ProductGrid({ products, onSelect, loading, recentlyAddedId }: ProductGridProps) {
  if (loading) {
    return (
      <div className="grid grid-cols-3 xl:grid-cols-4 gap-3 content-start">
        {Array.from({ length: 12 }).map((_, i) => (
          <div key={i} className="h-24 rounded-xl bg-slate-100 animate-pulse" />
        ))}
      </div>
    );
  }

  if (products.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 text-slate-400 text-sm">
        No products found
      </div>
    );
  }

  return (
    <div className="grid grid-cols-3 xl:grid-cols-4 gap-3 content-start">
      {products.map((product) => {
        const Icon = zoneIcon[product.temperature_zone] ?? Package;
        const outOfStock = (product.stock_quantity ?? 0) <= 0;

        return (
          <button
            key={product.id}
            onClick={() => !outOfStock && onSelect(product)}
            disabled={outOfStock}
            className={cn(
              "relative flex flex-col items-start justify-between p-3 rounded-xl border text-left transition-all",
              "h-24 select-none",
              outOfStock
                ? "border-slate-100 bg-slate-50 opacity-50 cursor-not-allowed"
                : product.id === recentlyAddedId
                  ? "border-green-400 bg-green-50 shadow-md scale-95 cursor-pointer"
                  : "border-slate-200 bg-white hover:border-blue-400 hover:shadow-md active:scale-95 cursor-pointer"
            )}
          >
            <div className="flex items-start justify-between w-full">
              <p className="text-xs font-semibold text-slate-800 leading-tight line-clamp-2 flex-1 pr-1">
                {product.name}
              </p>
              <Icon className={cn("w-3.5 h-3.5 shrink-0 mt-0.5", zoneColor[product.temperature_zone])} />
            </div>

            <div className="w-full">
              <p className="text-sm font-bold text-blue-700">
                GH₵{product.selling_price.toFixed(2)}
              </p>
              <p className="text-xs text-slate-400">
                {outOfStock ? "Out of stock" : `${product.stock_quantity} ${product.unit}`}
              </p>
            </div>
          </button>
        );
      })}
    </div>
  );
}
