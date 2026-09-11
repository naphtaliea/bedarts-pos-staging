"use client";

import { Delete, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface NumpadProps {
  onKey: (key: string) => void;
  disabled?: boolean;
  onPay?: () => void;
  payDisabled?: boolean;
}

const KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "00", "0", "."];

export function Numpad({ onKey, disabled = false, onPay, payDisabled }: NumpadProps) {
  return (
    <div className="grid grid-cols-4 gap-2">
      {/* 3-col digit grid */}
      <div className="col-span-3 grid grid-cols-3 gap-2">
        {KEYS.map((key) => (
          <button
            key={key}
            onClick={() => onKey(key)}
            disabled={disabled}
            className={cn(
              "h-10 rounded-xl border border-border bg-card text-base font-medium text-foreground",
              "transition-colors hover:bg-secondary active:scale-95 disabled:opacity-40 shadow-sm"
            )}
          >
            {key}
          </button>
        ))}
      </div>

      {/* Right col: backspace + pay */}
      <div className="flex flex-col gap-2">
        <button
          onClick={() => onKey("backspace")}
          disabled={disabled}
          aria-label="Backspace"
          className={cn(
            onPay ? "h-10" : "flex-1",
            "flex items-center justify-center rounded-xl border border-border bg-secondary text-foreground",
            "transition-colors hover:bg-border active:scale-95 disabled:opacity-40 shadow-sm"
          )}
        >
          <Delete className="w-5 h-5" />
        </button>

        {onPay && (
          <button
            onClick={onPay}
            disabled={payDisabled}
            aria-label="Proceed to payment"
            className={cn(
              "flex-1 flex flex-col items-center justify-center gap-1 rounded-xl",
              "bg-primary text-primary-foreground font-bold text-xs",
              "transition-colors hover:bg-primary/90 active:scale-95 disabled:opacity-40 shadow-sm"
            )}
          >
            <ArrowRight className="w-5 h-5" />
            <span className="leading-none">Pay</span>
          </button>
        )}
      </div>
    </div>
  );
}
