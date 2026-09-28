import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { InventoryClient } from "./inventory-client";
import type { Category, Product, ProductPackage, Profile } from "@/lib/types";

export default async function InventoryPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [profileRes, productsRes, categoriesRes, batchesRes, adjustmentsRes, suppliersRes, packagesRes, pickupsRes] =
    await Promise.all([
      supabase.from("profiles").select("*").eq("id", user.id).single(),
      supabase
        .from("product_stock")
        .select("*, category:categories(name)")
        .order("name"),
      supabase.from("categories").select("*").order("name"),
      supabase
        .from("stock_batches")
        .select("*, product:products(name, unit, selling_price)")
        .order("received_date", { ascending: false }),
      supabase
        .from("stock_adjustments")
        .select("*, product:products(name), adjuster:profiles(full_name)")
        .order("created_at", { ascending: false })
        .limit(200),
      supabase.from("suppliers").select("id, name").order("name"),
      supabase.from("product_packages").select("*").order("label"),
      supabase
        .from("sales")
        .select("id, stock_deducted, sale_items(product_id, quantity)")
        .eq("pending_pickup", true),
    ]);

  // Aggregate pending pickup qty per product. Split by whether stock is
  // already deducted (legacy sales flagged after the fact — inventory needs
  // to be reduced by this) vs not yet deducted (new pre-orders — inventory
  // stays untouched until delivery, no action needed at receiving).
  const pickupQtyByProduct = new Map<string, { alreadyDeducted: number; awaiting: number }>();
  for (const sale of (pickupsRes.data ?? []) as { stock_deducted: boolean; sale_items: { product_id: string; quantity: number }[] }[]) {
    for (const it of sale.sale_items ?? []) {
      const cur = pickupQtyByProduct.get(it.product_id) ?? { alreadyDeducted: 0, awaiting: 0 };
      if (sale.stock_deducted) cur.alreadyDeducted += Number(it.quantity);
      else cur.awaiting += Number(it.quantity);
      pickupQtyByProduct.set(it.product_id, cur);
    }
  }
  const pickupSummary = Object.fromEntries(pickupQtyByProduct.entries());

  if (!profileRes.data) redirect("/login");

  // Role check: only admin and manager can access inventory
  if (!["admin", "manager"].includes(profileRes.data.role)) redirect("/pos");

  return (
    <InventoryClient
      profile={profileRes.data as Profile}
      products={(productsRes.data as Product[]) ?? []}
      categories={(categoriesRes.data as Category[]) ?? []}
      batches={(batchesRes.data as any[]) ?? []}
      adjustments={(adjustmentsRes.data as any[]) ?? []}
      suppliers={(suppliersRes.data as any[]) ?? []}
      packages={(packagesRes.data as ProductPackage[]) ?? []}
      pickupSummary={pickupSummary}
    />
  );
}
