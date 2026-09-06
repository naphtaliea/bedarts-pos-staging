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
  const [products, setProducts] = useState(initialProducts);
  const [customers] = useState(initialCustomers);

  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
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

  // Reload products when category or search changes
  useEffect(() => {
    const timer = setTimeout(async () => {
      setLoading(true);
      const supabase = createClient();
      let query = supabase
        .from("product_stock")
        .select("*, category:categories(name)")
        .eq("is_active", true)
        .order("name");

      if (selectedCategory) query = query.eq("category_id", selectedCategory);
      if (search.trim()) query = query.ilike("name", `%${search.trim()}%`);

      const { data } = await query.limit(60);
      setProducts((data as Product[]) ?? []);
      setLoading(false);
    }, 200);
    return () => clearTimeout(timer);
  }, [selectedCategory, search]);

  const handleProductSelect = (product: Product) => {
    addItem(product);
    setSelectedLineId(product.id);
    setRecentlyAddedId(product.id);
    setTimeout(() => setRecentlyAddedId(null), 600);
  };

  const handleConfirmSale = async (payments: PaymentEntry[]) => {
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
    await printReceipt(saleId);
  };

  const printReceipt = async (saleId: string) => {
    try {
      const { sale, settings } = await getSaleForReceipt(saleId);
      if (!sale || !settings) return;
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
      const win = window.open(url, "_blank");
      if (!win) {
        // Popup blocked — keep URL so cashier can open it manually
        setBlockedReceiptUrl(url);
      } else {
        setTimeout(() => URL.revokeObjectURL(url), 30000);
      }
    } catch {
      // Non-blocking — sale is saved
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-100">
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
            className="w-full pl-9 pr-3 h-9 text-sm border border-slate-200 rounded-lg bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
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
            products={products}
            onSelect={handleProductSelect}
            loading={loading}
            recentlyAddedId={recentlyAddedId}
          />
        </div>

        {/* Right: order panel */}
        <div className="w-72 xl:w-80 shrink-0 flex flex-col border-l border-slate-200">
          <OrderPanel
            customers={customers}
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
