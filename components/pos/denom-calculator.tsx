"use client";

import { useState } from "react";
import { Calculator, X } from "lucide-react";
import { cn } from "@/lib/utils";

const DENOMS = [200, 100, 50, 20, 10, 5, 1] as const;

export function DenomCalculator() {
  const [open, setOpen] = useState(false);
  const [counts, setCounts] = useState<Record<number, string>>({});

  function setCount(denom: number, value: string) {
    setCounts((prev) => ({ ...prev, [denom]: value }));
  }

  function clear() {
    setCounts({});
  }

  const rows = DENOMS.map((d) => {
    const count = parseInt(counts[d] ?? "0", 10) || 0;
    return { denom: d, count, subtotal: d * count };
  });

  const total = rows.reduce((sum, r) => sum + r.subtotal, 0);

  return (
    <>
      {/* Topbar button */}
      <button
        onClick={() => setOpen(true)}
        aria-label="Till counter"
        className="flex items-center justify-center w-11 border-r border-border text-slate-500 hover:bg-slate-50 hover:text-slate-900 transition-colors"
      >
        <Calculator className="w-4 h-4" />
      </button>

      {/* Backdrop */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/30"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Slide-over panel */}
      <div
        className={cn(
          "fixed top-0 right-0 z-50 h-full w-80 bg-white border-l border-border shadow-2xl flex flex-col transition-transform duration-200",
          open ? "translate-x-0" : "translate-x-full"
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border shrink-0">
          <h2 className="text-sm font-semibold text-foreground">Till Counter</h2>
          <div className="flex items-center gap-2">
            <button
              onClick={clear}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors px-2 py-1 rounded hover:bg-secondary"
            >
              Clear
            </button>
            <button
              onClick={() => setOpen(false)}
              aria-label="Close"
              className="p-1.5 rounded-md text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Rows */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-2">
          {rows.map(({ denom, count, subtotal }) => (
            <div key={denom} className="flex items-center gap-3">
              {/* Denomination */}
              <div className="w-16 shrink-0">
                <span className="text-sm font-semibold text-foreground">GH₵ {denom}</span>
              </div>

              {/* Count input */}
              <input
                type="number"
                inputMode="numeric"
                min={0}
                value={counts[denom] ?? ""}
                onChange={(e) => setCount(denom, e.target.value)}
                placeholder="0"
                className="w-20 h-9 rounded-lg border border-border bg-secondary/40 px-3 text-sm text-right tabular-nums focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              />

              {/* = sign */}
              <span className="text-muted-foreground text-sm shrink-0">=</span>

              {/* Subtotal */}
              <span className="flex-1 text-right text-sm tabular-nums font-medium text-foreground">
                {count > 0
                  ? `GH₵ ${subtotal.toLocaleString("en-GH", { minimumFractionDigits: 2 })}`
                  : <span className="text-muted-foreground">—</span>
                }
              </span>
            </div>
          ))}
        </div>

        {/* Total footer */}
        <div className="shrink-0 border-t border-border px-5 py-4 bg-secondary/30">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-foreground">Total</span>
            <span className="text-lg font-bold text-primary tabular-nums">
              GH₵ {total.toLocaleString("en-GH", { minimumFractionDigits: 2 })}
            </span>
          </div>
        </div>
      </div>
    </>
  );
}
