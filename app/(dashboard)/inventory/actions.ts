"use server";

import { requireManagerOrAdmin } from "@/lib/auth-guards";
import { revalidatePath } from "next/cache";

type ProductData = {
  name: string;
  category_id: string | null;
  unit: string;
  units_per_box: number;
  selling_price: number;
  wholesale_price: number | null;
  low_stock_threshold: number;
  image_url: string | null;
};

// ─── Products ─────────────────────────────────────────────────────────────────

export async function createProduct(
  data: ProductData
): Promise<{ error?: string }> {
  const supabase = await requireManagerOrAdmin();

  const { data: created, error } = await supabase
    .from("products")
    .insert(data)
    .select("id, units_per_box, selling_price")
    .single();
  if (error) return { error: error.message };

  // Auto-provision Full Box + Half Box packages with default prices
  // (derived from selling_price × qty; user can edit them from the product form)
  const fullQty = created.units_per_box;
  const halfQty = created.units_per_box / 2;
  const fullPrice = Number(created.selling_price) * fullQty;
  const halfPrice = Number(created.selling_price) * halfQty;
  await supabase.from("product_packages").insert([
    { product_id: created.id, label: "Full Box", quantity: fullQty, price: fullPrice },
    { product_id: created.id, label: "Half Box", quantity: halfQty, price: halfPrice },
  ]);

  revalidatePath("/inventory");
  return {};
}

export async function updateProduct(
  id: string,
  data: ProductData
): Promise<{ error?: string }> {
  const supabase = await requireManagerOrAdmin();

  // Read current price before overwriting for history log
  const { data: current } = await supabase
    .from("products")
    .select("selling_price")
    .eq("id", id)
    .single();

  const { error } = await supabase.from("products").update(data).eq("id", id);
  if (error) return { error: error.message };

  if (current && current.selling_price !== data.selling_price) {
    const { data: { user } } = await supabase.auth.getUser();
    await supabase.from("price_history").insert({
      product_id: id,
      old_price: current.selling_price,
      new_price: data.selling_price,
      changed_by: user?.id ?? null,
    });
  }

  revalidatePath("/inventory");
  return {};
}

export async function deleteProduct(id: string): Promise<{ error?: string }> {
  const supabase = await requireManagerOrAdmin();

  const { error } = await supabase.from("products").delete().eq("id", id);
  if (error) return { error: error.message };

  revalidatePath("/inventory");
  return {};
}

export async function toggleProductActive(
  id: string,
  isActive: boolean
): Promise<{ error?: string }> {
  const supabase = await requireManagerOrAdmin();

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
  const supabase = await requireManagerOrAdmin();

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
  const supabase = await requireManagerOrAdmin();

  const { error } = await supabase.from("categories").delete().eq("id", id);
  if (error) {
    if ((error as { code?: string }).code === "23503" || error.message.includes("foreign key")) {
      return { error: "This category is used by one or more products. Reassign those products first, or delete them, before removing this category." };
    }
    return { error: error.message };
  }

  revalidatePath("/inventory");
  return {};
}

// ─── Stock Batches ────────────────────────────────────────────────────────────

export async function receiveStock(data: {
  product_id: string;
  supplier_id: string;
  payment_method: string;
  quantity_received: number;
  cost_price: number;
  expiry_date: string | null;
  received_date: string;
  notes: string | null;
}): Promise<{ error?: string }> {
  const supabase = await requireManagerOrAdmin();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  // Insert stock batch
  const { error: batchErr } = await supabase.from("stock_batches").insert({
    product_id: data.product_id,
    quantity_received: data.quantity_received,
    quantity_remaining: data.quantity_received,
    cost_price: data.cost_price,
    expiry_date: data.expiry_date,
    received_date: data.received_date,
    notes: data.notes,
    supplier_id: data.supplier_id,
  });
  if (batchErr) return { error: batchErr.message };

  // Create purchase record — immediately marked as paid
  const total_amount = data.quantity_received * data.cost_price;
  const { data: purchase, error: purchaseErr } = await supabase
    .from("purchases")
    .insert({
      supplier_id: data.supplier_id,
      received_by: user.id,
      total_amount,
      notes: data.notes,
      payment_status: "paid",
      paid_at: new Date().toISOString(),
      payment_method: data.payment_method,
      paid_by: user.id,
    })
    .select("id")
    .single();
  if (purchaseErr) return { error: purchaseErr.message };

  // Create purchase line item
  const { error: itemErr } = await supabase.from("purchase_items").insert({
    purchase_id: purchase.id,
    product_id: data.product_id,
    quantity: data.quantity_received,
    cost_price: data.cost_price,
    expiry_date: data.expiry_date,
  });
  if (itemErr) return { error: itemErr.message };

  // Update product's current cost_price to the latest received cost
  await supabase
    .from("products")
    .update({ cost_price: data.cost_price })
    .eq("id", data.product_id);

  revalidatePath("/inventory");
  revalidatePath("/suppliers");
  return {};
}

export async function receiveBulkStock(data: {
  supplier_id: string;
  payment_method: string;
  received_date: string;
  notes: string | null;
  items: Array<{
    product_id: string;
    quantity_received: number;
    cost_price: number;
    expiry_date: string | null;
  }>;
}): Promise<{ error?: string }> {
  const supabase = await requireManagerOrAdmin();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const total_amount = data.items.reduce(
    (sum, item) => sum + item.quantity_received * item.cost_price,
    0
  );

  const { data: purchase, error: purchaseErr } = await supabase
    .from("purchases")
    .insert({
      supplier_id: data.supplier_id,
      received_by: user.id,
      total_amount,
      notes: data.notes,
      payment_status: "paid",
      paid_at: new Date().toISOString(),
      payment_method: data.payment_method,
      paid_by: user.id,
    })
    .select("id")
    .single();
  if (purchaseErr) return { error: purchaseErr.message };

  const { error: batchErr } = await supabase.from("stock_batches").insert(
    data.items.map((item) => ({
      product_id: item.product_id,
      quantity_received: item.quantity_received,
      quantity_remaining: item.quantity_received,
      cost_price: item.cost_price,
      expiry_date: item.expiry_date,
      received_date: data.received_date,
      notes: data.notes,
      supplier_id: data.supplier_id,
    }))
  );
  if (batchErr) return { error: batchErr.message };

  const { error: itemErr } = await supabase.from("purchase_items").insert(
    data.items.map((item) => ({
      purchase_id: purchase.id,
      product_id: item.product_id,
      quantity: item.quantity_received,
      cost_price: item.cost_price,
      expiry_date: item.expiry_date,
    }))
  );
  if (itemErr) return { error: itemErr.message };

  // Update each product's cost_price to the latest received cost
  const latestCosts = new Map<string, number>();
  for (const item of data.items) {
    latestCosts.set(item.product_id, item.cost_price);
  }
  for (const [product_id, cost_price] of latestCosts) {
    await supabase.from("products").update({ cost_price }).eq("id", product_id);
  }

  revalidatePath("/inventory");
  revalidatePath("/suppliers");
  return {};
}

// ─── Product Packages ─────────────────────────────────────────────────────────

export async function createProductPackage(data: {
  product_id: string;
  label: string;
  quantity: number;
  price: number;
}): Promise<{ error?: string }> {
  const supabase = await requireManagerOrAdmin();
  const { error } = await supabase.from("product_packages").insert(data);
  if (error) return { error: error.message };
  revalidatePath("/inventory");
  return {};
}

export async function deleteProductPackage(id: string): Promise<{ error?: string }> {
  const supabase = await requireManagerOrAdmin();
  const { error } = await supabase.from("product_packages").delete().eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/inventory");
  return {};
}

/**
 * Ensures the given product has exactly two packages — "Full Box" and "Half Box" —
 * with quantities derived from units_per_box, and prices set by the caller.
 * Idempotent: safe to call on every product save.
 */
export async function upsertBoxPackages(
  productId: string,
  fullPrice: number,
  halfPrice: number
): Promise<{ error?: string }> {
  const supabase = await requireManagerOrAdmin();

  const { data: product, error: pErr } = await supabase
    .from("products")
    .select("units_per_box")
    .eq("id", productId)
    .single();
  if (pErr || !product) return { error: pErr?.message ?? "Product not found" };

  const fullQty = product.units_per_box;
  const halfQty = product.units_per_box / 2;

  // Delete any packages that aren't Full/Half to keep the two-package invariant
  await supabase
    .from("product_packages")
    .delete()
    .eq("product_id", productId)
    .not("label", "in", '("Full Box","Half Box")');

  const { data: existing } = await supabase
    .from("product_packages")
    .select("id, label")
    .eq("product_id", productId);

  const existingMap = new Map((existing ?? []).map((p) => [p.label, p.id]));

  const rows: Array<{ id?: string; product_id: string; label: string; quantity: number; price: number }> = [
    { id: existingMap.get("Full Box"), product_id: productId, label: "Full Box", quantity: fullQty, price: fullPrice },
    { id: existingMap.get("Half Box"), product_id: productId, label: "Half Box", quantity: halfQty, price: halfPrice },
  ];

  for (const row of rows) {
    if (row.id) {
      const { error } = await supabase
        .from("product_packages")
        .update({ quantity: row.quantity, price: row.price })
        .eq("id", row.id);
      if (error) return { error: error.message };
    } else {
      const { error } = await supabase
        .from("product_packages")
        .insert({ product_id: row.product_id, label: row.label, quantity: row.quantity, price: row.price });
      if (error) return { error: error.message };
    }
  }

  revalidatePath("/inventory");
  return {};
}

// ─── Stock Adjustments ────────────────────────────────────────────────────────

export async function markdownProduct(
  productId: string,
  newPrice: number
): Promise<{ error?: string }> {
  const supabase = await requireManagerOrAdmin();

  const { data: current } = await supabase
    .from("products")
    .select("selling_price")
    .eq("id", productId)
    .single();

  const { error } = await supabase
    .from("products")
    .update({ selling_price: newPrice })
    .eq("id", productId);
  if (error) return { error: error.message };

  if (current) {
    const { data: { user } } = await supabase.auth.getUser();
    await supabase.from("price_history").insert({
      product_id: productId,
      old_price: current.selling_price,
      new_price: newPrice,
      changed_by: user?.id ?? null,
      notes: "Markdown from inventory alerts",
    });
  }

  revalidatePath("/inventory");
  return {};
}

export async function adjustStock(data: {
  product_id: string;
  quantity_change: number;
  reason: "write_off" | "waste" | "theft" | "damaged" | "correction" | "return" | "found";
  notes: string | null;
}): Promise<{ error?: string }> {
  const supabase = await requireManagerOrAdmin();

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
    // Deducting reasons: remove from batches FIFO (oldest received_date first)
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
