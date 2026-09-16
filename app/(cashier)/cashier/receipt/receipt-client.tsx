"use client";

import { useState } from "react";
import Link from "next/link";
import { Printer, ShoppingCart, ClipboardList, AlertCircle, CheckCircle2 } from "lucide-react";
import { generateReceipt } from "@/lib/pdf/receipt";
import { formatCurrency } from "@/lib/utils";
import { PosTopBar } from "@/components/pos/pos-topbar";
import type { Sale, StoreSettings } from "@/lib/types";

interface ReceiptClientProps {
  sale: Sale;
  settings: StoreSettings;
}

const METHOD_LABELS: Record<string, string> = {
  cash: "Cash",
  momo: "Mobile Money",
  pos_machine: "POS Machine",
  account: "On Account",
};

export function ReceiptClient({ sale, settings }: ReceiptClientProps) {
  const [printError, setPrintError] = useState<string | null>(null);

  const handlePrint = async () => {
    setPrintError(null);
    try {
      const pdfBytes = await generateReceipt({
        sale,
        items: sale.sale_items ?? [],
        payments: payments,
        cashierName: sale.cashier?.full_name ?? "Cashier",
        customerName: sale.customer?.name ?? undefined,
        settings,
      });
      const blob = new Blob([pdfBytes.buffer as ArrayBuffer], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      const win = window.open(url, "_blank");
      if (!win) {
        setPrintError(
          "Popups are blocked. Allow popups for this site in your browser settings, then try again."
        );
      } else {
        setTimeout(() => URL.revokeObjectURL(url), 30_000);
      }
    } catch {
      setPrintError("Could not generate receipt PDF. Please try again.");
    }
  };

  const saleRef = `#${sale.id.slice(0, 8).toUpperCase()}`;
  const saleDate = new Date(sale.created_at).toLocaleString("en-GH", {
    dateStyle: "medium",
    timeStyle: "short",
  });

  const payments = sale.payments ?? [];
  const hasCash = payments.some((p) => p.method === "cash");
  const totalPaid = payments.reduce((s, p) => s + p.amount, 0);
  const change = hasCash ? Math.max(0, totalPaid - sale.total_amount) : 0;

  return (
    <div className="flex flex-col h-screen bg-background">
      <PosTopBar
        cashierName={sale.cashier?.full_name ?? "Cashier"}
        showBack
        backHref="/cashier/orders"
      />

      <div className="flex flex-1 min-h-0">
        {/* ── LEFT: Success state + actions ─────────────────────── */}
        <aside className="w-2/5 border-r border-border flex flex-col bg-card shrink-0">
          {/* Success banner */}
          <div className="px-6 py-8 text-center border-b border-border">
            <div className="w-16 h-16 rounded-full bg-success/12 flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="w-9 h-9 text-success" aria-hidden="true" />
            </div>
            <p className="text-xl font-bold text-foreground">Payment Received</p>
            <p className="text-sm font-mono text-muted-foreground mt-1">{saleRef}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{saleDate}</p>
          </div>

          {/* Payment summary */}
          <div className="px-5 py-4 border-b border-border space-y-2">
            <div className="flex justify-between items-baseline">
              <span className="text-sm text-muted-foreground">Total</span>
              <span className="text-xl font-bold text-primary tabular-nums">
                {formatCurrency(sale.total_amount)}
              </span>
            </div>
            {(payments).map((p) => (
              <div key={p.id} className="flex justify-between text-sm">
                <span className="text-muted-foreground">{METHOD_LABELS[p.method] ?? p.method}</span>
                <span className="tabular-nums font-medium text-foreground">{formatCurrency(p.amount)}</span>
              </div>
            ))}
            {change > 0 && (
              <div className="flex justify-between text-sm pt-1 border-t border-border">
                <span className="text-muted-foreground">Change</span>
                <span className="tabular-nums font-semibold text-success">{formatCurrency(change)}</span>
              </div>
            )}
          </div>

          {/* Action buttons */}
          <div className="flex-1 flex flex-col gap-2 p-5">
            <button
              onClick={handlePrint}
              className="flex items-center justify-center gap-2 h-12 bg-primary text-primary-foreground rounded-xl font-semibold text-sm hover:bg-primary/90 transition-colors"
            >
              <Printer className="w-4 h-4" aria-hidden="true" />
              Print Receipt
            </button>
            <Link
              href="/cashier/orders"
              className="flex items-center justify-center gap-2 h-12 rounded-xl border border-border bg-card text-foreground font-semibold text-sm hover:bg-secondary transition-colors"
            >
              <ClipboardList className="w-4 h-4" aria-hidden="true" />
              View Orders
            </Link>

            {printError && (
              <div
                role="alert"
                className="flex items-start gap-2 rounded-xl border border-destructive/30 bg-destructive/5 px-3 py-2.5 text-xs text-destructive"
              >
                <AlertCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" aria-hidden="true" />
                <span>{printError}</span>
              </div>
            )}
          </div>

          {/* New Order — navy strip */}
          <div className="p-4 bg-sidebar shrink-0">
            <Link
              href="/cashier"
              className="flex items-center justify-center gap-2 w-full h-12 bg-primary text-primary-foreground rounded-xl font-bold text-sm hover:bg-primary/90 transition-colors"
            >
              <ShoppingCart className="w-4 h-4" aria-hidden="true" />
              New Order
            </Link>
          </div>
        </aside>

        {/* ── RIGHT: Receipt paper preview ──────────────────────── */}
        <main className="flex-1 overflow-y-auto flex justify-center p-6 bg-background">
          <div className="w-full max-w-sm">
            <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
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
                  {settings.vat_number && (
                    <p className="text-center">VAT Reg: {settings.vat_number}</p>
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
                  {(sale.sale_items ?? []).map((item) => {
                    const isKg = item.product?.unit === "kg";
                    return (
                      <div key={item.id} className="text-xs text-foreground">
                        <div className="flex justify-between gap-2">
                          <span className="truncate flex-1">{item.product?.name ?? "Unknown"}</span>
                          <span className="tabular-nums font-medium shrink-0">{formatCurrency(item.total_price)}</span>
                        </div>
                        <div className="text-muted-foreground tabular-nums">
                          {isKg
                            ? `${item.quantity}kg / ${formatCurrency(item.unit_price)}`
                            : `${item.quantity} × ${formatCurrency(item.unit_price)}`}
                        </div>
                        {item.discount_amount > 0 && (
                          <div className="text-warning">Disc: −{formatCurrency(item.discount_amount)}</div>
                        )}
                      </div>
                    );
                  })}
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
                      <span className="tabular-nums text-warning">−{formatCurrency(sale.discount_amount)}</span>
                    </div>
                  )}
                  {settings.tax_enabled && settings.tax_rate > 0 && (() => {
                    const taxable = sale.subtotal - sale.discount_amount;
                    if (settings.vat_number) {
                      // GRA-compliant: show VAT (15%) and NHIL/GETFL (2.5%) as separate levy lines
                      const vatAmt  = taxable * 0.15;
                      const nhilAmt = taxable * 0.025;
                      return (
                        <>
                          <div className="flex justify-between text-muted-foreground">
                            <span>VAT (15%)</span>
                            <span className="tabular-nums">{formatCurrency(vatAmt)}</span>
                          </div>
                          <div className="flex justify-between text-muted-foreground">
                            <span>NHIL/GETFL (2.5%)</span>
                            <span className="tabular-nums">{formatCurrency(nhilAmt)}</span>
                          </div>
                        </>
                      );
                    }
                    return (
                      <div className="flex justify-between text-muted-foreground">
                        <span>Tax ({settings.tax_rate}%)</span>
                        <span className="tabular-nums">{formatCurrency(taxable * (settings.tax_rate / 100))}</span>
                      </div>
                    );
                  })()}
                  <div className="flex justify-between text-base font-bold text-foreground pt-1 border-t border-border">
                    <span>TOTAL</span>
                    <span className="tabular-nums text-primary">{formatCurrency(sale.total_amount)}</span>
                  </div>
                </div>

                <hr className="border-dashed border-border" />

                {/* Payments */}
                <div className="space-y-1 text-xs">
                  <p className="font-semibold text-muted-foreground uppercase tracking-wide">Payment</p>
                  {(payments).map((p) => (
                    <div key={p.id} className="flex justify-between text-foreground">
                      <span>{METHOD_LABELS[p.method] ?? p.method}</span>
                      <span className="tabular-nums">{formatCurrency(p.amount)}</span>
                    </div>
                  ))}
                  {change > 0 && (
                    <div className="flex justify-between text-foreground">
                      <span>Change</span>
                      <span className="tabular-nums text-success">{formatCurrency(change)}</span>
                    </div>
                  )}
                </div>

                {/* Footer */}
                <p className="text-center text-xs text-muted-foreground pt-1">
                  {settings.receipt_footer ?? "Thank you for shopping with us!"}
                </p>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
