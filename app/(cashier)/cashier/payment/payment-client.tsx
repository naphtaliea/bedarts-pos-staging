"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Banknote, Smartphone, CreditCard, Landmark, AlertCircle, Loader2, Delete, X, Search, UserPlus } from "lucide-react";
import { useCartStore } from "@/lib/pos-store";
import { PosTopBar } from "@/components/pos/pos-topbar";
import { submitSale } from "@/app/(dashboard)/pos/actions";
import { formatCurrency } from "@/lib/utils";
import { cn } from "@/lib/utils";
import type { Customer, PaymentMethod, PaymentEntry } from "@/lib/types";

const METHOD_OPTIONS: { value: PaymentMethod; label: string; icon: React.ElementType }[] = [
  { value: "cash",        label: "Cash",          icon: Banknote   },
  { value: "momo",        label: "MTN MoMo",      icon: Smartphone },
  { value: "pos_machine", label: "Visa / POS",    icon: CreditCard },
  { value: "account",     label: "On Account",    icon: Landmark   },
];

const METHOD_LABELS: Record<string, string> = {
  cash: "Cash", momo: "MTN MoMo", pos_machine: "Visa / POS", account: "On Account",
};

const CASH_ROWS: [string, string, string, string][] = [
  ["1", "2", "3", "+10"],
  ["4", "5", "6", "+20"],
  ["7", "8", "9", "+50"],
  ["00", "0", ".", "⌫"],
];

const DIGIT_ROWS: [string, string, string][] = [
  ["1", "2", "3"],
  ["4", "5", "6"],
  ["7", "8", "9"],
  ["00", "0", "."],
];

interface Split {
  id: string;
  method: PaymentMethod;
  amount: number;
  reference: string;
}

interface PaymentClientProps {
  cashierName: string;
  initialCustomers: Customer[];
}

export function PaymentClient({ cashierName, initialCustomers }: PaymentClientProps) {
  const router = useRouter();
  const { items, subtotal, total, discount, clearCart, customer, setCustomer } = useCartStore();
  const subtotalVal = subtotal();
  const totalVal    = total();

  const [splits,             setSplits]             = useState<Split[]>([]);
  const [method,             setMethod]             = useState<PaymentMethod>("cash");
  const [tendered,           setTendered]           = useState("");
  const [reference,          setReference]          = useState("");
  const [isProcessing,       setIsProcessing]       = useState(false);
  const [error,              setError]              = useState<string | null>(null);
  const [offlineSaved,       setOfflineSaved]       = useState(false);
  const [customerSearch,     setCustomerSearch]     = useState("");
  const [customerPickerOpen, setCustomerPickerOpen] = useState(false);

  useEffect(() => {
    if (items.length === 0) router.replace("/cashier");
  }, [items.length, router]);

  const splitsTotal = splits.reduce((s, p) => s + p.amount, 0);
  const remaining   = Math.max(0, totalVal - splitsTotal);

  // For cash: digit-entered amount. For digital: digit-entered if typed, else full remaining.
  const tenderedNum  = parseFloat(tendered) || 0;
  const entryAmount  = method === "account"
    ? remaining
    : method === "cash"
      ? tenderedNum
      : tenderedNum > 0 ? tenderedNum : remaining;

  const totalCovered = splitsTotal + entryAmount;
  const change       = Math.max(0, totalCovered - totalVal);

  // Split button: only when entry is a partial payment (any non-account method)
  const showSplitButton = method !== "account" && entryAmount > 0 && entryAmount < remaining - 0.001;

  const pressTender = (key: string) => {
    if (key === "⌫") return setTendered(t => t.slice(0, -1));
    if (key.startsWith("+")) {
      const add = parseFloat(key.slice(1));
      return setTendered(t => String((parseFloat(t) || 0) + add));
    }
    if (key === ".")  return setTendered(t => t.includes(".") ? t : (t || "0") + ".");
    if (key === "00") return setTendered(t => (t === "" || t === "0") ? "0" : t + "00");
    setTendered(t => t === "0" ? key : t + key);
  };

  const addSplit = () => {
    if (entryAmount <= 0) return;
    setSplits(prev => [...prev, {
      id: crypto.randomUUID(),
      method,
      amount: entryAmount,
      reference: reference.trim(),
    }]);
    setTendered("");
    setReference("");
  };

  const removeSplit = (id: string) => setSplits(prev => prev.filter(p => p.id !== id));

  // Account: guard against exceeding credit limit
  const accountEntryAmount = method === "account" ? remaining : 0;
  const totalOnAccount = splits.filter(s => s.method === "account").reduce((s, p) => s + p.amount, 0) + accountEntryAmount;
  const creditAvailable = customer ? Math.max(0, customer.credit_limit - customer.credit_balance) : 0;
  const accountOverLimit = method === "account" && customer && customer.credit_limit > 0 && totalOnAccount > creditAvailable;

  const canConfirm = items.length > 0
    && totalCovered >= totalVal
    && !accountOverLimit
    && (method !== "account" || !!customer);

  const handleConfirm = async () => {
    if (!canConfirm || isProcessing) return;
    setIsProcessing(true);
    setError(null);

    const payments: PaymentEntry[] = [
      ...splits.map(p => ({ method: p.method, amount: p.amount, reference: p.reference })),
      { method, amount: entryAmount, reference: reference.trim() },
    ].filter(p => p.amount > 0);

    const payload = { items, payments, subtotal: subtotalVal, discount, total: totalVal, customerId: customer?.id ?? null };
    try {
      if (!navigator.onLine) throw new Error("OFFLINE_MODE");
      const { saleId } = await submitSale(payload);
      clearCart();
      router.push(`/cashier/receipt?sale=${saleId}`);
    } catch (e) {
      const isOffline = !navigator.onLine || (e instanceof Error &&
        (e.message === "OFFLINE_MODE" || e.message.includes("fetch")));
      if (isOffline) {
        const { saveOfflineSale } = await import("@/lib/sync-queue");
        await saveOfflineSale(payload);
        clearCart();
        setOfflineSaved(true);
        setTimeout(() => router.push("/cashier"), 3000);
      } else {
        setIsProcessing(false);
        setError(e instanceof Error ? e.message : "Payment failed. Please try again.");
      }
    }
  };

  // Keyboard handler
  const kbRef = useRef<(e: KeyboardEvent) => void>(() => {});
  kbRef.current = (e: KeyboardEvent) => {
    if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    if (e.key === "Escape" && customerPickerOpen) { e.preventDefault(); setCustomerPickerOpen(false); return; }
    if (customerPickerOpen) return;
    if (method === "cash" || method === "momo" || method === "pos_machine") {
      if (/^[0-9]$/.test(e.key)) { e.preventDefault(); pressTender(e.key); }
      else if (e.key === ".") { e.preventDefault(); pressTender("."); }
      else if (e.key === "Backspace") { e.preventDefault(); pressTender("⌫"); }
    }
    if (e.key === "Enter" && canConfirm && !isProcessing) { e.preventDefault(); handleConfirm(); }
  };
  useEffect(() => {
    const h = (e: KeyboardEvent) => kbRef.current(e);
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, []);

  const filteredCustomers = customerSearch.trim() === ""
    ? initialCustomers
    : initialCustomers.filter(c =>
        c.name.toLowerCase().includes(customerSearch.toLowerCase()) ||
        (c.phone ?? "").includes(customerSearch)
      );

  if (items.length === 0) return null;

  return (
    <div className="flex flex-col h-screen bg-background">
      <PosTopBar cashierName={cashierName} showBack backHref="/cashier" />

      <div className="flex flex-1 min-h-0">

        {/* ── LEFT: Method selector + committed splits + summary ── */}
        <aside className="w-2/5 border-r border-border flex flex-col bg-card shrink-0">
          <div className="px-4 py-3 border-b border-border shrink-0">
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">
              Payment Method
            </p>
          </div>

          {METHOD_OPTIONS.map(opt => {
            const Icon = opt.icon;
            const active = method === opt.value;
            return (
              <button
                key={opt.value}
                onClick={() => { setMethod(opt.value); setTendered(""); setReference(""); setError(null); }}
                className={cn(
                  "flex items-center gap-3 px-4 py-3.5 text-sm font-medium border-b border-border border-l-[3px] transition-all text-left shrink-0",
                  active
                    ? "border-l-primary bg-primary/5 text-foreground"
                    : "border-l-transparent text-muted-foreground hover:bg-secondary hover:text-foreground"
                )}
              >
                <Icon className={cn("w-4 h-4 shrink-0", active && "text-primary")} aria-hidden="true" />
                {opt.label}
              </button>
            );
          })}

          {/* Committed split payments */}
          {splits.length > 0 && (
            <div className="border-t border-border shrink-0">
              <div className="px-4 pt-3 pb-2">
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">
                  Split Payments
                </p>
              </div>
              {splits.map(p => (
                <div key={p.id} className="flex items-center justify-between px-4 py-2 border-b border-border/50 text-sm">
                  <div className="min-w-0">
                    <p className="font-medium text-foreground">{METHOD_LABELS[p.method]}</p>
                    {p.reference && (
                      <p className="text-xs text-muted-foreground truncate">{p.reference}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0 ml-2">
                    <span className="tabular-nums font-semibold text-foreground">{formatCurrency(p.amount)}</span>
                    <button
                      onClick={() => removeSplit(p.id)}
                      aria-label={`Remove ${METHOD_LABELS[p.method]} payment`}
                      className="text-muted-foreground hover:text-destructive transition-colors p-2 rounded"
                    >
                      <X className="w-3.5 h-3.5" aria-hidden="true" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Summary */}
          <div className="mt-auto border-t border-border px-4 py-4 shrink-0">
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-3">
              Summary
            </p>
            <div className="space-y-1.5 text-sm">
              <div className="flex justify-between text-muted-foreground">
                <span>Subtotal</span>
                <span className="tabular-nums">{formatCurrency(subtotalVal)}</span>
              </div>
              {discount > 0 && (
                <div className="flex justify-between text-warning">
                  <span>Discount</span>
                  <span className="tabular-nums">−{formatCurrency(discount)}</span>
                </div>
              )}
              <div className="flex justify-between font-bold text-foreground text-base pt-2 border-t border-border">
                <span>Total</span>
                <span className="tabular-nums text-primary">{formatCurrency(totalVal)}</span>
              </div>
              {splits.length > 0 && (
                <div className="flex justify-between text-muted-foreground pt-1 border-t border-border">
                  <span>Paid so far</span>
                  <span className="tabular-nums font-medium text-foreground">{formatCurrency(splitsTotal)}</span>
                </div>
              )}
              {remaining > 0 && splits.length > 0 && (
                <div className="flex justify-between font-semibold text-warning">
                  <span>Remaining</span>
                  <span className="tabular-nums">{formatCurrency(remaining)}</span>
                </div>
              )}
              {change > 0 && (
                <div className="flex justify-between font-semibold text-success">
                  <span>Change</span>
                  <span className="tabular-nums">{formatCurrency(change)}</span>
                </div>
              )}
            </div>
          </div>
        </aside>

        {/* ── RIGHT: Amount display + input + actions ── */}
        <main className="flex-1 flex flex-col min-h-0">
          {/* Amount display */}
          <div className="shrink-0 py-5 px-8 text-center border-b border-border bg-card">
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-1">
              {splits.length > 0 ? "Remaining" : "Total"}
            </p>
            <p
              className="font-display font-black text-foreground tabular-nums leading-none"
              style={{ fontSize: "3.5rem" }}
            >
              {formatCurrency(splits.length > 0 ? remaining : totalVal)}
            </p>
            {(method === "cash" || method === "momo" || method === "pos_machine") && (
              <p className="text-muted-foreground mt-1.5 text-sm tabular-nums">
                {tendered
                  ? `Amount entered: ${formatCurrency(tenderedNum)}`
                  : method === "cash"
                    ? "Enter tendered amount — or press digits on your keyboard"
                    : "Amount defaults to total due — enter partial to split"}
              </p>
            )}
          </div>

          <div className="flex-1 flex flex-col items-center justify-center px-8 py-5 gap-3 overflow-y-auto">
            {method === "cash" ? (
              /* Cash: full numpad with shortcut buttons */
              <div className="w-full max-w-lg">
                <div className="flex flex-col gap-2 mb-3">
                  {CASH_ROWS.map(([k1, k2, k3, k4], ri) => (
                    <div key={ri} className="grid grid-cols-4 gap-2">
                      {([k1, k2, k3] as string[]).map(key => (
                        <button
                          key={key}
                          onClick={() => pressTender(key)}
                          className="h-14 rounded-xl border border-border bg-card font-display text-2xl font-bold text-foreground hover:bg-secondary active:scale-95 transition-all shadow-sm select-none"
                        >
                          {key}
                        </button>
                      ))}
                      {k4 === "⌫" ? (
                        <button
                          onClick={() => pressTender("⌫")}
                          aria-label="Backspace"
                          className="h-14 rounded-xl border border-border bg-secondary text-muted-foreground hover:bg-border active:scale-95 transition-all shadow-sm select-none flex items-center justify-center"
                        >
                          <Delete className="w-5 h-5" aria-hidden="true" />
                        </button>
                      ) : (
                        <button
                          onClick={() => pressTender(k4)}
                          className="h-14 rounded-xl border border-primary/25 bg-primary/8 font-display text-xl font-bold text-primary hover:bg-primary/15 active:scale-95 transition-all shadow-sm select-none"
                        >
                          {k4}
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ) : method === "account" ? (
              /* On Account: customer picker + credit info */
              <div className="w-full max-w-lg space-y-3">
                <div className="flex items-baseline justify-between">
                  <p className="text-sm font-medium text-foreground">Amount Charged to Account</p>
                  <p className="font-display font-black text-2xl text-primary tabular-nums">
                    {formatCurrency(remaining)}
                  </p>
                </div>

                {/* Customer selector */}
                <button
                  onClick={() => setCustomerPickerOpen(true)}
                  className={cn(
                    "w-full flex items-center justify-between px-4 py-3 rounded-xl border text-sm font-medium transition-colors",
                    customer
                      ? "border-border bg-card text-foreground hover:bg-secondary"
                      : "border-dashed border-amber-400 bg-amber-50 dark:bg-amber-950/30 text-amber-800 dark:text-amber-300 hover:bg-amber-100"
                  )}
                >
                  <span className="flex items-center gap-2">
                    <UserPlus className="w-4 h-4 shrink-0" aria-hidden="true" />
                    {customer ? customer.name : "Select customer — required for On Account"}
                  </span>
                  {customer && (
                    <button
                      onClick={(e) => { e.stopPropagation(); setCustomer(null); }}
                      aria-label="Clear customer"
                      className="ml-2 p-1 rounded hover:bg-secondary transition-colors text-muted-foreground"
                    >
                      <X className="w-3.5 h-3.5" aria-hidden="true" />
                    </button>
                  )}
                </button>

                {customer && (
                  <div className="rounded-xl border border-border bg-card p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-semibold text-foreground">{customer.name}</p>
                        {customer.phone && <p className="text-xs text-muted-foreground">{customer.phone}</p>}
                      </div>
                      <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize bg-secondary text-secondary-foreground">
                        {customer.price_group}
                      </span>
                    </div>
                    <div className="grid grid-cols-3 gap-2 pt-1 border-t border-border">
                      <div className="text-center">
                        <p className="text-xs text-muted-foreground mb-0.5">Credit Limit</p>
                        <p className="font-display font-bold text-base tabular-nums">
                          {customer.credit_limit > 0 ? formatCurrency(customer.credit_limit) : "Unlimited"}
                        </p>
                      </div>
                      <div className="text-center">
                        <p className="text-xs text-muted-foreground mb-0.5">Balance Owed</p>
                        <p className={cn("font-display font-bold text-base tabular-nums", customer.credit_balance > 0 ? "text-destructive" : "text-foreground")}>
                          {formatCurrency(customer.credit_balance)}
                        </p>
                      </div>
                      <div className="text-center">
                        <p className="text-xs text-muted-foreground mb-0.5">Available</p>
                        <p className={cn("font-display font-bold text-base tabular-nums", creditAvailable === 0 && customer.credit_limit > 0 ? "text-destructive" : "text-success")}>
                          {customer.credit_limit > 0 ? formatCurrency(creditAvailable) : "—"}
                        </p>
                      </div>
                    </div>
                    {accountOverLimit && (
                      <div role="alert" className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs text-destructive">
                        <AlertCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" aria-hidden="true" />
                        <span>This sale ({formatCurrency(totalOnAccount)}) exceeds the available credit of {formatCurrency(creditAvailable)}.</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ) : (
              /* MoMo / POS: digit numpad + reference */
              <div className="w-full max-w-lg space-y-3">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Reference / Transaction ID{" "}
                    <span className="text-muted-foreground font-normal">(optional)</span>
                  </label>
                  <input
                    type="text"
                    value={reference}
                    onChange={e => setReference(e.target.value)}
                    placeholder="Enter reference number…"
                    className="w-full h-12 rounded-xl border border-border bg-background px-4 text-base focus:outline-none focus:border-primary transition-colors"
                    autoFocus
                  />
                </div>
                <div className="flex flex-col gap-2">
                  {DIGIT_ROWS.map((row, ri) => (
                    <div key={ri} className="grid grid-cols-4 gap-2">
                      {row.map(key => (
                        <button
                          key={key}
                          onClick={() => pressTender(key)}
                          className="h-12 rounded-xl border border-border bg-card font-display text-xl font-bold text-foreground hover:bg-secondary active:scale-95 transition-all shadow-sm select-none"
                        >
                          {key}
                        </button>
                      ))}
                      <button
                        onClick={() => pressTender("⌫")}
                        aria-label="Backspace"
                        className="h-12 rounded-xl border border-border bg-secondary text-muted-foreground hover:bg-border active:scale-95 transition-all shadow-sm select-none flex items-center justify-center"
                      >
                        <Delete className="w-4 h-4" aria-hidden="true" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {offlineSaved && (
              <div role="alert" className="flex items-start gap-3 rounded-xl border border-success/30 bg-success/5 px-4 py-3 text-sm text-success w-full max-w-lg">
                <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" aria-hidden="true" />
                <span>You&apos;re offline — sale saved and will sync automatically when connection returns.</span>
              </div>
            )}

            {error && (
              <div role="alert" className="flex items-start gap-3 rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive w-full max-w-lg">
                <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" aria-hidden="true" />
                <span>{error}</span>
              </div>
            )}

            <div className="w-full max-w-lg flex flex-col gap-2">
              {showSplitButton && (
                <button
                  onClick={addSplit}
                  className="w-full h-11 rounded-xl border border-border bg-card text-foreground text-sm font-semibold hover:bg-secondary transition-colors flex items-center justify-center gap-2 select-none"
                >
                  Add {formatCurrency(entryAmount)} {METHOD_LABELS[method]} · pay rest with another method
                </button>
              )}

              <button
                onClick={handleConfirm}
                disabled={!canConfirm || isProcessing}
                className="w-full h-16 bg-primary text-primary-foreground rounded-xl font-display font-black text-xl uppercase tracking-wide transition-colors hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-md select-none"
              >
                {isProcessing ? (
                  <><Loader2 className="w-5 h-5 animate-spin" aria-hidden="true" /> Processing…</>
                ) : (
                  `Confirm · ${formatCurrency(totalVal)}`
                )}
              </button>
            </div>
          </div>
        </main>
      </div>

      {/* ── Customer picker modal ── */}
      {customerPickerOpen && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center sm:items-center bg-black/60 backdrop-blur-sm"
          onClick={(e) => e.target === e.currentTarget && setCustomerPickerOpen(false)}
        >
          <div className="w-full max-w-sm bg-card rounded-t-3xl sm:rounded-3xl p-5 shadow-2xl">
            <div className="w-10 h-1 bg-border rounded-full mx-auto mb-5 sm:hidden" aria-hidden="true" />
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-foreground">Select Customer</h3>
              <button
                onClick={() => setCustomerPickerOpen(false)}
                className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center text-muted-foreground hover:bg-border transition-colors"
                aria-label="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="relative mb-3">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" aria-hidden="true" />
              <input
                autoFocus
                type="text"
                placeholder="Search by name or phone…"
                value={customerSearch}
                onChange={(e) => setCustomerSearch(e.target.value)}
                className="h-11 w-full rounded-xl border border-border bg-background pl-11 pr-4 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-transparent transition-all"
              />
            </div>

            <div className="max-h-64 overflow-y-auto -mx-1 px-1 space-y-0.5">
              {filteredCustomers.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-10">No customers found</p>
              ) : (
                filteredCustomers.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => { setCustomer(c); setCustomerPickerOpen(false); setCustomerSearch(""); }}
                    className="w-full flex items-center justify-between px-3 py-3 rounded-xl hover:bg-secondary active:bg-border transition-colors text-left"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-foreground truncate">{c.name}</p>
                      {c.phone && <p className="text-xs text-muted-foreground mt-0.5">{c.phone}</p>}
                    </div>
                    <span className={cn(
                      "text-[10px] font-bold uppercase tracking-wide px-2 py-1 rounded-full ml-3 shrink-0",
                      c.price_group === "wholesale"   ? "bg-amber-100 text-amber-700" :
                      c.price_group === "distributor" ? "bg-purple-100 text-purple-700" :
                      "bg-secondary text-muted-foreground"
                    )}>
                      {c.price_group}
                    </span>
                  </button>
                ))
              )}
            </div>

            <button
              onClick={() => { setCustomerPickerOpen(false); setCustomerSearch(""); }}
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
