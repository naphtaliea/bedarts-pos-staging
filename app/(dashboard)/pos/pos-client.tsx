"use client";

import { useState } from "react";
import { ShoppingCart, ReceiptText, Trash2 } from "lucide-react";
import { ProductSearch } from "@/components/pos/product-search";
import { Cart } from "@/components/pos/cart";
import { PaymentDialog } from "@/components/pos/payment-dialog";
import { Button } from "@/components/ui/button";
import { useCartStore } from "@/lib/pos-store";
import { submitSale, getSaleForReceipt } from "./actions";
import { generateReceipt } from "@/lib/pdf/receipt";
import type { PaymentEntry, Profile } from "@/lib/types";

interface POSClientProps {
  cashier: Profile;
}

export function POSClient({ cashier }: POSClientProps) {
  const [showPayment, setShowPayment] = useState(false);
  const [lastSaleId, setLastSaleId] = useState<string | null>(null);

  const items = useCartStore((s) => s.items);
  const discount = useCartStore((s) => s.discount);
  const customerId = useCartStore((s) => s.customerId);
  const subtotal = useCartStore((s) => s.subtotal());
  const total = useCartStore((s) => s.total());
  const clearCart = useCartStore((s) => s.clearCart);

  const handleConfirmSale = async (payments: PaymentEntry[]) => {
    const { saleId } = await submitSale({
      items,
      payments,
      subtotal,
      discount,
      total,
      customerId,
    });

    setLastSaleId(saleId);
    setShowPayment(false);
    clearCart();

    // Generate and open PDF receipt
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
      window.open(url, "_blank");
      setTimeout(() => URL.revokeObjectURL(url), 30000);
    } catch {
      // Receipt generation is non-blocking — sale is already saved
    }
  };

  return (
    <div className="flex h-full">
      {/* Left: product area (future: product grid) */}
      <div className="flex-1 flex flex-col p-6 gap-4 min-w-0">
        <div>
          <h1 className="text-xl font-bold text-slate-900 mb-4">Point of Sale</h1>
          <ProductSearch />
        </div>

        {/* Success banner */}
        {lastSaleId && items.length === 0 && (
          <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2 text-green-700">
              <ReceiptText className="w-4 h-4" />
              <span className="text-sm font-medium">Sale completed — receipt opened for printing</span>
            </div>
            <button
              onClick={() => printReceipt(lastSaleId)}
              className="text-xs text-green-600 hover:text-green-800 underline"
            >
              Reprint
            </button>
          </div>
        )}

        {/* Placeholder for future product grid */}
        <div className="flex-1 flex items-center justify-center text-slate-300">
          <div className="text-center">
            <ShoppingCart className="w-16 h-16 mx-auto mb-3 opacity-30" />
            <p className="text-sm">Search for products to add them to the cart</p>
          </div>
        </div>
      </div>

      {/* Right: cart panel */}
      <div className="w-80 border-l border-slate-200 bg-white flex flex-col">
        {/* Cart header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200">
          <div className="flex items-center gap-2">
            <ShoppingCart className="w-4 h-4 text-slate-500" />
            <span className="font-semibold text-slate-900">Cart</span>
            {items.length > 0 && (
              <span className="bg-blue-700 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold">
                {items.length}
              </span>
            )}
          </div>
          {items.length > 0 && (
            <button
              onClick={clearCart}
              className="text-slate-400 hover:text-red-500 transition-colors"
              title="Clear cart"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Cart content */}
        <div className="flex-1 flex flex-col min-h-0 px-4 py-3">
          <Cart />
        </div>

        {/* Charge button */}
        {items.length > 0 && (
          <div className="p-4 border-t border-slate-200">
            <Button
              size="xl"
              className="w-full"
              onClick={() => setShowPayment(true)}
            >
              Charge · GH₵{total.toFixed(2)}
            </Button>
          </div>
        )}
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
