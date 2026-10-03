"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ChevronLeft,
  Package,
  Clock,
  Truck,
  Store,
  CheckCircle2,
  XCircle,
  ChevronDown,
  MessageCircle,
  RefreshCw,
  Loader2,
} from "lucide-react";
import { getCustomerOrders, cancelOrder } from "@/src/lib/actions/orders";
import { getProductsByIds } from "@/src/lib/actions/products";
import { getStoreSettings } from "@/src/lib/actions/settings";
import { signOut } from "@/src/lib/actions/auth";
import { formatCurrency, formatDate, cn } from "@/src/lib/utils";
import { useAuth } from "@/src/lib/use-auth";
import { useCart } from "@/src/lib/cart-store";
import { extractWhatsAppNumber, buildOrderChatUrl } from "@/src/lib/whatsapp";
import type { OnlineOrder, OrderStatus, StoreSettings } from "@/src/lib/types";

const STATUS_CONFIG: Record<
  OrderStatus,
  { label: string; tone: string; Icon: React.ComponentType<{ className?: string }> }
> = {
  pending_payment: { label: "Awaiting payment", tone: "text-warning bg-warning/10", Icon: Clock },
  paid:            { label: "Confirmed",        tone: "text-accent bg-accent/10",  Icon: CheckCircle2 },
  dispatched:      { label: "On the way",       tone: "text-accent bg-accent/10",  Icon: Truck },
  delivered:       { label: "Delivered",        tone: "text-success bg-success/10", Icon: CheckCircle2 },
  cancelled:       { label: "Cancelled",        tone: "text-primary bg-primary/10", Icon: XCircle },
};

function OrderCard({
  order,
  settings,
  onChanged,
}: {
  order: OnlineOrder;
  settings: StoreSettings | null;
  onChanged: () => void;
}) {
  const router = useRouter();
  const { add, setQty, open, clear } = useCart();
  const [expanded, setExpanded] = useState(false);
  const [busy, setBusy] = useState<"cancel" | "reorder" | null>(null);
  const [cancelConfirm, setCancelConfirm] = useState(false);
  const [flash, setFlash] = useState<string | null>(null);

  const cfg = STATUS_CONFIG[order.status] ?? STATUS_CONFIG.pending_payment;
  const { Icon } = cfg;
  const isPickup = order.fulfillment_type === "pickup";
  const canCancel = order.status === "pending_payment";
  const whatsappNumber = extractWhatsAppNumber(settings?.phone ?? null);

  async function handleCancel() {
    setBusy("cancel");
    const res = await cancelOrder(order.id);
    setBusy(null);
    setCancelConfirm(false);
    if (!res.ok) {
      setFlash(res.error);
      return;
    }
    onChanged();
  }

  async function handleReorder() {
    setBusy("reorder");
    const ids = (order.items ?? []).map((i) => i.product_id);
    const live = await getProductsByIds(ids);
    const missing: string[] = [];
    const outOfStock: string[] = [];

    clear();
    for (const item of order.items ?? []) {
      const p = live.find((l) => l.id === item.product_id);
      if (!p) {
        missing.push(item.product_name);
        continue;
      }
      if (p.stock_quantity <= 0) {
        outOfStock.push(item.product_name);
        continue;
      }
      const qty = Math.min(item.quantity, p.stock_quantity);
      add({
        product_id: p.id,
        product_name: p.name,
        unit: p.unit,
        unit_price: p.selling_price,
        image_url: p.image_url,
      });
      if (qty !== 1) setQty(p.id, qty);
    }

    setBusy(null);

    const skipped = [...missing, ...outOfStock];
    if (skipped.length > 0) {
      setFlash(`Some items aren't available: ${skipped.join(", ")}`);
    }

    // If nothing at all was added, don't route; keep the customer on the page.
    const anyAdded = (order.items ?? []).length - skipped.length > 0;
    if (anyAdded) {
      router.push("/");
      open();
    }
  }

  return (
    <article className="bg-card rounded-2xl shadow-card border border-border overflow-hidden">
      <button
        onClick={() => setExpanded((p) => !p)}
        aria-expanded={expanded}
        className="w-full flex items-center justify-between px-4 py-3.5 text-left hover:bg-background/50 transition-colors"
      >
        <div className="flex items-center gap-3 min-w-0">
          <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center shrink-0", cfg.tone)}>
            <Icon className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-bold text-foreground tabular-nums">
                {formatCurrency(order.total_amount)}
              </span>
              <span className={cn("text-[11px] font-semibold px-2 py-0.5 rounded-full", cfg.tone)}>
                {cfg.label}
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5 truncate">
              {formatDate(order.created_at)} ·{" "}
              {isPickup ? (
                <span className="inline-flex items-center gap-0.5">
                  <Store className="w-3 h-3 inline" aria-hidden="true" /> Pickup
                </span>
              ) : (
                <span className="inline-flex items-center gap-0.5">
                  <Truck className="w-3 h-3 inline" aria-hidden="true" /> Delivery
                </span>
              )}
            </p>
          </div>
        </div>
        <ChevronDown
          className={cn(
            "w-4 h-4 text-muted-foreground shrink-0 transition-transform",
            expanded && "rotate-180"
          )}
          aria-hidden="true"
        />
      </button>

      {expanded && (
        <div className="border-t border-background">
          <div className="divide-y divide-background">
            {(order.items ?? []).map((item) => (
              <div key={item.id} className="flex justify-between items-center px-4 py-2.5">
                <div>
                  <p className="text-sm font-item-title text-foreground leading-tight">
                    {item.product_name}
                  </p>
                  <p className="text-xs text-muted-foreground">Qty {item.quantity}</p>
                </div>
                <p className="text-sm font-semibold tabular-nums text-foreground">
                  {formatCurrency(item.total_price)}
                </p>
              </div>
            ))}
            {order.delivery_address && order.delivery_address !== "Pickup" && (
              <div className="px-4 py-2.5">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-0.5">
                  Address
                </p>
                <p className="text-sm text-foreground">{order.delivery_address}</p>
              </div>
            )}
          </div>

          {flash && (
            <div className="px-4 pt-3">
              <p className="text-xs rounded-lg px-3 py-2 bg-warning/10 border border-warning/20 text-warning">
                {flash}
              </p>
            </div>
          )}

          {/* Actions */}
          <div className="p-3 flex flex-wrap gap-2 bg-background/40">
            {order.status !== "cancelled" && (
              <button
                onClick={handleReorder}
                disabled={busy === "reorder"}
                className="h-10 px-3.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 border border-border bg-card text-foreground hover:bg-background active:bg-background transition-colors disabled:opacity-60"
              >
                {busy === "reorder" ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden="true" />
                ) : (
                  <RefreshCw className="w-3.5 h-3.5" aria-hidden="true" />
                )}
                Reorder
              </button>
            )}

            {whatsappNumber && (
              <a
                href={buildOrderChatUrl(whatsappNumber, order)}
                target="_blank"
                rel="noopener noreferrer"
                className="h-10 px-3.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 border border-border bg-card text-foreground hover:bg-background transition-colors"
              >
                <MessageCircle className="w-3.5 h-3.5" aria-hidden="true" />
                Ask about this order
              </a>
            )}

            {canCancel && !cancelConfirm && (
              <button
                onClick={() => setCancelConfirm(true)}
                className="h-10 px-3.5 rounded-xl text-xs font-semibold ml-auto text-primary hover:bg-primary/10 transition-colors"
              >
                Cancel order
              </button>
            )}
            {canCancel && cancelConfirm && (
              <div className="ml-auto flex gap-2 items-center">
                <span className="text-xs text-muted-foreground">Cancel this order?</span>
                <button
                  onClick={() => setCancelConfirm(false)}
                  className="h-10 px-3 rounded-xl text-xs font-semibold border border-border bg-card hover:bg-background transition-colors"
                >
                  Keep
                </button>
                <button
                  onClick={handleCancel}
                  disabled={busy === "cancel"}
                  className="h-10 px-3 rounded-xl text-xs font-semibold text-primary-foreground bg-primary hover:opacity-90 transition-opacity disabled:opacity-60 flex items-center gap-1.5"
                >
                  {busy === "cancel" && <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden="true" />}
                  Cancel
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </article>
  );
}

export default function AccountPage() {
  const router = useRouter();
  const { user, ready } = useAuth();
  const [orders, setOrders] = useState<OnlineOrder[]>([]);
  const [settings, setSettings] = useState<StoreSettings | null>(null);
  const [loading, setLoading] = useState(true);

  async function reload() {
    const list = await getCustomerOrders();
    setOrders(list);
  }

  useEffect(() => {
    if (ready && !user) {
      router.replace("/");
      return;
    }
    if (user) {
      Promise.all([getCustomerOrders(), getStoreSettings()])
        .then(([o, s]) => {
          setOrders(o);
          setSettings(s);
        })
        .finally(() => setLoading(false));
    }
  }, [ready, user, router]);

  async function handleSignOut() {
    await signOut();
    router.push("/");
  }

  return (
    <div className="min-h-dvh flex flex-col bg-background">
      <header
        className="sticky top-0 z-40 px-4 sm:px-6 flex items-center justify-between bg-navy"
        style={{ height: "var(--nav-height-sm)" }}
      >
        <Link
          href="/"
          className="flex items-center gap-1.5 h-11 -ml-2 pl-2 pr-3 rounded-lg text-white text-sm font-medium hover:bg-white/10 transition-colors"
        >
          <ChevronLeft className="w-4 h-4" aria-hidden="true" />
          Back to shop
        </Link>
        <button
          onClick={handleSignOut}
          className="h-11 px-3 -mr-2 rounded-lg text-xs font-medium text-navy-muted hover:text-white hover:bg-white/10 transition-colors"
        >
          Sign out
        </button>
      </header>

      <main className="flex-1 max-w-2xl mx-auto w-full px-4 sm:px-6 py-8">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-navy">
            <Package className="w-5 h-5 text-white" aria-hidden="true" />
          </div>
          <div>
            <h1 className="font-display-black text-xl uppercase text-foreground">
              My orders
            </h1>
            {user?.email && (
              <p className="text-xs text-muted-foreground">{user.email}</p>
            )}
          </div>
        </div>

        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-20 bg-card/60 rounded-2xl animate-pulse-soft" />
            ))}
          </div>
        ) : orders.length === 0 ? (
          <div className="text-center py-20">
            <Package className="w-10 h-10 mx-auto text-muted-foreground mb-3" aria-hidden="true" />
            <p className="text-sm text-muted-foreground">No orders yet.</p>
            <Link
              href="/"
              className="mt-3 inline-block text-sm font-semibold text-primary"
            >
              Start shopping
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {orders.map((order) => (
              <OrderCard
                key={order.id}
                order={order}
                settings={settings}
                onChanged={reload}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
