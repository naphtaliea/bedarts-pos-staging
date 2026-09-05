import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { SuppliersClient } from "./suppliers-client";
import type { Product, Supplier } from "@/lib/types";

export default async function SuppliersPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [profileRes, suppliersRes, productsRes, purchasesRes] =
    await Promise.all([
      supabase.from("profiles").select("*").eq("id", user.id).single(),
      supabase.from("suppliers").select("*").order("name"),
      supabase
        .from("products")
        .select("id, name, unit, is_active")
        .order("name"),
      supabase
        .from("purchases")
        .select(
          "*, supplier:suppliers(name), receiver:profiles(full_name), purchase_items(*, product:products(name, unit))"
        )
        .order("created_at", { ascending: false })
        .limit(200),
    ]);

  if (!profileRes.data) redirect("/login");
  if (!["admin", "manager"].includes(profileRes.data.role)) redirect("/pos");

  return (
    <SuppliersClient
      suppliers={(suppliersRes.data as Supplier[]) ?? []}
      products={(productsRes.data as Product[]) ?? []}
      purchases={(purchasesRes.data as any[]) ?? []}
    />
  );
}
