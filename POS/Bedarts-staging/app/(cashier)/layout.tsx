import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { OfflineSyncer } from "@/components/offline-syncer";

export default async function CashierLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  if (profileError && profileError.code !== "PGRST116") {
    redirect("/login");
  }

  if (!profile || !profile.is_active) {
    await supabase.auth.signOut();
    redirect("/login");
  }

  // Accountants have no business on the cashier POS; admins/managers may access for oversight
  if (profile.role === "accountant") {
    redirect("/dashboard");
  }
  // Butchers only see their own thaw view.
  if (profile.role === "butcher") {
    redirect("/butcher");
  }

  return (
    <>
      {children}
      <OfflineSyncer />
    </>
  );
}
