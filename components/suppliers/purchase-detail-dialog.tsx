"use client";

import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatCurrency, formatDate, formatDateOnly } from "@/lib/utils";
import type { PurchaseRow } from "./purchase-table";

interface PurchaseDetailDialogProps {
  purchase: PurchaseRow;
  onClose: () => void;
}

export function PurchaseDetailDialog({
  purchase,
  onClose,
}: PurchaseDetailDialogProps) {
  const items = purchase.purchase_items ?? [];
  const total = items.reduce(
    (sum, item) => sum + item.quantity * item.cost_price,
    0
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-card rounded-2xl shadow-2xl w-full max-w-lg mx-4 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border shrink-0">
          <h2 className="text-lg font-semibold text-foreground">
            Purchase Details
          </h2>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto flex-1 px-6 py-4 space-y-5">
          {/* Info grid */}
          <div className="grid grid-cols-2 gap-x-6 gap-y-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Supplier
              </p>
              <p className="mt-0.5 text-sm font-medium text-foreground">
                {purchase.supplier.name}
              </p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Received By
              </p>
              <p className="mt-0.5 text-sm font-medium text-foreground">
                {purchase.receiver.full_name}
              </p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Date
              </p>
              <p className="mt-0.5 text-sm text-foreground">
                {formatDate(purchase.created_at)}
              </p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Notes
              </p>
              <p className="mt-0.5 text-sm text-foreground">
                {purchase.notes ?? <span className="text-muted-foreground">—</span>}
              </p>
            </div>
          </div>

          {/* Divider */}
          <hr className="border-border" />

          {/* Items table */}
          {items.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              No items recorded.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full border-separate border-spacing-0">
                <thead>
                  <tr>
                    {["Product", "Qty", "Unit", "Cost/Unit", "Expiry", "Subtotal"].map(
                      (heading) => (
                        <th
                          key={heading}
                          className="pb-2 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground pr-3 last:pr-0"
                        >
                          {heading}
                        </th>
                      )
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {items.map((item) => (
                    <tr key={item.id} className="hover:bg-secondary transition-colors">
                      {/* Product */}
                      <td className="py-2.5 pr-3 text-sm font-medium text-foreground whitespace-nowrap">
                        {item.product.name}
                      </td>

                      {/* Qty */}
                      <td className="py-2.5 pr-3 text-sm tabular-nums text-foreground whitespace-nowrap">
                        {item.quantity}
                      </td>

                      {/* Unit */}
                      <td className="py-2.5 pr-3 text-sm text-muted-foreground whitespace-nowrap">
                        {item.product.unit}
                      </td>

                      {/* Cost/Unit */}
                      <td className="py-2.5 pr-3 text-sm tabular-nums text-foreground whitespace-nowrap">
                        {formatCurrency(item.cost_price)}
                      </td>

                      {/* Expiry */}
                      <td className="py-2.5 pr-3 text-sm text-muted-foreground whitespace-nowrap">
                        {item.expiry_date
                          ? formatDateOnly(item.expiry_date)
                          : "—"}
                      </td>

                      {/* Subtotal */}
                      <td className="py-2.5 text-sm tabular-nums font-medium text-foreground whitespace-nowrap">
                        {formatCurrency(item.quantity * item.cost_price)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="shrink-0 border-t border-border px-6 py-4 flex items-center justify-between">
          <div className="text-foreground">
            <span className="text-sm text-muted-foreground mr-2">Total:</span>
            <span className="text-xl font-bold tabular-nums">
              {formatCurrency(total)}
            </span>
          </div>
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </div>
  );
}
