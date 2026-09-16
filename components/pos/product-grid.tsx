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
  frozen: "text-accent",
  chilled: "text-sky-500",
  ambient: "text-amber-500",
};

export function ProductGrid({ products, onSelect, loading, recentlyAddedId }: ProductGridProps) {
  if (loading) {
    return (
      <div className="grid grid-cols-3 xl:grid-cols-4 gap-3 content-start">
        {Array.from({ length: 12 }).map((_, i) => (
          <div key={i} className="h-24 rounded-xl bg-secondary animate-pulse" />
        ))}
      </div>
    );
  }

  if (products.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 text-muted-foreground text-sm">
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
              "relative flex flex-col p-0 rounded-xl border text-left transition-all overflow-hidden bg-card",
              "h-36 select-none",
              outOfStock
                ? "border-border opacity-50 cursor-not-allowed grayscale-[50%]"
                : product.id === recentlyAddedId
                  ? "border-success shadow-md scale-95 cursor-pointer"
                  : "border-border hover:border-primary hover:shadow-md active:scale-95 cursor-pointer"
            )}
          >
            <div className="relative w-full h-20 bg-secondary shrink-0 border-b border-border">
              {product.image_url ? (
                <img src={product.image_url} alt={product.name} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-muted-foreground/30">
                  <Icon className="w-6 h-6 opacity-30" />
                </div>
              )}
              {/* Floating zone icon */}
              <div className="absolute top-1.5 right-1.5 w-6 h-6 bg-card/95 backdrop-blur-sm rounded-full flex items-center justify-center shadow-sm">
                <Icon className={cn("w-3.5 h-3.5", zoneColor[product.temperature_zone])} />
              </div>
            </div>

            <div className="flex flex-col flex-1 p-2.5 justify-between w-full">
              <p className="text-sm font-semibold text-foreground leading-tight line-clamp-2">
                {product.name}
              </p>

              <div className="flex items-end justify-between w-full mt-1">
                <p
                  className="text-sm text-primary leading-none"
                  style={{ fontFamily: "var(--font-display)", fontWeight: 800 }}
                >
                  GH₵{product.selling_price.toFixed(2)}
                  <span className="text-[10px] text-muted-foreground ml-0.5" style={{ fontFamily: "var(--font-sans)", fontWeight: 400 }}>/{product.unit}</span>
                </p>
                <p className="text-[10px] font-medium text-muted-foreground leading-none text-right">
                  {outOfStock ? "Out" : `${product.stock_quantity}${product.unit}`}
                </p>
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}
