"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function voidSale(
  saleId: string,
  reason: string
): Promise<{ error?: string }> {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "admin") return { error: "Only admins can void sales" };

  const { data: sale } = await supabase
    .from("sales")
    .select("status")
    .eq("id", saleId)
    .single();

  if (!sale) return { error: "Sale not found" };
  if (sale.status === "voided") return { error: "Sale is already voided" };

  // Void the sale
  const { error: voidErr } = await supabase
    .from("sales")
    .update({ status: "voided", voided_by: user.id, void_reason: reason })
    .eq("id", saleId);

  if (voidErr) return { error: voidErr.message };

  // Return stock to batches — restore quantity_remaining on a new batch priced at 0
  // (simple approach: a correction adjustment is made per item)
  const { data: saleItems } = await supabase
    .from("sale_items")
    .select("product_id, quantity")
    .eq("sale_id", saleId);

  for (const item of saleItems ?? []) {
    const today = new Date().toISOString().slice(0, 10);
    await supabase.from("stock_batches").insert({
      product_id: item.product_id,
      quantity_received: item.quantity,
      quantity_remaining: item.quantity,
      cost_price: 0,
      received_date: today,
      expiry_date: null,
      notes: `Returned from voided sale ${saleId.slice(0, 8)}`,
      supplier_id: null,
    });
  }

  revalidatePath("/refunds");
  revalidatePath("/inventory");
  return {};
}
