import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { readCashierSession } from "@/lib/cashier-session";

export async function requirePinSession(): Promise<string> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, id")
    .eq("id", user.id)
    .single();

  // Admin/manager bypass PIN — they're already identified by Supabase auth
  if (profile?.role === "admin" || profile?.role === "manager") {
    return user.id;
  }

  // Cashier must have a valid (HMAC-verified) PIN session
  const cashierId = await readCashierSession();
  if (!cashierId) redirect("/cashier/pin");

  return cashierId;
}
