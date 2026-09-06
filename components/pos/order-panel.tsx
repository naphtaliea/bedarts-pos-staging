"use client";

import { useState, useEffect } from "react";
import { Trash2, ChevronDown, UserPlus } from "lucide-react";
import { useCartStore } from "@/lib/pos-store";
import { formatCurrency, cn } from "@/lib/utils";
import { Numpad } from "./numpad";
import type { Customer } from "@/lib/types";

interface OrderPanelProps {
  customers: Customer[];
  selectedCustomerId: string | null;
  onCustomerChange: (id: string | null) => void;
  onCharge: () => void;
  selectedLineId: string | null;
  onLineSelect: (productId: string | null) => void;
}

export function OrderPanel({
  customers,
  selectedCustomerId,
  onCustomerChange,
  onCharge,
  selectedLineId,
  onLineSelect,
}: OrderPanelProps) {
  const { items, removeItem, updateQty, updateItemDiscount, clearCart } = useCartStore();
  const subtotal = useCartStore((s) => s.subtotal());
  const discount = useCartStore((s) => s.discount);
  const total = useCartStore((s) => s.total());
  const setDiscount = useCartStore((s) => s.setDiscount);

  const [numpadMode, setNumpadMode] = useState<"qty" | "disc">("qty");
  const [numpadInput, setNumpadInput] = useState("");

  // Reset numpad when the selected line changes (e.g. from a product tile click)
  useEffect(() => {
    setNumpadInput("");
  }, [selectedLineId]);

  const selectedLine = items.find((i) => i.product.id === selectedLineId);
  const selectedCustomer = customers.find((c) => c.id === selectedCustomerId);

  const handleNumpadInput = (key: string) => {
    const next = numpadInput === "0" ? key : numpadInput + key;
    setNumpadInput(next);
    applyNumpad(next);
  };

  const handleBackspace = () => {
    const next = numpadInput.slice(0, -1);
    setNumpadInput(next);
    applyNumpad(next);
  };

  const handleClear = () => {
    setNumpadInput("");
    applyNumpad("");
  };

  const applyNumpad = (val: string) => {
    const n = parseFloat(val) || 0;
    if (!selectedLineId) {
      if (numpadMode === "disc") setDiscount(n);
      return;
    }
    if (numpadMode === "qty") updateQty(selectedLineId, n || 1);
    else updateItemDiscount(selectedLineId, n);
  };

  const handleLineClick = (productId: string) => {
    const line = items.find((i) => i.product.id === productId)!;
    onLineSelect(productId);
    setNumpadInput("");
    if (numpadMode === "qty") setNumpadInput(String(line.quantity));
    else setNumpadInput(String(line.discount_amount || ""));
  };

  const currentNumpadValue = numpadInput !== ""
    ? numpadInput
    : selectedLine
      ? numpadMode === "qty" ? String(selectedLine.quantity) : String(selectedLine.discount_amount || "")
      : "";

  return (
    <div className="flex flex-col h-full bg-white border-l border-slate-200">
      {/* Customer selector */}
      <div className="px-3 py-2 border-b border-slate-100">
        <div className="relative">
          <select
            value={selectedCustomerId ?? ""}
            onChange={(e) => onCustomerChange(e.target.value || null)}
            className="w-full h-9 pl-3 pr-8 text-sm border border-slate-200 rounded-lg bg-white appearance-none focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Walk-in Customer</option>
            {customers.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
          <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
        </div>
      </div>

      {/* Order lines */}
      <div className="flex-1 overflow-y-auto">
        {items.length === 0 ? (
          <div className="flex items-center justify-center h-full text-slate-300 text-sm">
            No items yet
          </div>
        ) : (
          <div className="divide-y divide-slate-50">
            {/* Header */}
            <div className="grid grid-cols-[1fr_auto_auto_auto] gap-2 px-3 py-1.5 bg-slate-50 text-xs font-semibold text-slate-400 uppercase tracking-wide">
              <span>Product</span>
              <span className="text-right">Qty</span>
              <span className="text-right">Price</span>
              <span className="text-right">Total</span>
            </div>

            {items.map((item) => {
              const lineTotal = Math.max(0, item.quantity * item.unit_price - item.discount_amount);
              const isSelected = item.product.id === selectedLineId;

              return (
                <div
                  key={item.product.id}
                  onClick={() => handleLineClick(item.product.id)}
                  className={cn(
                    "grid grid-cols-[1fr_auto_auto_auto] gap-2 px-3 py-2.5 cursor-pointer transition-colors",
                    isSelected ? "bg-blue-50 border-l-2 border-blue-600" : "hover:bg-slate-50"
                  )}
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-slate-900 truncate">{item.product.name}</p>
                    {item.discount_amount > 0 && (
                      <p className="text-xs text-orange-500">-{formatCurrency(item.discount_amount)}</p>
                    )}
                  </div>
                  <span className="text-sm text-slate-700 text-right self-center">{item.quantity}</span>
                  <span className="text-sm text-slate-700 text-right self-center">
                    {formatCurrency(item.unit_price)}
                  </span>
                  <div className="flex items-center gap-1 self-center">
                    <span className="text-sm font-semibold text-slate-900 text-right">
                      {formatCurrency(lineTotal)}
                    </span>
                    <button
                      onClick={(e) => { e.stopPropagation(); removeItem(item.product.id); onLineSelect(null); }}
                      className="text-slate-200 hover:text-red-500 transition-colors ml-1"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Numpad */}
      {items.length > 0 && (
        <Numpad
          mode={numpadMode}
          onModeChange={(m) => { setNumpadMode(m); setNumpadInput(""); }}
          onInput={handleNumpadInput}
          onBackspace={handleBackspace}
          onClear={handleClear}
          currentValue={currentNumpadValue}
        />
      )}

      {/* Totals + charge */}
      <div className="border-t border-slate-200 px-3 py-3 space-y-1.5">
        <div className="flex justify-between text-sm text-slate-500">
          <span>Subtotal</span>
          <span>{formatCurrency(subtotal)}</span>
        </div>
        {discount > 0 && (
          <div className="flex justify-between text-sm text-orange-500">
            <span>Discount</span>
            <span>-{formatCurrency(discount)}</span>
          </div>
        )}
        <div className="flex justify-between text-base font-bold text-slate-900">
          <span>Total</span>
          <span>{formatCurrency(total)}</span>
        </div>

        <div className="flex gap-2 pt-1">
          {items.length > 0 && (
            <button
              onClick={() => { clearCart(); onLineSelect(null); }}
              className="px-3 py-3 rounded-xl border border-slate-200 text-slate-400 hover:text-red-500 hover:border-red-200 transition-colors"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
          <button
            onClick={onCharge}
            disabled={items.length === 0}
            className={cn(
              "flex-1 py-3 rounded-xl font-bold text-base transition-all",
              items.length === 0
                ? "bg-slate-100 text-slate-400 cursor-not-allowed"
                : "bg-blue-700 text-white hover:bg-blue-800 active:scale-95 shadow-sm"
            )}
          >
            {items.length === 0 ? "Add items" : `Charge ${formatCurrency(total)}`}
          </button>
        </div>
      </div>
    </div>
  );
}
