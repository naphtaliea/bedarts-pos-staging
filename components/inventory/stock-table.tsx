"use client";

import { Fragment } from "react";
import { CalendarClock } from "lucide-react";
import { StockBatch } from "@/lib/types";
import { formatCurrency, daysUntilExpiry } from "@/lib/utils";

interface StockBatchRow extends Omit<StockBatch, "product"> {
  product: { name: string; unit: string };
}

interface StockTableProps {
  batches: StockBatchRow[];
  productSearch: string;
  hideDepleted: boolean;
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

function formatDateHeader(dateStr: string): string {
  const today = new Date();
  const todayStr = today.toISOString().split("T")[0];
  const yesterdayStr = new Date(today.getTime() - 86400000).toISOString().split("T")[0];
  if (dateStr === todayStr) return "Today";
  if (dateStr === yesterdayStr) return "Yesterday";
  return new Date(dateStr).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

function formatShortDate(date: string): string {
  return new Date(date).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

function StatusBadge({ status }: { status: BatchStatus }) {
  switch (status) {
    case "depleted":
      return <span className="inline-flex items-center rounded-full bg-secondary px-2.5 py-0.5 text-xs font-medium text-muted-foreground">Depleted</span>;
    case "expired":
      return <span className="inline-flex items-center rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-medium text-destructive">Expired</span>;
    case "expiring":
      return <span className="inline-flex items-center rounded-full bg-orange-100 px-2.5 py-0.5 text-xs font-medium text-orange-600">Expiring</span>;
    case "active":
      return <span className="inline-flex items-center rounded-full bg-success/12 px-2.5 py-0.5 text-xs font-medium text-success">Active</span>;
  }
}

function ExpiryCell({ expiry_date }: { expiry_date: string | null }) {
  if (expiry_date === null) return <span className="text-muted-foreground">—</span>;
  const days = daysUntilExpiry(expiry_date);
  if (days < 0) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-xs font-semibold text-destructive">
        <CalendarClock className="h-3 w-3 shrink-0" />EXPIRED
      </span>
    );
  }
  if (days <= 3) {
    return (
      <span className="inline-flex items-center gap-1 text-sm font-medium text-destructive">
        <CalendarClock className="h-3.5 w-3.5 shrink-0" />{days}d
      </span>
    );
  }
  if (days <= 7) {
    return (
      <span className="inline-flex items-center gap-1 text-sm font-medium text-orange-500">
        <CalendarClock className="h-3.5 w-3.5 shrink-0" />{days}d
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-sm text-muted-foreground">
      <CalendarClock className="h-3.5 w-3.5 shrink-0" />{formatShortDate(expiry_date)}
    </span>
  );
}

const COLUMNS = ["Product", "Received", "Remaining", "Unit cost", "Expiry", "Status"];

export function StockTable({ batches, productSearch, hideDepleted }: StockTableProps) {
  let filtered = productSearch.trim() === ""
    ? batches
    : batches.filter((b) => b.product.name.toLowerCase().includes(productSearch.toLowerCase()));

  if (hideDepleted) filtered = filtered.filter((b) => b.quantity_remaining > 0);

  const sorted = [...filtered].sort((a, b) => b.received_date.localeCompare(a.received_date));

  if (sorted.length === 0) {
    return (
      <div className="flex items-center justify-center py-20 text-sm text-muted-foreground">
        {productSearch || hideDepleted ? "No matching batches" : "No stock batches yet"}
      </div>
    );
  }

  const groups: { date: string; batches: StockBatchRow[] }[] = [];
  for (const batch of sorted) {
    const date = batch.received_date.split("T")[0];
    const last = groups[groups.length - 1];
    if (last && last.date === date) {
      last.batches.push(batch);
    } else {
      groups.push({ date, batches: [batch] });
    }
  }

  return (
    <>
      {/* ── Mobile cards ────────────────────────────────────── */}
      <div className="lg:hidden divide-y divide-border">
        {groups.map(({ date, batches: groupBatches }) => (
          <Fragment key={`mob-${date}`}>
            <div className="px-4 py-2 bg-secondary/60 text-xs font-semibold text-muted-foreground">
              {formatDateHeader(date)}
            </div>
            {groupBatches.map((batch) => (
              <div key={batch.id} className="px-4 py-3 space-y-1.5">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-semibold text-foreground leading-tight">{batch.product.name}</p>
                  <StatusBadge status={getBatchStatus(batch)} />
                </div>
                <p className="text-base font-black tabular-nums text-foreground">
                  {batch.quantity_remaining}{" "}
                  <span className="text-sm font-normal text-muted-foreground">{batch.product.unit} left</span>
                </p>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                  <span>Received: {batch.quantity_received} {batch.product.unit}</span>
                  <span>·</span>
                  <span>{formatCurrency(batch.cost_price)}/unit</span>
                  {batch.expiry_date && (
                    <>
                      <span>·</span>
                      <ExpiryCell expiry_date={batch.expiry_date} />
                    </>
                  )}
                </div>
              </div>
            ))}
          </Fragment>
        ))}
      </div>

      {/* ── Desktop table ────────────────────────────────────── */}
      <div className="hidden lg:block overflow-x-auto">
        <table className="min-w-full border-separate border-spacing-0">
          <thead>
            <tr>
              {COLUMNS.map((heading) => (
                <th
                  key={heading}
                  className="sticky top-0 bg-card px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground first:pl-5 last:pr-5"
                >
                  {heading}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {groups.map(({ date, batches: groupBatches }) => (
              <Fragment key={date}>
                <tr>
                  <td
                    colSpan={COLUMNS.length}
                    className="bg-secondary/60 px-5 py-2 text-xs font-semibold text-muted-foreground border-y border-border"
                  >
                    {formatDateHeader(date)}
                  </td>
                </tr>
                {groupBatches.map((batch) => (
                  <tr key={batch.id} className="transition-colors hover:bg-secondary">
                    <td className="whitespace-nowrap px-4 py-3 pl-5 text-sm font-medium text-foreground">
                      {batch.product.name}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm tabular-nums text-foreground">
                      {batch.quantity_received} {batch.product.unit}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm font-semibold tabular-nums text-foreground">
                      {batch.quantity_remaining} {batch.product.unit}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm tabular-nums text-foreground">
                      {formatCurrency(batch.cost_price)}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3">
                      <ExpiryCell expiry_date={batch.expiry_date} />
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 pr-5">
                      <StatusBadge status={getBatchStatus(batch)} />
                    </td>
                  </tr>
                ))}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
