"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
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
  stockOverrideReason?: string;
}

export async function submitSale(args: SubmitSaleArgs): Promise<
  | { ok: true; saleId: string }
  | { ok: false; stockInsufficient: string[] }
> {
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

  const { items, payments, subtotal, discount, total, pendingPickup, pickupNote, stockOverrideReason } = args;

  if (stockOverrideReason && !["admin", "manager"].includes(profile.role)) {
    throw new Error("Stock override requires manager or admin authorisation");
  }

  // Fetch authoritative server state: stock, price, and active status.
  // selling_price is used server-side to prevent stale-price financial errors.
  // is_active blocks sales of deactivated products regardless of cashier screen state.
  const { data: stocks } = await supabase
    .from("product_stock")
    .select("id, stock_quantity, name, unit, selling_price, is_active")
    .in("id", items.map((i) => i.product.id));

  const stockMap = Object.fromEntries((stocks ?? []).map((s) => [s.id, s]));
  for (const item of items) {
    if (!stockMap[item.product.id]) throw new Error(`Product not found: ${item.product.name}`);
  }

  // Block deactivated products — not override-able. A product pulled for
  // quality or safety must be reactivated before it can be sold.
  const inactiveItems = items.filter((item) => !stockMap[item.product.id]?.is_active);
  if (inactiveItems.length > 0) {
    throw new Error(
      `Cannot sell deactivated product${inactiveItems.length > 1 ? "s" : ""}: ${inactiveItems.map((i) => i.product.name).join(", ")}`
    );
  }

  // Replace stale client prices with the authoritative server price at time of
  // sale. Per-item discount is capped at the line total so a client-supplied
  // discount_amount can never exceed what was actually charged.
  const correctedItems = items.map((item) => {
    const serverPrice = stockMap[item.product.id]?.selling_price ?? item.unit_price;
    const cappedDiscount = Math.min(item.discount_amount ?? 0, item.quantity * serverPrice);
    return {
      ...item,
      unit_price: serverPrice,
      discount_amount: cappedDiscount,
    };
  });

  // Recompute totals from the corrected prices.
  const correctedSubtotal = correctedItems.reduce(
    (sum, item) => sum + Math.max(0, item.quantity * item.unit_price - (item.discount_amount ?? 0)),
    0
  );
  if (discount < 0 || discount > correctedSubtotal) {
    throw new Error("Invalid discount amount");
  }
  const correctedTotal = correctedSubtotal - discount;

  if (!pendingPickup && !stockOverrideReason) {
    const violations = correctedItems
      .filter((item) => (stockMap[item.product.id]?.stock_quantity ?? 0) < item.quantity)
      .map((item) => item.product.name);
    if (violations.length > 0) {
      return { ok: false as const, stockInsufficient: violations };
    }
  }

  const p_items = correctedItems.map((item) => ({
    product_id: item.product.id,
    quantity: item.quantity,
    unit_price: item.unit_price,
    discount_amount: item.discount_amount,
    package_label: item.packageLabel ?? null,
  }));

  const p_payments = payments.map((p) => ({
    method: p.method,
    amount: p.amount,
    tendered: p.tendered ?? null,
    reference: p.reference?.trim() || "",
  }));

  const { data: saleId, error: rpcErr } = await supabase.rpc("submit_sale_v5", {
    p_cashier_id: cashierId,
    p_customer_id: null,
    p_subtotal: correctedSubtotal,
    p_discount: discount,
    p_total: correctedTotal,
    p_items: p_items,
    p_payments: p_payments,
    p_pending_pickup: pendingPickup ?? false,
    p_pickup_note: pickupNote ?? null,
    p_stock_override_reason: stockOverrideReason ?? null,
  });

  if (rpcErr) throw new Error(rpcErr.message);

  revalidatePath("/dashboard");
  revalidatePath("/reports");

  return { ok: true as const, saleId: saleId as string };
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
