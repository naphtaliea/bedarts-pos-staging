"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { CartItem, Product } from "@/lib/types";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface OrderTab {
  id: string;
  name: string;
}

// Persisted snapshot of a tab's cart (saved when you leave the tab)
type TabSnapshot = { items: CartItem[]; discount: number };

interface PosStore {
  // Active cart (flat — mirrors the active tab at all times)
  items: CartItem[];
  discount: number;

  // Tab list + which one is active
  tabs: OrderTab[];
  activeTabId: string;
  snapshots: Record<string, TabSnapshot>;

  // Tab management
  addTab: () => void;
  removeTab: (id: string) => void;
  setActiveTab: (id: string) => void;

  // Cart operations (same API as before — operate on active tab)
  addItem: (product: Product) => void;
  removeItem: (productId: string) => void;
  updateQty: (productId: string, qty: number) => void;
  updateItemDiscount: (productId: string, discount: number) => void;
  updateItemPrice: (productId: string, price: number) => void;
  setDiscount: (discount: number) => void;
  setCustomer: (id: string | null) => void;
  clearCart: () => void;

  // Computed (same API as before)
  subtotal: () => number;
  total: () => number;
}

function makeTab(name: string): OrderTab {
  return { id: crypto.randomUUID(), name };
}

const FIRST_TAB = makeTab("Order 1");

export const useCartStore = create<PosStore>()(
  persist(
    (set, get) => ({
      items: [],
      discount: 0,
      tabs: [FIRST_TAB],
      activeTabId: FIRST_TAB.id,
      snapshots: {},

      // ── Tab management ───────────────────────────────────────

      addTab: () => {
        const s = get();
        const tab = makeTab(`Order ${s.tabs.length + 1}`);
        // Save current cart to snapshot of the active tab
        set({
          snapshots: { ...s.snapshots, [s.activeTabId]: { items: s.items, discount: s.discount } },
          tabs: [...s.tabs, tab],
          activeTabId: tab.id,
          items: [],
          discount: 0,
        });
      },

      removeTab: (id) => {
        const s = get();
        if (s.tabs.length === 1) return;
        const remaining = s.tabs.filter((t) => t.id !== id);
        const newSnapshots = { ...s.snapshots };
        delete newSnapshots[id];

        let newActiveId = s.activeTabId;
        let newItems = s.items;
        let newDiscount = s.discount;

        if (s.activeTabId === id) {
          // Switch to last remaining tab
          const nextTab = remaining[remaining.length - 1];
          newActiveId = nextTab.id;
          const snap = newSnapshots[nextTab.id];
          newItems = snap?.items ?? [];
          newDiscount = snap?.discount ?? 0;
          delete newSnapshots[nextTab.id];
        }

        set({ tabs: remaining, activeTabId: newActiveId, snapshots: newSnapshots, items: newItems, discount: newDiscount });
      },

      setActiveTab: (id) => {
        const s = get();
        if (s.activeTabId === id) return;
        // Save current tab to snapshot
        const newSnapshots = {
          ...s.snapshots,
          [s.activeTabId]: { items: s.items, discount: s.discount },
        };
        // Load the target tab's snapshot (or empty)
        const snap = s.snapshots[id];
        delete newSnapshots[id];
        set({
          snapshots: newSnapshots,
          activeTabId: id,
          items: snap?.items ?? [],
          discount: snap?.discount ?? 0,
        });
      },

      // ── Cart operations ──────────────────────────────────────

      addItem: (product) => {
        const items = get().items;
        const existing = items.find((i) => i.product.id === product.id);
        if (existing) {
          set({ items: items.map((i) => i.product.id === product.id ? { ...i, quantity: i.quantity + 1 } : i) });
        } else {
          set({ items: [...items, { product, quantity: 1, unit_price: product.selling_price, discount_amount: 0 }] });
        }
      },

      removeItem: (productId) =>
        set((s) => ({ items: s.items.filter((i) => i.product.id !== productId) })),

      updateQty: (productId, qty) => {
        if (qty <= 0) { get().removeItem(productId); return; }
        set((s) => ({ items: s.items.map((i) => i.product.id === productId ? { ...i, quantity: qty } : i) }));
      },

      updateItemDiscount: (productId, discount) =>
        set((s) => ({ items: s.items.map((i) => i.product.id === productId ? { ...i, discount_amount: Math.max(0, discount) } : i) })),

      updateItemPrice: (productId, price) =>
        set((s) => ({ items: s.items.map((i) => i.product.id === productId ? { ...i, unit_price: Math.max(0, price) } : i) })),

      setDiscount: (discount) => set({ discount: Math.max(0, discount) }),
      setCustomer: () => {},
      clearCart: () => set({ items: [], discount: 0 }),

      // ── Computed ─────────────────────────────────────────────

      subtotal: () =>
        get().items.reduce((sum, i) => sum + Math.max(0, i.quantity * i.unit_price - i.discount_amount), 0),

      total: () => Math.max(0, get().subtotal() - get().discount),
    }),
    { name: "bedarts-pos-v2" }
  )
);
