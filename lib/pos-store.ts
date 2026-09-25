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
type TabSnapshot = {
  items: CartItem[];
  discount: number;
  preorderMode?: boolean;
  preorderNote?: string;
};

interface PosStore {
  // Active cart (flat — mirrors the active tab at all times)
  items: CartItem[];
  discount: number;

  // Pre-order mode is per-tab: when on, this tab bypasses stock caps and
  // the sale is submitted as a pending pickup (stock deducted at delivery).
  preorderMode: boolean;
  preorderNote: string;

  // Tab list + which one is active
  tabs: OrderTab[];
  activeTabId: string;
  snapshots: Record<string, TabSnapshot>;
  tabCounter: number; // monotonically increasing — prevents duplicate tab names

  // Tabs currently sitting on the Payment screen (per-tab view persistence)
  paymentTabIds: string[];

  // Tab management
  addTab: () => void;
  removeTab: (id: string) => void;
  setActiveTab: (id: string) => void;

  // Payment-screen tracking
  enterPayment: (tabId?: string) => void;
  exitPayment: (tabId?: string) => void;

  // Cart operations (same API as before — operate on active tab)
  addItem: (product: Product, lineId: string) => void;
  removeItem: (lineId: string) => void;
  updateQty: (lineId: string, qty: number) => void;
  updateItemDiscount: (lineId: string, discount: number) => void;
  updateItemPrice: (lineId: string, price: number) => void;
  updateItemPackageLabel: (lineId: string, label: string | null) => void;
  setDiscount: (discount: number) => void;
  clearCart: () => void;

  // Pre-order controls
  setPreorderMode: (on: boolean) => void;
  setPreorderNote: (note: string) => void;

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
      preorderMode: false,
      preorderNote: "",
      tabs: [FIRST_TAB],
      activeTabId: FIRST_TAB.id,
      snapshots: {},
      tabCounter: 1,
      paymentTabIds: [],

      // ── Tab management ───────────────────────────────────────

      addTab: () => {
        const s = get();
        const counter = s.tabCounter + 1;
        const tab = makeTab(`Order ${counter}`);
        set({
          snapshots: {
            ...s.snapshots,
            [s.activeTabId]: { items: s.items, discount: s.discount, preorderMode: s.preorderMode, preorderNote: s.preorderNote },
          },
          tabs: [...s.tabs, tab],
          activeTabId: tab.id,
          tabCounter: counter,
          items: [],
          discount: 0,
          preorderMode: false,
          preorderNote: "",
        });
      },

      removeTab: (id) => {
        const s = get();
        if (s.tabs.length === 1) return;
        const remaining = s.tabs.filter((t) => t.id !== id);
        const newSnapshots = { ...s.snapshots };
        delete newSnapshots[id];
        const newPaymentTabIds = s.paymentTabIds.filter((t) => t !== id);

        let newActiveId = s.activeTabId;
        let newItems = s.items;
        let newDiscount = s.discount;
        let newPreorderMode = s.preorderMode;
        let newPreorderNote = s.preorderNote;

        if (s.activeTabId === id) {
          // prefer the tab to the left; fall back to the first remaining tab
          const removedIdx = s.tabs.findIndex((t) => t.id === id);
          const nextTab = remaining[Math.max(0, removedIdx - 1)];
          newActiveId = nextTab.id;
          const snap = newSnapshots[nextTab.id];
          newItems = snap?.items ?? [];
          newDiscount = snap?.discount ?? 0;
          newPreorderMode = snap?.preorderMode ?? false;
          newPreorderNote = snap?.preorderNote ?? "";
          delete newSnapshots[nextTab.id];
        }

        set({
          tabs: remaining,
          activeTabId: newActiveId,
          snapshots: newSnapshots,
          items: newItems,
          discount: newDiscount,
          preorderMode: newPreorderMode,
          preorderNote: newPreorderNote,
          paymentTabIds: newPaymentTabIds,
        });
      },

      enterPayment: (tabId) => {
        const id = tabId ?? get().activeTabId;
        set((s) => (s.paymentTabIds.includes(id) ? s : { paymentTabIds: [...s.paymentTabIds, id] }));
      },

      exitPayment: (tabId) => {
        const id = tabId ?? get().activeTabId;
        set((s) => ({ paymentTabIds: s.paymentTabIds.filter((t) => t !== id) }));
      },

      setActiveTab: (id) => {
        const s = get();
        if (s.activeTabId === id) return;
        const newSnapshots = {
          ...s.snapshots,
          [s.activeTabId]: { items: s.items, discount: s.discount, preorderMode: s.preorderMode, preorderNote: s.preorderNote },
        };
        const snap = s.snapshots[id];
        delete newSnapshots[id];
        set({
          snapshots: newSnapshots,
          activeTabId: id,
          items: snap?.items ?? [],
          discount: snap?.discount ?? 0,
          preorderMode: snap?.preorderMode ?? false,
          preorderNote: snap?.preorderNote ?? "",
        });
      },

      // ── Cart operations ──────────────────────────────────────

      addItem: (product, lineId) => {
        set((s) => ({
          items: [...s.items, { lineId, product, quantity: 1, unit_price: product.selling_price, discount_amount: 0, packageLabel: null }],
        }));
      },

      removeItem: (lineId) =>
        set((s) => ({ items: s.items.filter((i) => i.lineId !== lineId) })),

      updateQty: (lineId, qty) => {
        set((s) => ({ items: s.items.map((i) => i.lineId === lineId ? { ...i, quantity: Math.max(0, qty) } : i) }));
      },

      updateItemDiscount: (lineId, discount) =>
        set((s) => ({ items: s.items.map((i) => i.lineId === lineId ? { ...i, discount_amount: Math.max(0, discount) } : i) })),

      updateItemPrice: (lineId, price) =>
        set((s) => ({ items: s.items.map((i) => i.lineId === lineId ? { ...i, unit_price: Math.max(0, price) } : i) })),

      updateItemPackageLabel: (lineId, label) =>
        set((s) => ({ items: s.items.map((i) => i.lineId === lineId ? { ...i, packageLabel: label } : i) })),

      setDiscount: (discount) => set({ discount: Math.max(0, discount) }),
      clearCart: () => set({ items: [], discount: 0, preorderMode: false, preorderNote: "" }),

      setPreorderMode: (on) => set({ preorderMode: on, preorderNote: on ? get().preorderNote : "" }),
      setPreorderNote: (note) => set({ preorderNote: note }),

      // ── Computed ─────────────────────────────────────────────

      subtotal: () =>
        get().items.reduce((sum, i) => sum + Math.max(0, i.quantity * i.unit_price - i.discount_amount), 0),

      total: () => Math.max(0, get().subtotal() - get().discount),
    }),
    { name: "bedarts-pos-v4" }
  )
);
