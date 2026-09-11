import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { CashierPOSClient } from "./cashier-pos-client";
import type { Category, Product, Profile } from "@/lib/types";

export default async function CashierPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [profileRes, categoriesRes, productsRes] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", user.id).single(),
    supabase.from("categories").select("*").order("name"),
    supabase
      .from("product_stock")
      .select("*, category:categories(name)")
      .eq("is_active", true)
      .order("name")
      .limit(60),
  ]);

  if (!profileRes.data) redirect("/login");

  return (
    <CashierPOSClient
      cashier={profileRes.data as Profile}
      initialCategories={(categoriesRes.data as Category[]) ?? []}
      initialProducts={(productsRes.data as Product[]) ?? []}
    />
  );
}
