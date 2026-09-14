import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { PinClient } from "./pin-client";

export default async function PinPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Already have a PIN session — go straight to POS
  const cookieStore = await cookies();
  if (cookieStore.get("cashier_session")?.value) redirect("/cashier");

  const { data: cashiers } = await supabase
    .from("profiles")
    .select("id, full_name, pin")
    .eq("is_active", true)
    .eq("role", "cashier")
    .order("full_name");

  const cashierList = (cashiers ?? []).map((c) => ({
    id: c.id,
    full_name: c.full_name,
    hasPin: !!c.pin,
  }));

  return <PinClient cashiers={cashierList} />;
}
