"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

type SupplierData = {
  name: string;
  phone: string | null;
  email: string | null;
  address: string | null;
};

// ─── Suppliers ────────────────────────────────────────────────────────────────

export async function createSupplier(
  data: SupplierData
): Promise<{ error?: string }> {
  const supabase = await createClient();

  const { error } = await supabase.from("suppliers").insert(data);
  if (error) return { error: error.message };

  revalidatePath("/suppliers");
  return {};
}

export async function updateSupplier(
  id: string,
  data: SupplierData
): Promise<{ error?: string }> {
  const supabase = await createClient();

  const { error } = await supabase
    .from("suppliers")
    .update(data)
    .eq("id", id);
  if (error) return { error: error.message };

  revalidatePath("/suppliers");
  return {};
}

export async function deleteSupplier(id: string): Promise<{ error?: string }> {
  const supabase = await createClient();

  const { error } = await supabase.from("suppliers").delete().eq("id", id);
  if (error) return { error: error.message };

  revalidatePath("/suppliers");
  return {};
}

// ─── Purchases ────────────────────────────────────────────────────────────────

type PurchaseItem = {
  product_id: string;
  quantity: number;
  cost_price: number;
  expiry_date: string | null;
};

export async function createPurchase(data: {
  supplier_id: string;
  notes: string | null;
  items: PurchaseItem[];
}): Promise<{ error?: string }> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const total_amount = data.items.reduce(
    (sum, item) => sum + item.quantity * item.cost_price,
    0
  );

  // Insert the purchase header
  const { data: purchase, error: purchaseErr } = await supabase
    .from("purchases")
    .insert({
      supplier_id: data.supplier_id,
      received_by: user.id,
      total_amount,
      notes: data.notes,
    })
    .select("id")
    .single();
  if (purchaseErr) return { error: purchaseErr.message };

  // Insert purchase line items
  const { error: itemsErr } = await supabase.from("purchase_items").insert(
    data.items.map((item) => ({
      purchase_id: purchase.id,
      product_id: item.product_id,
      quantity: item.quantity,
      cost_price: item.cost_price,
      expiry_date: item.expiry_date,
    }))
  );
  if (itemsErr) return { error: itemsErr.message };

  // Insert stock batches
  const receivedDate = new Date().toISOString().split("T")[0];
  const { error: batchErr } = await supabase.from("stock_batches").insert(
    data.items.map((item) => ({
      product_id: item.product_id,
      supplier_id: data.supplier_id,
      quantity_received: item.quantity,
      quantity_remaining: item.quantity,
      cost_price: item.cost_price,
      expiry_date: item.expiry_date,
      received_date: receivedDate,
    }))
  );
  if (batchErr) return { error: batchErr.message };

  // Update each product's cost_price to the latest received cost (best-effort)
  for (const item of data.items) {
    await supabase
      .from("products")
      .update({ cost_price: item.cost_price })
      .eq("id", item.product_id);
  }

  revalidatePath("/suppliers");
  revalidatePath("/inventory");
  return {};
}
