"use client";

import { useState, useEffect, useLayoutEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Trash2, Search } from "lucide-react";
import { useCartStore } from "@/lib/pos-store";
import { PosTopBar } from "@/components/pos/pos-topbar";
import { Numpad } from "@/components/pos/numpad";
import { cn, formatCurrency } from "@/lib/utils";
import type { Profile, Category, Product } from "@/lib/types";

interface CashierPOSClientProps {
  cashier: Profile;
  initialCategories: Category[];
  initialProducts: Product[];
}

function getCategoryStyle(categoryName: string): { bg: string; text: string } {
  const name = categoryName.toLowerCase();
  if (name.includes("poultry") || name.includes("chicken"))
    return { bg: "bg-amber-100", text: "text-amber-700" };
  if (name.includes("fish"))
    return { bg: "bg-sky-100", text: "text-sky-700" };
  if (name.includes("seafood") || name.includes("prawn") || name.includes("shrimp"))
    return { bg: "bg-teal-100", text: "text-teal-700" };
  if (name.includes("meat") || name.includes("beef") || name.includes("pork") || name.includes("lamb"))
    return { bg: "bg-rose-100", text: "text-rose-700" };
  if (name.includes("frozen") || name.includes("ice"))
    return { bg: "bg-blue-100", text: "text-blue-700" };
  if (name.includes("vegetable") || name.includes("veg"))
    return { bg: "bg-green-100", text: "text-green-700" };
  return { bg: "bg-slate-100", text: "text-slate-500" };
}

export function CashierPOSClient({
  cashier,
  initialCategories,
  initialProducts,
}: CashierPOSClientProps) {
  const router = useRouter();

  const {
    items,
    addItem,
    removeItem,
    updateQty,
    updateItemDiscount,
    updateItemPrice,
    clearCart,
    subtotal,
    total,
  } = useCartStore();

  const subtotalVal = subtotal();
  const totalVal = total();

  const [selectedLineId, setSelectedLineId] = useState<string | null>(null);
  const [mode, setMode] = useState<"Qty" | "Disc" | "Price">("Qty");
  const [buffer, setBuffer] = useState("");
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<string | null>(null);
  const [recentlyAddedId, setRecentlyAddedId] = useState<string | null>(null);

  const selectedLine = items.find((i) => i.product.id === selectedLineId);
  const categoryMap = Object.fromEntries(initialCategories.map((c) => [c.id, c.name]));
  const selectedRowRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setBuffer("");
  }, [selectedLineId]);

  useLayoutEffect(() => {
    selectedRowRef.current?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [selectedLineId]);

  const pressKey = (key: string) => {
    if (!selectedLineId) return;
    let next = buffer;
    if (key === "backspace") {
      next = next.slice(0, -1);
    } else if (key === "00") {
      next = next === "" || next === "0" ? "0" : next + "00";
    } else if (key === ".") {
      next = next.includes(".") ? next : (next || "0") + ".";
    } else {
      next = next === "0" ? key : next + key;
    }
    setBuffer(next);
    const value = parseFloat(next) || 0;
    if (mode === "Qty") {
      const selectedProduct = initialProducts.find((p) => p.id === selectedLineId);
      const maxQty = selectedProduct?.stock_quantity ?? Infinity;
      updateQty(selectedLineId, Math.min(value || 1, maxQty));
    } else if (mode === "Disc") {
      updateItemDiscount(selectedLineId, Math.max(0, value));
    } else {
      updateItemPrice(selectedLineId, Math.max(0, value));
    }
  };

  const handleAddProduct = (product: Product) => {
    // Already focused on this product — no-op, use numpad to edit
    if (selectedLineId === product.id) return;
    // In cart but not selected — just select it, don't increment
    const alreadyInCart = items.some((i) => i.product.id === product.id);
    if (alreadyInCart) {
      setSelectedLineId(product.id);
      return;
    }
    addItem(product);
    setSelectedLineId(product.id);
    setRecentlyAddedId(product.id);
    setTimeout(() => setRecentlyAddedId(null), 600);
  };

  const filteredProducts = initialProducts.filter((p) => {
    const matchesSearch =
      search.trim() === "" || p.name.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = category === null || p.category_id === category;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="flex flex-col h-screen bg-background">
      <PosTopBar cashierName={cashier.full_name} />

      <div className="flex flex-1 min-h-0 p-3 gap-3 lg:p-4 lg:gap-4">
        {/* LEFT — Order panel */}
        <section className="flex flex-col gap-2.5 w-full lg:w-[40%] min-w-0">
          {/* Order lines — expands to fill all space above the fixed numpad */}
          <div className="flex-1 min-h-0 rounded-xl border border-border bg-card overflow-hidden flex flex-col">
            <div className="px-3 py-2 border-b border-border flex items-center justify-between shrink-0">
              <span className="text-sm font-semibold text-foreground">Order</span>
              {items.length > 0 && (
                <button onClick={clearCart} className="text-xs text-destructive hover:underline">
                  Clear all
                </button>
              )}
            </div>

            {items.length === 0 ? (
              <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">
                No items added yet
              </div>
            ) : (
              <div className="overflow-y-auto flex-1">
                {items.map((item) => {
                  const lineTotal = Math.max(
                    0,
                    item.quantity * item.unit_price - item.discount_amount
                  );
                  const isSelected = selectedLineId === item.product.id;
                  return (
                    <div
                      key={item.product.id}
                      ref={isSelected ? selectedRowRef : null}
                      onClick={() => setSelectedLineId(item.product.id)}
                      className={cn(
                        "grid grid-cols-2 gap-2 px-3 py-2.5 cursor-pointer transition-colors border-b border-border last:border-b-0",
                        isSelected
                          ? "bg-primary text-primary-foreground"
                          : "hover:bg-secondary"
                      )}
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{item.product.name}</p>
                        <p
                          className={cn(
                            "text-xs",
                            isSelected ? "text-primary-foreground/70" : "text-muted-foreground"
                          )}
                        >
                          {item.quantity} × {formatCurrency(item.unit_price)}
                          {item.discount_amount > 0 && (
                            <span className="ml-1">− {formatCurrency(item.discount_amount)}</span>
                          )}
                        </p>
                      </div>
                      <div className="flex items-center justify-end gap-2">
                        <span className="text-sm font-semibold tabular-nums">
                          {formatCurrency(lineTotal)}
                        </span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            removeItem(item.product.id);
                            if (selectedLineId === item.product.id) setSelectedLineId(null);
                          }}
                          aria-label={`Remove ${item.product.name}`}
                          className={cn(
                            "p-1 rounded transition-colors",
                            isSelected
                              ? "hover:bg-primary-foreground/10 text-primary-foreground/70"
                              : "hover:bg-destructive/10 text-destructive"
                          )}
                        >
                          <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Selected line display */}
          <div className="rounded-xl border border-border bg-card px-4 py-3 min-h-[60px] flex flex-col justify-center shrink-0">
            {selectedLine ? (
              <>
                <p className="text-xs text-muted-foreground truncate leading-tight">
                  {selectedLine.product.name}
                </p>
                <div className="flex items-baseline justify-between mt-0.5">
                  <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    {mode}
                  </span>
                  <span className="text-3xl font-bold text-foreground tabular-nums">
                    {buffer !== ""
                      ? buffer
                      : mode === "Qty"
                      ? String(selectedLine.quantity)
                      : mode === "Disc"
                      ? String(selectedLine.discount_amount)
                      : selectedLine.unit_price.toFixed(2)}
                  </span>
                </div>
              </>
            ) : (
              <p className="text-sm text-muted-foreground text-center">
                Select a product to edit
              </p>
            )}
          </div>

          {/* Compact totals */}
          <div className="flex items-baseline justify-between shrink-0 px-1">
            <span className="text-xs text-muted-foreground tabular-nums">
              {items.length > 0 ? `Sub ${formatCurrency(subtotalVal)}` : ""}
            </span>
            <span className="text-xl font-bold text-primary tabular-nums">
              {items.length > 0
                ? `₵${totalVal.toLocaleString("en-GH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                : ""}
            </span>
          </div>

          {/* Mode buttons */}
          <div className="grid grid-cols-3 gap-2 shrink-0">
            {(["Qty", "Disc", "Price"] as const).map((m) => (
              <button
                key={m}
                onClick={() => {
                  setMode(m);
                  setBuffer("");
                }}
                disabled={!selectedLineId}
                className={cn(
                  "h-11 rounded-xl border text-sm font-semibold transition-colors disabled:opacity-40",
                  mode === m
                    ? "bg-primary text-primary-foreground border-primary"
                    : "border-border bg-card text-foreground hover:bg-secondary"
                )}
              >
                {m}
              </button>
            ))}
          </div>

          {/* Numpad */}
          <div className="shrink-0">
            <Numpad
              onKey={pressKey}
              disabled={!selectedLineId}
              onPay={() => router.push("/cashier/payment")}
              payDisabled={items.length === 0}
            />
          </div>
        </section>

        {/* RIGHT — Product area */}
        <section className="flex flex-col gap-3 flex-1 min-w-0">
          {/* Search */}
          <div className="relative shrink-0">
            <label htmlFor="product-search" className="sr-only">Search products</label>
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" aria-hidden="true" />
            <input
              id="product-search"
              type="text"
              placeholder="Search products…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-12 w-full rounded-xl border border-border bg-card pl-11 pr-4 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary transition-colors"
            />
          </div>

          {/* Category pills with right-fade scroll hint */}
          <div className="relative shrink-0">
            <div className="flex gap-2 overflow-x-auto pb-1 pr-8">
              <button
                onClick={() => setCategory(null)}
                className={cn(
                  "shrink-0 rounded-full px-4 py-1.5 text-sm font-medium transition-colors",
                  category === null
                    ? "bg-primary text-primary-foreground"
                    : "bg-card border border-border text-foreground hover:bg-secondary"
                )}
              >
                All
              </button>
              {initialCategories.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setCategory(cat.id)}
                  className={cn(
                    "shrink-0 rounded-full px-4 py-1.5 text-sm font-medium transition-colors",
                    category === cat.id
                      ? "bg-primary text-primary-foreground"
                      : "bg-card border border-border text-foreground hover:bg-secondary"
                  )}
                >
                  {cat.name}
                </button>
              ))}
            </div>
            {/* Fade hint indicating more pills exist to the right */}
            <div className="absolute right-0 top-0 bottom-1 w-8 bg-gradient-to-l from-background to-transparent pointer-events-none" aria-hidden="true" />
          </div>

          {/* Product grid */}
          <div className="flex-1 min-h-0 overflow-y-auto">
            {filteredProducts.length === 0 ? (
              <div className="flex items-center justify-center h-32 text-muted-foreground text-sm">
                No products found
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3 pb-2">
                {filteredProducts.map((product) => {
                  const isRecent = recentlyAddedId === product.id;
                  const isActive = selectedLineId === product.id;
                  const stockQty = product.stock_quantity ?? 0;
                  const isOutOfStock = stockQty <= 0;
                  const isLowStock = !isOutOfStock && stockQty < product.low_stock_threshold;
                  const catName = categoryMap[product.category_id] ?? "";
                  const { bg, text } = getCategoryStyle(catName);
                  return (
                    <div
                      key={product.id}
                      onClick={() => !isOutOfStock && handleAddProduct(product)}
                      aria-disabled={isOutOfStock}
                      className={cn(
                        "rounded-xl border bg-card shadow-sm overflow-hidden transition-all select-none motion-reduce:transition-none",
                        isOutOfStock
                          ? "opacity-50 cursor-not-allowed"
                          : "cursor-pointer",
                        !isOutOfStock && (isActive
                          ? "border-primary ring-2 ring-primary/20 shadow-md"
                          : isRecent
                          ? "border-green-400 scale-95 motion-reduce:scale-100"
                          : "border-border hover:border-primary hover:shadow-md")
                      )}
                    >
                      {/* Image / placeholder area */}
                      {product.image_url ? (
                        <img
                          src={product.image_url}
                          alt={product.name}
                          className="w-full aspect-[4/3] object-cover"
                        />
                      ) : (
                        <div
                          className={cn(
                            "w-full aspect-[4/3] flex items-center justify-center",
                            isRecent ? "bg-green-100" : bg
                          )}
                        >
                          <span
                            className={cn(
                              "text-3xl font-bold select-none",
                              isRecent ? "text-green-600" : text
                            )}
                            aria-hidden="true"
                          >
                            {product.name.charAt(0).toUpperCase()}
                          </span>
                        </div>
                      )}

                      {/* Product info */}
                      <div className="p-2.5">
                        <p className="text-sm font-semibold text-foreground truncate leading-snug">
                          {product.name}
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5">{product.unit}</p>
                        <div className="flex items-center justify-between mt-1.5">
                          <p className="text-sm font-bold text-accent tabular-nums">
                            {formatCurrency(product.selling_price)}
                          </p>
                          {isOutOfStock ? (
                            <span className="text-xs text-destructive font-medium">Out</span>
                          ) : isLowStock ? (
                            <span className="text-xs text-amber-600 font-medium">
                              {stockQty} left
                            </span>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
