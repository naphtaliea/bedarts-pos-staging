"use server";

import { createClient } from "@/lib/supabase/server";
import type { CartItem, PaymentEntry } from "@/lib/types";

interface SubmitSaleArgs {
  items: CartItem[];
  payments: PaymentEntry[];
  subtotal: number;
  discount: number;
  total: number;
  customerId: string | null;
}

export async function submitSale(args: SubmitSaleArgs) {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { items, payments, subtotal, discount, total, customerId } = args;

  // Insert sale
  const { data: sale, error: saleErr } = await supabase
    .from("sales")
    .insert({
      cashier_id: user.id,
      customer_id: customerId || null,
      subtotal,
      discount_amount: discount,
      total_amount: total,
      status: "completed",
    })
    .select()
    .single();

  if (saleErr || !sale) throw new Error(saleErr?.message ?? "Failed to create sale");

  // Insert sale items
  const saleItems = items.map((item) => ({
    sale_id: sale.id,
    product_id: item.product.id,
    quantity: item.quantity,
    unit_price: item.unit_price,
    discount_amount: item.discount_amount,
    total_price: Math.max(0, item.quantity * item.unit_price - item.discount_amount),
  }));

  const { error: itemsErr } = await supabase.from("sale_items").insert(saleItems);
  if (itemsErr) throw new Error(itemsErr.message);

  // Insert payments
  const paymentRows = payments.map((p) => ({
    sale_id: sale.id,
    method: p.method,
    amount: p.amount,
    reference: p.reference?.trim() || null,
  }));

  const { error: paymentsErr } = await supabase.from("payments").insert(paymentRows);
  if (paymentsErr) throw new Error(paymentsErr.message);

  // Deduct stock (FIFO — oldest batches first)
  for (const item of items) {
    let remaining = item.quantity;
    const { data: batches } = await supabase
      .from("stock_batches")
      .select("id, quantity_remaining")
      .eq("product_id", item.product.id)
      .gt("quantity_remaining", 0)
      .order("received_date", { ascending: true })
      .order("created_at", { ascending: true });

    for (const batch of batches ?? []) {
      if (remaining <= 0) break;
      const deduct = Math.min(remaining, batch.quantity_remaining);
      await supabase
        .from("stock_batches")
        .update({ quantity_remaining: batch.quantity_remaining - deduct })
        .eq("id", batch.id);
      remaining -= deduct;
    }
  }

  return { saleId: sale.id };
}

export async function getSaleForReceipt(saleId: string) {
  const supabase = await createClient();

  const { data: sale } = await supabase
    .from("sales")
    .select(`
      *,
      cashier:profiles!sales_cashier_id_fkey(full_name),
      customer:customers(name),
      sale_items(*, product:products(name, unit)),
      payments(*)
    `)
    .eq("id", saleId)
    .single();

  const { data: settings } = await supabase
    .from("store_settings")
    .select("*")
    .eq("id", 1)
    .single();

  return { sale, settings };
}
