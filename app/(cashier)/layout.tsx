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
    <>
      {children}
      <OfflineSyncer />
    </>
  );
}
