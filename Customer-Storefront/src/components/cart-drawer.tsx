"use client";

import Image from "next/image";
import Link from "next/link";
import { X, Minus, Plus, ShoppingCart, Trash2 } from "lucide-react";
import { useCart } from "@/src/lib/cart-store";
import { formatCurrency } from "@/src/lib/utils";
import { Dialog } from "@/src/components/dialog";

interface CartDrawerProps {
  isLoggedIn: boolean;
  onAuthRequired: () => void;
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

export function CartDrawer({ isLoggedIn, onAuthRequired }: CartDrawerProps) {
  const { items, isOpen, close, setQty, remove, total } = useCart();
  const orderTotal = total();
  const itemCount = items.length;

  return (
    <Dialog
      open={isOpen}
      onClose={close}
      variant="sheet-right"
      labelledById="cart-title"
      panelClassName="w-full md:w-96 flex flex-col"
    >
      <div
        className="flex flex-col h-[90dvh] md:h-dvh bg-card rounded-t-3xl md:rounded-none overflow-hidden shadow-float"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 shrink-0 bg-navy">
          <div className="flex items-center gap-2.5">
            <ShoppingCart className="w-5 h-5 text-white" aria-hidden="true" />
            <h2 id="cart-title" className="font-semibold text-white text-sm">
              Your cart
              {itemCount > 0 && (
                <span className="ml-1.5 text-navy-muted font-normal">
                  · {itemCount} item{itemCount !== 1 ? "s" : ""}
                </span>
              )}
            </h2>
          </div>
          <button
            onClick={close}
            aria-label="Close cart"
            className="h-10 w-10 -mr-2 rounded-lg flex items-center justify-center text-white hover:bg-white/10 active:bg-white/15 transition-colors"
          >
            <X className="w-5 h-5" aria-hidden="true" />
          </button>
        </div>

        {/* Items */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          {itemCount === 0 ? (
            <div className="flex flex-col items-center justify-center h-full py-12 gap-4 text-center">
              <div className="w-16 h-16 rounded-full bg-background flex items-center justify-center">
                <ShoppingCart className="w-7 h-7 text-muted-foreground" aria-hidden="true" />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-semibold text-foreground">
                  Your cart is empty
                </p>
                <p className="text-xs text-muted-foreground">
                  Add a few items to get started.
                </p>
              </div>
              <button
                onClick={close}
                className="mt-2 h-11 px-5 rounded-xl text-sm font-semibold text-primary-foreground bg-primary hover:opacity-90 active:scale-[0.98] transition-transform"
              >
                Browse products
              </button>
            </div>
          ) : (
            items.map((item) => {
              const showImage = isSupabaseUrl(item.image_url);
              return (
                <div key={item.product_id} className="flex gap-3">
                  <div className="relative w-14 h-14 rounded-xl shrink-0 overflow-hidden bg-card border border-border">
                    {showImage ? (
                      <Image
                        src={item.image_url!}
                        alt=""
                        fill
                        sizes="56px"
                        className="object-contain p-1"
                      />
                    ) : (
                      <div
                        aria-hidden="true"
                        className="w-full h-full flex items-center justify-center text-xs font-display-black text-accent select-none"
                      >
                        {item.product_name.slice(0, 2).toUpperCase()}
                      </div>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-item-title text-foreground line-clamp-1 leading-tight">
                      {item.product_name}
                    </p>
                    <p className="text-sm font-bold mt-0.5 text-primary tabular-nums">
                      {formatCurrency(item.total_price)}
                    </p>

                    <div className="flex items-center gap-3 mt-2">
                      <div
                        role="group"
                        aria-label={`${item.product_name} quantity`}
                        className="flex items-center rounded-lg overflow-hidden border border-border"
                      >
                        <button
                          onClick={() => setQty(item.product_id, item.quantity - 1)}
                          aria-label={`Decrease ${item.product_name}`}
                          className="h-9 w-9 flex items-center justify-center text-foreground hover:bg-background active:bg-background transition-colors"
                        >
                          <Minus className="w-3.5 h-3.5" aria-hidden="true" />
                        </button>
                        <span
                          aria-live="polite"
                          aria-atomic="true"
                          className="w-9 text-center text-sm font-bold tabular-nums text-foreground"
                        >
                          {item.quantity}
                        </span>
                        <button
                          onClick={() => setQty(item.product_id, item.quantity + 1)}
                          aria-label={`Increase ${item.product_name}`}
                          className="h-9 w-9 flex items-center justify-center text-primary hover:bg-background active:bg-background transition-colors"
                        >
                          <Plus className="w-3.5 h-3.5" aria-hidden="true" />
                        </button>
                      </div>

                      <button
                        onClick={() => remove(item.product_id)}
                        aria-label={`Remove ${item.product_name}`}
                        className="relative h-11 w-11 -m-2 flex items-center justify-center rounded-lg text-muted-foreground hover:bg-background active:bg-background transition-colors"
                      >
                        <Trash2 className="w-4 h-4" aria-hidden="true" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        {itemCount > 0 && (
          <div className="px-5 py-4 border-t border-border space-y-3 shrink-0 bg-card">
            <div className="flex justify-between items-baseline">
              <span className="text-sm text-muted-foreground">Total</span>
              <span className="text-xl font-bold tabular-nums text-foreground">
                {formatCurrency(orderTotal)}
              </span>
            </div>

            {isLoggedIn ? (
              <Link
                href="/checkout"
                onClick={close}
                className="flex items-center justify-center w-full h-12 rounded-xl text-sm font-semibold text-primary-foreground bg-primary transition-transform hover:opacity-90 active:scale-[0.98]"
              >
                Checkout
              </Link>
            ) : (
              <button
                onClick={() => {
                  close();
                  onAuthRequired();
                }}
                className="w-full h-12 rounded-xl text-sm font-semibold text-primary-foreground bg-primary transition-transform hover:opacity-90 active:scale-[0.98]"
              >
                Continue to checkout
              </button>
            )}
          </div>
        )}
      </div>
    </Dialog>
  );
}
