"use client";

import Link from "next/link";
import { Printer, ShoppingCart } from "lucide-react";
import { generateReceipt } from "@/lib/pdf/receipt";
import { formatCurrency } from "@/lib/utils";
import type { Sale, StoreSettings } from "@/lib/types";

interface ReceiptClientProps {
  sale: Sale;
  settings: StoreSettings;
}

const METHOD_LABELS: Record<string, string> = {
  cash: "Cash",
  momo: "Mobile Money",
  pos_machine: "POS Machine",
};

export function ReceiptClient({ sale, settings }: ReceiptClientProps) {
  const handlePrint = async () => {
    const pdfBytes = await generateReceipt({
      sale,
      items: sale.sale_items ?? [],
      payments: sale.payments ?? [],
      cashierName: sale.cashier?.full_name ?? "Cashier",
      customerName: sale.customer?.name ?? undefined,
      settings,
    });
    const blob = new Blob([pdfBytes.buffer as ArrayBuffer], { type: "application/pdf" });
    const url = URL.createObjectURL(blob);
    const win = window.open(url, "_blank");
    if (!win) alert("Please allow popups to open the receipt PDF.");
    setTimeout(() => URL.revokeObjectURL(url), 30_000);
  };

  const saleRef = `#${sale.id.slice(0, 8).toUpperCase()}`;
  const saleDate = new Date(sale.created_at).toLocaleString("en-GH", {
    dateStyle: "medium",
    timeStyle: "short",
  });

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-start py-10 px-4">
      {/* Receipt card */}
      <div className="w-full max-w-md bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
        {/* Store header */}
        <div className="bg-primary px-6 py-5 text-center">
          <img src="/logo-light.svg" alt={settings.store_name} className="h-9 mx-auto mb-2" />
          <p className="text-white/70 text-xs">Always fresh…always in season</p>
        </div>

        <div className="px-6 py-5 space-y-4 font-mono text-sm">
          {/* Sale meta */}
          <div className="space-y-1 text-muted-foreground text-xs">
            {settings.address && (
              <p className="text-center text-foreground font-medium">{settings.address}</p>
            )}
            {settings.phone && (
              <p className="text-center">Tel: {settings.phone}</p>
            )}
            <div className="flex justify-between pt-1">
              <span>Receipt</span>
              <span className="font-semibold text-foreground">{saleRef}</span>
            </div>
            <div className="flex justify-between">
              <span>Date</span>
              <span>{saleDate}</span>
            </div>
            <div className="flex justify-between">
              <span>Cashier</span>
              <span>{sale.cashier?.full_name ?? "Cashier"}</span>
            </div>
            {sale.customer?.name && (
              <div className="flex justify-between">
                <span>Customer</span>
                <span>{sale.customer.name}</span>
              </div>
            )}
          </div>

          <hr className="border-dashed border-border" />

          {/* Items */}
          <div className="space-y-2">
            <div className="grid grid-cols-12 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              <span className="col-span-6">Item</span>
              <span className="col-span-2 text-center">Qty</span>
              <span className="col-span-2 text-right">Price</span>
              <span className="col-span-2 text-right">Total</span>
            </div>
            {(sale.sale_items ?? []).map((item) => (
              <div key={item.id} className="grid grid-cols-12 text-xs text-foreground gap-0.5">
                <span className="col-span-6 truncate">{item.product?.name ?? "Unknown"}</span>
                <span className="col-span-2 text-center tabular-nums">{item.quantity}</span>
                <span className="col-span-2 text-right tabular-nums">{formatCurrency(item.unit_price)}</span>
                <span className="col-span-2 text-right tabular-nums font-medium">{formatCurrency(item.total_price)}</span>
                {item.discount_amount > 0 && (
                  <span className="col-span-12 text-xs text-amber-600">
                    &nbsp;&nbsp;Disc: −{formatCurrency(item.discount_amount)}
                  </span>
                )}
              </div>
            ))}
          </div>

          <hr className="border-dashed border-border" />

          {/* Totals */}
          <div className="space-y-1.5 text-xs">
            <div className="flex justify-between text-muted-foreground">
              <span>Subtotal</span>
              <span className="tabular-nums">{formatCurrency(sale.subtotal)}</span>
            </div>
            {sale.discount_amount > 0 && (
              <div className="flex justify-between text-muted-foreground">
                <span>Discount</span>
                <span className="tabular-nums text-amber-600">−{formatCurrency(sale.discount_amount)}</span>
              </div>
            )}
            <div className="flex justify-between text-base font-bold text-foreground pt-1 border-t border-border">
              <span>TOTAL</span>
              <span className="tabular-nums text-primary">{formatCurrency(sale.total_amount)}</span>
            </div>
          </div>

          <hr className="border-dashed border-border" />

          {/* Payments */}
          <div className="space-y-1 text-xs">
            <p className="font-semibold text-muted-foreground uppercase tracking-wide">Payment</p>
            {(sale.payments ?? []).map((p) => (
              <div key={p.id} className="flex justify-between text-foreground">
                <span>{METHOD_LABELS[p.method] ?? p.method}</span>
                <span className="tabular-nums">{formatCurrency(p.amount)}</span>
              </div>
            ))}
          </div>

          {/* Footer */}
          <p className="text-center text-xs text-muted-foreground pt-1">
            {settings.receipt_footer ?? "Thank you for shopping with us!"}
          </p>
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex gap-3 mt-6 w-full max-w-md">
        <button
          onClick={handlePrint}
          className="flex-1 flex items-center justify-center gap-2 h-12 bg-primary text-primary-foreground rounded-xl font-semibold text-sm hover:bg-primary/90 transition-colors"
        >
          <Printer className="w-4 h-4" />
          Print Receipt
        </button>
        <Link
          href="/cashier"
          className="flex-1 flex items-center justify-center gap-2 h-12 rounded-xl border border-border bg-card text-foreground font-semibold text-sm hover:bg-secondary transition-colors"
        >
          <ShoppingCart className="w-4 h-4" />
          New Order
        </Link>
      </div>
    </div>
  );
}
