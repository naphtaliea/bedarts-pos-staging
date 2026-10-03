"use client";

import { useEffect, useRef, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { CheckCircle2, Clock, XCircle, Loader2, MessageCircle } from "lucide-react";
import Link from "next/link";
import { getOrderByRef } from "@/src/lib/actions/orders";
import { getStoreSettings } from "@/src/lib/actions/settings";
import { formatCurrency, formatDate } from "@/src/lib/utils";
import { extractWhatsAppNumber, buildOrderChatUrl } from "@/src/lib/whatsapp";
import type { OnlineOrder, StoreSettings } from "@/src/lib/types";

function ConfirmContent() {
  const params = useSearchParams();
  const ref = params.get("reference") ?? params.get("trxref") ?? "";
  const [order, setOrder] = useState<OnlineOrder | null>(null);
  const [settings, setSettings] = useState<StoreSettings | null>(null);
  const [attemptCount, setAttemptCount] = useState(0);
  const attemptsRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    getStoreSettings().then(setSettings);
  }, []);

  useEffect(() => {
    if (!ref) return;
    let cancelled = false;
    const MAX = 15;
    attemptsRef.current = 0;

    async function poll() {
      if (cancelled) return;
      const o = await getOrderByRef(ref);
      if (cancelled) return;
      setOrder(o);
      attemptsRef.current += 1;
      setAttemptCount(attemptsRef.current);
      if (o && o.status === "pending_payment" && attemptsRef.current < MAX) {
        timerRef.current = setTimeout(poll, 2000);
      }
    }

    poll();
    return () => {
      cancelled = true;
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [ref]);

  if (!ref) {
    return (
      <div className="text-center py-20">
        <p className="text-muted-foreground text-sm">No order reference found.</p>
        <Link
          href="/"
          className="mt-4 inline-block text-sm font-semibold text-primary"
        >
          Back to shop
        </Link>
      </div>
    );
  }

  const isPending = !order || order.status === "pending_payment";
  const isPaid =
    order?.status === "paid" ||
    order?.status === "dispatched" ||
    order?.status === "delivered";
  const isCancelled = order?.status === "cancelled";

  return (
    <div className="max-w-md mx-auto px-4 py-16 text-center animate-slide-up">
      {isPending && (
        <>
          <div className="w-16 h-16 rounded-full bg-background flex items-center justify-center mx-auto mb-5">
            <Loader2 className="w-8 h-8 animate-spin text-accent" aria-hidden="true" />
          </div>
          <h1 className="font-display-black text-2xl uppercase text-foreground">
            Confirming payment…
          </h1>
          <p className="text-sm text-muted-foreground mt-2">
            This usually takes a few seconds.
          </p>
          {attemptCount >= 10 && (
            <p className="text-xs text-muted-foreground mt-4 bg-card rounded-xl px-4 py-3 border border-border">
              Taking longer than expected. If you completed payment, your order
              will be confirmed shortly and you&apos;ll see it in{" "}
              <Link href="/account" className="text-primary font-semibold">
                My orders
              </Link>
              .
            </p>
          )}
        </>
      )}

      {isPaid && order && (
        <>
          <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-5 bg-success/10">
            <CheckCircle2 className="w-8 h-8 text-success" aria-hidden="true" />
          </div>
          <h1 className="font-display-black text-2xl uppercase text-foreground">
            Order confirmed!
          </h1>
          <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
            {order.fulfillment_type === "pickup"
              ? "We'll call to confirm when your order is ready. Send a Bolt driver with your order number, or come by yourself."
              : "We'll call to confirm your Bolt fare and dispatch time. The Bolt fare is separate from what you paid here."}
          </p>

          <div className="mt-6 bg-card rounded-2xl border border-border shadow-card text-left overflow-hidden">
            <div className="px-4 py-3 border-b border-border">
              <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                Order details
              </p>
            </div>
            <div className="divide-y divide-background">
              {(order.items ?? []).map((item) => (
                <div key={item.id} className="flex justify-between px-4 py-2.5">
                  <p className="text-sm font-item-title text-foreground">
                    {item.product_name}
                  </p>
                  <p className="text-sm tabular-nums text-foreground">
                    {formatCurrency(item.total_price)}
                  </p>
                </div>
              ))}
            </div>
            <div className="flex justify-between px-4 py-3 border-t border-border">
              <span className="text-sm text-muted-foreground">Total paid</span>
              <span className="font-bold tabular-nums text-foreground">
                {formatCurrency(order.total_amount)}
              </span>
            </div>
          </div>

          <p className="text-xs text-muted-foreground mt-4">
            {formatDate(order.created_at)}
          </p>
        </>
      )}

      {isCancelled && (
        <>
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-5">
            <XCircle className="w-8 h-8 text-primary" aria-hidden="true" />
          </div>
          <h1 className="font-display-black text-2xl uppercase text-foreground">
            Order cancelled
          </h1>
          <p className="text-sm text-muted-foreground mt-2">
            Your payment was not completed.
          </p>
        </>
      )}

      <div className="flex flex-col sm:flex-row gap-3 mt-8">
        <Link
          href="/account"
          className="flex-1 h-11 rounded-xl border border-border bg-card text-sm font-semibold text-foreground flex items-center justify-center gap-2 hover:bg-background transition-colors"
        >
          <Clock className="w-4 h-4 text-muted-foreground" aria-hidden="true" />
          My orders
        </Link>
        <Link
          href="/"
          className="flex-1 h-11 rounded-xl text-sm font-semibold text-primary-foreground bg-primary flex items-center justify-center transition-transform hover:opacity-90 active:scale-[0.98]"
        >
          Continue shopping
        </Link>
      </div>

      {isPaid && order && settings?.phone && extractWhatsAppNumber(settings.phone) && (
        <a
          href={buildOrderChatUrl(extractWhatsAppNumber(settings.phone)!, order)}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-3 h-11 rounded-xl flex items-center justify-center gap-2 text-sm font-semibold text-success bg-success/10 hover:bg-success/20 transition-colors"
        >
          <MessageCircle className="w-4 h-4" aria-hidden="true" />
          Chat with us on WhatsApp
        </a>
      )}
    </div>
  );
}

export default function ConfirmPage() {
  return (
    <div className="min-h-dvh bg-background">
      <header className="px-4 py-4 bg-navy">
        <Link href="/" className="inline-block">
          <span className="font-display-black text-base uppercase text-white tracking-wide">
            Bedarts Cold Supplies
          </span>
        </Link>
      </header>
      <Suspense
        fallback={
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" aria-hidden="true" />
          </div>
        }
      >
        <ConfirmContent />
      </Suspense>
    </div>
  );
}
