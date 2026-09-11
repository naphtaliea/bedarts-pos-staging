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
      {/* Number keys — 3 columns */}
      <div className="col-span-3 grid grid-cols-3 gap-2">
        {KEYS.map((key) => (
          <button
            key={key}
            onClick={() => onKey(key)}
            disabled={disabled}
            className={cn(
              "h-10 rounded-lg border border-border bg-card text-sm font-medium text-foreground transition-colors hover:bg-secondary disabled:opacity-40 active:scale-95"
            )}
          >
            {key}
          </button>
        ))}
      </div>

      {/* Backspace — 4th column, full height */}
      <button
        onClick={() => onKey("backspace")}
        disabled={disabled}
        className="flex items-center justify-center rounded-lg border border-border bg-secondary text-foreground transition-colors hover:bg-border disabled:opacity-40 active:scale-95"
      >
        <Delete className="w-5 h-5" />
      </button>
    </div>
  );
}
