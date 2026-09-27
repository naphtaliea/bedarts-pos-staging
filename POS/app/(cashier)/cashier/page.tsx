import { redirect } from "next/navigation";
import { unstable_cache } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createCacheClient } from "@/lib/supabase/cache";
import { requirePinSession } from "@/lib/require-pin-session";
import { CashierPOSClient } from "./cashier-pos-client";
import type { Category, Product, Profile, ProductPackage, StoreSettings } from "@/lib/types";

const getCachedCategories = unstable_cache(
  async () => {
    const supabase = createCacheClient();
    const { data } = await supabase.from("categories").select("*").order("name");
    return (data ?? []) as Category[];
  },
  ["pos-categories"],
  { revalidate: 300 }
);

const getCachedPackages = unstable_cache(
  async () => {
    const supabase = createCacheClient();
    const { data } = await supabase.from("product_packages").select("*").order("label");
    return (data ?? []) as ProductPackage[];
  },
  ["pos-packages"],
  { revalidate: 300 }
);

export default async function CashierPage() {
  const cashierId = await requirePinSession();
  // requirePinSession already verified auth and redirects to /login if unauthenticated
  const supabase = await createClient();

  const [profileRes, productsRes, categories, packages, settingsRes] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", cashierId).single(),
    supabase
      .from("product_stock")
      .select("*, category:categories(name)")
      .eq("is_active", true)
      .order("name")
      .limit(200),
    getCachedCategories(),
    getCachedPackages(),
    supabase.from("store_settings").select("*").eq("id", 1).single(),
  ]);

  if (!profileRes.data) redirect("/login");

  const validStockRes = await supabase
    .from("stock_batches")
    .select("product_id")
    .gt("quantity_remaining", 0)
    .or("expiry_date.is.null,expiry_date.gte." + new Date().toISOString().split("T")[0]);

  const validProductIds = new Set(
    (validStockRes.data ?? []).map((r: { product_id: string }) => r.product_id)
  );

  const products = ((productsRes.data as Product[]) ?? []).map((p) => ({
    ...p,
    has_valid_stock: validProductIds.has(p.id),
  }));

  return (
    <CashierPOSClient
      cashier={profileRes.data as Profile}
      initialCategories={categories}
      initialProducts={products}
      initialPackages={packages}
      initialSettings={(settingsRes.data as StoreSettings) ?? null}
    />
  );
}
