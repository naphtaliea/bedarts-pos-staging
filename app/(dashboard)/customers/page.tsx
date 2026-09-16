import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { CustomersClient } from "./customers-client";
import type { Customer } from "@/lib/types";

export default async function CustomersPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [profileRes, customersRes] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", user.id).single(),
    supabase
      .from("customers")
      .select("*")
      .order("name"),
  ]);

  if (!profileRes.data) redirect("/login");
  if (!["admin", "manager"].includes(profileRes.data.role)) redirect("/pos");

  return (
    <CustomersClient
      customers={(customersRes.data as Customer[]) ?? []}
    />
  );
}
