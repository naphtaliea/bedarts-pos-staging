"use client";

import { Eye, ShoppingBag } from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/utils";

export interface PurchaseItemRow {
  id: string;
  product_id: string;
  quantity: number;
  cost_price: number;
  expiry_date: string | null;
  product: { name: string; unit: string };
}

export interface PurchaseRow {
  id: string;
  supplier_id: string;
  received_by: string;
  total_amount: number;
  notes: string | null;
  created_at: string;
  supplier: { name: string };
  receiver: { full_name: string };
  purchase_items?: PurchaseItemRow[];
  payment_status: "unpaid" | "paid";
  paid_at: string | null;
  payment_method: string | null;
  payment_reference: string | null;
  paid_by: string | null;
  payer?: { full_name: string } | null;
}

interface PurchaseTableProps {
  purchases: PurchaseRow[];
  onViewDetail: (purchase: PurchaseRow) => void;
}

const METHOD_LABELS: Record<string, string> = {
  cash: "Cash",
  momo: "MoMo",
  bank_transfer: "Bank Transfer",
  cheque: "Cheque",
};

export function PurchaseTable({ purchases, onViewDetail }: PurchaseTableProps) {
  if (purchases.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
        <div className="h-12 w-12 rounded-full bg-secondary flex items-center justify-center mb-3">
          <ShoppingBag className="h-5 w-5 text-muted-foreground" />
        </div>
        <p className="text-sm font-medium text-foreground mb-1">No purchases recorded yet</p>
        <p className="text-xs text-muted-foreground">Purchases will appear here once stock is received</p>
      </div>
    );
  }

  return (
    <>
      {/* ── Mobile: card list (< lg) ──────────────────────────────────── */}
      <div className="lg:hidden divide-y divide-border">
        {purchases.map((purchase) => {
          const itemCount = purchase.purchase_items?.length ?? 0;
          const isPaid = purchase.payment_status === "paid";

          return (
            <div key={purchase.id} className="flex items-start gap-3 px-4 py-3.5">
              <div className="flex-1 min-w-0">
                {/* Supplier + status */}
                <div className="flex items-center gap-2 flex-wrap mb-0.5">
                  <span className="text-sm font-semibold text-foreground">{purchase.supplier.name}</span>
                  {isPaid ? (
                    <span className="inline-flex items-center rounded-full bg-success/10 px-2 py-0.5 text-[11px] font-semibold text-success">
                      Paid{purchase.payment_method ? ` · ${METHOD_LABELS[purchase.payment_method] ?? purchase.payment_method}` : ""}
                    </span>
                  ) : (
                    <span className="inline-flex items-center rounded-full bg-warning/10 px-2 py-0.5 text-[11px] font-semibold text-warning">
                      Unpaid
                    </span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  {formatDate(purchase.created_at)} · {itemCount === 1 ? "1 item" : `${itemCount} items`}
                </p>
              </div>

              {/* Amount + view button */}
              <div className="flex items-center gap-1 shrink-0">
                <span className="text-sm font-semibold tabular-nums text-foreground">
                  {formatCurrency(purchase.total_amount)}
                </span>
                <button
                  onClick={() => onViewDetail(purchase)}
                  aria-label="View purchase details"
                  className="flex h-10 w-10 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                >
                  <Eye className="h-4 w-4" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Desktop: table (lg+) ──────────────────────────────────────── */}
      <div className="hidden lg:block overflow-x-auto">
        <table className="min-w-full border-separate border-spacing-0">
          <thead>
            <tr>
              {["Date", "Supplier", "Received By", "Items", "Total", "Status", "Actions"].map((h) => (
                <th
                  key={h}
                  className="sticky top-0 bg-card px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground first:pl-5 last:pr-5"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {purchases.map((purchase) => {
              const itemCount = purchase.purchase_items?.length ?? 0;
              const isPaid = purchase.payment_status === "paid";

              return (
                <tr key={purchase.id} className="transition-colors hover:bg-secondary">
                  <td className="whitespace-nowrap px-4 py-3 pl-5 text-sm text-muted-foreground">
                    {formatDate(purchase.created_at)}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3">
                    <span className="text-sm font-medium text-foreground">{purchase.supplier.name}</span>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-sm text-muted-foreground">
                    {purchase.receiver.full_name}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-sm text-muted-foreground">
                    {itemCount === 1 ? "1 item" : `${itemCount} items`}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-sm tabular-nums font-medium text-foreground">
                    {formatCurrency(purchase.total_amount)}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3">
                    {isPaid ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-success/10 px-2 py-0.5 text-xs font-semibold text-success">
                        Paid{purchase.payment_method ? ` · ${METHOD_LABELS[purchase.payment_method] ?? purchase.payment_method}` : ""}
                      </span>
                    ) : (
                      <span className="inline-flex items-center rounded-full bg-warning/10 px-2 py-0.5 text-xs font-semibold text-warning">
                        Unpaid
                      </span>
                    )}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 pr-5">
                    <button
                      onClick={() => onViewDetail(purchase)}
                      aria-label="View purchase details"
                      className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                    >
                      <Eye className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}
