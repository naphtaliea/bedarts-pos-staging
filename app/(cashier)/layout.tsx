import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { CashierHeader } from "@/components/cashier/cashier-header";
import type { Profile } from "@/lib/types";

export default async function CashierLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  if (!profile || !profile.is_active) {
    await supabase.auth.signOut();
    redirect("/login");
  }

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      <CashierHeader profile={profile as Profile} />
      <main className="flex-1 overflow-hidden">
        {children}
      </main>
    </div>
  );
}
