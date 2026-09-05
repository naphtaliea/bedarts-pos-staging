"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

type ProductData = {
  name: string;
  category_id: string | null;
  unit: string;
  selling_price: number;
  cost_price: number;
  temperature_zone: "frozen" | "chilled" | "ambient";
  low_stock_threshold: number;
};

// ─── Products ─────────────────────────────────────────────────────────────────

export async function createProduct(
  data: ProductData
): Promise<{ error?: string }> {
  const supabase = await createClient();

  const { error } = await supabase.from("products").insert(data);
  if (error) return { error: error.message };

  revalidatePath("/inventory");
  return {};
}

export async function updateProduct(
  id: string,
  data: ProductData
): Promise<{ error?: string }> {
  const supabase = await createClient();

  const { error } = await supabase.from("products").update(data).eq("id", id);
  if (error) return { error: error.message };

  revalidatePath("/inventory");
  return {};
}

export async function toggleProductActive(
  id: string,
  isActive: boolean
): Promise<{ error?: string }> {
  const supabase = await createClient();

  const { error } = await supabase
    .from("products")
    .update({ is_active: isActive })
    .eq("id", id);
  if (error) return { error: error.message };

  revalidatePath("/inventory");
  return {};
}

// ─── Categories ───────────────────────────────────────────────────────────────

export async function createCategory(
  name: string
): Promise<{ id: string; name: string } | { error: string }> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("categories")
    .insert({ name })
    .select("id, name")
    .single();
  if (error) return { error: error.message };

  revalidatePath("/inventory");
  return data;
}

export async function deleteCategory(id: string): Promise<{ error?: string }> {
  const supabase = await createClient();

  const { error } = await supabase.from("categories").delete().eq("id", id);
  if (error) return { error: error.message };

  revalidatePath("/inventory");
  return {};
}

// ─── Stock Batches ────────────────────────────────────────────────────────────

export async function receiveStock(data: {
  product_id: string;
  quantity_received: number;
  cost_price: number;
  expiry_date: string | null;
  received_date: string;
  notes: string | null;
}): Promise<{ error?: string }> {
  const supabase = await createClient();

  const { error } = await supabase.from("stock_batches").insert({
    product_id: data.product_id,
    quantity_received: data.quantity_received,
    quantity_remaining: data.quantity_received,
    cost_price: data.cost_price,
    expiry_date: data.expiry_date,
    received_date: data.received_date,
    notes: data.notes,
    supplier_id: null,
  });
  if (error) return { error: error.message };

  revalidatePath("/inventory");
  return {};
}

// ─── Stock Adjustments ────────────────────────────────────────────────────────

export async function adjustStock(data: {
  product_id: string;
  quantity_change: number;
  reason: "write_off" | "correction" | "return";
  notes: string | null;
}): Promise<{ error?: string }> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  // Record the adjustment
  const { error: adjErr } = await supabase.from("stock_adjustments").insert({
    product_id: data.product_id,
    adjusted_by: user.id,
    quantity_change: data.quantity_change,
    reason: data.reason,
    notes: data.notes,
  });
  if (adjErr) return { error: adjErr.message };

  if (data.quantity_change < 0) {
    // Write-off: deduct from batches FIFO (oldest received_date first)
    let remaining = Math.abs(data.quantity_change);

    const { data: batches, error: batchErr } = await supabase
      .from("stock_batches")
      .select("id, quantity_remaining")
      .eq("product_id", data.product_id)
      .gt("quantity_remaining", 0)
      .order("received_date", { ascending: true })
      .order("created_at", { ascending: true });

    if (batchErr) return { error: batchErr.message };

    for (const batch of batches ?? []) {
      if (remaining <= 0) break;
      const deduct = Math.min(remaining, batch.quantity_remaining);
      const { error: updateErr } = await supabase
        .from("stock_batches")
        .update({ quantity_remaining: batch.quantity_remaining - deduct })
        .eq("id", batch.id);
      if (updateErr) return { error: updateErr.message };
      remaining -= deduct;
    }
  } else {
    // Correction / return: add a new batch priced at the product's current cost_price
    const { data: product, error: productErr } = await supabase
      .from("products")
      .select("cost_price")
      .eq("id", data.product_id)
      .single();
    if (productErr) return { error: productErr.message };

    const today = new Date().toISOString().slice(0, 10);
    const { error: batchErr } = await supabase.from("stock_batches").insert({
      product_id: data.product_id,
      quantity_received: data.quantity_change,
      quantity_remaining: data.quantity_change,
      cost_price: product.cost_price,
      received_date: today,
      expiry_date: null,
      notes: data.notes,
      supplier_id: null,
    });
    if (batchErr) return { error: batchErr.message };
  }

  revalidatePath("/inventory");
  return {};
}
