"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { CartItem, Customer, Product } from "@/lib/types";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface OrderTab {
  id: string;
  name: string;
}

// Persisted snapshot of a tab's cart (saved when you leave the tab)
type TabSnapshot = { items: CartItem[]; discount: number; customer: Customer | null };

interface PosStore {
  // Active cart (flat — mirrors the active tab at all times)
  items: CartItem[];
  discount: number;
  customer: Customer | null;

  // Tab list + which one is active
  tabs: OrderTab[];
  activeTabId: string;
  snapshots: Record<string, TabSnapshot>;
  tabCounter: number; // monotonically increasing — prevents duplicate tab names

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
  setCustomer: (customer: Customer | null) => void;
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
      customer: null,
      tabs: [FIRST_TAB],
      activeTabId: FIRST_TAB.id,
      snapshots: {},
      tabCounter: 1,

      // ── Tab management ───────────────────────────────────────

      addTab: () => {
        const s = get();
        const counter = s.tabCounter + 1;
        const tab = makeTab(`Order ${counter}`);
        set({
          snapshots: { ...s.snapshots, [s.activeTabId]: { items: s.items, discount: s.discount, customer: s.customer } },
          tabs: [...s.tabs, tab],
          activeTabId: tab.id,
          tabCounter: counter,
          items: [],
          discount: 0,
          customer: null,
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
        let newCustomer = s.customer;

        if (s.activeTabId === id) {
          // prefer the tab to the left; fall back to the first remaining tab
          const removedIdx = s.tabs.findIndex((t) => t.id === id);
          const nextTab = remaining[Math.max(0, removedIdx - 1)];
          newActiveId = nextTab.id;
          const snap = newSnapshots[nextTab.id];
          newItems = snap?.items ?? [];
          newDiscount = snap?.discount ?? 0;
          newCustomer = snap?.customer ?? null;
          delete newSnapshots[nextTab.id];
        }

        set({ tabs: remaining, activeTabId: newActiveId, snapshots: newSnapshots, items: newItems, discount: newDiscount, customer: newCustomer });
      },

      setActiveTab: (id) => {
        const s = get();
        if (s.activeTabId === id) return;
        const newSnapshots = {
          ...s.snapshots,
          [s.activeTabId]: { items: s.items, discount: s.discount, customer: s.customer },
        };
        const snap = s.snapshots[id];
        delete newSnapshots[id];
        set({
          snapshots: newSnapshots,
          activeTabId: id,
          items: snap?.items ?? [],
          discount: snap?.discount ?? 0,
          customer: snap?.customer ?? null,
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
      setCustomer: (customer) => set({ customer }),
      clearCart: () => set({ items: [], discount: 0, customer: null }),

      // ── Computed ─────────────────────────────────────────────

      subtotal: () =>
        get().items.reduce((sum, i) => sum + Math.max(0, i.quantity * i.unit_price - i.discount_amount), 0),

      total: () => Math.max(0, get().subtotal() - get().discount),
    }),
    { name: "bedarts-pos-v2" }
  )
);
