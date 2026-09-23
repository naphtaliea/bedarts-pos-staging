import Link from "next/link";
import { Printer, RefreshCw } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { requirePinSession } from "@/lib/require-pin-session";
import { PosTopBar } from "@/components/pos/pos-topbar";
import { DateToggle } from "./date-toggle";
import { formatCurrency } from "@/lib/utils";
import { redirect } from "next/navigation";
import type { PaymentMethod } from "@/lib/types";


const METHOD_LABELS: Record<PaymentMethod, string> = {
  cash: "Cash",
  momo: "MoMo",
  pos_machine: "POS",
};

const METHOD_BADGE: Record<PaymentMethod | "split", string> = {
  cash: "bg-success/12 text-success",
  momo: "bg-accent/12 text-accent",
  pos_machine: "bg-gray-100 text-gray-700",
  split: "bg-primary/10 text-primary",
};

type OrderRow = {
  id: string;
  created_at: string;
  total_amount: number;
  status: string;
  payments: { method: PaymentMethod; amount: number }[];
  sale_items: { quantity: number }[];
};

interface OrdersPageProps {
  searchParams: Promise<{ date?: string }>;
}

export default async function OrdersPage({ searchParams }: OrdersPageProps) {
  const cashierId = await requirePinSession();

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, avatar_url, role")
    .eq("id", cashierId)
    .single();

  const canSeeRevenue = profile?.role === "admin" || profile?.role === "manager";

  const { date: dateParam } = await searchParams;
  const isYesterday = dateParam === "yesterday";

  const start = new Date();
  if (isYesterday) start.setDate(start.getDate() - 1);
  start.setHours(0, 0, 0, 0);

  const end = new Date(start);
  end.setHours(23, 59, 59, 999);

  const { data: orders } = await supabase
    .from("sales")
    .select(
      "id, created_at, total_amount, status, payments(method, amount), sale_items(quantity)"
    )
    .gte("created_at", start.toISOString())
    .lte("created_at", end.toISOString())
    .eq("status", "completed")
    .order("created_at", { ascending: false });

  const rows = (orders ?? []) as OrderRow[];
  const totalRevenue = rows.reduce((s, o) => s + o.total_amount, 0);

  const dateLabel = isYesterday
    ? new Date(start).toLocaleDateString("en-GH", { dateStyle: "full" })
    : new Date().toLocaleDateString("en-GH", { dateStyle: "full" });

  return (
    <div className="flex flex-col h-dvh bg-background overflow-hidden animate-page-enter">
      <PosTopBar cashierName={profile?.full_name ?? ""} avatarUrl={profile?.avatar_url} title="Orders" showBack backHref="/cashier" />

      {/* Sub-header: date + stats + controls */}
      <div className="shrink-0 border-b border-border px-4 lg:px-6 py-2 flex items-center justify-between gap-3 flex-wrap bg-white">
        <p className="text-sm text-muted-foreground">{dateLabel}</p>
        <div className="flex items-center gap-2 shrink-0">
          <div className="flex items-center gap-3 px-3 py-1.5 rounded-lg bg-slate-50 border border-border text-sm">
            {canSeeRevenue && (
              <>
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] text-muted-foreground uppercase tracking-wide font-bold">Revenue</span>
                  <span className="font-bold text-foreground tabular-nums">{formatCurrency(totalRevenue)}</span>
                </div>
                <div className="w-px h-3.5 bg-border" aria-hidden="true" />
              </>
            )}
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] text-muted-foreground uppercase tracking-wide font-bold">Orders</span>
              <span className="font-bold text-foreground tabular-nums">{rows.length}</span>
            </div>
          </div>
          <Link
            href={isYesterday ? "/cashier/orders?date=yesterday" : "/cashier/orders"}
            className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-sm font-medium text-muted-foreground hover:bg-slate-50 hover:text-foreground transition-colors"
            aria-label="Refresh orders"
          >
            <RefreshCw className="w-3.5 h-3.5" aria-hidden="true" />
            <span className="hidden sm:inline">Refresh</span>
          </Link>
          <DateToggle active={isYesterday ? "yesterday" : "today"} />
        </div>
      </div>

      <div className="flex-1 flex flex-col min-h-0 px-5 py-3 max-w-5xl mx-auto w-full gap-3">

        {/* ── Orders table — fills remaining space, scrolls internally ── */}
        <div className="flex-1 min-h-0 rounded-xl border border-border bg-card overflow-hidden flex flex-col">
          {rows.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center gap-2 text-muted-foreground text-sm">
              <p>No completed orders {isYesterday ? "yesterday" : "today"}</p>
            </div>
          ) : (
            <div className="flex-1 min-h-0 overflow-y-auto overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="sticky top-0 z-10">
                  <tr className="border-b border-border bg-secondary/70 backdrop-blur-sm">
                    <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                      Receipt #
                    </th>
                    <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                      Time
                    </th>
                    <th className="text-center px-4 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                      Items
                    </th>
                    <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                      Method
                    </th>
                    <th className="text-right px-4 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                      Total
                    </th>
                    <th className="px-4 py-2.5" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {rows.map((order) => {
                    const productCount = order.sale_items.length;
                    const isSplit = order.payments.length > 1;
                    const primaryPayment = order.payments[0];
                    const payMethod: PaymentMethod | "split" = isSplit ? "split" : (primaryPayment?.method ?? "cash");
                    const receiptRef = `#${order.id.slice(0, 8).toUpperCase()}`;

                    return (
                      <tr
                        key={order.id}
                        className="relative hover:bg-secondary/40 has-[a:focus-visible]:bg-secondary/40 transition-colors"
                      >
                        <td className="px-4 py-2.5 font-mono font-medium text-foreground">
                          <Link
                            href={`/cashier/receipt?sale=${order.id}`}
                            aria-label={`View receipt ${receiptRef}`}
                            className="before:absolute before:inset-0 before:content-[''] focus:outline-none focus-visible:before:ring-2 focus-visible:before:ring-primary focus-visible:before:ring-inset"
                          >
                            {receiptRef}
                          </Link>
                        </td>
                        <td className="px-4 py-2.5 text-muted-foreground">
                          {new Date(order.created_at).toLocaleTimeString("en-GH", {
                            hour: "2-digit",
                            minute: "2-digit",
                            hour12: true,
                          })}
                        </td>
                        <td className="px-4 py-2.5 text-center tabular-nums text-muted-foreground">
                          {productCount}
                        </td>
                        <td className="px-4 py-2.5">
                          <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${METHOD_BADGE[payMethod]}`}>
                            {payMethod === "split" ? "Split" : METHOD_LABELS[payMethod]}
                          </span>
                        </td>
                        <td className="px-4 py-2.5 text-right font-semibold tabular-nums text-foreground">
                          {formatCurrency(order.total_amount)}
                        </td>
                        <td className="px-4 py-2.5 relative z-10">
                          <Link
                            href={`/cashier/receipt?sale=${order.id}`}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-border px-2.5 py-1 text-xs font-medium text-foreground hover:bg-secondary transition-colors"
                            tabIndex={-1}
                            aria-hidden="true"
                          >
                            <Printer className="w-3.5 h-3.5" aria-hidden="true" />
                            Receipt
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
