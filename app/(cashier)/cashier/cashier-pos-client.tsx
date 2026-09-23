"use client";

import { useState, useEffect, useLayoutEffect, useRef } from "react";
import { Trash2, Search, ArrowRight, Delete, ShoppingCart, Scale, Check, Ban } from "lucide-react";
import { useCartStore } from "@/lib/pos-store";
import { PosTopBar } from "@/components/pos/pos-topbar";
import { PaymentClient } from "./payment/payment-client";
import { ReceiptClient } from "./receipt/receipt-client";
import { OrdersView } from "./orders-view";
import { DashboardView } from "./dashboard-view";
import { getSaleForReceipt } from "@/app/(dashboard)/pos/actions";
import { cn, formatCurrency } from "@/lib/utils";
import type { Profile, Category, Product, ProductPackage, Sale, StoreSettings } from "@/lib/types";

interface CashierPOSClientProps {
  cashier: Profile;
  initialCategories: Category[];
  initialProducts: Product[];
  initialPackages: ProductPackage[];
  initialSettings: StoreSettings | null;
}

// Global overlays (not per-tab). Payment view is now tracked per-tab in pos-store.
type PosView =
  | { screen: "pos" }
  | { screen: "receipt"; sale: Sale; settings: StoreSettings | null }
  | { screen: "orders" }
  | { screen: "dashboard" };

const DEFAULT_SETTINGS: StoreSettings = {
  id: 1, store_name: "Bedarts Cold Supplies",
  address: null, phone: null, email: null,
  vat_number: null, opening_hours: null, sunday_hours: null,
  receipt_footer: "Thank you for shopping with us!",
  receipt_paper_size: "80mm",
  updated_at: "", tax_rate: 0, tax_enabled: false,
};

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
  initialSettings,
}: CashierPOSClientProps) {
  const [view, setView] = useState<PosView>({ screen: "pos" });

  const {
    items,
    addItem,
    removeItem,
    updateQty,
    updateItemDiscount,
    updateItemPrice,
    updateItemPackageLabel,
    clearCart,
    subtotal,
    total,
    activeTabId,
    paymentTabIds,
    enterPayment,
    exitPayment,
  } = useCartStore();

  // Payment view is derived per-tab: the current tab is "in payment" iff its id
  // is in paymentTabIds. Switching tabs preserves each tab's screen state.
  const isPaymentScreen = paymentTabIds.includes(activeTabId);

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
  const [packageModalLineId, setPackageModalLineId] = useState<string | null>(null);
  const [stockCapId,       setStockCapId]       = useState<string | null>(null);
  const [discCapId,        setDiscCapId]        = useState<string | null>(null);
  const [confirmClear,     setConfirmClear]     = useState(false);
  const [failedImages,     setFailedImages]     = useState<Set<string>>(new Set());
  const [mobileView,       setMobileView]       = useState<"products" | "order">("products");
  const confirmClearTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const selectedLine   = items.find((i) => i.lineId === selectedLineId);
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
      if (mode === "Qty") {
        if (buffer === "0" || buffer === "") {
          // Second backspace at zero — remove the line, select predecessor
          const idx = items.findIndex((i) => i.lineId === selectedLineId);
          const next = (idx > 0 ? items[idx - 1] : items[idx + 1])?.lineId ?? null;
          removeItem(selectedLineId);
          setSelectedLineId(next);
          setBuffer("");
          return;
        }
        // First backspace — collapse to "0" rather than empty
        next = buffer.length === 1 ? "0" : buffer.slice(0, -1);
      } else {
        next = next.slice(0, -1);
      }
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
      // Allow qty=0 so the line shows 0 before a second backspace removes it
      const prod = initialProducts.find((p) => p.id === selectedLine?.product.id);
      const maxQty = prod?.stock_quantity ?? Infinity;
      const capped = value > 0 ? Math.min(value, maxQty) : 0;
      if (maxQty !== Infinity && value > 0 && capped < value) {
        setStockCapId(selectedLineId);
        setTimeout(() => setStockCapId(null), 2500);
      }
      updateQty(selectedLineId, capped);
    } else if (mode === "Disc") {
      // Cap discount at the line total so we never record discount > sale value
      const maxDisc = selectedLine ? selectedLine.quantity * selectedLine.unit_price : Infinity;
      const capped = Math.min(Math.max(0, value), maxDisc);
      if (maxDisc !== Infinity && capped < value) {
        setDiscCapId(selectedLineId);
        setTimeout(() => setDiscCapId(null), 2500);
      }
      updateItemDiscount(selectedLineId, capped);
    } else {
      updateItemPrice(selectedLineId, Math.max(0, value));
    }
  };

  const productPackages = (product: Product) =>
    initialPackages.filter((pkg) => pkg.product_id === product.id);

  const effectivePrice = (product: Product): number => product.selling_price;

  const handleAddProduct = (product: Product) => {
    const lineId = crypto.randomUUID();
    addItem({ ...product, selling_price: effectivePrice(product) }, lineId);
    setSelectedLineId(lineId);
    setRecentlyAddedId(product.id);
    setTimeout(() => setRecentlyAddedId(null), 600);
  };

  const handleAddLoose = (product: Product) => {
    if (packageModalLineId) {
      updateItemPrice(packageModalLineId, effectivePrice(product));
      updateItemPackageLabel(packageModalLineId, null);
      setSelectedLineId(packageModalLineId);
    } else {
      const lineId = crypto.randomUUID();
      addItem({ ...product, selling_price: effectivePrice(product) }, lineId);
      setSelectedLineId(lineId);
      setRecentlyAddedId(product.id);
      setTimeout(() => setRecentlyAddedId(null), 600);
    }
    setPackageModal(null);
    setPackageModalLineId(null);
  };

  const handleAddPackage = (product: Product, pkg: ProductPackage) => {
    const unitPrice = pkg.price / pkg.quantity;
    if (packageModalLineId) {
      updateItemPrice(packageModalLineId, unitPrice);
      updateQty(packageModalLineId, pkg.quantity);
      updateItemPackageLabel(packageModalLineId, pkg.label);
      setSelectedLineId(packageModalLineId);
    } else {
      const lineId = crypto.randomUUID();
      addItem({ ...product, selling_price: unitPrice }, lineId);
      updateQty(lineId, pkg.quantity);
      updateItemPackageLabel(lineId, pkg.label);
      setSelectedLineId(lineId);
      setRecentlyAddedId(product.id);
      setTimeout(() => setRecentlyAddedId(null), 600);
    }
    setPackageModal(null);
    setPackageModalLineId(null);
  };

  const filteredProducts = initialProducts.filter((p) => {
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
  const weightPreview = isWeightMode && selectedLine && !selectedLine.packageLabel
    ? weightQty > 0
      ? `${weightQty}kg / ${formatCurrency(selectedLine.unit_price)} = ${formatCurrency(Math.max(0, weightQty * selectedLine.unit_price - selectedLine.discount_amount))}`
      : `/ ${formatCurrency(selectedLine.unit_price)} per kg`
    : null;
  const boxPreview = selectedLine?.packageLabel
    ? `${selectedLine.packageLabel} · ${formatCurrency(Math.max(0, selectedLine.quantity * selectedLine.unit_price - selectedLine.discount_amount))}`
    : null;

  const kbRef = useRef<(e: KeyboardEvent) => void>(() => {});
  kbRef.current = (e: KeyboardEvent) => {
    if (view.screen !== "pos") return;
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    if (e.key === "Escape") {
      e.preventDefault();
      if (packageModal) { setPackageModal(null); setPackageModalLineId(null); return; }
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

  if (view.screen === "pos" && isPaymentScreen) {
    return (
      <PaymentClient
        cashierName={cashier.full_name}
        avatarUrl={cashier.avatar_url}
        onBack={() => exitPayment()}
        onComplete={async (saleId) => {
          exitPayment();
          try {
            const timeout = new Promise<never>((_, reject) =>
              setTimeout(() => reject(new Error("timeout")), 8000)
            );
            const { sale, settings } = await Promise.race([getSaleForReceipt(saleId), timeout]);
            if (sale) setView({ screen: "receipt", sale, settings });
          } catch {
            /* stay on pos */
          }
        }}
        onOfflineComplete={(sale) => {
          exitPayment();
          setView({ screen: "receipt", sale, settings: initialSettings });
        }}
      />
    );
  }

  if (view.screen === "receipt") {
    return (
      <ReceiptClient
        sale={view.sale}
        settings={view.settings ?? DEFAULT_SETTINGS}
        onNewOrder={() => {
          setSelectedLineId(null);
          setView({ screen: "pos" });
        }}
        onViewOrders={() => setView({ screen: "orders" })}
      />
    );
  }

  if (view.screen === "orders") {
    return (
      <OrdersView
        cashier={cashier}
        onBack={() => setView({ screen: "pos" })}
        onViewReceipt={async (saleId) => {
          try {
            const timeout = new Promise<never>((_, reject) =>
              setTimeout(() => reject(new Error("timeout")), 8000)
            );
            const { sale, settings } = await Promise.race([getSaleForReceipt(saleId), timeout]);
            if (sale) setView({ screen: "receipt", sale, settings });
          } catch {
            // network unavailable or timed out — stay on orders
          }
        }}
      />
    );
  }

  if (view.screen === "dashboard") {
    return (
      <DashboardView
        cashier={cashier}
        onBack={() => setView({ screen: "pos" })}
      />
    );
  }

  return (
    <div className="flex flex-col h-dvh bg-white select-none overflow-hidden animate-page-enter">

      {/* ── TOP BAR (with order tabs) ────────────────────────────── */}
      <PosTopBar
        cashierName={cashier.full_name}
        avatarUrl={cashier.avatar_url}
        showTabs
        onTabChange={() => setSelectedLineId(null)}
        onOrders={() => setView({ screen: "orders" })}
        onDashboard={() => setView({ screen: "dashboard" })}
        showRefunds={cashier.role === "admin" || cashier.role === "manager"}
      />

      {/* ── MOBILE VIEW SWITCHER ─────────────────────────────────── */}
      <div className="lg:hidden flex shrink-0 border-b border-border bg-white">
        <button
          onClick={() => setMobileView("products")}
          className={cn(
            "flex-1 py-3 text-xs font-bold transition-colors",
            mobileView === "products" ? "text-primary border-b-2 border-primary" : "text-muted-foreground hover:text-foreground"
          )}
        >
          Products
        </button>
        <button
          onClick={() => setMobileView("order")}
          className={cn(
            "flex-1 py-3 text-xs font-bold transition-colors flex items-center justify-center gap-1.5",
            mobileView === "order" ? "text-primary border-b-2 border-primary" : "text-muted-foreground hover:text-foreground"
          )}
        >
          Order
          {items.length > 0 && (
            <span className={cn(
              "text-[10px] px-1.5 py-0.5 rounded-full leading-none tabular-nums font-black",
              mobileView === "order" ? "bg-primary text-white" : "bg-secondary text-muted-foreground"
            )}>
              {items.length}
            </span>
          )}
        </button>
      </div>

      {/* ── MAIN BODY ─────────────────────────────────────────────── */}
      <div className="flex flex-1 min-h-0">

        {/* ══════════════════════════════════════════════════════════
            LEFT PANEL — Order & Numpad (dark)
        ══════════════════════════════════════════════════════════ */}
        <section
          aria-label="Order panel"
          className={cn(
            "flex flex-col bg-white w-full lg:w-2/5 lg:shrink-0",
            mobileView === "order" ? "" : "hidden lg:flex"
          )}
        >

          {/* Order header */}
          <div className="shrink-0 flex items-center justify-between px-3 py-1 border-b border-border">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-black text-slate-500 uppercase tracking-[0.15em]">Order</span>
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
                    ? "text-destructive bg-destructive/10"
                    : "text-slate-500 hover:text-slate-900 hover:bg-slate-100"
                )}
              >
                {confirmClear ? "Confirm?" : "Clear"}
              </button>
            )}
          </div>

          {/* ── Order lines (scrollable) ── */}
          <div className="flex-1 min-h-0 overflow-y-auto">
            {items.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center gap-4 text-center px-8">
                <div className="w-16 h-16 rounded-2xl bg-primary/5 border border-primary/10 flex items-center justify-center">
                  <ShoppingCart className="w-7 h-7 text-primary/60" aria-hidden="true" strokeWidth={1.75} />
                </div>
                <div>
                  <p className="font-display font-black text-slate-900 text-base">Start a new order</p>
                  <p className="text-xs text-slate-500 mt-1">Tap a product on the right to add it</p>
                </div>
              </div>
            ) : (
              items.map((item) => {
                const lineTotal  = Math.max(0, item.quantity * item.unit_price - item.discount_amount);
                const isSelected = selectedLineId === item.lineId;
                return (
                  <div
                    key={item.lineId}
                    ref={isSelected ? selectedRowRef : null}
                    onClick={() => setSelectedLineId(item.lineId)}
                    tabIndex={-1}
                    className={cn(
                      "flex items-center gap-2.5 px-3 py-2 cursor-pointer border-b border-border transition-all focus:outline-none border-l-[3px]",
                      isSelected
                        ? "bg-primary/[0.04] border-l-primary"
                        : "border-l-transparent hover:bg-slate-50"
                    )}
                  >
                    {/* Thumbnail */}
                    <div className="shrink-0 w-9 h-9 rounded-lg overflow-hidden bg-slate-100">
                      {item.product.image_url ? (
                        <img
                          src={item.product.image_url}
                          alt=""
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <span className="text-slate-400 font-bold text-sm" aria-hidden="true">
                            {item.product.name.charAt(0).toUpperCase()}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Name + calc */}
                    <div className="flex-1 min-w-0">
                      <p className={cn(
                        "text-sm font-bold truncate leading-tight",
                        isSelected ? "text-slate-900" : "text-slate-800"
                      )}>
                        {item.product.name}
                      </p>
                      <p className="text-[11px] mt-0.5 tabular-nums text-slate-500 leading-snug">
                        {item.packageLabel
                          ? `${item.packageLabel} · ${item.quantity}${item.product.unit === "kg" ? "kg" : "pcs"}`
                          : item.product.unit === "kg"
                            ? `${item.quantity}kg / ${formatCurrency(item.unit_price)}`
                            : `${item.quantity} × ${formatCurrency(item.unit_price)}`}
                        {item.discount_amount > 0 && (
                          <span className="ml-1.5 text-warning">
                            −{formatCurrency(item.discount_amount)}
                          </span>
                        )}
                        {stockCapId === item.lineId && (
                          <span className="ml-1.5 text-warning font-semibold">max stock</span>
                        )}
                        {discCapId === item.lineId && (
                          <span className="ml-1.5 text-warning font-semibold">discount capped at line total</span>
                        )}
                      </p>
                    </div>

                    {/* Total */}
                    <span className={cn(
                      "font-display font-black text-base tabular-nums shrink-0 tracking-tight",
                      isSelected ? "text-primary" : "text-slate-900"
                    )}>
                      {formatCurrency(lineTotal)}
                    </span>

                    {/* Remove */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        const idx = items.findIndex((i) => i.lineId === item.lineId);
                        const next = (idx > 0 ? items[idx - 1] : items[idx + 1])?.lineId ?? null;
                        removeItem(item.lineId);
                        if (selectedLineId === item.lineId) setSelectedLineId(next);
                      }}
                      aria-label={`Remove ${item.product.name}`}
                      className="w-6 h-6 rounded flex items-center justify-center shrink-0 text-slate-400 hover:text-destructive hover:bg-destructive/10 transition-all"
                    >
                      <Trash2 className="w-3 h-3" aria-hidden="true" />
                    </button>
                  </div>
                );
              })
            )}
          </div>

          {/* ── NUMPAD ── */}
          <div className="shrink-0 bg-slate-50 border-t border-border p-2 space-y-1.5">

            {/* Selected line readout */}
            <div className="flex items-center justify-between gap-2 h-8">
              {selectedLine ? (
                <>
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] font-bold text-slate-500 uppercase tracking-[0.12em] truncate">
                      {selectedLine.product.name}
                    </p>
                    {(boxPreview ?? weightPreview) && (
                      <p className="text-[11px] text-primary/70 tabular-nums truncate">{boxPreview ?? weightPreview}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full bg-primary text-white leading-none">
                      {mode === "Qty" && selectedLine.product.unit === "kg" ? "Wt" : mode}
                    </span>
                    <span className="font-display font-black text-xl text-slate-900 tabular-nums">
                      {displayValue}
                    </span>
                  </div>
                </>
              ) : (
                <p className="text-[11px] text-slate-400 w-full text-center uppercase tracking-widest font-bold">Numpad</p>
              )}
            </div>

            {/* Change UOM — always visible when a line is selected */}
            {selectedLine && (
              <button
                onClick={() => { setPackageModal(selectedLine.product); setPackageModalLineId(selectedLineId); }}
                className="w-full flex items-center justify-center gap-1.5 h-7 rounded-md bg-white border border-slate-200 text-slate-500 hover:bg-slate-100 hover:text-slate-900 text-xs font-semibold transition-colors"
              >
                <Scale className="w-3 h-3" aria-hidden="true" />
                Change UOM
              </button>
            )}

            {/* 4-column digit + mode grid */}
            <div className="grid grid-cols-4 gap-1.5">
              {/* Row 1: 1 2 3  Qty */}
              {["1","2","3"].map(k => (
                <button key={k} onClick={() => pressKey(k)}
                  className="h-12 rounded-xl btn-tactile active:btn-tactile-active text-slate-900 font-display font-black text-xl">
                  {k}
                </button>
              ))}
              <button
                onClick={() => { setMode("Qty"); setBuffer(""); }}
                className={cn(
                  "h-12 rounded-xl text-xs font-black uppercase tracking-wider",
                  mode === "Qty"
                    ? "btn-tactile-primary active:btn-tactile-primary-active"
                    : "btn-tactile active:btn-tactile-active text-slate-500"
                )}
              >
                {selectedLine?.product.unit === "kg" ? "Wt" : "Qty"}
              </button>

              {/* Row 2: 4 5 6  Disc */}
              {["4","5","6"].map(k => (
                <button key={k} onClick={() => pressKey(k)}
                  className="h-12 rounded-xl btn-tactile active:btn-tactile-active text-slate-900 font-display font-black text-xl">
                  {k}
                </button>
              ))}
              <button
                onClick={() => { setMode("Disc"); setBuffer(""); }}
                className={cn(
                  "h-12 rounded-xl text-xs font-black uppercase tracking-wider",
                  mode === "Disc"
                    ? "btn-tactile-primary active:btn-tactile-primary-active"
                    : "btn-tactile active:btn-tactile-active text-slate-500"
                )}
              >
                Disc
              </button>

              {/* Row 3: 7 8 9  Price */}
              {["7","8","9"].map(k => (
                <button key={k} onClick={() => pressKey(k)}
                  className="h-12 rounded-xl btn-tactile active:btn-tactile-active text-slate-900 font-display font-black text-xl">
                  {k}
                </button>
              ))}
              <button
                onClick={() => { setMode("Price"); setBuffer(""); }}
                className={cn(
                  "h-12 rounded-xl text-xs font-black uppercase tracking-wider",
                  mode === "Price"
                    ? "btn-tactile-primary active:btn-tactile-primary-active"
                    : "btn-tactile active:btn-tactile-active text-slate-500"
                )}
              >
                Price
              </button>

              {/* Row 4: 00 0 .  ⌫ */}
              {["00","0","."].map(k => (
                <button key={k} onClick={() => pressKey(k)}
                  className="h-12 rounded-xl btn-tactile active:btn-tactile-active text-slate-900 font-display font-black text-xl">
                  {k}
                </button>
              ))}
              <button
                onClick={() => pressKey("backspace")}
                aria-label="Backspace"
                className="h-12 rounded-xl btn-tactile active:btn-tactile-active text-slate-500 hover:text-destructive flex items-center justify-center"
              >
                <Delete className="w-5 h-5" aria-hidden="true" />
              </button>
            </div>
          </div>

          {/* ── TOTALS + PAY ── */}
          <div className="shrink-0 px-3 pb-3 pt-2 bg-slate-50 border-t-2 border-primary/10 space-y-2">
            {discountVal > 0 && (
              <div className="flex justify-between text-[11px] tabular-nums px-1">
                <span className="text-slate-500">Subtotal <span className="text-slate-800 font-semibold">{formatCurrency(subtotalVal)}</span></span>
                <span className="text-warning font-semibold">−{formatCurrency(discountVal)}</span>
              </div>
            )}
            <button
              onClick={() => enterPayment()}
              disabled={items.length === 0}
              className={cn(
                "w-full h-16 rounded-2xl flex items-center justify-between px-5 gap-3 transition-all",
                "btn-tactile-primary active:btn-tactile-primary-active",
                "disabled:opacity-25 disabled:pointer-events-none"
              )}
            >
              <span className="font-display font-black text-lg text-white uppercase tracking-wider">Pay</span>
              <span className="font-display font-black text-2xl text-white tabular-nums flex-1 text-center">
                {items.length > 0
                  ? formatCurrency(totalVal)
                  : <span className="text-white/30">—</span>}
              </span>
              <ArrowRight className="w-5 h-5 text-white/70 shrink-0" aria-hidden="true" />
            </button>
          </div>
        </section>

        {/* ══════════════════════════════════════════════════════════
            RIGHT PANEL — Product Browser (light)
        ══════════════════════════════════════════════════════════ */}
        <section
          aria-label="Product browser"
          className={cn(
            "flex flex-col flex-1 min-w-0 bg-slate-50",
            mobileView === "products" ? "" : "hidden lg:flex"
          )}
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
                className="h-11 w-full rounded-2xl bg-white border-0 shadow-sm pl-11 pr-4 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-accent/25 transition-all"
              />
            </div>
          </div>

          {/* Category chip pills */}
          <div className="relative shrink-0 px-4 pb-3">
            <div className="flex gap-2 overflow-x-auto pb-0.5 scrollbar-none">
              {/* All chip */}
              <button
                onClick={() => setCategory(null)}
                className={cn(
                  "shrink-0 h-9 px-4 rounded-full text-xs font-black uppercase tracking-wider transition-all whitespace-nowrap",
                  category === null
                    ? "bg-slate-900 text-white shadow-md"
                    : "bg-white text-slate-500 shadow-sm hover:text-slate-800 hover:shadow-md hover:-translate-y-0.5"
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
                      "shrink-0 h-9 px-4 rounded-full text-xs font-bold transition-all whitespace-nowrap",
                      isActive
                        ? "bg-slate-900 text-white shadow-md"
                        : `${chip} shadow-sm hover:shadow-md hover:-translate-y-0.5`
                    )}
                  >
                    {cat.name}
                  </button>
                );
              })}
            </div>
            <div className="pointer-events-none absolute inset-y-0 right-0 w-10 bg-gradient-to-l from-slate-50 to-transparent" aria-hidden="true" />
          </div>

          {/* Mobile running total — sticky strip above product grid */}
          {items.length > 0 && (
            <div className="lg:hidden shrink-0 flex items-center justify-between gap-3 px-4 py-2.5 bg-slate-900 border-b border-slate-800">
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none mb-0.5">
                  {items.length} item{items.length !== 1 ? "s" : ""}
                </p>
                <p className="font-display font-black text-base text-white tabular-nums leading-none">{formatCurrency(totalVal)}</p>
              </div>
              <button
                onClick={() => setMobileView("order")}
                className="flex items-center gap-1.5 h-9 px-4 rounded-xl bg-primary text-white font-bold text-xs shrink-0 transition-colors hover:bg-primary/90"
              >
                Review order
                <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
              </button>
            </div>
          )}

          {/* Product grid */}
          <div className="flex-1 min-h-0 overflow-y-auto px-4 pb-4">
            {filteredProducts.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-48 gap-4 text-center">
                <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center">
                  <Search className="w-7 h-7 text-slate-400" strokeWidth={1.75} aria-hidden="true" />
                </div>
                <div>
                  <p className="font-display font-black text-base text-slate-900">No matches</p>
                  <p className="text-xs text-slate-500 mt-1">Try a different search or category</p>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {filteredProducts.map((product) => {
                  const isRecent      = recentlyAddedId === product.id;
                  const isActive      = selectedLineId !== null && items.some((i) => i.lineId === selectedLineId && i.product.id === product.id);
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
                      onKeyDown={(e) => { if ((e.key === "Enter" || e.key === " ") && !isOutOfStock) { e.preventDefault(); handleAddProduct(product); } }}
                      role="button"
                      aria-disabled={isOutOfStock}
                      tabIndex={isOutOfStock ? undefined : 0}
                      className={cn(
                        "bg-white rounded-2xl overflow-hidden transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-accent relative",
                        isOutOfStock
                          ? "cursor-not-allowed"
                          : "cursor-pointer shadow-sm hover:shadow-lg hover:-translate-y-0.5 active:scale-[0.97] active:shadow-sm",
                        isActive  ? "ring-2 ring-primary shadow-lg shadow-primary/15 -translate-y-0.5" :
                        isRecent  ? "ring-2 ring-emerald-400 shadow-lg shadow-emerald-400/10" : ""
                      )}
                    >
                      {/* Color block / image */}
                      {product.image_url && !failedImages.has(product.id) ? (
                        <img
                          src={product.image_url}
                          alt={product.name}
                          className="w-full aspect-[3/2] object-cover"
                          onError={() => setFailedImages(prev => new Set(prev).add(product.id))}
                        />
                      ) : (
                        <div className={cn(
                          "w-full aspect-[3/2] flex items-center justify-center relative overflow-hidden",
                          isActive  ? "bg-primary/10" :
                          isRecent  ? "bg-emerald-50" : bg
                        )}>
                          <span
                            className={cn(
                              "font-display font-black text-5xl select-none opacity-50",
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
                                <Check className="w-3.5 h-3.5 text-white" aria-hidden="true" />
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
                          <span className="text-xs text-slate-400 font-medium shrink-0">
                            /{product.unit}
                          </span>
                        </div>
                        {isLowStock && !isOutOfStock && (
                          <p className="text-xs font-bold text-warning mt-1">
                            {product.unit === "kg" ? stockQty.toFixed(2) : stockQty} {product.unit} left
                          </p>
                        )}
                        {!isOutOfStock && !isLowStock && (
                          <p className="text-xs text-slate-400 mt-1 tabular-nums">
                            {product.unit === "kg" ? stockQty.toFixed(2) : stockQty} {product.unit}
                          </p>
                        )}
                        {isOutOfStock && !isExpiredOnly && (
                          <p className="text-xs font-bold text-transparent mt-1 select-none">&nbsp;</p>
                        )}
                        {isExpiredOnly && (
                          <p className="text-xs font-bold text-transparent mt-1 select-none">&nbsp;</p>
                        )}
                      </div>

                      {/* Out-of-stock overlay — locks the entire card */}
                      {isOutOfStock && (
                        <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-[1px] flex flex-col items-center justify-center gap-1.5 rounded-2xl">
                          <Ban className="w-8 h-8 text-white/90" strokeWidth={2} aria-hidden="true" />
                          <span className="text-[10px] font-black text-white uppercase tracking-widest">
                            {isExpiredOnly ? "Expired" : "Out of Stock"}
                          </span>
                        </div>
                      )}
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
          onClick={(e) => { if (e.target === e.currentTarget) { setPackageModal(null); setPackageModalLineId(null); } }}
        >
          <div className="w-full max-w-sm bg-white rounded-t-3xl sm:rounded-3xl p-5 shadow-2xl">
            <div className="w-10 h-1 bg-slate-200 rounded-full mx-auto mb-5 sm:hidden" aria-hidden="true" />
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">{packageModalLineId ? "Change UOM" : "Add to order"}</p>
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
              onClick={() => { setPackageModal(null); setPackageModalLineId(null); }}
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
