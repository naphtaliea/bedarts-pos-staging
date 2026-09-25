"use client";

import { useState, useEffect, useLayoutEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Trash2, Search, ArrowRight, Delete, ShoppingCart, Scale, Check, Ban, X } from "lucide-react";
import { useCartStore } from "@/lib/pos-store";
import { PosTopBar } from "@/components/pos/pos-topbar";
import { PaymentClient } from "./payment/payment-client";
import { ReceiptClient } from "./receipt/receipt-client";
import { OrdersView } from "./orders-view";
import { DashboardView } from "./dashboard-view";
import { getSaleForReceipt, pingServer } from "@/app/(dashboard)/pos/actions";
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
  return { bg: "bg-secondary", text: "text-muted-foreground", chip: "text-muted-foreground bg-secondary" };
}

export function CashierPOSClient({
  cashier,
  initialCategories,
  initialProducts,
  initialPackages,
  initialSettings,
}: CashierPOSClientProps) {
  const router = useRouter();
  const [view, setView] = useState<PosView>({ screen: "pos" });

  // Local mirror of products so completed sales can decrement stock instantly
  // (no round-trip). Re-syncs to server truth whenever the server component
  // re-renders (e.g. after the hourly router.refresh()).
  const [products, setProducts] = useState<Product[]>(initialProducts);
  useEffect(() => { setProducts(initialProducts); }, [initialProducts]);

  const applyStockDeductions = (soldItems: { product_id: string; quantity: number }[]) => {
    if (soldItems.length === 0) return;
    const sold = new Map<string, number>();
    for (const it of soldItems) sold.set(it.product_id, (sold.get(it.product_id) ?? 0) + it.quantity);
    setProducts((prev) => prev.map((p) => {
      const q = sold.get(p.id);
      if (!q) return p;
      const nextQty = Math.max(0, (p.stock_quantity ?? 0) - q);
      return { ...p, stock_quantity: nextQty, has_valid_stock: nextQty > 0 && p.has_valid_stock };
    }));
  };

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
    snapshots,
    enterPayment,
    exitPayment,
    preorderMode,
    preorderNote,
    setPreorderMode,
    setPreorderNote,
  } = useCartStore();

  // Payment view is derived per-tab: the current tab is "in payment" iff its id
  // is in paymentTabIds. Switching tabs preserves each tab's screen state.
  const isPaymentScreen = paymentTabIds.includes(activeTabId);

  // Silent background refresh — re-fetches products/prices/stock every hour.
  // Safe = no items in any tab, not in payment, not showing receipt.
  // On skip or network failure: retries in 5 min. On success: waits the full hour.
  const safeToRefreshRef = useRef(true);
  safeToRefreshRef.current =
    !isPaymentScreen &&
    view.screen !== "receipt" &&
    items.length === 0 &&
    Object.values(snapshots).every((s) => s.items.length === 0);

  const refreshTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const scheduleRefreshRef = useRef<(ms: number) => void>(() => {});
  scheduleRefreshRef.current = (ms: number) => {
    refreshTimerRef.current = setTimeout(async () => {
      if (!safeToRefreshRef.current) {
        scheduleRefreshRef.current(5 * 60 * 1000);
        return;
      }
      try {
        await pingServer();
        router.refresh();
        scheduleRefreshRef.current(60 * 60 * 1000);
      } catch {
        scheduleRefreshRef.current(5 * 60 * 1000);
      }
    }, ms);
  };
  useEffect(() => {
    scheduleRefreshRef.current(60 * 60 * 1000);
    return () => clearTimeout(refreshTimerRef.current);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
      const prod = products.find((p) => p.id === selectedLine?.product.id);
      // Pre-order mode bypasses the stock cap entirely — stock will be
      // deducted from a future batch when the pickup is delivered.
      const maxQty = preorderMode ? Infinity : (prod?.stock_quantity ?? Infinity);
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

  const filteredProducts = products.filter((p) => {
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
    if (view.screen !== "pos" || isPaymentScreen) return;
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
            if (sale) {
              // Only decrement local stock for real sales — pre-orders don't
              // touch stock until pickup delivery.
              const stockAlreadyDeducted = (sale as { stock_deducted?: boolean }).stock_deducted !== false;
              if (stockAlreadyDeducted) {
                const items = (sale.sale_items ?? []) as { product_id: string; quantity: number }[];
                applyStockDeductions(items.map((it) => ({ product_id: it.product_id, quantity: it.quantity })));
              }
              setView({ screen: "receipt", sale, settings });
            }
          } catch {
            /* stay on pos */
          }
        }}
        onOfflineComplete={(sale) => {
          exitPayment();
          // Offline pre-orders aren't supported (submitSale wouldn't have queued
          // them); this path always deducts.
          applyStockDeductions(
            (sale.sale_items ?? []).map((it) => ({ product_id: it.product_id, quantity: it.quantity }))
          );
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
              <span className="text-[11px] font-black text-muted-foreground uppercase tracking-[0.15em]">Order</span>
              {items.length > 0 && (
                <span className="text-[10px] font-black bg-primary text-white px-1.5 py-0.5 rounded-full leading-none tabular-nums">
                  {items.length}
                </span>
              )}
            </div>
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setPreorderMode(!preorderMode)}
                aria-pressed={preorderMode}
                title={preorderMode ? "Turn off pre-order mode" : "Mark this order as a pre-paid pickup (stock deducted on delivery)"}
                className={cn(
                  "text-[10px] font-bold uppercase tracking-wide px-2.5 py-1 rounded-lg transition-all",
                  preorderMode
                    ? "bg-warning text-white"
                    : "text-muted-foreground hover:text-foreground hover:bg-secondary"
                )}
              >
                {preorderMode ? "Pre-order ✓" : "Pre-order"}
              </button>
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
                    : "text-muted-foreground hover:text-foreground hover:bg-secondary"
                )}
              >
                {confirmClear ? "Confirm?" : "Clear"}
              </button>
              )}
            </div>
          </div>

          {/* Pre-order strip + customer note */}
          {preorderMode && (
            <div className="shrink-0 bg-warning/10 border-b border-warning/30 px-3 py-2 space-y-2">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-md bg-warning flex items-center justify-center shrink-0">
                  <span className="text-[9px] font-black text-white">!</span>
                </div>
                <p className="text-[11px] font-black text-warning uppercase tracking-widest leading-none">
                  Pre-order — stock deducted at pickup
                </p>
              </div>
              <input
                type="text"
                value={preorderNote}
                onChange={(e) => setPreorderNote(e.target.value)}
                placeholder="Customer name + phone (required)"
                className="w-full h-9 rounded-lg border border-warning/40 bg-white px-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-warning/40"
              />
            </div>
          )}

          {/* ── Order lines (scrollable) ── */}
          <div className="flex-1 min-h-0 overflow-y-auto">
            {items.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center gap-4 text-center px-8">
                <div className="w-16 h-16 rounded-2xl bg-primary/5 border border-primary/10 flex items-center justify-center">
                  <ShoppingCart className="w-7 h-7 text-primary/60" aria-hidden="true" strokeWidth={1.75} />
                </div>
                <div>
                  <p className="font-display font-black text-foreground text-base">Start a new order</p>
                  <p className="text-xs text-muted-foreground mt-1">Tap a product on the right to add it</p>
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
                      "flex items-center gap-2.5 px-3 py-2 cursor-pointer border-b border-border transition-all focus:outline-none",
                      isSelected ? "bg-primary/[0.08]" : "hover:bg-secondary/60"
                    )}
                  >
                    {/* Thumbnail */}
                    <div className="shrink-0 w-9 h-9 rounded-lg overflow-hidden bg-secondary">
                      {item.product.image_url ? (
                        <img
                          src={item.product.image_url}
                          alt={item.product.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <span className="text-muted-foreground/60 font-bold text-sm" aria-hidden="true">
                            {item.product.name.charAt(0).toUpperCase()}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Name + calc */}
                    <div className="flex-1 min-w-0">
                      <p className={cn(
                        "text-sm font-bold truncate leading-tight",
                        isSelected ? "text-foreground" : "text-foreground/90"
                      )}>
                        {item.product.name}
                      </p>
                      <p className="text-[11px] mt-0.5 tabular-nums text-muted-foreground leading-snug">
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
                      isSelected ? "text-primary" : "text-foreground"
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
                      className="w-11 h-11 -my-2 -mr-2 rounded-lg flex items-center justify-center shrink-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all"
                    >
                      <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                    </button>
                  </div>
                );
              })
            )}
          </div>

          {/* ── NUMPAD ── */}
          <div className="shrink-0 bg-secondary/40 border-t border-border p-2 space-y-1.5">

            {/* Selected line readout */}
            <div className="flex items-center justify-between gap-2 h-8">
              {selectedLine ? (
                <>
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-[0.12em] truncate">
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
                    <span className="font-display font-black text-xl text-foreground tabular-nums">
                      {displayValue}
                    </span>
                  </div>
                </>
              ) : (
                <p className="text-[11px] text-muted-foreground w-full text-center uppercase tracking-widest font-bold">Numpad</p>
              )}
            </div>

            {/* Change UOM — always visible when a line is selected */}
            {selectedLine && (
              <button
                onClick={() => { setPackageModal(selectedLine.product); setPackageModalLineId(selectedLineId); }}
                className="w-full flex items-center justify-center gap-1.5 h-9 rounded-md btn-tactile active:btn-tactile-active text-muted-foreground hover:text-foreground text-xs font-semibold"
              >
                <Scale className="w-3.5 h-3.5" aria-hidden="true" />
                Change UOM
              </button>
            )}

            {/* 4-column digit + mode grid */}
            <div className="grid grid-cols-4 gap-1.5">
              {/* Row 1: 1 2 3  Qty */}
              {["1","2","3"].map(k => (
                <button key={k} onClick={() => pressKey(k)}
                  className="h-12 rounded-xl btn-tactile active:btn-tactile-active text-foreground font-display font-black text-xl">
                  {k}
                </button>
              ))}
              <button
                onClick={() => { setMode("Qty"); setBuffer(""); }}
                className={cn(
                  "h-12 rounded-xl text-xs font-black uppercase tracking-wider",
                  mode === "Qty"
                    ? "btn-tactile-primary active:btn-tactile-primary-active"
                    : "btn-tactile active:btn-tactile-active text-muted-foreground"
                )}
              >
                {selectedLine?.product.unit === "kg" ? "Wt" : "Qty"}
              </button>

              {/* Row 2: 4 5 6  Disc */}
              {["4","5","6"].map(k => (
                <button key={k} onClick={() => pressKey(k)}
                  className="h-12 rounded-xl btn-tactile active:btn-tactile-active text-foreground font-display font-black text-xl">
                  {k}
                </button>
              ))}
              <button
                onClick={() => { setMode("Disc"); setBuffer(""); }}
                className={cn(
                  "h-12 rounded-xl text-xs font-black uppercase tracking-wider",
                  mode === "Disc"
                    ? "btn-tactile-primary active:btn-tactile-primary-active"
                    : "btn-tactile active:btn-tactile-active text-muted-foreground"
                )}
              >
                Disc
              </button>

              {/* Row 3: 7 8 9  Price */}
              {["7","8","9"].map(k => (
                <button key={k} onClick={() => pressKey(k)}
                  className="h-12 rounded-xl btn-tactile active:btn-tactile-active text-foreground font-display font-black text-xl">
                  {k}
                </button>
              ))}
              <button
                onClick={() => { setMode("Price"); setBuffer(""); }}
                className={cn(
                  "h-12 rounded-xl text-xs font-black uppercase tracking-wider",
                  mode === "Price"
                    ? "btn-tactile-primary active:btn-tactile-primary-active"
                    : "btn-tactile active:btn-tactile-active text-muted-foreground"
                )}
              >
                Price
              </button>

              {/* Row 4: 00 0 .  ⌫ */}
              {["00","0","."].map(k => (
                <button key={k} onClick={() => pressKey(k)}
                  className="h-12 rounded-xl btn-tactile active:btn-tactile-active text-foreground font-display font-black text-xl">
                  {k}
                </button>
              ))}
              <button
                onClick={() => pressKey("backspace")}
                aria-label="Backspace"
                className="h-12 rounded-xl btn-tactile active:btn-tactile-active text-muted-foreground hover:text-destructive flex items-center justify-center"
              >
                <Delete className="w-5 h-5" aria-hidden="true" />
              </button>
            </div>
          </div>

          {/* ── TOTALS + PAY ── */}
          <div className="shrink-0 px-3 pb-3 pt-2 bg-secondary/40 border-t-2 border-primary/10 space-y-2">
            {discountVal > 0 && (
              <div className="flex justify-between text-[11px] tabular-nums px-1">
                <span className="text-muted-foreground">Subtotal <span className="text-foreground font-semibold">{formatCurrency(subtotalVal)}</span></span>
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
            "flex flex-col flex-1 min-w-0 bg-secondary/30",
            mobileView === "products" ? "" : "hidden lg:flex"
          )}
        >

          {/* Search */}
          <div className="shrink-0 px-4 pt-3 pb-2">
            <label htmlFor="product-search" className="sr-only">Search products</label>
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/60 pointer-events-none" aria-hidden="true" />
              <input
                id="product-search"
                type="text"
                placeholder="Search products…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-11 w-full rounded-2xl bg-white border-0 shadow-sm pl-11 pr-10 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent/25 transition-all"
              />
              {search && (
                <button
                  onClick={() => setSearch("")}
                  aria-label="Clear search"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          {/* Category chip pills */}
          <div className="relative shrink-0 px-4 pb-3">
            <div className="flex gap-2 overflow-x-auto pb-0.5 scrollbar-none">
              {/* All chip */}
              <button
                onClick={() => setCategory(null)}
                className={cn(
                  "shrink-0 h-10 px-4 rounded-full text-xs font-black uppercase tracking-wider transition-all whitespace-nowrap",
                  category === null
                    ? "bg-sidebar text-white shadow-md"
                    : "bg-white text-muted-foreground shadow-sm hover:text-foreground hover:shadow-md hover:-translate-y-0.5"
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
                      "shrink-0 h-10 px-4 rounded-full text-xs font-bold transition-all whitespace-nowrap",
                      isActive
                        ? "bg-sidebar text-white shadow-md"
                        : `${chip} shadow-sm hover:shadow-md hover:-translate-y-0.5`
                    )}
                  >
                    {cat.name}
                  </button>
                );
              })}
            </div>
            <div className="pointer-events-none absolute inset-y-0 right-0 w-10 bg-gradient-to-l from-secondary/30 to-transparent" aria-hidden="true" />
          </div>

          {/* Mobile running total — sticky strip above product grid */}
          {items.length > 0 && (
            <div className="lg:hidden shrink-0 flex items-center justify-between gap-3 px-4 py-2.5 bg-sidebar border-b border-white/10">
              <div>
                <p className="text-[10px] font-bold text-white/60 uppercase tracking-widest leading-none mb-0.5">
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
                <div className="w-16 h-16 rounded-2xl bg-secondary flex items-center justify-center">
                  <Search className="w-7 h-7 text-muted-foreground/60" strokeWidth={1.75} aria-hidden="true" />
                </div>
                <div>
                  <p className="font-display font-black text-base text-foreground">No matches</p>
                  <p className="text-xs text-muted-foreground mt-1">Try a different search or category</p>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {filteredProducts.map((product) => {
                  const isRecent      = recentlyAddedId === product.id;
                  const isActive      = selectedLineId !== null && items.some((i) => i.lineId === selectedLineId && i.product.id === product.id);
                  const stockQty      = product.stock_quantity ?? 0;
                  const isExpiredOnly = stockQty > 0 && !product.has_valid_stock;
                  const trueOutOfStock = stockQty <= 0 || !product.has_valid_stock;
                  // In pre-order mode, out-of-stock items are addable
                  // (stock will be deducted at pickup delivery time).
                  const isOutOfStock  = trueOutOfStock && !preorderMode;
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
                        <p className="text-[13px] font-semibold text-foreground leading-snug line-clamp-2 mb-1.5">
                          {product.name}
                        </p>
                        <div className="flex items-baseline justify-between gap-1">
                          <span className="font-display font-black text-base text-primary tabular-nums leading-none">
                            {formatCurrency(product.selling_price)}
                          </span>
                          <span className="text-xs text-muted-foreground font-medium shrink-0">
                            /{product.unit}
                          </span>
                        </div>
                        {isLowStock && !isOutOfStock && (
                          <p className="text-xs font-bold text-warning mt-1">
                            {product.unit === "kg" ? stockQty.toFixed(2) : stockQty} {product.unit} left
                          </p>
                        )}
                        {!isOutOfStock && !isLowStock && (
                          <p className="text-xs text-muted-foreground mt-1 tabular-nums">
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
                        <div className="absolute inset-0 bg-sidebar/70 backdrop-blur-[1px] flex flex-col items-center justify-center gap-1.5 rounded-2xl">
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
            <div className="w-10 h-1 bg-border rounded-full mx-auto mb-5 sm:hidden" aria-hidden="true" />
            <p className="text-[11px] font-bold text-muted-foreground/70 uppercase tracking-widest mb-0.5">{packageModalLineId ? "Change UOM" : "Add to order"}</p>
            <h3 className="text-lg font-bold text-foreground mb-4">{packageModal.name}</h3>
            <div className="space-y-2">
              <button
                onClick={() => handleAddLoose(packageModal)}
                className="w-full flex items-center justify-between px-4 py-3.5 rounded-2xl border border-border hover:border-border/80 hover:bg-secondary/60 active:scale-[0.99] transition-all text-left"
              >
                <div>
                  <p className="text-sm font-bold text-foreground">Loose — per {packageModal.unit}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Enter quantity with numpad</p>
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
                    <p className="text-sm font-bold text-foreground">{pkg.label}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
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
              className="w-full mt-3 h-11 rounded-2xl border border-border text-sm font-semibold text-muted-foreground hover:bg-secondary transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
