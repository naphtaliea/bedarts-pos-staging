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

  const [profileRes, productsRes, categoriesRes, batchesRes, adjustmentsRes, suppliersRes, packagesRes] =
    await Promise.all([
      supabase.from("profiles").select("*").eq("id", user.id).single(),
      supabase
        .from("product_stock")
        .select("*, category:categories(name)")
        .order("name"),
      supabase.from("categories").select("*").order("name"),
      supabase
        .from("stock_batches")
        .select("*, product:products(name, unit)")
        .order("received_date", { ascending: false }),
      supabase
        .from("stock_adjustments")
        .select("*, product:products(name), adjuster:profiles(full_name)")
        .order("created_at", { ascending: false })
        .limit(200),
      supabase.from("suppliers").select("id, name").order("name"),
      supabase.from("product_packages").select("*").order("label"),
    ]);

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
    />
  );
}
