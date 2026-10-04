import { openDB } from "idb";
import type { CartItem, PaymentEntry } from "@/lib/types";
import type { SyncStatus } from "@/lib/sync-core";

export interface OfflineSale {
  // Also the idempotency key sent to the server (client_ref), so a retry can
  // never record the same sale twice.
  id: string;
  timestamp: number;
  payload: {
    items: CartItem[];
    payments: PaymentEntry[];
    subtotal: number;
    discount: number;
    total: number;
    // Chosen at the till when the sale was made offline against stock the till
    // thought was short. Sent with the sale when it syncs.
    stockOverrideReason?: string;
  };
  // Sync state. Absent on sales queued before this existed = "pending".
  status?: SyncStatus;
  lastError?: string;
  shortItems?: string[];
  lastAttemptAt?: number;
}

export interface CachedOrder {
  id: string;
  created_at: string;
  total_amount: number;
  status: string;
  payments: { method: string; amount: number }[];
  sale_items: { quantity: number }[];
}

interface OrderCacheEntry {
  date: string; // YYYY-MM-DD local
  orders: CachedOrder[];
  cached_at: number;
}

const DB_NAME = "bedarts-pos-offline";
const DB_VERSION = 2;
const QUEUE_STORE = "sales_queue";
const CACHE_STORE = "orders_cache";

// Keep the old export alias so existing callers don't break
const STORE_NAME = QUEUE_STORE;

async function getDB() {
  return openDB(DB_NAME, DB_VERSION, {
    upgrade(db, oldVersion) {
      if (!db.objectStoreNames.contains(QUEUE_STORE)) {
        db.createObjectStore(QUEUE_STORE, { keyPath: "id" });
      }
      if (oldVersion < 2 && !db.objectStoreNames.contains(CACHE_STORE)) {
        db.createObjectStore(CACHE_STORE, { keyPath: "date" });
      }
    },
  });
}

export async function saveOfflineSale(payload: OfflineSale["payload"]): Promise<string> {
  const db = await getDB();
  const sale: OfflineSale = {
    id: crypto.randomUUID(),
    timestamp: Date.now(),
    payload,
  };
  await db.put(STORE_NAME, sale);
  return sale.id;
}

export async function getOfflineSales(): Promise<OfflineSale[]> {
  const db = await getDB();
  return db.getAll(STORE_NAME);
}

export async function updateOfflineSale(
  id: string,
  patch: Partial<Pick<OfflineSale, "status" | "lastError" | "shortItems" | "lastAttemptAt">>
): Promise<void> {
  const db = await getDB();
  const existing = (await db.get(STORE_NAME, id)) as OfflineSale | undefined;
  if (!existing) return;
  await db.put(STORE_NAME, { ...existing, ...patch });
}

export async function removeOfflineSale(id: string): Promise<void> {
  const db = await getDB();
  await db.delete(STORE_NAME, id);
}

/** Cache a day's completed orders for offline fallback. Fire-and-forget safe. */
export async function cacheOrdersForDate(date: string, orders: CachedOrder[]): Promise<void> {
  const db = await getDB();
  const entry: OrderCacheEntry = { date, orders, cached_at: Date.now() };
  await db.put(CACHE_STORE, entry);
}

/** Return cached completed orders for a date, or [] if nothing cached yet. */
export async function getCachedOrdersForDate(date: string): Promise<CachedOrder[]> {
  const db = await getDB();
  const entry = (await db.get(CACHE_STORE, date)) as OrderCacheEntry | undefined;
  return entry?.orders ?? [];
}

/** Return when the cache for a date was last written (ms epoch), or null. */
export async function getOrderCacheAge(date: string): Promise<number | null> {
  const db = await getDB();
  const entry = (await db.get(CACHE_STORE, date)) as OrderCacheEntry | undefined;
  return entry?.cached_at ?? null;
}
