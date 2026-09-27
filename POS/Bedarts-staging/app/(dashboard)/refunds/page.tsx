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

  const { data: sales, error: salesError } = await supabase
    .from("sales")
    .select(
      `id, total_amount, discount_amount, status, created_at, void_reason,
       cashier:profiles!cashier_id(full_name),
       voider:profiles!voided_by(full_name),
       sale_items(id, quantity, unit_price, total_price, cost_at_sale, discount_amount,
         product:products(id, name, unit)),
       payments(method, amount),
       refunds(id, refund_amount, created_at)`
    )
    .order("created_at", { ascending: false })
    .limit(200);

  if (salesError) console.error("[refunds] query error:", salesError);

  return <RefundsClient sales={(sales ?? []) as any[]} />;
}
