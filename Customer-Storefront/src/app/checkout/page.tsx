"use client";

import { useState, useEffect, useId, useRef } from "react";
import { useRouter } from "next/navigation";
import { Loader2, ChevronLeft, Truck, Store, ChevronDown, Clock } from "lucide-react";
import Link from "next/link";
import { useCart } from "@/src/lib/cart-store";
import { initializeOrder } from "@/src/lib/actions/orders";
import { getStoreSettings } from "@/src/lib/actions/settings";
import { formatCurrency, cn } from "@/src/lib/utils";
import { useAuth } from "@/src/lib/use-auth";
import { computeDispatch, type DispatchEstimate } from "@/src/lib/dispatch-estimate";
import type { StoreSettings } from "@/src/lib/types";

type Fulfillment = "delivery" | "pickup";

export default function CheckoutPage() {
  const router = useRouter();
  const { items, total, clear } = useCart();
  const { user, ready } = useAuth();

  const [fulfillment, setFulfillment] = useState<Fulfillment>("delivery");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [mobileSummaryOpen, setMobileSummaryOpen] = useState(false);
  const [settings, setSettings] = useState<StoreSettings | null>(null);
  const [dispatch, setDispatch] = useState<DispatchEstimate | null>(null);

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [guestEmail, setGuestEmail] = useState("");
  const [address, setAddress] = useState("");
  const [notes, setNotes] = useState("");

  const nameId = useId();
  const phoneId = useId();
  const emailId = useId();
  const addressId = useId();
  const notesId = useId();
  const errorRef = useRef<HTMLParagraphElement | null>(null);

  const isGuest = !!user && !user.email;

  useEffect(() => {
    if (ready && !user) router.replace("/");
  }, [ready, user, router]);

  useEffect(() => {
    if (items.length === 0) router.replace("/");
  }, [items.length, router]);

  useEffect(() => {
    getStoreSettings().then((s) => {
      setSettings(s);
      setDispatch(computeDispatch(s));
    });
  }, []);

  const orderTotal = total();
  const itemCount = items.length;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    setError("");
    setLoading(true);

    try {
      const res = await initializeOrder(
        items.map((i) => ({
          product_id: i.product_id,
          product_name: i.product_name,
          unit: i.unit,
          quantity: i.quantity,
          unit_price: i.unit_price,
          total_price: i.total_price,
          image_url: i.image_url,
        })),
        {
          name,
          phone,
          address: fulfillment === "delivery" ? address : "Pickup",
          notes: fulfillment === "pickup" ? "PICKUP ORDER" : notes || undefined,
          fulfillmentType: fulfillment,
          guestEmail: isGuest ? guestEmail : undefined,
        }
      );

      if (!res.ok) {
        setError(res.error);
        requestAnimationFrame(() => errorRef.current?.focus?.());
        return;
      }

      clear();
      window.location.href = res.data.authorizationUrl;
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  const inputClass =
    "w-full h-11 px-3.5 rounded-xl border border-border bg-input text-sm text-foreground placeholder-muted-foreground outline-none transition-shadow focus:ring-2 focus:ring-accent/30 focus:border-accent";

  const labelClass =
    "text-xs font-semibold text-muted-foreground uppercase tracking-widest";

  return (
    <div className="min-h-dvh flex flex-col bg-background">
      <header
        className="sticky top-0 z-40 px-4 sm:px-6 flex items-center bg-navy"
        style={{ height: "var(--nav-height-sm)" }}
      >
        <Link
          href="/"
          className="flex items-center gap-1.5 h-11 -ml-2 pl-2 pr-3 rounded-lg text-white text-sm font-medium hover:bg-white/10 transition-colors"
        >
          <ChevronLeft className="w-4 h-4" aria-hidden="true" />
          Back to shop
        </Link>
      </header>

      {/* Mobile summary — collapsed strip on top */}
      <div className="md:hidden border-b border-border bg-card">
        <button
          onClick={() => setMobileSummaryOpen((v) => !v)}
          aria-expanded={mobileSummaryOpen}
          aria-controls="mobile-summary"
          className="w-full flex items-center justify-between px-4 h-12 text-left"
        >
          <span className="text-sm text-muted-foreground">
            {itemCount} item{itemCount !== 1 ? "s" : ""} ·{" "}
            <span className="font-bold text-foreground tabular-nums">
              {formatCurrency(orderTotal)}
            </span>
          </span>
          <span className="flex items-center gap-1 text-xs text-muted-foreground">
            {mobileSummaryOpen ? "Hide" : "Details"}
            <ChevronDown
              className={cn("w-4 h-4 transition-transform", mobileSummaryOpen && "rotate-180")}
              aria-hidden="true"
            />
          </span>
        </button>
        {mobileSummaryOpen && (
          <div id="mobile-summary" className="divide-y divide-background">
            {items.map((item) => (
              <div key={item.product_id} className="flex justify-between gap-3 px-4 py-2.5">
                <div className="min-w-0">
                  <p className="text-sm font-item-title text-foreground leading-snug line-clamp-1">
                    {item.product_name}
                  </p>
                  <p className="text-xs text-muted-foreground">Qty {item.quantity}</p>
                </div>
                <p className="text-sm font-semibold tabular-nums text-foreground shrink-0">
                  {formatCurrency(item.total_price)}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>

      <main className="flex-1 max-w-3xl mx-auto w-full px-4 sm:px-6 py-8 grid md:grid-cols-[1fr_320px] gap-6 items-start">
        {/* Left — form */}
        <form onSubmit={handleSubmit} noValidate className="space-y-6">
          <h1 className="font-display-black text-2xl uppercase text-foreground">Checkout</h1>

          {/* Dispatch banner */}
          {dispatch && (
            <div
              className={cn(
                "flex items-start gap-2.5 rounded-xl border px-3.5 py-3",
                dispatch.isSameDay
                  ? "border-success/30 bg-success/10 text-success"
                  : "border-warning/30 bg-warning/10 text-warning"
              )}
              role="status"
            >
              <Clock className="w-4 h-4 mt-0.5 shrink-0" aria-hidden="true" />
              <p className="text-xs font-medium leading-relaxed">{dispatch.message}</p>
            </div>
          )}

          {/* Fulfillment toggle */}
          <div>
            <p className={cn(labelClass, "mb-2")}>How do you want it?</p>
            <div
              role="radiogroup"
              aria-label="Fulfillment method"
              className="flex rounded-xl border border-border overflow-hidden bg-card p-1 gap-1"
            >
              {(
                [
                  { value: "delivery" as const, label: "Delivery", Icon: Truck },
                  { value: "pickup" as const, label: "Pickup", Icon: Store },
                ] as const
              ).map(({ value, label, Icon }) => {
                const active = fulfillment === value;
                return (
                  <button
                    key={value}
                    type="button"
                    role="radio"
                    aria-checked={active}
                    onClick={() => setFulfillment(value)}
                    className={cn(
                      "flex-1 h-10 rounded-lg flex items-center justify-center gap-2 text-sm font-semibold transition-colors",
                      active ? "text-white bg-navy" : "text-muted-foreground hover:bg-background"
                    )}
                  >
                    <Icon className="w-4 h-4" aria-hidden="true" />
                    {label}
                  </button>
                );
              })}
            </div>

            {/* Fulfillment explainer */}
            <div className="mt-2 rounded-xl border border-border bg-card px-3.5 py-3 text-xs leading-relaxed text-muted-foreground">
              {fulfillment === "delivery" ? (
                <>
                  <p className="text-foreground font-semibold">
                    A Bolt driver delivers to your address.
                  </p>
                  <p className="mt-1">
                    You pay the driver directly for delivery. You only pay us for the goods here.
                  </p>
                </>
              ) : (
                <>
                  <p className="text-foreground font-semibold">
                    Collect at our store in {settings?.address ?? "Lashibi"}.
                  </p>
                  <p className="mt-1">
                    You can also send your own Bolt driver — give them your order number when they arrive.
                  </p>
                </>
              )}
            </div>
          </div>

          {/* Contact */}
          <div className="space-y-3">
            <p className={labelClass}>Your details</p>
            <div>
              <label htmlFor={nameId} className="sr-only">Full name</label>
              <input
                id={nameId}
                required
                type="text"
                placeholder="Full name"
                autoComplete="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className={inputClass}
              />
            </div>
            <div>
              <label htmlFor={phoneId} className="sr-only">Phone number</label>
              <input
                id={phoneId}
                required
                type="tel"
                placeholder="Phone number"
                autoComplete="tel"
                inputMode="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className={inputClass}
              />
            </div>
            {isGuest && (
              <div>
                <label htmlFor={emailId} className="sr-only">Email address</label>
                <input
                  id={emailId}
                  required
                  type="email"
                  placeholder="Email (for your receipt)"
                  autoComplete="email"
                  inputMode="email"
                  value={guestEmail}
                  onChange={(e) => setGuestEmail(e.target.value)}
                  className={inputClass}
                />
              </div>
            )}
          </div>

          {/* Delivery fields */}
          {fulfillment === "delivery" && (
            <div className="space-y-3">
              <p className={labelClass}>Delivery address</p>
              <div>
                <label htmlFor={addressId} className="sr-only">Street or area</label>
                <input
                  id={addressId}
                  required
                  type="text"
                  placeholder="Street / area / landmark"
                  autoComplete="street-address"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className={inputClass}
                />
              </div>
              <div>
                <label htmlFor={notesId} className="sr-only">Delivery notes</label>
                <textarea
                  id={notesId}
                  rows={2}
                  placeholder="Delivery notes (optional)"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className={cn(inputClass, "h-auto py-3 resize-none")}
                />
              </div>
            </div>
          )}

          {error && (
            <p
              ref={errorRef}
              tabIndex={-1}
              role="alert"
              className="text-xs font-medium rounded-xl px-3 py-2.5 bg-primary/10 border border-primary/20 text-primary outline-none"
            >
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full h-12 rounded-xl text-sm font-semibold text-primary-foreground bg-primary flex items-center justify-center gap-2 transition-transform hover:opacity-90 active:scale-[0.98] disabled:opacity-60"
          >
            {loading && <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />}
            Pay {formatCurrency(orderTotal)}
            {dispatch?.ctaSuffix && (
              <span className="opacity-90 font-normal">
                &nbsp;· {dispatch.ctaSuffix}
              </span>
            )}
          </button>

          <p className="text-[11px] text-center text-muted-foreground leading-relaxed">
            By continuing you agree to our{" "}
            <Link href="/terms" className="underline hover:text-foreground">Terms</Link>{" "}
            and{" "}
            <Link href="/returns" className="underline hover:text-foreground">Returns policy</Link>.
          </p>
        </form>

        {/* Right — order summary (desktop) */}
        <aside
          aria-label="Order summary"
          className="hidden md:block bg-card rounded-2xl shadow-card border border-border overflow-hidden md:sticky md:top-6"
        >
          <div className="px-4 py-3 border-b border-border">
            <p className={labelClass}>Order summary</p>
          </div>
          <div className="divide-y divide-background">
            {items.map((item) => (
              <div key={item.product_id} className="flex justify-between gap-3 px-4 py-3">
                <div className="min-w-0">
                  <p className="text-sm font-item-title text-foreground leading-snug line-clamp-1">
                    {item.product_name}
                  </p>
                  <p className="text-xs text-muted-foreground">Qty {item.quantity}</p>
                </div>
                <p className="text-sm font-semibold tabular-nums text-foreground shrink-0">
                  {formatCurrency(item.total_price)}
                </p>
              </div>
            ))}
          </div>
          <div className="flex justify-between px-4 py-3 border-t border-border">
            <span className="text-sm text-muted-foreground">Total</span>
            <span className="text-base font-bold tabular-nums text-foreground">
              {formatCurrency(orderTotal)}
            </span>
          </div>
        </aside>
      </main>
    </div>
  );
}
