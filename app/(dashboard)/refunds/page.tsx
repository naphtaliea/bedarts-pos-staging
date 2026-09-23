import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { RefundsClient } from "./refunds-client";

export const revalidate = 0;

export default async function RefundsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (!["admin", "manager", "accountant"].includes(profile?.role ?? "")) redirect("/dashboard");

  const { data: sales } = await supabase
    .from("sales")
    .select(
      `id, total_amount, discount_amount, status, created_at, void_reason,
       cashier:profiles!sales_cashier_id_fkey(full_name),
       voider:profiles!sales_voided_by_fkey(full_name),
       sale_items(quantity, unit_price, product:products(name)),
       payments(method, amount)`
    )
    .order("created_at", { ascending: false })
    .limit(200);

  return <RefundsClient sales={(sales ?? []) as any[]} />;
}
