"use server";

import { revalidatePath } from "next/cache";
import { requireManagerOrAdmin } from "@/lib/auth-guards";

export async function markSaleForPickup(
  saleId: string,
  note: string
): Promise<{ error?: string }> {
  const supabase = await requireManagerOrAdmin();
  const { error } = await supabase
    .from("sales")
    .update({
      pending_pickup: true,
      pickup_note: note.trim() || null,
    })
    .eq("id", saleId);
  if (error) return { error: error.message };
  revalidatePath("/pickups");
  return {};
}

export async function markPickupDelivered(
  saleId: string
): Promise<{ error?: string }> {
  const supabase = await requireManagerOrAdmin();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  // For pre-orders (stock_deducted=false), this runs FEFO deduction against
  // whichever batch has valid stock. Raises on insufficient stock — caller
  // sees that in the returned error. For sales whose stock was already
  // deducted at sale time, this is a no-op.
  const { error: deductErr } = await supabase.rpc("deduct_pickup_stock_v1", {
    p_sale_id: saleId,
  });
  if (deductErr) return { error: deductErr.message };

  const { error } = await supabase
    .from("sales")
    .update({
      pending_pickup: false,
      picked_up_at: new Date().toISOString(),
      picked_up_by: user.id,
    })
    .eq("id", saleId)
    .eq("pending_pickup", true);
  if (error) return { error: error.message };
  revalidatePath("/pickups");
  revalidatePath("/inventory");
  return {};
}

export async function undoPickupDelivered(
  saleId: string
): Promise<{ error?: string }> {
  const supabase = await requireManagerOrAdmin();
  const { error } = await supabase
    .from("sales")
    .update({
      pending_pickup: true,
      picked_up_at: null,
      picked_up_by: null,
    })
    .eq("id", saleId);
  if (error) return { error: error.message };
  revalidatePath("/pickups");
  return {};
}

export async function clearPickupFlag(
  saleId: string
): Promise<{ error?: string }> {
  const supabase = await requireManagerOrAdmin();
  const { error } = await supabase
    .from("sales")
    .update({
      pending_pickup: false,
      pickup_note: null,
    })
    .eq("id", saleId)
    .eq("pending_pickup", true);
  if (error) return { error: error.message };
  revalidatePath("/pickups");
  return {};
}
