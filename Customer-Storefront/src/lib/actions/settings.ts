"use server";

import { createClient } from "@/src/lib/supabase/server";
import type { StoreSettings } from "@/src/lib/types";

/**
 * Read the storefront-safe subset of store_settings. Uses the RPC because the
 * raw table's RLS is authenticated-only.
 */
export async function getStoreSettings(): Promise<StoreSettings | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_storefront_settings");
  if (error || !data || data.length === 0) return null;
  return data[0] as StoreSettings;
}
