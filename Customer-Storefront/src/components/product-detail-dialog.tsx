"use client";

import { useId } from "react";
import Image from "next/image";
import { X, Plus, Minus, Share2 } from "lucide-react";
import { Dialog } from "@/src/components/dialog";
import { useCart } from "@/src/lib/cart-store";
import { formatCurrency, cn } from "@/src/lib/utils";
import type { StorefrontProduct } from "@/src/lib/types";

interface ProductDetailDialogProps {
  product: StorefrontProduct | null;
  onClose: () => void;
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

/**
 * Product detail sheet. Shows the full image, box pricing (if available),
 * stock, and add controls. Presented as a bottom sheet on mobile, centered
 * card on desktop.
 */
export function ProductDetailDialog({ product, onClose }: ProductDetailDialogProps) {
  if (!product) return null;
  return <DetailInner product={product} onClose={onClose} />;
}

function DetailInner({ product, onClose }: { product: StorefrontProduct; onClose: () => void }) {
  const { items, add, setQty } = useCart();
  const titleId = useId();

  const cartItem = items.find((i) => i.product_id === product.id);
  const qty = cartItem?.quantity ?? 0;
  const outOfStock = product.stock_quantity <= 0;
  const hasValidImage = isSupabaseUrl(product.image_url);

  const unitLabel = product.unit === "kg" ? "kg" : "each";
  const perLabel = product.unit === "kg" ? "/kg" : " each";

  const box = product.units_per_box ?? 0;
  const halfBox = Math.floor(box / 2);

  function pctSavings(boxPrice: number | null, units: number): number | null {
    if (!boxPrice || !units) return null;
    const looseTotal = product.selling_price * units;
    if (looseTotal <= 0) return null;
    const diff = looseTotal - boxPrice;
    if (diff <= 0) return null;
    return Math.round((diff / looseTotal) * 100);
  }

  function handleAdd() {
    add({
      product_id: product.id,
      product_name: product.name,
      unit: product.unit,
      unit_price: product.selling_price,
      image_url: product.image_url,
    });
  }

  function handleAddQty(units: number) {
    if (qty === 0) {
      add({
        product_id: product.id,
        product_name: product.name,
        unit: product.unit,
        unit_price: product.selling_price,
        image_url: product.image_url,
      });
    }
    setQty(product.id, units);
  }

  const fullBoxSavings = pctSavings(product.full_box_price, box);
  const halfBoxSavings = pctSavings(product.half_box_price, halfBox);

  return (
    <Dialog
      open={!!product}
      onClose={onClose}
      variant="sheet-bottom"
      labelledById={titleId}
      panelClassName="w-full max-w-lg"
    >
      <div className="bg-card rounded-t-3xl sm:rounded-2xl shadow-float overflow-hidden max-h-[92dvh] flex flex-col">
        {/* Image */}
        <div className="relative aspect-[4/3] sm:aspect-video bg-card shrink-0">
          {hasValidImage ? (
            <Image
              src={product.image_url!}
              alt={product.name}
              fill
              sizes="(max-width: 640px) 100vw, 512px"
              className="object-contain"
              quality={90}
              priority
            />
          ) : (
            <div
              aria-hidden="true"
              className="w-full h-full flex items-center justify-center text-6xl font-display-black text-accent/25"
            >
              {product.name.slice(0, 2).toUpperCase()}
            </div>
          )}
          <button
            onClick={onClose}
            aria-label="Close"
            className="absolute top-3 right-3 h-10 w-10 rounded-full flex items-center justify-center bg-card/90 backdrop-blur text-foreground shadow-card hover:bg-card active:bg-background transition-colors"
          >
            <X className="w-5 h-5" aria-hidden="true" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-5 space-y-5">
          <div>
            <p className="text-[11px] font-semibold tracking-widest uppercase text-muted-foreground">
              {product.category_name}
            </p>
            <h2
              id={titleId}
              className="font-display-black text-2xl uppercase text-foreground mt-1 leading-tight"
            >
              {product.name}
            </h2>
            <div className="flex items-baseline gap-2 mt-2">
              <span className="text-2xl font-bold text-primary tabular-nums">
                {formatCurrency(product.selling_price)}
              </span>
              <span className="text-sm text-muted-foreground">{perLabel}</span>
            </div>
            {outOfStock ? (
              <p className="mt-2 text-xs font-semibold text-muted-foreground">
                Out of stock
              </p>
            ) : (
              <p className="mt-2 text-xs font-semibold text-success">
                {product.stock_quantity} {unitLabel} available
              </p>
            )}
          </div>

          {/* Bulk pricing */}
          {(product.full_box_price || product.half_box_price) && (
            <div>
              <p className="text-[11px] font-semibold tracking-widest uppercase text-muted-foreground mb-2">
                Bulk prices
              </p>
              <div className="grid grid-cols-2 gap-2">
                {product.half_box_price && halfBox > 0 && (
                  <button
                    type="button"
                    onClick={() => handleAddQty(halfBox)}
                    disabled={outOfStock || halfBox > product.stock_quantity}
                    className={cn(
                      "text-left rounded-xl border border-border bg-background p-3 transition-transform",
                      outOfStock || halfBox > product.stock_quantity
                        ? "opacity-40 cursor-not-allowed"
                        : "hover:border-accent active:scale-[0.98]"
                    )}
                  >
                    <p className="text-xs font-semibold text-muted-foreground uppercase">
                      Half box · {halfBox} {unitLabel}
                    </p>
                    <p className="text-lg font-bold text-foreground tabular-nums mt-0.5">
                      {formatCurrency(product.half_box_price)}
                    </p>
                    {halfBoxSavings !== null && (
                      <p className="text-[11px] font-semibold text-success mt-0.5">
                        Save {halfBoxSavings}%
                      </p>
                    )}
                  </button>
                )}
                {product.full_box_price && box > 0 && (
                  <button
                    type="button"
                    onClick={() => handleAddQty(box)}
                    disabled={outOfStock || box > product.stock_quantity}
                    className={cn(
                      "text-left rounded-xl border border-border bg-background p-3 transition-transform",
                      outOfStock || box > product.stock_quantity
                        ? "opacity-40 cursor-not-allowed"
                        : "hover:border-accent active:scale-[0.98]"
                    )}
                  >
                    <p className="text-xs font-semibold text-muted-foreground uppercase">
                      Full box · {box} {unitLabel}
                    </p>
                    <p className="text-lg font-bold text-foreground tabular-nums mt-0.5">
                      {formatCurrency(product.full_box_price)}
                    </p>
                    {fullBoxSavings !== null && (
                      <p className="text-[11px] font-semibold text-success mt-0.5">
                        Save {fullBoxSavings}%
                      </p>
                    )}
                  </button>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
                Tapping a bulk option sets your quantity to that amount.
              </p>
            </div>
          )}
        </div>

        {/* Footer add controls */}
        <div className="px-5 pt-3 pb-5 border-t border-border bg-card shrink-0 space-y-3">
          {qty === 0 ? (
            <button
              type="button"
              onClick={handleAdd}
              disabled={outOfStock}
              className={cn(
                "w-full h-12 rounded-xl flex items-center justify-center gap-2 text-sm font-semibold text-primary-foreground bg-primary transition-transform",
                outOfStock ? "opacity-40 cursor-not-allowed" : "hover:opacity-90 active:scale-[0.98]"
              )}
            >
              <Plus className="w-4 h-4" aria-hidden="true" />
              Add to cart
            </button>
          ) : (
            <div className="flex items-center gap-3">
              <div
                role="group"
                aria-label={`${product.name} quantity`}
                className="flex items-center rounded-xl overflow-hidden border border-border h-12"
              >
                <button
                  onClick={() => setQty(product.id, qty - 1)}
                  aria-label="Decrease"
                  className="h-full w-12 flex items-center justify-center text-foreground hover:bg-background active:bg-background transition-colors"
                >
                  <Minus className="w-4 h-4" aria-hidden="true" />
                </button>
                <span
                  aria-live="polite"
                  aria-atomic="true"
                  className="w-12 text-center text-base font-bold tabular-nums text-foreground"
                >
                  {qty}
                </span>
                <button
                  onClick={() => setQty(product.id, qty + 1)}
                  disabled={qty >= product.stock_quantity}
                  aria-label="Increase"
                  className="h-full w-12 flex items-center justify-center text-primary hover:bg-background active:bg-background transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <Plus className="w-4 h-4" aria-hidden="true" />
                </button>
              </div>
              <div className="flex-1 text-right">
                <p className="text-xs text-muted-foreground">Subtotal</p>
                <p className="text-lg font-bold tabular-nums text-foreground">
                  {formatCurrency(qty * product.selling_price)}
                </p>
              </div>
            </div>
          )}

          <ShareButton product={product} />
        </div>
      </div>
    </Dialog>
  );
}

function ShareButton({ product }: { product: StorefrontProduct }) {
  const siteUrl =
    typeof window !== "undefined" ? window.location.origin : "https://bedarts.shop";
  const text = `${product.name} — GH¢${product.selling_price.toFixed(2)} at Bedarts Cold Supplies. ${siteUrl}`;

  async function handleShare() {
    if (typeof navigator !== "undefined" && "share" in navigator) {
      try {
        await navigator.share({ title: product.name, text, url: siteUrl });
        return;
      } catch {
        // fall through to WhatsApp deep link
      }
    }
    const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(url, "_blank", "noopener,noreferrer");
  }

  return (
    <button
      type="button"
      onClick={handleShare}
      className="w-full h-11 rounded-xl flex items-center justify-center gap-2 text-sm font-semibold text-foreground border border-border bg-card hover:bg-background active:bg-background transition-colors"
    >
      <Share2 className="w-4 h-4" aria-hidden="true" />
      Share on WhatsApp
    </button>
  );
}
