import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { readCashierSession } from "@/lib/cashier-session";
import { PinClient } from "./pin-client";

export default async function PinPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Already have a valid PIN session — go straight to POS
  if (await readCashierSession()) redirect("/cashier");

  const { data: cashiers } = await supabase
    .from("profiles")
    .select("id, full_name, pin, avatar_url")
    .eq("is_active", true)
    .eq("role", "cashier")
    .order("full_name");

  const cashierList = (cashiers ?? []).map((c) => ({
    id: c.id,
    full_name: c.full_name,
    hasPin: !!c.pin,
    avatar_url: c.avatar_url as string | null,
  }));

  return <PinClient cashiers={cashierList} />;
}
