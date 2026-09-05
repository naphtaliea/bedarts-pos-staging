"use client";

import { Eye } from "lucide-react";
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
}

interface PurchaseTableProps {
  purchases: PurchaseRow[];
  onViewDetail: (purchase: PurchaseRow) => void;
}

const HEADINGS = ["Date", "Supplier", "Received By", "Items", "Total", "Actions"];

export function PurchaseTable({ purchases, onViewDetail }: PurchaseTableProps) {
  if (purchases.length === 0) {
    return (
      <div className="flex items-center justify-center py-20 text-sm text-slate-400">
        No purchases recorded yet
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full border-separate border-spacing-0">
        <thead>
          <tr>
            {HEADINGS.map((heading) => (
              <th
                key={heading}
                className="sticky top-0 bg-white px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-400 first:pl-5 last:pr-5"
              >
                {heading}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {purchases.map((purchase) => {
            const itemCount = purchase.purchase_items?.length ?? 0;

            return (
              <tr
                key={purchase.id}
                className="transition-colors hover:bg-slate-50"
              >
                {/* Date */}
                <td className="whitespace-nowrap px-4 py-3 pl-5 text-sm text-slate-500">
                  {formatDate(purchase.created_at)}
                </td>

                {/* Supplier */}
                <td className="whitespace-nowrap px-4 py-3">
                  <span className="text-sm font-medium text-slate-900">
                    {purchase.supplier.name}
                  </span>
                </td>

                {/* Received By */}
                <td className="whitespace-nowrap px-4 py-3 text-sm text-slate-500">
                  {purchase.receiver.full_name}
                </td>

                {/* Items */}
                <td className="whitespace-nowrap px-4 py-3 text-sm text-slate-500">
                  {itemCount === 1 ? "1 item" : `${itemCount} items`}
                </td>

                {/* Total */}
                <td className="whitespace-nowrap px-4 py-3 text-sm tabular-nums font-medium text-slate-700">
                  {formatCurrency(purchase.total_amount)}
                </td>

                {/* Actions */}
                <td className="whitespace-nowrap px-4 py-3 pr-5">
                  <button
                    onClick={() => onViewDetail(purchase)}
                    aria-label="View purchase details"
                    className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
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
  );
}
