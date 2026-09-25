"use client";

import Link from "next/link";
import { Printer, ClipboardList, CheckCircle2, ShoppingCart } from "lucide-react";
import { formatCurrency, formatReceiptDate } from "@/lib/utils";
import { PosTopBar } from "@/components/pos/pos-topbar";
import type { Sale, StoreSettings } from "@/lib/types";

interface ReceiptClientProps {
  sale: Sale;
  settings: StoreSettings;
  onNewOrder?: () => void;
  onViewOrders?: () => void;
}

const METHOD_LABELS: Record<string, string> = {
  cash: "Cash",
  momo: "Mobile Money",
  pos_machine: "POS Machine",
  account: "On Account",
};

function Dash() {
  return <div className="border-t border-dashed border-border/50 mx-5" />;
}

function Row({ label, value, valueBold }: { label: string; value: string; valueBold?: boolean }) {
  return (
    <div className="flex justify-between gap-4">
      <span className="text-muted-foreground shrink-0">{label}</span>
      <span className={`tabular-nums text-right ${valueBold ? "font-bold text-foreground" : "text-foreground"}`}>{value}</span>
    </div>
  );
}

export function ReceiptClient({ sale, settings, onNewOrder, onViewOrders }: ReceiptClientProps) {
  const saleRef = `#${sale.id.slice(0, 8).toUpperCase()}`;
  const saleDate = formatReceiptDate(sale.created_at);

  const payments = sale.payments ?? [];
  const hasCash = payments.some((p) => p.method === "cash");
  const totalPaid = payments.reduce((s, p) => s + p.amount, 0);
  const change = hasCash ? Math.max(0, totalPaid - sale.total_amount) : 0;

  return (
    <div className="flex flex-col h-dvh bg-white select-none overflow-hidden animate-page-enter">
      {/* ── Print styles: isolate #receipt-print to the configured paper size ── */}
      {(() => {
        const paper = settings.receipt_paper_size === "58mm" ? { page: "58mm", inner: "54mm" } : { page: "80mm", inner: "76mm" };
        return (
          <style>{`
            @media print {
              @page { size: ${paper.page} auto; margin: 0 0 5mm; }
              body * { visibility: hidden !important; }
              #receipt-print, #receipt-print * { visibility: visible !important; }
              #receipt-print {
                position: fixed !important;
                left: 50% !important;
                top: 0 !important;
                transform: translateX(-50%) !important;
                width: ${paper.inner} !important;
                background: #fff !important;
                border: none !important;
                border-radius: 0 !important;
                box-shadow: none !important;
                overflow: visible !important;
                font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif !important;
              }
              #receipt-print * { color: #000 !important; }
              #receipt-print .border-t { border-top-color: #ccc !important; }
              #receipt-print img {
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
              }
            }
          `}</style>
        );
      })()}

      <PosTopBar
        cashierName={sale.cashier?.full_name ?? "Cashier"}
        avatarUrl={sale.cashier?.avatar_url}
        title="Receipt"
        showBack
        backHref="/cashier/orders"
      />

      <div className="flex flex-col lg:flex-row flex-1 min-h-0">
        {/* ── LEFT: Success state + actions — full width on mobile, 40% on lg+ ── */}
        <aside className="w-full lg:w-2/5 border-b lg:border-b-0 lg:border-r border-border flex flex-col bg-white shrink-0">
          {/* Success banner */}
          <div className="bg-white border-b border-border">
            <div className="px-6 py-8 text-center">
              <div className="w-14 h-14 rounded-full bg-success/10 border border-success/20 flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 className="w-8 h-8 text-success" aria-hidden="true" />
              </div>
              <p className="text-xl font-bold text-foreground">Payment Received</p>
              <p className="text-sm font-mono text-muted-foreground mt-1">{saleRef}</p>
              <p className="text-xs text-muted-foreground/60 mt-0.5">{saleDate}</p>
            </div>
          </div>

          {/* Payment summary */}
          <div className="px-5 py-4 border-b border-border space-y-2">
            <div className="flex justify-between items-baseline">
              <span className="text-sm text-muted-foreground">Total</span>
              <span className="text-xl font-bold text-primary tabular-nums">
                {formatCurrency(sale.total_amount)}
              </span>
            </div>
            {payments.map((p) => (
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
              onClick={() => window.print()}
              className="flex items-center justify-center gap-2 h-12 rounded-xl font-semibold text-sm btn-tactile-primary active:btn-tactile-primary-active"
            >
              <Printer className="w-4 h-4" aria-hidden="true" />
              Print Receipt
            </button>
            {onViewOrders ? (
              <button
                onClick={onViewOrders}
                className="flex items-center justify-center gap-2 h-12 rounded-xl border border-border bg-card text-foreground font-semibold text-sm hover:bg-secondary transition-colors"
              >
                <ClipboardList className="w-4 h-4" aria-hidden="true" />
                View Orders
              </button>
            ) : (
              <Link
                href="/cashier/orders"
                className="flex items-center justify-center gap-2 h-12 rounded-xl border border-border bg-card text-foreground font-semibold text-sm hover:bg-secondary transition-colors"
              >
                <ClipboardList className="w-4 h-4" aria-hidden="true" />
                View Orders
              </Link>
            )}
            {onNewOrder ? (
              <button
                onClick={onNewOrder}
                className="flex items-center justify-center gap-2 h-12 rounded-xl border border-border bg-card text-foreground font-semibold text-sm hover:bg-secondary transition-colors"
              >
                <ShoppingCart className="w-4 h-4" aria-hidden="true" />
                New Order
              </button>
            ) : (
              <Link
                href="/cashier"
                className="flex items-center justify-center gap-2 h-12 rounded-xl border border-border bg-card text-foreground font-semibold text-sm hover:bg-secondary transition-colors"
              >
                <ShoppingCart className="w-4 h-4" aria-hidden="true" />
                New Order
              </Link>
            )}
          </div>
        </aside>

        {/* ── RIGHT: Receipt paper preview ──────────────────────── */}
        <main className="flex-1 overflow-y-auto flex justify-center px-6 py-8 bg-secondary/50">
          <div className="w-full max-w-sm">
            <div id="receipt-print" className="bg-white rounded-xl shadow-lg border border-black/5 overflow-hidden font-mono text-xs">

              {/* Logo */}
              <div className="pt-4 pb-2 flex flex-col items-center px-6">
                <img src="/logo-brand.png" alt="Bedarts Cold Supplies" className="h-10 object-contain" draggable={false} />
              </div>

              <Dash />

              {/* Store info */}
              {(settings.address || settings.phone || settings.vat_number || settings.opening_hours || settings.sunday_hours) && (
                <>
                  <div className="px-6 py-2 text-center space-y-0.5 text-[12px]">
                    {settings.address && <p className="text-foreground leading-snug">{settings.address}</p>}
                    {settings.phone && <p className="text-muted-foreground">Tel: {settings.phone}</p>}
                    {settings.vat_number && <p className="text-muted-foreground">VAT Reg: {settings.vat_number}</p>}
                    {settings.opening_hours && <p className="text-muted-foreground">Mon–Sat: {settings.opening_hours}</p>}
                    {settings.sunday_hours && <p className="text-muted-foreground">Sun: {settings.sunday_hours}</p>}
                  </div>
                  <Dash />
                </>
              )}

              {/* Sale meta */}
              <div className="px-6 py-2 space-y-1 text-[12px]">
                <Row label="Receipt" value={saleRef} valueBold />
                <Row label="Date" value={saleDate} />
                <Row label="Cashier" value={sale.cashier?.full_name ?? "Cashier"} />
              </div>

              <Dash />

              {/* Items */}
              <div className="px-6 py-2 space-y-2">
                {(sale.sale_items ?? []).map((item) => {
                  const isKg = item.product?.unit === "kg";
                  return (
                    <div key={item.id}>
                      <div className="flex justify-between gap-3">
                        <span className="font-bold text-foreground uppercase flex-1 leading-snug text-[13px]">
                          {item.product?.name ?? "Unknown"}
                        </span>
                        <span className="tabular-nums font-bold shrink-0 text-[13px]">{item.total_price.toFixed(2)}</span>
                      </div>
                      <div className="text-foreground/80 tabular-nums pl-2 text-[13px] font-semibold">
                        {item.package_label
                          ? `${item.package_label} · ${item.quantity}${isKg ? "kg" : "pcs"}`
                          : isKg
                            ? `${item.quantity}kg / GH¢${item.unit_price.toFixed(2)}`
                            : `${item.quantity} x GH¢${item.unit_price.toFixed(2)}`}
                      </div>
                      {item.discount_amount > 0 && (
                        <div className="text-warning pl-2 text-[12px]">Disc: -{item.discount_amount.toFixed(2)}</div>
                      )}
                    </div>
                  );
                })}
              </div>

              <Dash />

              {/* Pre-total lines (discount / tax) */}
              {(sale.discount_amount > 0 || (settings.tax_enabled && settings.tax_rate > 0)) && (
                <>
                  <div className="px-6 py-2 space-y-1 text-[12px]">
                    {sale.discount_amount > 0 && (
                      <>
                        <Row label="Subtotal" value={sale.subtotal.toFixed(2)} />
                        <div className="flex justify-between gap-4">
                          <span className="text-muted-foreground">Discount</span>
                          <span className="tabular-nums text-warning">-{sale.discount_amount.toFixed(2)}</span>
                        </div>
                      </>
                    )}
                    {settings.tax_enabled && settings.tax_rate > 0 && (() => {
                      const taxable = sale.subtotal - sale.discount_amount;
                      if (settings.vat_number) {
                        return (
                          <>
                            <Row label="VAT (15%)" value={(taxable * 0.15).toFixed(2)} />
                            <Row label="NHIL/GETFL (2.5%)" value={(taxable * 0.025).toFixed(2)} />
                          </>
                        );
                      }
                      return <Row label={`Tax (${settings.tax_rate}%)`} value={(taxable * (settings.tax_rate / 100)).toFixed(2)} />;
                    })()}
                  </div>
                  <Dash />
                </>
              )}

              {/* TOTAL */}
              <div className="px-6 py-3 flex justify-between items-baseline">
                <span className="text-[16px] font-extrabold tracking-wide text-foreground">TOTAL</span>
                <span className="text-[20px] font-extrabold tabular-nums text-foreground">GH¢{sale.total_amount.toFixed(2)}</span>
              </div>

              <Dash />

              {/* Payments */}
              <div className="px-6 py-2 space-y-1 text-[12px]">
                <p className="text-[10px] font-bold tracking-widest text-muted-foreground uppercase mb-1">Payment</p>
                {payments.map((p) => (
                  <Row key={p.id} label={METHOD_LABELS[p.method] ?? p.method} value={p.amount.toFixed(2)} />
                ))}
                {change > 0 && (
                  <div className="flex justify-between gap-4 pt-1">
                    <span className="font-bold text-foreground">Change</span>
                    <span className="tabular-nums font-bold text-[14px] text-success">GH¢{change.toFixed(2)}</span>
                  </div>
                )}
              </div>

              <Dash />

              {/* Footer */}
              <div className="px-6 py-2 text-center">
                <p className="text-[12px] text-muted-foreground/70 leading-snug">
                  {settings.receipt_footer ?? "Thank you for shopping with us!"}
                </p>
              </div>

              {/* Order ID at the very bottom — small, unobtrusive */}
              <div className="px-6 pt-1.5 pb-3 text-center">
                <p className="text-[9px] text-muted-foreground/40 tracking-widest font-mono">{saleRef}</p>
              </div>

            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
