"use client";

import { useState, useEffect, useLayoutEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Trash2, Search, X, ArrowRight, Delete, ShoppingCart } from "lucide-react";
import { useCartStore } from "@/lib/pos-store";
import type { OrderTab } from "@/lib/pos-store";
import { PosTopBar } from "@/components/pos/pos-topbar";
import { cn, formatCurrency } from "@/lib/utils";
import type { Profile, Category, Product, ProductPackage } from "@/lib/types";

interface CashierPOSClientProps {
  cashier: Profile;
  initialCategories: Category[];
  initialProducts: Product[];
  initialPackages: ProductPackage[];
}

function getCategoryStyle(categoryName: string): { bg: string; text: string; chip: string } {
  const name = categoryName.toLowerCase();
  if (name.includes("poultry") || name.includes("chicken"))
    return { bg: "bg-amber-100", text: "text-amber-700", chip: "text-amber-700 bg-amber-50" };
  if (name.includes("fish"))
    return { bg: "bg-sky-100", text: "text-sky-700", chip: "text-sky-700 bg-sky-50" };
  if (name.includes("seafood") || name.includes("prawn") || name.includes("shrimp"))
    return { bg: "bg-teal-100", text: "text-teal-700", chip: "text-teal-700 bg-teal-50" };
  if (name.includes("meat") || name.includes("beef") || name.includes("pork") || name.includes("lamb"))
    return { bg: "bg-rose-100", text: "text-rose-700", chip: "text-rose-700 bg-rose-50" };
  if (name.includes("frozen") || name.includes("ice"))
    return { bg: "bg-blue-100", text: "text-blue-700", chip: "text-blue-700 bg-blue-50" };
  if (name.includes("chilled") || name.includes("dairy") || name.includes("milk") || name.includes("cheese"))
    return { bg: "bg-cyan-100", text: "text-cyan-700", chip: "text-cyan-700 bg-cyan-50" };
  if (name.includes("ambient") || name.includes("dry") || name.includes("grocery"))
    return { bg: "bg-amber-50", text: "text-amber-600", chip: "text-amber-600 bg-amber-50" };
  if (name.includes("drink") || name.includes("juice") || name.includes("water") || name.includes("beverage"))
    return { bg: "bg-indigo-100", text: "text-indigo-700", chip: "text-indigo-700 bg-indigo-50" };
  if (name.includes("vegetable") || name.includes("veg") || name.includes("produce") || name.includes("fruit"))
    return { bg: "bg-green-100", text: "text-green-700", chip: "text-green-700 bg-green-50" };
  return { bg: "bg-slate-100", text: "text-slate-500", chip: "text-slate-600 bg-slate-100" };
}

export function CashierPOSClient({
  cashier,
  initialCategories,
  initialProducts,
  initialPackages,
}: CashierPOSClientProps) {
  const router = useRouter();

  const {
    items,
    tabs,
    activeTabId,
    addTab,
    removeTab,
    setActiveTab,
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
  const totalVal    = total();
  const discountVal = subtotalVal - totalVal;

  const [selectedLineId,   setSelectedLineId]   = useState<string | null>(null);
  const [mode,             setMode]             = useState<"Qty" | "Disc" | "Price">("Qty");
  const [buffer,           setBuffer]           = useState("");
  const [search,           setSearch]           = useState("");
  const [category,         setCategory]         = useState<string | null>(null);
  const [recentlyAddedId,  setRecentlyAddedId]  = useState<string | null>(null);
  const [packageModal,     setPackageModal]     = useState<Product | null>(null);
  const [stockCapId,       setStockCapId]       = useState<string | null>(null);
  const [confirmClear,     setConfirmClear]     = useState(false);
  const [failedImages,     setFailedImages]     = useState<Set<string>>(new Set());
  const confirmClearTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const selectedLine   = items.find((i) => i.product.id === selectedLineId);
  const categoryMap    = Object.fromEntries(initialCategories.map((c) => [c.id, c.name]));
  const selectedRowRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => { setBuffer(""); }, [selectedLineId]);

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
      // Don't update the store while value is 0 (user is mid-entry, e.g. "0.")
      if (value > 0) {
        const prod = initialProducts.find((p) => p.id === selectedLineId);
        const maxQty = prod?.stock_quantity ?? Infinity;
        const capped = Math.min(value, maxQty);
        if (maxQty !== Infinity && capped < value) {
          setStockCapId(selectedLineId);
          setTimeout(() => setStockCapId(null), 2500);
        }
        updateQty(selectedLineId, capped);
      }
    } else if (mode === "Disc") {
      // Cap discount at the line total so we never record discount > sale value
      const line = items.find((i) => i.product.id === selectedLineId);
      const maxDisc = line ? line.quantity * line.unit_price : Infinity;
      updateItemDiscount(selectedLineId, Math.min(Math.max(0, value), maxDisc));
    } else {
      updateItemPrice(selectedLineId, Math.max(0, value));
    }
  };

  const productPackages = (product: Product) =>
    initialPackages.filter((pkg) => pkg.product_id === product.id);

  const effectivePrice = (product: Product): number => product.selling_price;

  const handleAddProduct = (product: Product) => {
    const pkgs = productPackages(product);
    if (selectedLineId === product.id) {
      // Already selected: re-open the package picker so cashier can switch size
      if (pkgs.length > 0) setPackageModal(product);
      return;
    }
    const alreadyInCart = items.some((i) => i.product.id === product.id);
    if (alreadyInCart) { setSelectedLineId(product.id); return; }
    if (pkgs.length > 0) { setPackageModal(product); return; }
    addItem({ ...product, selling_price: effectivePrice(product) });
    setSelectedLineId(product.id);
    setRecentlyAddedId(product.id);
    setTimeout(() => setRecentlyAddedId(null), 600);
  };

  const handleAddLoose = (product: Product) => {
    const alreadyInCart = items.some((i) => i.product.id === product.id);
    if (!alreadyInCart) {
      addItem({ ...product, selling_price: effectivePrice(product) });
      setRecentlyAddedId(product.id);
      setTimeout(() => setRecentlyAddedId(null), 600);
    }
    setSelectedLineId(product.id);
    setPackageModal(null);
  };

  const handleAddPackage = (product: Product, pkg: ProductPackage) => {
    const unitPrice = pkg.price / pkg.quantity;
    const alreadyInCart = items.some((i) => i.product.id === product.id);
    if (!alreadyInCart) {
      addItem({ ...product, selling_price: unitPrice });
    } else {
      // Switching package on an existing line — update price, then qty below
      updateItemPrice(product.id, unitPrice);
    }
    updateQty(product.id, pkg.quantity);
    setSelectedLineId(product.id);
    setPackageModal(null);
    setRecentlyAddedId(product.id);
    setTimeout(() => setRecentlyAddedId(null), 600);
  };

  const filteredProducts = initialProducts.filter((p) => {
    if (failedImages.has(p.id)) return false;
    const matchesSearch = search.trim() === "" || p.name.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = category === null || p.category_id === category;
    return matchesSearch && matchesCategory;
  });

  const selectedUnit = selectedLine?.product.unit;
  const displayValue = selectedLine
    ? (() => {
        const raw = buffer !== ""
          ? buffer
          : mode === "Qty" ? String(selectedLine.quantity)
          : mode === "Disc" ? String(selectedLine.discount_amount)
          : selectedLine.unit_price.toFixed(2);
        return mode === "Qty" && selectedUnit === "kg" ? raw + " kg" : raw;
      })()
    : "";

  const isWeightMode = mode === "Qty" && selectedUnit === "kg";
  const weightQty = isWeightMode && selectedLine
    ? (parseFloat(buffer !== "" ? buffer : String(selectedLine.quantity)) || 0)
    : 0;
  const weightPreview = isWeightMode && selectedLine
    ? weightQty > 0
      ? `${weightQty}kg / ${formatCurrency(selectedLine.unit_price)} = ${formatCurrency(Math.max(0, weightQty * selectedLine.unit_price - selectedLine.discount_amount))}`
      : `/ ${formatCurrency(selectedLine.unit_price)} per kg`
    : null;

  const kbRef = useRef<(e: KeyboardEvent) => void>(() => {});
  kbRef.current = (e: KeyboardEvent) => {
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    if (e.key === "Escape") {
      e.preventDefault();
      if (packageModal) { setPackageModal(null); return; }
      setSelectedLineId(null);
      return;
    }
    if (!selectedLineId || packageModal) return;
    if (/^[0-9]$/.test(e.key)) { e.preventDefault(); pressKey(e.key); }
    else if (e.key === ".") { e.preventDefault(); pressKey("."); }
    else if (e.key === "Backspace" || e.key === "Delete") { e.preventDefault(); pressKey("backspace"); }
  };
  useEffect(() => {
    const h = (e: KeyboardEvent) => kbRef.current(e);
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, []);

  return (
    <div className="flex flex-col h-screen bg-pos-bg select-none overflow-hidden">

      {/* ── TOP BAR ──────────────────────────────────────────────── */}
      <PosTopBar cashierName={cashier.full_name} hideDashboardLink />

      {/* ── ORDER TABS — slim navy strip ─────────────────────────── */}
      <div className="flex items-center gap-0.5 px-3 border-b border-white/[0.06] bg-pos-bg overflow-x-auto shrink-0">
        {tabs.map((tab: OrderTab) => {
          const isActive = tab.id === activeTabId;
          return (
            <div
              key={tab.id}
              onClick={() => { setActiveTab(tab.id); setSelectedLineId(null); }}
              className={cn(
                "flex items-center gap-1 shrink-0 px-3 py-2 text-xs font-semibold transition-all cursor-pointer border-b-2",
                isActive
                  ? "border-primary text-white"
                  : "border-transparent text-slate-600 hover:text-slate-400"
              )}
            >
              <span>{tab.name}</span>
              {tabs.length > 1 && (
                <button
                  onClick={(e) => { e.stopPropagation(); removeTab(tab.id); setSelectedLineId(null); }}
                  className="ml-0.5 p-1 rounded hover:bg-white/10 text-slate-600 hover:text-white transition-colors"
                  aria-label={`Close ${tab.name}`}
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          );
        })}
        <button
          onClick={() => { addTab(); setSelectedLineId(null); }}
          className="shrink-0 px-3 py-2 text-sm font-bold text-slate-600 hover:text-slate-300 transition-colors"
          aria-label="New order"
        >+</button>
      </div>

      {/* ── MAIN BODY ─────────────────────────────────────────────── */}
      <div className="flex flex-1 min-h-0">

        {/* ══════════════════════════════════════════════════════════
            LEFT PANEL — Order & Numpad (dark)
        ══════════════════════════════════════════════════════════ */}
        <section
          aria-label="Order panel"
          className="flex flex-col w-2/5 shrink-0 bg-pos-bg"
        >

          {/* Order header */}
          <div className="shrink-0 flex items-center justify-between px-3 py-1 border-b border-white/[0.06]">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black text-slate-600 uppercase tracking-[0.15em]">Order</span>
              {items.length > 0 && (
                <span className="text-[10px] font-black bg-primary text-white px-1.5 py-0.5 rounded-full leading-none tabular-nums">
                  {items.length}
                </span>
              )}
            </div>
            {items.length > 0 && (
              <button
                onClick={() => {
                  if (!confirmClear) {
                    setConfirmClear(true);
                    confirmClearTimer.current = setTimeout(() => setConfirmClear(false), 3000);
                    return;
                  }
                  clearTimeout(confirmClearTimer.current);
                  clearCart();
                  setSelectedLineId(null);
                  setConfirmClear(false);
                }}
                className={cn(
                  "text-[10px] font-bold uppercase tracking-wide px-2.5 py-1 rounded-lg transition-all",
                  confirmClear
                    ? "text-red-400 bg-red-400/10"
                    : "text-slate-600 hover:text-slate-400 hover:bg-white/5"
                )}
              >
                {confirmClear ? "Confirm?" : "Clear"}
              </button>
            )}
          </div>

          {/* ── Order lines (scrollable) ── */}
          <div className="flex-1 min-h-0 overflow-y-auto">
            {items.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center gap-3 text-center px-8">
                <div className="w-14 h-14 rounded-2xl bg-white/[0.04] flex items-center justify-center">
                  <ShoppingCart className="w-6 h-6 text-slate-700" aria-hidden="true" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-600">Empty order</p>
                  <p className="text-xs text-slate-700 mt-0.5">Tap a product to begin</p>
                </div>
              </div>
            ) : (
              items.map((item) => {
                const lineTotal  = Math.max(0, item.quantity * item.unit_price - item.discount_amount);
                const isSelected = selectedLineId === item.product.id;
                return (
                  <div
                    key={item.product.id}
                    ref={isSelected ? selectedRowRef : null}
                    onClick={() => setSelectedLineId(item.product.id)}
                    tabIndex={-1}
                    className={cn(
                      "flex items-center gap-2 px-3 py-1.5 cursor-pointer border-b border-white/[0.04] transition-all focus:outline-none border-l-2",
                      isSelected
                        ? "bg-white/[0.07] border-l-primary"
                        : "border-l-transparent hover:bg-white/[0.03]"
                    )}
                  >
                    {/* Thumbnail */}
                    <div className="shrink-0 w-8 h-8 rounded-md overflow-hidden bg-white/[0.05]">
                      {item.product.image_url ? (
                        <img
                          src={item.product.image_url}
                          alt=""
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <span className="text-slate-500 font-bold text-sm" aria-hidden="true">
                            {item.product.name.charAt(0).toUpperCase()}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Name + calc */}
                    <div className="flex-1 min-w-0">
                      <p className={cn(
                        "text-[13px] font-semibold truncate leading-snug",
                        isSelected ? "text-white" : "text-slate-300"
                      )}>
                        {item.product.name}
                      </p>
                      <p className="text-[11px] mt-0.5 tabular-nums text-slate-500">
                        {item.product.unit === "kg"
                          ? `${item.quantity}kg / ${formatCurrency(item.unit_price)}`
                          : `${item.quantity} × ${formatCurrency(item.unit_price)}`}
                        {item.discount_amount > 0 && (
                          <span className="ml-1.5 text-amber-400">
                            −{formatCurrency(item.discount_amount)}
                          </span>
                        )}
                        {stockCapId === item.product.id && (
                          <span className="ml-1.5 text-amber-300 font-semibold">max</span>
                        )}
                      </p>
                    </div>

                    {/* Total */}
                    <span className={cn(
                      "font-display font-black text-sm tabular-nums shrink-0",
                      isSelected ? "text-primary" : "text-slate-200"
                    )}>
                      {formatCurrency(lineTotal)}
                    </span>

                    {/* Remove */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        removeItem(item.product.id);
                        if (selectedLineId === item.product.id) setSelectedLineId(null);
                      }}
                      aria-label={`Remove ${item.product.name}`}
                      className="w-6 h-6 rounded flex items-center justify-center shrink-0 text-slate-700 hover:text-red-400 hover:bg-red-400/10 transition-all"
                    >
                      <Trash2 className="w-3 h-3" aria-hidden="true" />
                    </button>
                  </div>
                );
              })
            )}
          </div>

          {/* ── NUMPAD ── */}
          <div className="shrink-0 bg-pos-numpad border-t border-white/[0.06] p-2 space-y-1.5">

            {/* Selected line readout */}
            <div className="flex items-center justify-between gap-2 h-8">
              {selectedLine ? (
                <>
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] font-bold text-slate-600 uppercase tracking-[0.12em] truncate">
                      {selectedLine.product.name}
                    </p>
                    {weightPreview && (
                      <p className="text-[10px] text-primary/70 tabular-nums truncate">{weightPreview}</p>
                    )}
                  </div>
                  <span className="font-display font-black text-xl text-white tabular-nums shrink-0">
                    {displayValue}
                  </span>
                </>
              ) : (
                <p className="text-xs text-slate-700 w-full text-center">Select a line to edit</p>
              )}
            </div>

            {/* Mode selector — segmented pill */}
            <div className="flex gap-0.5 p-0.5 bg-white/[0.05] rounded-lg">
              {(["Qty", "Disc", "Price"] as const).map((m) => {
                const label = m === "Qty" && selectedLine?.product.unit === "kg" ? "Wt" : m;
                return (
                  <button
                    key={m}
                    onClick={() => { setMode(m); setBuffer(""); }}
                    disabled={!selectedLineId}
                    className={cn(
                      "flex-1 h-9 rounded-md text-xs font-bold transition-all disabled:opacity-20",
                      mode === m && selectedLineId
                        ? "bg-white text-slate-900 shadow-sm"
                        : "text-slate-600 hover:text-slate-400"
                    )}
                  >
                    {label}
                  </button>
                );
              })}
            </div>

            {/* Digit grid */}
            <div className="grid grid-cols-3 gap-1">
              {["1","2","3","4","5","6","7","8","9",".","0","00"].map((key) => (
                <button
                  key={key}
                  onClick={() => pressKey(key)}
                  disabled={!selectedLineId}
                  className="h-12 rounded-lg bg-white/[0.07] hover:bg-white/[0.12] active:scale-95 active:bg-white/[0.16] text-white font-display font-bold text-lg transition-all disabled:opacity-20"
                >
                  {key}
                </button>
              ))}
            </div>

            {/* Backspace */}
            <button
              onClick={() => pressKey("backspace")}
              disabled={!selectedLineId}
              aria-label="Backspace"
              className="h-10 w-full rounded-lg bg-white/[0.05] hover:bg-red-500/10 hover:text-red-400 active:scale-95 text-slate-600 transition-all disabled:opacity-20 flex items-center justify-center gap-1.5 text-xs font-semibold"
            >
              <Delete className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Backspace</span>
            </button>
          </div>

          {/* ── TOTALS + PAY ── */}
          <div className="shrink-0 px-2.5 pb-2.5 pt-1.5 bg-pos-bg border-t border-white/[0.06] space-y-1">
            {discountVal > 0 && (
              <div className="flex justify-between text-[10px] tabular-nums px-1">
                <span className="text-slate-600">Subtotal <span className="text-slate-500">{formatCurrency(subtotalVal)}</span></span>
                <span className="text-amber-400">−{formatCurrency(discountVal)}</span>
              </div>
            )}
            <button
              onClick={() => router.push("/cashier/payment")}
              disabled={items.length === 0}
              className={cn(
                "w-full h-14 rounded-xl flex items-center justify-between px-4 gap-3 transition-all",
                "bg-primary hover:bg-primary/90 active:scale-[0.98] disabled:opacity-25",
                "shadow-lg shadow-primary/20"
              )}
            >
              <span className="font-display font-black text-base text-white uppercase tracking-wide">Pay</span>
              <span className="font-display font-black text-xl text-white tabular-nums flex-1 text-center">
                {items.length > 0
                  ? formatCurrency(totalVal)
                  : <span className="text-white/30">—</span>}
              </span>
              <ArrowRight className="w-4 h-4 text-white/60 shrink-0" aria-hidden="true" />
            </button>
          </div>
        </section>

        {/* ══════════════════════════════════════════════════════════
            RIGHT PANEL — Product Browser (light)
        ══════════════════════════════════════════════════════════ */}
        <section
          aria-label="Product browser"
          className="flex flex-col flex-1 min-w-0 bg-slate-50"
        >

          {/* Search */}
          <div className="shrink-0 px-4 pt-3 pb-2">
            <label htmlFor="product-search" className="sr-only">Search products</label>
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" aria-hidden="true" />
              <input
                id="product-search"
                type="text"
                placeholder="Search products…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-11 w-full rounded-2xl bg-white border-0 shadow-sm pl-11 pr-4 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/25 transition-all"
              />
            </div>
          </div>

          {/* Category chip pills */}
          <div className="relative shrink-0 px-4 pb-2">
            <div className="flex gap-1.5 overflow-x-auto pb-0.5 scrollbar-none">
              {/* All chip */}
              <button
                onClick={() => setCategory(null)}
                className={cn(
                  "shrink-0 h-8 px-3.5 rounded-full text-xs font-bold transition-all whitespace-nowrap",
                  category === null
                    ? "bg-slate-900 text-white shadow-sm"
                    : "bg-white text-slate-500 shadow-sm hover:text-slate-800"
                )}
              >
                All
              </button>

              {initialCategories.map((cat) => {
                const { chip } = getCategoryStyle(cat.name);
                const isActive = category === cat.id;
                return (
                  <button
                    key={cat.id}
                    onClick={() => setCategory(cat.id)}
                    className={cn(
                      "shrink-0 h-8 px-3.5 rounded-full text-xs font-bold transition-all whitespace-nowrap",
                      isActive
                        ? "bg-slate-900 text-white shadow-sm"
                        : `${chip} shadow-sm hover:shadow-md`
                    )}
                  >
                    {cat.name}
                  </button>
                );
              })}
            </div>
            <div className="pointer-events-none absolute inset-y-0 right-0 w-10 bg-gradient-to-l from-slate-50 to-transparent" aria-hidden="true" />
          </div>

          {/* Product grid */}
          <div className="flex-1 min-h-0 overflow-y-auto px-4 pb-4">
            {filteredProducts.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-40 gap-2 text-center">
                <p className="text-sm font-semibold text-slate-400">No products found</p>
                <p className="text-xs text-slate-400/70">Try a different search or category</p>
              </div>
            ) : (
              <div className="grid grid-cols-3 md:grid-cols-4 gap-3">
                {filteredProducts.map((product) => {
                  const isRecent      = recentlyAddedId === product.id;
                  const isActive      = selectedLineId   === product.id;
                  const stockQty      = product.stock_quantity ?? 0;
                  const isExpiredOnly = stockQty > 0 && !product.has_valid_stock;
                  const isOutOfStock  = stockQty <= 0 || !product.has_valid_stock;
                  const isLowStock    = !isOutOfStock && stockQty < product.low_stock_threshold;
                  const catName       = categoryMap[product.category_id] ?? "";
                  const { bg, text }  = getCategoryStyle(catName);

                  return (
                    <div
                      key={product.id}
                      onClick={() => !isOutOfStock && handleAddProduct(product)}
                      aria-disabled={isOutOfStock}
                      tabIndex={isOutOfStock ? undefined : -1}
                      className={cn(
                        "bg-white rounded-2xl overflow-hidden transition-all focus:outline-none",
                        isOutOfStock
                          ? "opacity-40 cursor-not-allowed"
                          : "cursor-pointer shadow-sm hover:shadow-lg hover:-translate-y-0.5 active:scale-[0.97] active:shadow-sm",
                        isActive  ? "ring-2 ring-primary shadow-lg shadow-primary/15 -translate-y-0.5" :
                        isRecent  ? "ring-2 ring-emerald-400 shadow-lg shadow-emerald-400/10" : ""
                      )}
                    >
                      {/* Color block / image */}
                      {product.image_url ? (
                        <img
                          src={product.image_url}
                          alt={product.name}
                          className="w-full aspect-[4/3] object-cover"
                          onError={() => setFailedImages(prev => new Set(prev).add(product.id))}
                        />
                      ) : (
                        <div className={cn(
                          "w-full aspect-[4/3] flex items-center justify-center relative overflow-hidden",
                          isActive  ? "bg-primary/10" :
                          isRecent  ? "bg-emerald-50" : bg
                        )}>
                          <span
                            className={cn(
                              "font-display font-black text-5xl select-none opacity-25",
                              isActive  ? "text-primary" :
                              isRecent  ? "text-emerald-500" : text
                            )}
                            aria-hidden="true"
                          >
                            {product.name.charAt(0).toUpperCase()}
                          </span>
                          {isRecent && (
                            <div className="absolute inset-0 flex items-center justify-center">
                              <div className="w-8 h-8 rounded-full bg-emerald-500 flex items-center justify-center animate-ping opacity-30 absolute" />
                              <div className="w-6 h-6 rounded-full bg-emerald-500 flex items-center justify-center relative">
                                <span className="text-white text-xs font-bold">✓</span>
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Info */}
                      <div className="p-2.5 pt-2">
                        <p className="text-[13px] font-semibold text-slate-800 leading-snug line-clamp-2 mb-1.5">
                          {product.name}
                        </p>
                        <div className="flex items-baseline justify-between gap-1">
                          <span className="font-display font-black text-base text-primary tabular-nums leading-none">
                            {formatCurrency(product.selling_price)}
                          </span>
                          <span className="text-[10px] text-slate-400 font-medium shrink-0">
                            /{product.unit}
                          </span>
                        </div>
                        {isExpiredOnly ? (
                          <p className="text-[10px] font-bold text-orange-500 mt-1">Expired</p>
                        ) : isOutOfStock ? (
                          <p className="text-[10px] font-bold text-red-500 mt-1">Out of stock</p>
                        ) : isLowStock ? (
                          <p className="text-[10px] font-bold text-amber-500 mt-1">{stockQty} left</p>
                        ) : null}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </section>
      </div>

      {/* ══ PACKAGE PICKER MODAL ══ */}
      {packageModal && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center sm:items-center bg-black/60 backdrop-blur-sm"
          onClick={(e) => e.target === e.currentTarget && setPackageModal(null)}
        >
          <div className="w-full max-w-sm bg-white rounded-t-3xl sm:rounded-3xl p-5 shadow-2xl">
            <div className="w-10 h-1 bg-slate-200 rounded-full mx-auto mb-5 sm:hidden" aria-hidden="true" />
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Add to order</p>
            <h3 className="text-lg font-bold text-slate-900 mb-4">{packageModal.name}</h3>
            <div className="space-y-2">
              <button
                onClick={() => handleAddLoose(packageModal)}
                className="w-full flex items-center justify-between px-4 py-3.5 rounded-2xl border border-slate-200 hover:border-slate-300 hover:bg-slate-50 active:scale-[0.99] transition-all text-left"
              >
                <div>
                  <p className="text-sm font-bold text-slate-900">Loose — per {packageModal.unit}</p>
                  <p className="text-xs text-slate-500 mt-0.5">Enter quantity with numpad</p>
                </div>
                <span className="font-display font-black text-lg text-primary tabular-nums ml-3 shrink-0">
                  {formatCurrency(effectivePrice(packageModal))}
                </span>
              </button>

              {productPackages(packageModal).map((pkg) => (
                <button
                  key={pkg.id}
                  onClick={() => handleAddPackage(packageModal, pkg)}
                  className="w-full flex items-center justify-between px-4 py-3.5 rounded-2xl bg-primary/5 border border-primary/15 hover:bg-primary/10 active:scale-[0.99] transition-all text-left"
                >
                  <div>
                    <p className="text-sm font-bold text-slate-900">{pkg.label}</p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {pkg.quantity} {packageModal.unit} · {formatCurrency(pkg.price / pkg.quantity)}/{packageModal.unit}
                    </p>
                  </div>
                  <span className="font-display font-black text-lg text-primary tabular-nums ml-3 shrink-0">
                    {formatCurrency(pkg.price)}
                  </span>
                </button>
              ))}
            </div>
            <button
              onClick={() => setPackageModal(null)}
              className="w-full mt-3 h-11 rounded-2xl border border-slate-200 text-sm font-semibold text-slate-500 hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
