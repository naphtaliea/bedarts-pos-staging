"use client";

import { Minus, Plus, Trash2, Tag } from "lucide-react";
import { useCartStore } from "@/lib/pos-store";
import { formatCurrency } from "@/lib/utils";
import { useState } from "react";

export function Cart() {
  const { items, discount, removeItem, updateQty, updateItemDiscount, setDiscount } =
    useCartStore();
  const subtotal = useCartStore((s) => s.subtotal());
  const total = useCartStore((s) => s.total());
  const [editingDiscount, setEditingDiscount] = useState<string | null>(null);
  const [orderDiscountInput, setOrderDiscountInput] = useState("");

  if (items.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center text-slate-400">
        <div className="text-center">
          <p className="text-sm">Cart is empty</p>
          <p className="text-xs mt-1">Search for products above</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col flex-1 min-h-0">
      {/* Items */}
      <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
        {items.map((item) => {
          const lineTotal = Math.max(
            0,
            item.quantity * item.unit_price - item.discount_amount
          );
          return (
            <div key={item.product.id} className="py-3 px-1">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-900 truncate">
                    {item.product.name}
                  </p>
                  <p className="text-xs text-slate-500">
                    GH₵{item.unit_price.toFixed(2)} / {item.product.unit}
                  </p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => updateQty(item.product.id, item.quantity - 1)}
                    className="w-7 h-7 rounded-md bg-slate-100 hover:bg-slate-200 flex items-center justify-center"
                  >
                    <Minus className="w-3 h-3" />
                  </button>
                  <input
                    type="number"
                    min={1}
                    value={item.quantity}
                    onChange={(e) =>
                      updateQty(item.product.id, parseFloat(e.target.value) || 1)
                    }
                    className="w-12 h-7 text-center text-sm border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-red-700"
                  />
                  <button
                    onClick={() => updateQty(item.product.id, item.quantity + 1)}
                    className="w-7 h-7 rounded-md bg-slate-100 hover:bg-slate-200 flex items-center justify-center"
                  >
                    <Plus className="w-3 h-3" />
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between mt-2">
                {/* Per-item discount */}
                {editingDiscount === item.product.id ? (
                  <div className="flex items-center gap-1">
                    <Tag className="w-3 h-3 text-slate-400" />
                    <input
                      type="number"
                      min={0}
                      placeholder="0.00"
                      autoFocus
                      className="w-20 h-6 text-xs border border-slate-300 rounded px-1 focus:outline-none focus:ring-1 focus:ring-red-700"
                      onBlur={(e) => {
                        updateItemDiscount(
                          item.product.id,
                          parseFloat(e.target.value) || 0
                        );
                        setEditingDiscount(null);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") (e.target as HTMLInputElement).blur();
                      }}
                      defaultValue={item.discount_amount || ""}
                    />
                  </div>
                ) : (
                  <button
                    onClick={() => setEditingDiscount(item.product.id)}
                    className="text-xs text-slate-400 hover:text-red-700 flex items-center gap-1"
                  >
                    <Tag className="w-3 h-3" />
                    {item.discount_amount > 0
                      ? `-${formatCurrency(item.discount_amount)}`
                      : "Add discount"}
                  </button>
                )}

                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-slate-900">
                    {formatCurrency(lineTotal)}
                  </span>
                  <button
                    onClick={() => removeItem(item.product.id)}
                    className="text-slate-300 hover:text-red-500 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Totals */}
      <div className="border-t border-slate-200 pt-3 mt-1 space-y-1.5">
        <div className="flex justify-between text-sm text-slate-600">
          <span>Subtotal</span>
          <span>{formatCurrency(subtotal)}</span>
        </div>

        {/* Order-level discount */}
        <div className="flex justify-between items-center text-sm text-slate-600">
          <span>Order discount</span>
          <div className="flex items-center gap-1">
            <span className="text-xs text-slate-400">GH₵</span>
            <input
              type="number"
              min={0}
              value={orderDiscountInput}
              onChange={(e) => {
                setOrderDiscountInput(e.target.value);
                setDiscount(parseFloat(e.target.value) || 0);
              }}
              placeholder="0.00"
              className="w-20 text-right text-sm border border-slate-200 rounded px-1 h-6 focus:outline-none focus:ring-1 focus:ring-red-700"
            />
          </div>
        </div>

        {discount > 0 && (
          <div className="flex justify-between text-sm text-red-600">
            <span>Discount applied</span>
            <span>-{formatCurrency(discount)}</span>
          </div>
        )}

        <div className="flex justify-between text-base font-bold text-slate-900 pt-1 border-t border-slate-200">
          <span>Total</span>
          <span>{formatCurrency(total)}</span>
        </div>
      </div>
    </div>
  );
}
