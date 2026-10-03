"use server";

import { createClient } from "@/src/lib/supabase/server";
import { computeDispatch } from "@/src/lib/dispatch-estimate";
import type { CartItem, DeliveryDetails, OnlineOrder, StoreSettings } from "@/src/lib/types";

// Generates a reference like BDS-1748291234567-AB3X7
function generateRef(): string {
  const rand = Math.random().toString(36).slice(2, 7).toUpperCase();
  return `BDS-${Date.now()}-${rand}`;
}

interface InitializeOrderResult {
  authorizationUrl: string;
  reference: string;
  orderId: string;
}

export async function initializeOrder(
  items: CartItem[],
  delivery: DeliveryDetails & {
    fulfillmentType?: "delivery" | "pickup";
    /** Guest email — used only when the auth user has no email of its own (anonymous sign-in). */
    guestEmail?: string;
  },
  totalAmount: number
): Promise<{ ok: true; data: InitializeOrderResult } | { ok: false; error: string }> {
  if (!items.length) return { ok: false, error: "Cart is empty." };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "You must be signed in to place an order." };

  // Verify the customer has a profile (created at sign-up)
  const { data: profile } = await supabase
    .from("customer_profiles")
    .select("id")
    .eq("id", user.id)
    .single();
  if (!profile) return { ok: false, error: "Customer profile not found." };

  const ref = generateRef();

  // Check dispatch window server-side and annotate the order so staff can see it.
  const settingsRes = await supabase.rpc("get_storefront_settings");
  const settings = (settingsRes.data?.[0] ?? null) as StoreSettings | null;
  const dispatch = computeDispatch(settings);
  const dispatchNote = dispatch.isSameDay ? null : "[NEXT-DAY DISPATCH]";
  const rawNotes = delivery.notes ?? null;
  const resolvedNotes = dispatchNote
    ? (rawNotes ? `${rawNotes} | ${dispatchNote}` : dispatchNote)
    : rawNotes;

  // Create the order row
  const { data: order, error: orderErr } = await supabase
    .from("online_orders")
    .insert({
      customer_id:      user.id,
      total_amount:     totalAmount,
      delivery_name:    delivery.name,
      delivery_phone:   delivery.phone,
      delivery_address: delivery.fulfillmentType === "pickup" ? null : (delivery.address ?? null),
      delivery_notes:   resolvedNotes,
      fulfillment_type: delivery.fulfillmentType ?? "delivery",
      paystack_ref:     ref,
    })
    .select("id")
    .single();

  if (orderErr || !order) {
    return { ok: false, error: "Failed to create order. Please try again." };
  }

  // Insert line items
  const { error: itemsErr } = await supabase
    .from("online_order_items")
    .insert(
      items.map((item) => ({
        order_id:     order.id,
        product_id:   item.product_id,
        product_name: item.product_name,
        unit:         item.unit,
        quantity:     item.quantity,
        unit_price:   item.unit_price,
        total_price:  item.total_price,
      }))
    );

  if (itemsErr) {
    // Roll back the order header — items are the source of truth
    await supabase.from("online_orders").delete().eq("id", order.id);
    return { ok: false, error: "Failed to save order items. Please try again." };
  }

  // Paystack requires an email. Use the auth user's email when available,
  // otherwise the guest email provided at checkout, otherwise a synthetic
  // placeholder derived from the user id (Paystack accepts but can't email it).
  const paystackEmail =
    user.email ??
    delivery.guestEmail ??
    `guest-${user.id.replace(/-/g, "").slice(0, 12)}@guest.bedarts.shop`;

  // Initialize a Paystack transaction
  const paystackRes = await fetch("https://api.paystack.co/transaction/initialize", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      email:        paystackEmail,
      amount:       Math.round(totalAmount * 100), // GHS → kobo/pesewas
      currency:     "GHS",
      reference:    ref,
      callback_url: `${process.env.NEXT_PUBLIC_SITE_URL}/checkout/confirm`,
      metadata: {
        order_id:      order.id,
        customer_name: delivery.name,
        custom_fields: [
          { display_name: "Order ID",  variable_name: "order_id",  value: order.id },
          { display_name: "Deliver to", variable_name: "address",   value: delivery.address },
        ],
      },
    }),
  });

  if (!paystackRes.ok) {
    await supabase.from("online_orders").delete().eq("id", order.id);
    return { ok: false, error: "Could not reach payment provider. Please try again." };
  }

  const ps = await paystackRes.json() as {
    status: boolean;
    data: { authorization_url: string; access_code: string };
  };

  if (!ps.status) {
    await supabase.from("online_orders").delete().eq("id", order.id);
    return { ok: false, error: "Payment provider rejected the request." };
  }

  // Persist the access code (useful for inline Paystack widget)
  await supabase
    .from("online_orders")
    .update({ paystack_access_code: ps.data.access_code })
    .eq("id", order.id);

  return {
    ok: true,
    data: {
      authorizationUrl: ps.data.authorization_url,
      reference: ref,
      orderId: order.id,
    },
  };
}

export async function getOrder(orderId: string): Promise<OnlineOrder | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("online_orders")
    .select(`
      *,
      items:online_order_items(*)
    `)
    .eq("id", orderId)
    .single();
  return data as OnlineOrder | null;
}

export async function getCustomerOrders(): Promise<OnlineOrder[]> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data } = await supabase
    .from("online_orders")
    .select(`
      *,
      items:online_order_items(*)
    `)
    .eq("customer_id", user.id)
    .order("created_at", { ascending: false });

  return (data ?? []) as OnlineOrder[];
}

// Called from the checkout/confirm page to verify payment status after redirect.
// Paystack redirect happens before the webhook fires, so we poll briefly.
export async function getOrderByRef(ref: string): Promise<OnlineOrder | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("online_orders")
    .select(`*, items:online_order_items(*)`)
    .eq("paystack_ref", ref)
    .single();
  return data as OnlineOrder | null;
}

/**
 * Cancel a pending_payment order. RLS on online_orders allows customers to
 * update their own pending_payment orders to status='cancelled'. If the order
 * has already been paid (webhook processed), this update is rejected by RLS.
 */
export async function cancelOrder(
  orderId: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Please sign in." };

  const { error } = await supabase
    .from("online_orders")
    .update({ status: "cancelled" })
    .eq("id", orderId)
    .eq("customer_id", user.id)
    .eq("status", "pending_payment");

  if (error) return { ok: false, error: error.message };
  return { ok: true };
}
