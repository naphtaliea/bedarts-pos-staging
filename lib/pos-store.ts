"use client";

import { create } from "zustand";
import type { CartItem, Product, PaymentEntry } from "@/lib/types";

interface CartStore {
  items: CartItem[];
  discount: number;
  customerId: string | null;

  addItem: (product: Product) => void;
  removeItem: (productId: string) => void;
  updateQty: (productId: string, qty: number) => void;
  updateItemDiscount: (productId: string, discount: number) => void;
  setDiscount: (discount: number) => void;
  setCustomer: (id: string | null) => void;
  clearCart: () => void;

  subtotal: () => number;
  total: () => number;
}

export const useCartStore = create<CartStore>((set, get) => ({
  items: [],
  discount: 0,
  customerId: null,

  addItem: (product) => {
    const existing = get().items.find((i) => i.product.id === product.id);
    if (existing) {
      set((s) => ({
        items: s.items.map((i) =>
          i.product.id === product.id
            ? { ...i, quantity: i.quantity + 1 }
            : i
        ),
      }));
    } else {
      set((s) => ({
        items: [
          ...s.items,
          {
            product,
            quantity: 1,
            unit_price: product.selling_price,
            discount_amount: 0,
          },
        ],
      }));
    }
  },

  removeItem: (productId) =>
    set((s) => ({ items: s.items.filter((i) => i.product.id !== productId) })),

  updateQty: (productId, qty) => {
    if (qty <= 0) {
      get().removeItem(productId);
      return;
    }
    set((s) => ({
      items: s.items.map((i) =>
        i.product.id === productId ? { ...i, quantity: qty } : i
      ),
    }));
  },

  updateItemDiscount: (productId, discount) =>
    set((s) => ({
      items: s.items.map((i) =>
        i.product.id === productId
          ? { ...i, discount_amount: Math.max(0, discount) }
          : i
      ),
    })),

  setDiscount: (discount) => set({ discount: Math.max(0, discount) }),
  setCustomer: (id) => set({ customerId: id }),
  clearCart: () => set({ items: [], discount: 0, customerId: null }),

  subtotal: () =>
    get().items.reduce((sum, i) => {
      const lineTotal = i.quantity * i.unit_price - i.discount_amount;
      return sum + Math.max(0, lineTotal);
    }, 0),

  total: () => Math.max(0, get().subtotal() - get().discount),
}));
