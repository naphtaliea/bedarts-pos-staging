"use client";

import { Delete } from "lucide-react";
import { cn } from "@/lib/utils";

interface NumpadProps {
  mode: "qty" | "disc";
  onModeChange: (mode: "qty" | "disc") => void;
  onInput: (value: string) => void;
  onBackspace: () => void;
  onClear: () => void;
  currentValue: string;
}

const KEYS = ["7", "8", "9", "4", "5", "6", "1", "2", "3", "0", ".", "⌫"];

export function Numpad({
  mode,
  onModeChange,
  onInput,
  onBackspace,
  onClear,
  currentValue,
}: NumpadProps) {
  return (
    <div className="bg-slate-50 border-t border-slate-200 p-3 space-y-2">
      {/* Mode toggle + display */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => onModeChange("qty")}
          className={cn(
            "flex-1 py-1.5 rounded-lg text-xs font-semibold transition-colors",
            mode === "qty"
              ? "bg-blue-700 text-white"
              : "bg-white border border-slate-300 text-slate-600"
          )}
        >
          Qty
        </button>
        <button
          onClick={() => onModeChange("disc")}
          className={cn(
            "flex-1 py-1.5 rounded-lg text-xs font-semibold transition-colors",
            mode === "disc"
              ? "bg-orange-500 text-white"
              : "bg-white border border-slate-300 text-slate-600"
          )}
        >
          Disc
        </button>
        <div className="flex-1 text-right">
          <span className="text-xs text-slate-500">{mode === "qty" ? "Quantity" : "Discount (GH₵)"}</span>
          <p className="text-lg font-bold text-slate-900 leading-tight">
            {currentValue || "0"}
          </p>
        </div>
      </div>

      {/* Keys */}
      <div className="grid grid-cols-3 gap-1.5">
        {KEYS.map((key) => (
          <button
            key={key}
            onClick={() => {
              if (key === "⌫") onBackspace();
              else onInput(key);
            }}
            className={cn(
              "h-10 rounded-lg font-semibold text-sm transition-colors active:scale-95",
              key === "⌫"
                ? "bg-red-50 text-red-600 border border-red-200 hover:bg-red-100"
                : "bg-white border border-slate-200 text-slate-800 hover:bg-slate-100"
            )}
          >
            {key === "⌫" ? <Delete className="w-4 h-4 mx-auto" /> : key}
          </button>
        ))}
      </div>

      <button
        onClick={onClear}
        className="w-full py-1.5 rounded-lg text-xs font-semibold bg-slate-200 text-slate-600 hover:bg-slate-300 transition-colors"
      >
        Clear
      </button>
    </div>
  );
}
