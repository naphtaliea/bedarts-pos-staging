import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

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

  // Cashier must have a PIN session
  const cookieStore = await cookies();
  const cashierId = cookieStore.get("cashier_session")?.value;
  if (!cashierId) redirect("/cashier/pin");

  return cashierId;
}
