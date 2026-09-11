import { createClient } from "@/lib/supabase/server";
import { PosTopBar } from "@/components/pos/pos-topbar";
import { formatCurrency } from "@/lib/utils";
import { redirect } from "next/navigation";
import type { PaymentMethod } from "@/lib/types";

const METHOD_LABELS: Record<PaymentMethod, string> = {
  cash: "Cash",
  momo: "MoMo",
  pos_machine: "POS",
};

const METHOD_BADGE: Record<PaymentMethod, string> = {
  cash: "bg-green-100 text-green-700",
  momo: "bg-blue-100 text-blue-700",
  pos_machine: "bg-gray-100 text-gray-700",
};

type OrderRow = {
  id: string;
  created_at: string;
  total_amount: number;
  status: string;
  payments: { method: PaymentMethod; amount: number }[];
  sale_items: { quantity: number }[];
};

export default async function OrdersPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name")
    .eq("id", user.id)
    .single();

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const { data: orders } = await supabase
    .from("sales")
    .select(
      "id, created_at, total_amount, status, payments(method, amount), sale_items(quantity)"
    )
    .gte("created_at", today.toISOString())
    .eq("status", "completed")
    .order("created_at", { ascending: false });

  const rows = (orders ?? []) as OrderRow[];

  const totalRevenue = rows.reduce((s, o) => s + o.total_amount, 0);

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <PosTopBar cashierName={profile?.full_name ?? ""} showBack backHref="/cashier" />

      <main className="flex-1 p-4 lg:p-6 space-y-6 max-w-5xl mx-auto w-full">
        <div>
          <h1 className="text-xl font-bold text-foreground">Today&apos;s Orders</h1>
          <p className="text-sm text-muted-foreground">
            {new Date().toLocaleDateString("en-GH", { dateStyle: "full" })}
          </p>
        </div>

        {/* Summary stats */}
        <div className="grid grid-cols-2 gap-4">
          <div className="rounded-xl border border-border bg-card p-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wide">
              Revenue
            </p>
            <p className="text-2xl font-bold text-primary tabular-nums mt-1">
              {formatCurrency(totalRevenue)}
            </p>
          </div>
          <div className="rounded-xl border border-border bg-card p-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wide">
              Orders
            </p>
            <p className="text-2xl font-bold text-foreground tabular-nums mt-1">
              {rows.length}
            </p>
          </div>
        </div>

        {/* Orders table */}
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          {rows.length === 0 ? (
            <div className="flex items-center justify-center h-32 text-muted-foreground text-sm">
              No completed orders today
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-secondary/50">
                    <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                      Receipt #
                    </th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                      Time
                    </th>
                    <th className="text-center px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                      Items
                    </th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                      Method
                    </th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                      Total
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {rows.map((order) => {
                    const itemCount = order.sale_items.reduce(
                      (s, i) => s + i.quantity,
                      0
                    );
                    const primaryPayment = order.payments[0];
                    const payMethod: PaymentMethod =
                      primaryPayment?.method ?? "cash";

                    return (
                      <tr
                        key={order.id}
                        className="hover:bg-secondary/40 transition-colors"
                      >
                        <td className="px-4 py-3 font-mono font-medium text-foreground">
                          #{order.id.slice(0, 8).toUpperCase()}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {new Date(order.created_at).toLocaleTimeString(
                            "en-GH",
                            { hour: "2-digit", minute: "2-digit", hour12: true }
                          )}
                        </td>
                        <td className="px-4 py-3 text-center tabular-nums">
                          {itemCount}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${METHOD_BADGE[payMethod]}`}
                          >
                            {METHOD_LABELS[payMethod]}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right font-semibold tabular-nums text-foreground">
                          {formatCurrency(order.total_amount)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
