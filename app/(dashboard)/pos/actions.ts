"use server";

import { createClient } from "@/lib/supabase/server";
import { readCashierSession } from "@/lib/cashier-session";
import type { CartItem, PaymentEntry } from "@/lib/types";

// Lightweight reachability check — throws on network failure, returns true otherwise.
export async function pingServer(): Promise<true> { return true; }

interface SubmitSaleArgs {
  items: CartItem[];
  payments: PaymentEntry[];
  subtotal: number;
  discount: number;
  total: number;
  pendingPickup?: boolean;
  pickupNote?: string;
}

export async function submitSale(args: SubmitSaleArgs) {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  // AUTHORIZATION — must be admin/manager/cashier with active account
  const { data: profile } = await supabase
    .from("profiles")
    .select("role, is_active")
    .eq("id", user.id)
    .single();
  if (!profile || !profile.is_active) throw new Error("Account inactive");
  if (!["admin", "manager", "cashier", "terminal"].includes(profile.role)) {
    throw new Error("Access denied — POS access required");
  }

  // Cashier/terminal accounts must have a valid PIN session; admins/managers may use one to bill under a cashier
  const pinCashierId = await readCashierSession();
  if ((profile.role === "cashier" || profile.role === "terminal") && !pinCashierId) {
    throw new Error("PIN session required");
  }
  const cashierId = pinCashierId ?? user.id;

  const { items, payments, subtotal, discount, total, pendingPickup, pickupNote } = args;

  // Early stock guard — skipped for pre-orders (stock is deducted at pickup time).
  // Still validates that products exist regardless.
  const { data: stocks } = await supabase
    .from("product_stock")
    .select("id, stock_quantity, name, unit")
    .in("id", items.map((i) => i.product.id));

  const stockMap = Object.fromEntries((stocks ?? []).map((s) => [s.id, s]));
  for (const item of items) {
    const stock = stockMap[item.product.id];
    if (!stock) throw new Error(`Product not found: ${item.product.name}`);
    if (!pendingPickup && stock.stock_quantity < item.quantity) {
      throw new Error(
        `Only ${stock.stock_quantity} ${item.product.unit ?? "units"} of "${stock.name}" available — requested ${item.quantity}`
      );
    }
  }

  // submit_sale_v3: atomic FEFO deduction
  const p_items = items.map((item) => ({
    product_id: item.product.id,
    quantity: item.quantity,
    unit_price: item.unit_price,
    discount_amount: item.discount_amount,
    package_label: item.packageLabel ?? null,
  }));

  const p_payments = payments.map((p) => ({
    method: p.method,
    amount: p.amount,
    reference: p.reference?.trim() || "",
  }));

  const { data: saleId, error: rpcErr } = await supabase.rpc("submit_sale_v4", {
    p_cashier_id: cashierId,
    p_customer_id: null,
    p_subtotal: subtotal,
    p_discount: discount,
    p_total: total,
    p_items: p_items,
    p_payments: p_payments,
    p_pending_pickup: pendingPickup ?? false,
    p_pickup_note: pickupNote ?? null,
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
