"use server";

import { createClient } from "@/src/lib/supabase/server";
import type { StorefrontProduct } from "@/src/lib/types";

export async function getStorefrontProducts(): Promise<StorefrontProduct[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_storefront_products");
  if (error) throw new Error(error.message);
  return (data ?? []) as StorefrontProduct[];
}

/**
 * Fetch a small set of products by id — used by the account page's reorder
 * flow to check current stock/status. Returns only the shape needed to
 * repopulate a cart.
 */
export async function getProductsByIds(ids: string[]): Promise<StorefrontProduct[]> {
  if (ids.length === 0) return [];
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_storefront_products");
  if (error) throw new Error(error.message);
  const idSet = new Set(ids);
  return ((data ?? []) as StorefrontProduct[]).filter((p) => idSet.has(p.id));
}
