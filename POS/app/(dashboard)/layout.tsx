import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Sidebar } from "@/components/sidebar";
import type { Profile } from "@/lib/types";

export default async function DashboardLayout({
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

  // PGRST116 = "no rows" — profile genuinely absent. Any other error is transient
  // (network blip, cold-start timeout). Only revoke the session when we're certain
  // the account is missing or deactivated; transient errors should not sign users out.
  if (profileError && profileError.code !== "PGRST116") {
    redirect("/login");
  }

  if (!profile || !profile.is_active) {
    await supabase.auth.signOut();
    redirect("/login");
  }

  if (profile.role === "terminal" || profile.role === "cashier") {
    redirect("/cashier");
  }

  if (profile.role === "butcher") {
    redirect("/butcher");
  }

  // Count pending pre-paid pickups so the sidebar can show an alert badge
  const { count: pendingPickups } = await supabase
    .from("sales")
    .select("id", { count: "exact", head: true })
    .eq("pending_pickup", true);

  return (
    <div className="flex h-dvh overflow-hidden">
      <Sidebar profile={profile as Profile} pendingPickups={pendingPickups ?? 0} />
      <main className="flex-1 overflow-y-auto overflow-x-hidden bg-background pt-14 lg:pt-0">
        {children}
      </main>
    </div>
  );
}
