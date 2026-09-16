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

  // Early stock guard — single query, catches obvious overages before hitting the DB function
  const { data: stocks } = await supabase
    .from("product_stock")
    .select("id, stock_quantity, name, unit")
    .in("id", items.map((i) => i.product.id));

  const stockMap = Object.fromEntries((stocks ?? []).map((s) => [s.id, s]));
  for (const item of items) {
    const stock = stockMap[item.product.id];
    if (!stock) throw new Error(`Product not found: ${item.product.name}`);
    if (stock.stock_quantity < item.quantity) {
      throw new Error(
        `Only ${stock.stock_quantity} ${item.product.unit ?? "units"} of "${stock.name}" available — requested ${item.quantity}`
      );
    }
  }

  // submit_sale_v3: atomic FEFO deduction + account credit_balance update
  const p_items = items.map((item) => ({
    product_id: item.product.id,
    quantity: item.quantity,
    unit_price: item.unit_price,
    discount_amount: item.discount_amount,
  }));

  const p_payments = payments.map((p) => ({
    method: p.method,
    amount: p.amount,
    reference: p.reference?.trim() || "",
  }));

  const { data: saleId, error: rpcErr } = await supabase.rpc("submit_sale_v3", {
    p_cashier_id: cashierId,
    p_customer_id: customerId || null,
    p_subtotal: subtotal,
    p_discount: discount,
    p_total: total,
    p_items: p_items,
    p_payments: p_payments,
  });

  if (rpcErr) throw new Error(rpcErr.message);

  return { saleId: saleId as string };
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
