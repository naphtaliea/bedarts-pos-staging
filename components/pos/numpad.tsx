"use client";

import { Delete } from "lucide-react";
import { cn } from "@/lib/utils";

interface NumpadProps {
  onKey: (key: string) => void;
  disabled?: boolean;
}

const KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "00", "0", "."];

export function Numpad({ onKey, disabled = false }: NumpadProps) {
  return (
    <div className="grid grid-cols-4 gap-2">
      <div className="col-span-3 grid grid-cols-3 gap-2">
        {KEYS.map((key) => (
          <button
            key={key}
            onClick={() => onKey(key)}
            disabled={disabled}
            className={cn(
              "h-14 rounded-xl border border-border bg-card text-lg font-medium text-foreground",
              "transition-colors hover:bg-secondary active:scale-95 disabled:opacity-40 shadow-sm"
            )}
          >
            {key}
          </button>
        ))}
      </div>
      <button
        onClick={() => onKey("backspace")}
        disabled={disabled}
        aria-label="Backspace"
        className={cn(
          "flex items-center justify-center rounded-xl border border-border bg-secondary text-foreground",
          "transition-colors hover:bg-border active:scale-95 disabled:opacity-40 shadow-sm"
        )}
      >
        <Delete className="w-6 h-6" />
      </button>
    </div>
  );
}
