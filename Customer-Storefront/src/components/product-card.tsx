"use client";

import Image from "next/image";
import { Plus, Minus } from "lucide-react";
import { useCart } from "@/src/lib/cart-store";
import { formatCurrency, cn } from "@/src/lib/utils";
import type { StorefrontProduct } from "@/src/lib/types";

interface ProductCardProps {
  product: StorefrontProduct;
  onOpenDetail: (product: StorefrontProduct) => void;
}

function StockBadge({ qty }: { qty: number }) {
  if (qty <= 0) {
    return (
      <span className="text-xs font-semibold text-muted-foreground">
        Out of stock
      </span>
    );
  }
  if (qty <= 5) {
    return (
      <span className="text-xs font-semibold text-warning">
        Only {qty} left
      </span>
    );
  }
  return (
    <span className="text-xs font-semibold text-success">
      In stock
    </span>
  );
}

const SUPABASE_HOST = process.env.NEXT_PUBLIC_SUPABASE_URL
  ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).hostname
  : "supabase.co";

function isSupabaseUrl(url: string | null): boolean {
  if (!url) return false;
  try {
    return new URL(url).hostname.endsWith(SUPABASE_HOST);
  } catch {
    return false;
  }
}

export function ProductCard({ product, onOpenDetail }: ProductCardProps) {
  const { items, add, setQty } = useCart();
  const cartItem = items.find((i) => i.product_id === product.id);
  const qty = cartItem?.quantity ?? 0;
  const outOfStock = product.stock_quantity <= 0;
  const hasValidImage = isSupabaseUrl(product.image_url);

  const unitLabel = product.unit === "kg" ? "/kg" : " each";
  const hasBoxPrice = !!(product.full_box_price || product.half_box_price);

  function handleAdd(e: React.MouseEvent) {
    e.stopPropagation();
    add({
      product_id: product.id,
      product_name: product.name,
      unit: product.unit,
      unit_price: product.selling_price,
      image_url: product.image_url,
    });
  }

  function stopClick(e: React.MouseEvent) {
    e.stopPropagation();
  }

  function handleTileClick() {
    onOpenDetail(product);
  }

  return (
    <article className="bg-card rounded-2xl shadow-card flex flex-col overflow-hidden border border-border hover:shadow-raised transition-shadow duration-200">
      {/* Image + product body — clickable region opens detail */}
      <button
        type="button"
        onClick={handleTileClick}
        aria-label={`View details for ${product.name}`}
        className="text-left flex flex-col flex-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 rounded-t-2xl"
      >
        {/* Image — landscape on mobile, square on tablet+ */}
        <div className="relative aspect-[4/3] sm:aspect-square bg-card overflow-hidden">
          {hasValidImage ? (
            <Image
              src={product.image_url!}
              alt={product.name}
              fill
              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
              className="object-contain sm:p-3"
              quality={90}
            />
          ) : (
            <div
              aria-hidden="true"
              className="w-full h-full flex items-center justify-center text-4xl font-display-black select-none text-accent/25"
            >
              {product.name.slice(0, 2).toUpperCase()}
            </div>
          )}

          <span className="hidden sm:inline-block absolute top-2 left-2 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-background text-muted-foreground">
            {product.category_name}
          </span>
        </div>

        {/* Text body */}
        <div className="flex flex-col p-3 gap-1">
          <h2 className="font-item-title text-[15px] sm:text-base leading-tight text-foreground line-clamp-2">
            {product.name}
          </h2>

          <div className="flex items-center justify-between mt-0.5">
            <span className="text-base font-bold text-primary">
              {formatCurrency(product.selling_price)}
              <span className="text-xs font-medium ml-0.5 text-muted-foreground">
                {unitLabel}
              </span>
            </span>
            <StockBadge qty={product.stock_quantity} />
          </div>

          {hasBoxPrice && product.full_box_price && (
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Box: <span className="font-semibold text-foreground tabular-nums">{formatCurrency(product.full_box_price)}</span>
            </p>
          )}
        </div>
      </button>

      {/* Add / stepper — outside the click region so tapping controls doesn't open detail */}
      <div className="px-3 pb-3" onClick={stopClick}>
        {qty === 0 ? (
          <button
            onClick={handleAdd}
            disabled={outOfStock}
            aria-label={outOfStock ? `${product.name} — out of stock` : `Add ${product.name} to cart`}
            className={cn(
              "w-full h-11 rounded-xl flex items-center justify-center gap-1.5 text-sm font-semibold text-primary-foreground bg-primary transition-transform",
              outOfStock
                ? "opacity-40 cursor-not-allowed"
                : "hover:opacity-90 active:scale-[0.97]"
            )}
          >
            <Plus className="w-4 h-4" aria-hidden="true" />
            Add
          </button>
        ) : (
          <div
            className="w-full h-11 rounded-xl flex items-center justify-between px-1 bg-background"
            role="group"
            aria-label={`${product.name} quantity`}
          >
            <button
              onClick={() => setQty(product.id, qty - 1)}
              aria-label={`Decrease quantity of ${product.name}`}
              className="h-9 w-9 rounded-lg flex items-center justify-center text-foreground transition-colors hover:bg-card active:bg-card"
            >
              <Minus className="w-4 h-4" aria-hidden="true" />
            </button>
            <span
              className="text-sm font-bold tabular-nums text-foreground"
              aria-live="polite"
              aria-atomic="true"
            >
              {qty}
            </span>
            <button
              onClick={() => setQty(product.id, qty + 1)}
              disabled={qty >= product.stock_quantity}
              aria-label={`Increase quantity of ${product.name}`}
              className="h-9 w-9 rounded-lg flex items-center justify-center text-primary transition-colors hover:bg-card active:bg-card disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Plus className="w-4 h-4" aria-hidden="true" />
            </button>
          </div>
        )}
      </div>
    </article>
  );
}
