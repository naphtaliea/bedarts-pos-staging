"use client";

import { CalendarClock } from "lucide-react";
import { StockBatch } from "@/lib/types";
import { formatCurrency, daysUntilExpiry } from "@/lib/utils";

interface StockBatchRow extends Omit<StockBatch, "product"> {
  product: { name: string; unit: string };
}

interface StockTableProps {
  batches: StockBatchRow[];
  productFilter: string;
}

function formatShortDate(date: string): string {
  return new Date(date).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

type BatchStatus = "depleted" | "expired" | "expiring" | "active";

function getBatchStatus(batch: StockBatchRow): BatchStatus {
  if (batch.quantity_remaining === 0) return "depleted";
  if (batch.expiry_date !== null) {
    const days = daysUntilExpiry(batch.expiry_date);
    if (days < 0) return "expired";
    if (days <= 7) return "expiring";
  }
  return "active";
}

function StatusBadge({ status }: { status: BatchStatus }) {
  switch (status) {
    case "depleted":
      return (
        <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-500">
          Depleted
        </span>
      );
    case "expired":
      return (
        <span className="inline-flex items-center rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-medium text-red-600">
          Expired
        </span>
      );
    case "expiring":
      return (
        <span className="inline-flex items-center rounded-full bg-orange-100 px-2.5 py-0.5 text-xs font-medium text-orange-600">
          Expiring
        </span>
      );
    case "active":
      return (
        <span className="inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-700">
          Active
        </span>
      );
  }
}

function ExpiryCell({ expiry_date }: { expiry_date: string | null }) {
  if (expiry_date === null) {
    return <span className="text-slate-400">—</span>;
  }

  const days = daysUntilExpiry(expiry_date);

  if (days < 0) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-600">
        <CalendarClock className="h-3 w-3 shrink-0" />
        EXPIRED
      </span>
    );
  }

  if (days <= 3) {
    return (
      <span className="inline-flex items-center gap-1 text-sm font-medium text-red-600">
        <CalendarClock className="h-3.5 w-3.5 shrink-0" />
        {days}d
      </span>
    );
  }

  if (days <= 7) {
    return (
      <span className="inline-flex items-center gap-1 text-sm font-medium text-orange-500">
        <CalendarClock className="h-3.5 w-3.5 shrink-0" />
        {days}d
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1 text-sm text-slate-600">
      <CalendarClock className="h-3.5 w-3.5 shrink-0 text-slate-400" />
      {formatShortDate(expiry_date)}
    </span>
  );
}

function sortBatches(batches: StockBatchRow[]): StockBatchRow[] {
  return [...batches].sort((a, b) => {
    const statusA = getBatchStatus(a);
    const statusB = getBatchStatus(b);

    const isInactiveA = statusA === "depleted" || statusA === "expired";
    const isInactiveB = statusB === "depleted" || statusB === "expired";

    if (isInactiveA !== isInactiveB) {
      return isInactiveA ? 1 : -1;
    }

    // Both same group: sort by expiry_date ASC (nulls last), then received_date ASC
    if (a.expiry_date === null && b.expiry_date === null) {
      return a.received_date.localeCompare(b.received_date);
    }
    if (a.expiry_date === null) return 1;
    if (b.expiry_date === null) return -1;

    const expiryDiff = a.expiry_date.localeCompare(b.expiry_date);
    if (expiryDiff !== 0) return expiryDiff;

    return a.received_date.localeCompare(b.received_date);
  });
}

const COLUMNS = [
  "Product",
  "Received",
  "Received Qty",
  "Remaining",
  "Cost/Unit",
  "Expiry",
  "Status",
];

export function StockTable({ batches, productFilter }: StockTableProps) {
  const filtered =
    productFilter === ""
      ? batches
      : batches.filter((b) => b.product_id === productFilter);

  const sorted = sortBatches(filtered);

  if (sorted.length === 0) {
    return (
      <div className="flex items-center justify-center py-20 text-sm text-slate-400">
        No stock batches yet
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full border-separate border-spacing-0">
        <thead>
          <tr>
            {COLUMNS.map((heading) => (
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
          {sorted.map((batch) => {
            const status = getBatchStatus(batch);
            return (
              <tr
                key={batch.id}
                className="transition-colors hover:bg-slate-50"
              >
                {/* Product */}
                <td className="whitespace-nowrap px-4 py-3 pl-5">
                  <span className="text-sm font-medium text-slate-900">
                    {batch.product.name}
                  </span>
                </td>

                {/* Received date */}
                <td className="whitespace-nowrap px-4 py-3 text-sm text-slate-500">
                  {formatShortDate(batch.received_date)}
                </td>

                {/* Received qty */}
                <td className="whitespace-nowrap px-4 py-3 text-sm tabular-nums text-slate-700">
                  {batch.quantity_received} {batch.product.unit}
                </td>

                {/* Remaining qty */}
                <td className="whitespace-nowrap px-4 py-3 text-sm font-semibold tabular-nums text-slate-900">
                  {batch.quantity_remaining} {batch.product.unit}
                </td>

                {/* Cost/Unit */}
                <td className="whitespace-nowrap px-4 py-3 text-sm tabular-nums text-slate-700">
                  {formatCurrency(batch.cost_price)}
                </td>

                {/* Expiry */}
                <td className="whitespace-nowrap px-4 py-3">
                  <ExpiryCell expiry_date={batch.expiry_date} />
                </td>

                {/* Status badge */}
                <td className="whitespace-nowrap px-4 py-3 pr-5">
                  <StatusBadge status={status} />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
