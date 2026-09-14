"use server";

import { cookies } from "next/headers";
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

  // PIN session overrides auth user for cashier identification
  const cookieStore = await cookies();
  const pinCashierId = cookieStore.get("cashier_session")?.value;
  const cashierId = pinCashierId ?? user.id;

  const { items, payments, subtotal, discount, total, customerId } = args;

  // Bug #25 fix: validate stock server-side before creating the sale
  for (const item of items) {
    const { data: stock } = await supabase
      .from("product_stock")
      .select("stock_quantity, name")
      .eq("id", item.product.id)
      .single();

    if (!stock) throw new Error(`Product not found: ${item.product.name}`);
    if (stock.stock_quantity < item.quantity) {
      throw new Error(
        `Only ${stock.stock_quantity} ${item.product.unit ?? "units"} of "${item.product.name}" available — requested ${item.quantity}`
      );
    }
  }

  // Insert sale
  const { data: sale, error: saleErr } = await supabase
    .from("sales")
    .insert({
      cashier_id: cashierId,
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

  // Bug #23 fix: atomic stock deduction via DB function (FEFO — oldest batches first)
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
      const { error } = await supabase.rpc("deduct_batch_stock", {
        p_batch_id: batch.id,
        p_deduct: deduct,
      });
      if (error) throw new Error(`Stock deduction failed: ${error.message}`);
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
