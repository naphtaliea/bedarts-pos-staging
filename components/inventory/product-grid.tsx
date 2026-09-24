"use client";

import { AlertTriangle } from "lucide-react";
import { Product } from "@/lib/types";
import { cn } from "@/lib/utils";

interface ProductGridProps {
  products: Product[];
  onEdit: (product: Product) => void;
}

function getInitialColor(name: string): { bg: string; text: string } {
  // Deterministic muted palette so tiles without images still feel intentional
  const palettes = [
    { bg: "bg-rose-50",   text: "text-rose-400"   },
    { bg: "bg-amber-50",  text: "text-amber-500"  },
    { bg: "bg-sky-50",    text: "text-sky-400"    },
    { bg: "bg-emerald-50",text: "text-emerald-500"},
    { bg: "bg-violet-50", text: "text-violet-400" },
    { bg: "bg-slate-100", text: "text-slate-400"  },
  ];
  const idx = name.charCodeAt(0) % palettes.length;
  return palettes[idx];
}

export function ProductGrid({ products, onEdit }: ProductGridProps) {
  if (products.length === 0) {
    return (
      <div className="flex items-center justify-center py-20 text-sm text-muted-foreground">
        No products yet
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
      {products.map((product) => {
        const { bg, text } = getInitialColor(product.name);
        const stockQty = product.stock_quantity ?? 0;
        const isOutOfStock = stockQty === 0;
        const isLowStock = !isOutOfStock && stockQty <= product.low_stock_threshold;

        return (
          <button
            key={product.id}
            onClick={() => onEdit(product)}
            aria-label={`Edit ${product.name}`}
            className={cn(
              "group flex flex-col rounded-xl border border-border bg-card overflow-hidden text-left",
              "transition-all hover:border-primary/40 hover:shadow-md hover:-translate-y-0.5",
              "focus:outline-none focus-visible:ring-2 focus-visible:ring-primary",
              !product.is_active && "opacity-50"
            )}
          >
            {/* Image or letter fallback */}
            <div className="aspect-[4/3] overflow-hidden relative">
              {product.image_url ? (
                <img
                  src={product.image_url}
                  alt=""
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                  draggable={false}
                />
              ) : (
                <div className={cn("w-full h-full flex items-center justify-center", bg)}>
                  <span className={cn("font-display font-black text-4xl select-none opacity-70", text)} aria-hidden>
                    {product.name.charAt(0).toUpperCase()}
                  </span>
                </div>
              )}

              {/* Status pips — top-right */}
              <div className="absolute top-1.5 right-1.5 flex items-center gap-1">
                {!product.is_active && (
                  <span className="text-[9px] font-bold uppercase tracking-wider bg-slate-900/80 text-white px-1.5 py-0.5 rounded backdrop-blur-sm">
                    Inactive
                  </span>
                )}
                {product.is_active && isOutOfStock && (
                  <span className="text-[9px] font-bold uppercase tracking-wider bg-destructive/90 text-white px-1.5 py-0.5 rounded backdrop-blur-sm inline-flex items-center gap-0.5">
                    <AlertTriangle className="w-2.5 h-2.5" aria-hidden />
                    Out
                  </span>
                )}
                {product.is_active && isLowStock && (
                  <span className="text-[9px] font-bold uppercase tracking-wider bg-warning/90 text-white px-1.5 py-0.5 rounded backdrop-blur-sm">
                    Low
                  </span>
                )}
              </div>
            </div>

            {/* Name + stock */}
            <div className="px-3 py-2.5">
              <p className="text-[13px] font-semibold text-foreground line-clamp-2 leading-snug min-h-[2.4em]">
                {product.name}
              </p>
              <p className={cn(
                "text-[11px] font-semibold tabular-nums mt-1",
                isOutOfStock ? "text-destructive" : isLowStock ? "text-warning" : "text-muted-foreground"
              )}>
                {product.unit === "kg" ? stockQty.toFixed(2) : stockQty} {product.unit}
              </p>
            </div>
          </button>
        );
      })}
    </div>
  );
}
