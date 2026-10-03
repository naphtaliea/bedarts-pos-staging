"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { CartItem } from "./types";

interface CartStore {
  items: CartItem[];
  isOpen: boolean;
  open: () => void;
  close: () => void;
  add: (item: Omit<CartItem, "quantity" | "total_price">) => void;
  remove: (productId: string) => void;
  setQty: (productId: string, qty: number) => void;
  clear: () => void;
  total: () => number;
  count: () => number;
}

export const useCart = create<CartStore>()(
  persist(
    (set, get) => ({
      items: [],
      isOpen: false,
      open:  () => set({ isOpen: true }),
      close: () => set({ isOpen: false }),

      add: (incoming) =>
        set((state) => {
          const existing = state.items.find((i) => i.product_id === incoming.product_id);
          if (existing) {
            const qty = existing.quantity + 1;
            return {
              items: state.items.map((i) =>
                i.product_id === incoming.product_id
                  ? { ...i, quantity: qty, total_price: qty * i.unit_price }
                  : i
              ),
            };
          }
          return {
            items: [
              ...state.items,
              { ...incoming, quantity: 1, total_price: incoming.unit_price },
            ],
          };
        }),

      remove: (productId) =>
        set((state) => ({ items: state.items.filter((i) => i.product_id !== productId) })),

      setQty: (productId, qty) =>
        set((state) => {
          if (qty <= 0) return { items: state.items.filter((i) => i.product_id !== productId) };
          return {
            items: state.items.map((i) =>
              i.product_id === productId
                ? { ...i, quantity: qty, total_price: qty * i.unit_price }
                : i
            ),
          };
        }),

      clear: () => set({ items: [] }),
      total: () => get().items.reduce((s, i) => s + i.total_price, 0),
      count: () => get().items.reduce((s, i) => s + i.quantity, 0),
    }),
    { name: "bedarts-cart" }
  )
);
