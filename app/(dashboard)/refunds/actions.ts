"use server";

import { requireManagerOrAdmin } from "@/lib/auth-guards";
import { revalidatePath } from "next/cache";

export async function voidSale(
  saleId: string,
  reason: string
): Promise<{ error?: string }> {
  let supabase;
  try {
    supabase = await requireManagerOrAdmin();
  } catch {
    return { error: "You don't have permission to void sales" };
  }

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { data: sale } = await supabase
    .from("sales")
    .select("status")
    .eq("id", saleId)
    .single();

  if (!sale) return { error: "Sale not found" };
  if (sale.status === "voided") return { error: "Sale is already voided" };

  const { error: voidErr } = await supabase
    .from("sales")
    .update({ status: "voided", voided_by: user.id, void_reason: reason })
    .eq("id", saleId);

  if (voidErr) return { error: voidErr.message };

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

export interface RefundItem {
  sale_item_id: string;
  product_id: string;
  product_name: string;
  quantity: number;
  unit_price: number;
  subtotal: number;
  cost_at_sale: number | null;
}

export async function processRefund(
  saleId: string,
  items: RefundItem[],
  reason: string
): Promise<{ error?: string; refundId?: string }> {
  let supabase;
  try {
    supabase = await requireManagerOrAdmin();
  } catch {
    return { error: "You don't have permission to process refunds" };
  }

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  if (!items.length) return { error: "No items selected for refund" };
  if (reason.trim().length < 3) return { error: "Please provide a reason" };

  const refundAmount = items.reduce((s, i) => s + i.subtotal, 0);
  if (refundAmount <= 0) return { error: "Refund amount must be greater than zero" };

  const { data: sale } = await supabase
    .from("sales")
    .select("status")
    .eq("id", saleId)
    .single();

  if (!sale) return { error: "Sale not found" };
  if (sale.status === "voided") return { error: "Cannot refund a voided sale" };

  // Record the refund
  const { data: refund, error: refundErr } = await supabase
    .from("refunds")
    .insert({
      sale_id: saleId,
      refunded_by: user.id,
      reason: reason.trim(),
      refund_amount: refundAmount,
      refund_items: items,
    })
    .select("id")
    .single();

  if (refundErr) return { error: refundErr.message };

  // Return stock — create correction batches for each refunded item
  const today = new Date().toISOString().slice(0, 10);
  for (const item of items) {
    const fallbackCost =
      item.cost_at_sale != null ? Number(item.cost_at_sale) : 0;

    await supabase.from("stock_batches").insert({
      product_id: item.product_id,
      quantity_received: item.quantity,
      quantity_remaining: item.quantity,
      cost_price: fallbackCost,
      received_date: today,
      expiry_date: null,
      notes: `Returned via refund ${refund!.id.slice(0, 8)} (sale ${saleId.slice(0, 8)})`,
      supplier_id: null,
    });
  }

  revalidatePath("/refunds");
  revalidatePath("/inventory");
  return { refundId: refund!.id };
}
