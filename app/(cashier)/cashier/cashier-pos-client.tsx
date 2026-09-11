"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Trash2, Search } from "lucide-react";
import { useCartStore } from "@/lib/pos-store";
import { PosTopBar } from "@/components/pos/pos-topbar";
import { Numpad } from "@/components/pos/numpad";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/utils";
import type { Profile, Category, Product } from "@/lib/types";

interface CashierPOSClientProps {
  cashier: Profile;
  initialCategories: Category[];
  initialProducts: Product[];
}

export function CashierPOSClient({
  cashier,
  initialCategories,
  initialProducts,
}: CashierPOSClientProps) {
  const router = useRouter();

  // Cart state
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

  // UI state
  const [selectedLineId, setSelectedLineId] = useState<string | null>(null);
  const [mode, setMode] = useState<"Qty" | "Disc" | "Price">("Qty");
  const [buffer, setBuffer] = useState("");
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<string | null>(null);
  const [recentlyAddedId, setRecentlyAddedId] = useState<string | null>(null);

  const selectedLine = items.find((i) => i.product.id === selectedLineId);

  // Reset buffer when selected line changes
  useEffect(() => {
    setBuffer("");
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
      updateQty(selectedLineId, value || 1);
    } else if (mode === "Disc") {
      updateItemDiscount(selectedLineId, Math.max(0, value));
    } else {
      updateItemPrice(selectedLineId, Math.max(0, value));
    }
  };

  const handleAddProduct = (product: Product) => {
    addItem(product);
    setSelectedLineId(product.id);
    setRecentlyAddedId(product.id);
    setTimeout(() => setRecentlyAddedId(null), 600);
  };

  // Filtered products
  const filteredProducts = initialProducts.filter((p) => {
    const matchesSearch =
      search.trim() === "" ||
      p.name.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = category === null || p.category_id === category;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="flex flex-col h-screen bg-background">
      <PosTopBar cashierName={cashier.full_name} />

      <div className="flex flex-1 min-h-0 p-3 gap-3 lg:p-4 lg:gap-4">
        {/* LEFT — Order panel */}
        <section className="flex flex-col gap-3 w-full lg:w-[40%] min-w-0">
          {/* Order lines */}
          <div className="flex-1 min-h-0 rounded-xl border border-border bg-card overflow-hidden flex flex-col">
            <div className="px-3 py-2 border-b border-border flex items-center justify-between">
              <span className="text-sm font-semibold text-foreground">
                Order
              </span>
              {items.length > 0 && (
                <button
                  onClick={clearCart}
                  className="text-xs text-destructive hover:underline"
                >
                  Clear all
                </button>
              )}
            </div>

            {items.length === 0 ? (
              <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">
                No items added yet
              </div>
            ) : (
              <div
                className="overflow-y-auto"
                style={{ maxHeight: "42vh" }}
              >
                {items.map((item) => {
                  const lineTotal = Math.max(
                    0,
                    item.quantity * item.unit_price - item.discount_amount
                  );
                  const isSelected = selectedLineId === item.product.id;
                  return (
                    <div
                      key={item.product.id}
                      onClick={() => setSelectedLineId(item.product.id)}
                      className={cn(
                        "grid grid-cols-2 gap-2 px-3 py-2.5 cursor-pointer transition-colors border-b border-border last:border-b-0",
                        isSelected
                          ? "bg-primary text-primary-foreground"
                          : "hover:bg-secondary"
                      )}
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">
                          {item.product.name}
                        </p>
                        <p
                          className={cn(
                            "text-xs",
                            isSelected
                              ? "text-primary-foreground/70"
                              : "text-muted-foreground"
                          )}
                        >
                          {item.quantity} × {formatCurrency(item.unit_price)}
                          {item.discount_amount > 0 && (
                            <span className="ml-1">
                              − {formatCurrency(item.discount_amount)}
                            </span>
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
                            if (selectedLineId === item.product.id) {
                              setSelectedLineId(null);
                            }
                          }}
                          className={cn(
                            "p-1 rounded transition-colors",
                            isSelected
                              ? "hover:bg-primary-foreground/10 text-primary-foreground/70"
                              : "hover:bg-destructive/10 text-destructive"
                          )}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Selected line display + Mode buttons + Numpad */}
          <div className="rounded-xl border border-border bg-card p-3 space-y-2">
            {/* Selected product / input display */}
            <div className="rounded-lg bg-secondary px-3 py-2.5 min-h-[54px] flex flex-col justify-center">
              {selectedLine ? (
                <>
                  <p className="text-xs text-muted-foreground truncate leading-tight">
                    {selectedLine.product.name}
                  </p>
                  <div className="flex items-baseline justify-between mt-0.5">
                    <span className="text-xs text-muted-foreground">{mode}</span>
                    <span className="text-2xl font-bold text-foreground tabular-nums">
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

            {/* Mode buttons */}
            <div className="grid grid-cols-3 gap-1.5">
              {(["Qty", "Disc", "Price"] as const).map((m) => (
                <button
                  key={m}
                  onClick={() => { setMode(m); setBuffer(""); }}
                  disabled={!selectedLineId}
                  className={cn(
                    "py-1.5 rounded-lg border text-xs font-semibold transition-colors disabled:opacity-40",
                    mode === m
                      ? "bg-primary text-primary-foreground border-primary"
                      : "border-border bg-card text-foreground hover:bg-secondary"
                  )}
                >
                  {m}
                </button>
              ))}
            </div>

            <Numpad onKey={pressKey} disabled={!selectedLineId} />
          </div>

          {/* Totals + Payment button */}
          <div className="rounded-xl border border-border bg-card p-4 space-y-3">
            <dl className="space-y-1.5 text-sm">
              <div className="flex justify-between text-muted-foreground">
                <dt>Subtotal</dt>
                <dd className="tabular-nums">{formatCurrency(subtotalVal)}</dd>
              </div>
              <div className="flex items-baseline justify-between border-t border-border pt-2">
                <dt className="text-base font-semibold text-foreground">
                  Total
                </dt>
                <dd>
                  <span className="text-xl font-light text-primary">₵</span>
                  <span className="text-4xl font-bold text-primary tabular-nums ml-0.5">
                    {totalVal.toLocaleString("en-GH", {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </span>
                </dd>
              </div>
            </dl>

            <button
              onClick={() => router.push("/cashier/payment")}
              disabled={items.length === 0}
              className="w-full h-14 bg-primary text-primary-foreground rounded-lg text-base font-semibold transition-colors hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Proceed to Payment
            </button>
          </div>
        </section>

        {/* RIGHT — Product area */}
        <section className="flex flex-col gap-3 flex-1 min-w-0">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
            <input
              type="text"
              placeholder="Search products…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-12 w-full rounded-xl border border-border bg-card pl-11 pr-4 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary transition-colors"
            />
          </div>

          {/* Category pills */}
          <div className="flex gap-2 overflow-x-auto pb-1 shrink-0">
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

          {/* Product grid */}
          <div className="flex-1 min-h-0 overflow-y-auto">
            {filteredProducts.length === 0 ? (
              <div className="flex items-center justify-center h-32 text-muted-foreground text-sm">
                No products found
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3">
                {filteredProducts.map((product) => {
                  const isRecent = recentlyAddedId === product.id;
                  const isLowStock =
                    product.stock_quantity !== undefined &&
                    product.stock_quantity < product.low_stock_threshold;
                  return (
                    <div
                      key={product.id}
                      onClick={() => handleAddProduct(product)}
                      className={cn(
                        "rounded-xl border bg-card shadow-sm overflow-hidden cursor-pointer hover:border-primary transition-all select-none",
                        isRecent && "border-success bg-green-50 scale-95"
                      )}
                    >
                      {/* Signature red top stripe */}
                      <div className="h-1.5 w-full bg-primary" />
                      <div className="p-3">
                        <p className="text-sm font-medium text-foreground truncate leading-snug">
                          {product.name}
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {product.unit}
                        </p>
                        <p className="text-base font-bold text-accent tabular-nums mt-1.5">
                          {formatCurrency(product.selling_price)}
                        </p>
                        {isLowStock && (
                          <p className="text-xs text-warning font-medium mt-1">
                            Low stock
                          </p>
                        )}
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
