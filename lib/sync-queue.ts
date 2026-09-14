import { openDB } from "idb";
import type { CartItem, PaymentEntry } from "@/lib/types";

export interface OfflineSale {
  id: string;
  timestamp: number;
  payload: {
    items: CartItem[];
    payments: PaymentEntry[];
    subtotal: number;
    discount: number;
    total: number;
    customerId: string | null;
  };
}

const DB_NAME = "bedarts-pos-offline";
const STORE_NAME = "sales_queue";

async function getDB() {
  return openDB(DB_NAME, 1, {
    upgrade(db) {
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "id" });
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

export async function removeOfflineSale(id: string): Promise<void> {
  const db = await getDB();
  await db.delete(STORE_NAME, id);
}
