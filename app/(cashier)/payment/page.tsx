"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Banknote, Smartphone, CreditCard, ArrowLeft } from "lucide-react";
import { useCartStore } from "@/lib/pos-store";
import { PosTopBar } from "@/components/pos/pos-topbar";
import { Numpad } from "@/components/pos/numpad";
import { submitSale } from "@/app/(dashboard)/pos/actions";
import { formatCurrency } from "@/lib/utils";
import { cn } from "@/lib/utils";
import type { PaymentMethod, PaymentEntry } from "@/lib/types";

const QUICK_TENDER = ["5", "10", "20", "50", "100", "200"];

const METHOD_OPTIONS: { value: PaymentMethod; label: string; icon: React.ReactNode }[] = [
  { value: "cash", label: "Cash", icon: <Banknote className="w-5 h-5" /> },
  { value: "momo", label: "Mobile Money", icon: <Smartphone className="w-5 h-5" /> },
  { value: "pos_machine", label: "POS Machine", icon: <CreditCard className="w-5 h-5" /> },
];

export default function PaymentPage() {
  const router = useRouter();

  const { items, subtotal, total, discount, clearCart } = useCartStore();
  const subtotalVal = subtotal();
  const totalVal = total();

  const [method, setMethod] = useState<PaymentMethod>("cash");
  const [tendered, setTendered] = useState("");
  const [reference, setReference] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);

  const tenderedNum = parseFloat(tendered) || 0;
  const change = method === "cash" && tenderedNum > totalVal ? tenderedNum - totalVal : 0;
  const remaining =
    method === "cash" && tenderedNum > 0 && tenderedNum < totalVal
      ? totalVal - tenderedNum
      : 0;

  const pressTender = (key: string) => {
    if (key === "backspace") return setTendered((t) => t.slice(0, -1));
    if (key === ".") return setTendered((t) => (t.includes(".") ? t : (t || "0") + "."));
    if (key === "00")
      return setTendered((t) => (t === "" || t === "0" ? "0" : t + "00"));
    setTendered((t) => (t === "0" ? key : t + key));
  };

  const isValid =
    items.length > 0 &&
    (method !== "cash" || tenderedNum >= totalVal);

  const validate = async () => {
    if (!isValid || isProcessing) return;
    setIsProcessing(true);
    try {
      const payments: PaymentEntry[] = [
        {
          method,
          amount: method === "cash" ? Math.max(totalVal, tenderedNum) : totalVal,
          reference: reference.trim(),
        },
      ];
      const { saleId } = await submitSale({
        items,
        payments,
        subtotal: subtotalVal,
        discount,
        total: totalVal,
        customerId: null,
      });
      clearCart();
      router.push(`/cashier/receipt?sale=${saleId}`);
    } catch {
      setIsProcessing(false);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-background">
      <PosTopBar cashierName="" showBack backHref="/cashier" />

      <div className="flex flex-1 min-h-0 p-3 gap-3 lg:p-4 lg:gap-4">
        {/* LEFT — Payment panel */}
        <section className="flex flex-col gap-3 w-full lg:w-[55%] min-w-0">
          {/* Method selector */}
          <div className="rounded-xl border border-border bg-card p-4">
            <p className="text-sm font-semibold text-foreground mb-3">
              Payment Method
            </p>
            <div className="grid grid-cols-3 gap-2">
              {METHOD_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setMethod(opt.value)}
                  className={cn(
                    "flex flex-col items-center gap-2 py-4 rounded-xl border text-sm font-medium transition-colors",
                    method === opt.value
                      ? "bg-primary text-primary-foreground border-primary"
                      : "border-border bg-card text-foreground hover:bg-secondary"
                  )}
                >
                  {opt.icon}
                  <span className="text-xs">{opt.label}</span>
                </button>
              ))}
            </div>
          </div>

          {method === "cash" ? (
            <>
              {/* Tendered amount display */}
              <div className="rounded-xl border border-border bg-card p-4">
                <div className="flex justify-between items-baseline mb-1">
                  <span className="text-sm text-muted-foreground">Amount Tendered</span>
                  <span className="text-2xl font-bold text-foreground tabular-nums">
                    {tendered ? formatCurrency(tenderedNum) : "—"}
                  </span>
                </div>
                {change > 0 && (
                  <div className="flex justify-between items-baseline mt-2 pt-2 border-t border-border">
                    <span className="text-sm font-medium text-success">Change</span>
                    <span className="text-lg font-bold text-success tabular-nums">
                      {formatCurrency(change)}
                    </span>
                  </div>
                )}
                {remaining > 0 && (
                  <div className="flex justify-between items-baseline mt-2 pt-2 border-t border-border">
                    <span className="text-sm font-medium text-destructive">Remaining</span>
                    <span className="text-lg font-bold text-destructive tabular-nums">
                      {formatCurrency(remaining)}
                    </span>
                  </div>
                )}
              </div>

              {/* Quick-tender buttons */}
              <div className="rounded-xl border border-border bg-card p-4">
                <p className="text-xs text-muted-foreground mb-2">Quick tender (GHS)</p>
                <div className="grid grid-cols-6 gap-2 mb-3">
                  {QUICK_TENDER.map((amt) => (
                    <button
                      key={amt}
                      onClick={() => setTendered(amt)}
                      className="py-2 rounded-lg border border-border bg-secondary text-sm font-medium text-foreground hover:bg-border transition-colors"
                    >
                      {amt}
                    </button>
                  ))}
                </div>
                <Numpad onKey={pressTender} />
              </div>
            </>
          ) : (
            /* Reference input for MoMo / POS */
            <div className="rounded-xl border border-border bg-card p-4">
              <label
                htmlFor="reference"
                className="block text-sm font-medium text-foreground mb-2"
              >
                Reference / Transaction ID{" "}
                <span className="text-muted-foreground font-normal">(optional)</span>
              </label>
              <input
                id="reference"
                type="text"
                value={reference}
                onChange={(e) => setReference(e.target.value)}
                placeholder="Enter reference number…"
                className="w-full h-11 rounded-lg border border-border bg-input px-3 text-sm focus:outline-none focus:border-primary transition-colors"
              />
            </div>
          )}

          {/* Validate button */}
          <button
            onClick={validate}
            disabled={!isValid || isProcessing}
            className="w-full h-14 bg-primary text-primary-foreground rounded-xl text-base font-semibold transition-colors hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {isProcessing ? "Processing…" : `Confirm Payment · ${formatCurrency(totalVal)}`}
          </button>
        </section>

        {/* RIGHT — Order summary */}
        <section className="hidden lg:flex flex-col gap-3 flex-1 min-w-0">
          <div className="rounded-xl border border-border bg-card flex-1 min-h-0 overflow-hidden flex flex-col">
            <div className="px-4 py-3 border-b border-border">
              <p className="text-sm font-semibold text-foreground">Order Summary</p>
            </div>

            {items.length === 0 ? (
              <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">
                Cart is empty
              </div>
            ) : (
              <>
                <div className="flex-1 overflow-y-auto divide-y divide-border">
                  {items.map((item) => {
                    const lineTotal = Math.max(
                      0,
                      item.quantity * item.unit_price - item.discount_amount
                    );
                    return (
                      <div
                        key={item.product.id}
                        className="flex items-baseline justify-between px-4 py-2.5 gap-2"
                      >
                        <span className="text-sm text-foreground min-w-0 truncate">
                          <span className="text-muted-foreground mr-1">
                            {item.quantity}×
                          </span>
                          {item.product.name}
                        </span>
                        <span className="text-sm font-medium tabular-nums shrink-0">
                          {formatCurrency(lineTotal)}
                        </span>
                      </div>
                    );
                  })}
                </div>

                <div className="border-t border-border px-4 py-3 space-y-1.5">
                  <div className="flex justify-between text-sm text-muted-foreground">
                    <span>Subtotal</span>
                    <span className="tabular-nums">{formatCurrency(subtotalVal)}</span>
                  </div>
                  <div className="flex justify-between text-base font-semibold text-foreground pt-1 border-t border-border">
                    <span>Total</span>
                    <span className="tabular-nums text-primary">
                      {formatCurrency(totalVal)}
                    </span>
                  </div>
                </div>
              </>
            )}
          </div>

          <Link
            href="/cashier"
            className="flex items-center justify-center gap-2 h-11 rounded-xl border border-border bg-card text-sm font-medium text-foreground hover:bg-secondary transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to POS
          </Link>
        </section>
      </div>
    </div>
  );
}
