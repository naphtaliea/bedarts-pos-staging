"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

// Butcher sets (or updates) the actual amount they brought out of the freezer
// for a specific product today. Upserts into `thaw_brought_out` keyed by
// (product_id, Africa/Accra date). The thaw RPC picks the row up on the next
// request so the hero number flips from 'Bring out 30 kg' to 'X kg left'
// against the butcher's own figure, not the system's suggestion.
export async function setThawBroughtOut(
  productId: string,
  quantity: number
): Promise<{ error?: string }> {
  if (!productId) return { error: "Missing product" };
  if (!(quantity >= 0) || !Number.isFinite(quantity)) {
    return { error: "Quantity must be a non-negative number" };
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, is_active")
    .eq("id", user.id)
    .single();

  if (!profile?.is_active) return { error: "Account inactive" };
  if (!["admin", "manager", "butcher"].includes(profile.role)) {
    return { error: "Not permitted" };
  }

  // Africa/Accra is UTC+0 year-round, so toISOString().slice(0, 10) gives
  // the correct Accra calendar date without a tz library.
  const broughtDate = new Date().toISOString().slice(0, 10);

  const { error } = await supabase
    .from("thaw_brought_out")
    .upsert(
      {
        product_id: productId,
        brought_date: broughtDate,
        quantity,
        set_by: user.id,
        set_at: new Date().toISOString(),
      },
      { onConflict: "product_id,brought_date" }
    );

  if (error) return { error: error.message };

  revalidatePath("/butcher");
  revalidatePath("/dashboard");
  return {};
}
