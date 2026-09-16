"use server";

import { requireAdmin } from "@/lib/auth-guards";
import { revalidatePath } from "next/cache";

export async function voidSale(
  saleId: string,
  reason: string
): Promise<{ error?: string }> {
  const supabase = await requireAdmin().catch(() => null);
  if (!supabase) return { error: "Admin access required" };

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { data: sale } = await supabase
    .from("sales")
    .select("status, customer_id, payments(method, amount)")
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

  // Fetch sold items and current product cost prices for stock restoration
  const { data: saleItems } = await supabase
    .from("sale_items")
    .select("product_id, quantity")
    .eq("sale_id", saleId);

  const productIds = (saleItems ?? []).map((i) => i.product_id);

  const { data: products } = productIds.length
    ? await supabase.from("products").select("id, cost_price").in("id", productIds)
    : { data: [] };

  const costMap = Object.fromEntries((products ?? []).map((p) => [p.id, p.cost_price ?? 0]));

  // Return stock — create a correction batch using the product's current cost price
  const today = new Date().toISOString().slice(0, 10);
  for (const item of saleItems ?? []) {
    await supabase.from("stock_batches").insert({
      product_id: item.product_id,
      quantity_received: item.quantity,
      quantity_remaining: item.quantity,
      cost_price: costMap[item.product_id] ?? 0,
      received_date: today,
      expiry_date: null,
      notes: `Returned from voided sale ${saleId.slice(0, 8)}`,
      supplier_id: null,
    });
  }

  // Reverse credit balance for any on-account portion of the voided sale
  if (sale.customer_id) {
    const accountTotal = ((sale.payments as any[]) ?? [])
      .filter((p) => p.method === "account")
      .reduce((s: number, p: any) => s + p.amount, 0);

    if (accountTotal > 0) {
      await supabase.rpc("record_customer_payment", {
        p_customer_id: sale.customer_id,
        p_amount: accountTotal,
        p_notes: `Auto-reversal for voided sale ${saleId.slice(0, 8)}`,
      });
    }
  }

  revalidatePath("/refunds");
  revalidatePath("/inventory");
  revalidatePath("/customers");
  return {};
}
