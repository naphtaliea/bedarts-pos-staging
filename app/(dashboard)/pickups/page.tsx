import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PickupsClient } from "./pickups-client";

export const revalidate = 0;

export default async function PickupsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (!["admin", "manager", "accountant"].includes(profile?.role ?? "")) {
    redirect("/dashboard");
  }

  const [pendingRes, deliveredRes] = await Promise.all([
    supabase
      .from("sales")
      .select(
        `id, total_amount, created_at, pickup_note, pending_pickup, picked_up_at,
         cashier:profiles!sales_cashier_id_fkey(full_name),
         sale_items(id, quantity, package_label, unit_price, total_price,
           product:products(id, name, unit)),
         payments(method, amount)`
      )
      .eq("pending_pickup", true)
      .order("created_at", { ascending: false }),

    supabase
      .from("sales")
      .select(
        `id, total_amount, created_at, pickup_note, picked_up_at,
         cashier:profiles!sales_cashier_id_fkey(full_name),
         picker:profiles!sales_picked_up_by_fkey(full_name),
         sale_items(id, quantity, package_label, unit_price, total_price,
           product:products(id, name, unit)),
         payments(method, amount)`
      )
      .not("picked_up_at", "is", null)
      .order("picked_up_at", { ascending: false })
      .limit(50),
  ]);

  return (
    <PickupsClient
      pending={(pendingRes.data ?? []) as never[]}
      delivered={(deliveredRes.data ?? []) as never[]}
      canEdit={["admin", "manager"].includes(profile?.role ?? "")}
    />
  );
}
