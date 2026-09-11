"use client";

import { useState, useEffect } from "react";
import { Search, ReceiptText } from "lucide-react";
import { CategoryTabs } from "@/components/pos/category-tabs";
import { ProductGrid } from "@/components/pos/product-grid";
import { OrderPanel } from "@/components/pos/order-panel";
import { PaymentDialog } from "@/components/pos/payment-dialog";
import { useCartStore } from "@/lib/pos-store";
import { createClient } from "@/lib/supabase/client";
import { submitSale, getSaleForReceipt } from "./actions";
import { generateReceipt } from "@/lib/pdf/receipt";
import type { Category, Customer, PaymentEntry, Product, Profile } from "@/lib/types";

interface POSClientProps {
  cashier: Profile;
  initialCategories: Category[];
  initialProducts: Product[];
  initialCustomers: Customer[];
}

export function POSClient({
  cashier,
  initialCategories,
  initialProducts,
  initialCustomers,
}: POSClientProps) {
  const [categories] = useState(initialCategories);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [selectedLineId, setSelectedLineId] = useState<string | null>(null);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [showPayment, setShowPayment] = useState(false);
  const [lastSaleId, setLastSaleId] = useState<string | null>(null);
  const [lastReceiptNum, setLastReceiptNum] = useState<string | null>(null);
  const [blockedReceiptUrl, setBlockedReceiptUrl] = useState<string | null>(null);
  const [recentlyAddedId, setRecentlyAddedId] = useState<string | null>(null);

  const items = useCartStore((s) => s.items);
  const discount = useCartStore((s) => s.discount);
  const total = useCartStore((s) => s.total());
  const subtotal = useCartStore((s) => s.subtotal());
  const clearCart = useCartStore((s) => s.clearCart);
  const addItem = useCartStore((s) => s.addItem);

  // Client-side filtering for zero-latency search and offline support
  const filteredProducts = initialProducts.filter((p) => {
    const matchesCategory = selectedCategory ? p.category_id === selectedCategory : true;
    const matchesSearch = search.trim() === "" || p.name.toLowerCase().includes(search.trim().toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const handleProductSelect = (product: Product) => {
    addItem(product);
    setSelectedLineId(product.id);
    setRecentlyAddedId(product.id);
    setTimeout(() => setRecentlyAddedId(null), 600);
  };

  const handleConfirmSale = async (payments: PaymentEntry[]) => {
    // Open window synchronously during the click event to bypass popup blockers
    const win = window.open("about:blank", "_blank");

    const { saleId } = await submitSale({
      items,
      payments,
      subtotal,
      discount,
      total,
      customerId: selectedCustomerId,
    });
    setLastSaleId(saleId);
    setLastReceiptNum(saleId.slice(0, 8).toUpperCase());
    setBlockedReceiptUrl(null);
    setShowPayment(false);
    clearCart();
    setSelectedLineId(null);
    setSelectedCustomerId(null);
    await printReceipt(saleId, win);
  };

  const printReceipt = async (saleId: string, preOpenedWindow?: Window | null) => {
    try {
      const { sale, settings } = await getSaleForReceipt(saleId);
      if (!sale || !settings) {
        if (preOpenedWindow) preOpenedWindow.close();
        return;
      }
      const pdfBytes = await generateReceipt({
        sale,
        items: sale.sale_items ?? [],
        payments: sale.payments ?? [],
        cashierName: sale.cashier?.full_name ?? cashier.full_name,
        customerName: sale.customer?.name,
        settings,
      });
      const blob = new Blob([pdfBytes.buffer as ArrayBuffer], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      
      let win = preOpenedWindow;
      if (!win) {
        win = window.open(url, "_blank");
      } else {
        win.location.href = url;
      }

      if (!win) {
        // Popup blocked completely
        setBlockedReceiptUrl(url);
      } else {
        setTimeout(() => URL.revokeObjectURL(url), 30000);
      }
    } catch {
      if (preOpenedWindow) preOpenedWindow.close();
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#fdfbf7]">
      {/* Top bar */}
      <div className="flex items-center gap-3 px-4 py-2 bg-white border-b border-slate-200 shrink-0">
        <div className="flex-1">
          <CategoryTabs
            categories={categories}
            selected={selectedCategory}
            onSelect={(id) => { setSelectedCategory(id); setSearch(""); }}
          />
        </div>
        <div className="relative w-52 shrink-0">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search…"
            className="w-full pl-9 pr-3 h-9 text-sm border border-slate-200 rounded-lg bg-slate-50 focus:outline-none focus:ring-2 focus:ring-red-700 focus:bg-white"
          />
        </div>
      </div>

      {/* Main area */}
      <div className="flex flex-1 min-h-0">
        {/* Left: product grid */}
        <div className="flex-1 overflow-y-auto p-4">
          {/* Success banner */}
          {lastSaleId && items.length === 0 && (
            <div className="mb-3 bg-green-50 border border-green-200 rounded-xl px-4 py-3 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 min-w-0">
                <ReceiptText className="w-4 h-4 text-green-600 shrink-0" />
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-green-800">
                    Sale #{lastReceiptNum} complete
                  </p>
                  {blockedReceiptUrl ? (
                    <a
                      href={blockedReceiptUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs text-orange-600 hover:underline font-medium"
                    >
                      Receipt blocked — click to open
                    </a>
                  ) : (
                    <p className="text-xs text-green-600">Receipt opened for printing</p>
                  )}
                </div>
              </div>
              <button
                onClick={() => printReceipt(lastSaleId)}
                className="text-xs font-medium text-green-700 hover:underline shrink-0"
              >
                Reprint
              </button>
            </div>
          )}

          <ProductGrid
            products={filteredProducts}
            onSelect={handleProductSelect}
            recentlyAddedId={recentlyAddedId}
          />
        </div>

        {/* Right: order panel */}
        <div className="w-72 xl:w-80 shrink-0 flex flex-col border-l border-slate-200">
          <OrderPanel
            customers={initialCustomers}
            selectedCustomerId={selectedCustomerId}
            onCustomerChange={setSelectedCustomerId}
            onCharge={() => setShowPayment(true)}
            selectedLineId={selectedLineId}
            onLineSelect={setSelectedLineId}
          />
        </div>
      </div>

      {/* Payment dialog */}
      {showPayment && (
        <PaymentDialog
          total={total}
          onConfirm={handleConfirmSale}
          onClose={() => setShowPayment(false)}
        />
      )}
    </div>
  );
}
