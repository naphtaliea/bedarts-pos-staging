"use server";

import { requireManagerOrAdmin } from "@/lib/auth-guards";
import { revalidatePath } from "next/cache";

export async function voidSale(
  saleId: string,
  reason: string
): Promise<{ error?: string }> {
  const supabase = await requireManagerOrAdmin().catch(() => null);
  if (!supabase) return { error: "You don't have permission to void sales" };

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { data: sale } = await supabase
    .from("sales")
    .select("status, payments(method, amount)")
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

  // Pull sold items with their historical cost_at_sale (accurate to the batches
  // consumed by FEFO at time of sale). Falls back to current product.cost_price
  // only for pre-migration rows where cost_at_sale is NULL.
  const { data: saleItems } = await supabase
    .from("sale_items")
    .select("product_id, quantity, cost_at_sale")
    .eq("sale_id", saleId);

  const itemsMissingCost = (saleItems ?? []).filter((i) => i.cost_at_sale == null);
  const fallbackIds = itemsMissingCost.map((i) => i.product_id);
  const { data: fallbackProducts } = fallbackIds.length
    ? await supabase.from("products").select("id, cost_price").in("id", fallbackIds)
    : { data: [] };
  const fallbackMap = Object.fromEntries(
    (fallbackProducts ?? []).map((p) => [p.id, p.cost_price ?? 0])
  );

  // Return stock — create a correction batch using cost_at_sale for accuracy
  const today = new Date().toISOString().slice(0, 10);
  for (const item of saleItems ?? []) {
    const unitCost =
      item.cost_at_sale != null
        ? Number(item.cost_at_sale)
        : Number(fallbackMap[item.product_id] ?? 0);

    await supabase.from("stock_batches").insert({
      product_id: item.product_id,
      quantity_received: item.quantity,
      quantity_remaining: item.quantity,
      cost_price: unitCost,
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
