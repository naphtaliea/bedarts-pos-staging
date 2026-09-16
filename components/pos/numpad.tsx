"use client";

import { Delete } from "lucide-react";
import { cn } from "@/lib/utils";

interface NumpadProps {
  onKey: (key: string) => void;
  disabled?: boolean;
  onPay?: () => void;
  payDisabled?: boolean;
}

const DIGIT_ROWS = [
  ["1", "2", "3"],
  ["4", "5", "6"],
  ["7", "8", "9"],
  [".", "0", "00"],
] as const;

export function Numpad({ onKey, disabled = false, onPay, payDisabled }: NumpadProps) {
  return (
    <div className="flex flex-col gap-1.5">
      {DIGIT_ROWS.map((row, ri) => (
        <div key={ri} className="grid grid-cols-3 gap-1.5">
          {row.map((key) => (
            <button
              key={key}
              onClick={() => onKey(key)}
              disabled={disabled}
              className={cn(
                "h-11 rounded-xl bg-white border border-border shadow-sm select-none",
                "font-display text-xl font-bold text-foreground",
                "transition-all hover:bg-secondary active:scale-95 motion-reduce:active:scale-100",
                "disabled:opacity-30"
              )}
            >
              {key}
            </button>
          ))}
        </div>
      ))}

      <button
        onClick={() => onKey("backspace")}
        disabled={disabled}
        aria-label="Backspace"
        className={cn(
          "w-full h-9 rounded-xl bg-secondary border border-border select-none",
          "flex items-center justify-center gap-1.5 text-sm text-muted-foreground font-medium",
          "transition-all hover:bg-border hover:text-foreground active:scale-95 motion-reduce:active:scale-100",
          "disabled:opacity-30"
        )}
      >
        <Delete className="w-3.5 h-3.5" aria-hidden="true" />
        <span>Clear</span>
      </button>

      {onPay && (
        <button
          onClick={onPay}
          disabled={payDisabled}
          className={cn(
            "w-full h-12 rounded-xl bg-primary text-primary-foreground select-none",
            "font-display font-black text-base uppercase tracking-wide",
            "flex items-center justify-center",
            "transition-all hover:bg-primary/90 active:scale-95 motion-reduce:active:scale-100 disabled:opacity-40 shadow-sm"
          )}
        >
          Pay
        </button>
      )}
    </div>
  );
}
