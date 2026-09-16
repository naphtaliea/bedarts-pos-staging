import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PaymentClient } from "./payment-client";
import type { Customer } from "@/lib/types";

export default async function PaymentPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [profileRes, customersRes] = await Promise.all([
    supabase.from("profiles").select("full_name").eq("id", user.id).single(),
    supabase.from("customers").select("id, name, phone, price_group, credit_limit, credit_balance").order("name"),
  ]);

  return (
    <PaymentClient
      cashierName={profileRes.data?.full_name ?? ""}
      initialCustomers={(customersRes.data as Customer[]) ?? []}
    />
  );
}
