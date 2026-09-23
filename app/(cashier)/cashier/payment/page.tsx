import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PaymentClient } from "./payment-client";

export default async function PaymentPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, avatar_url")
    .eq("id", user.id)
    .single();

  return <PaymentClient cashierName={profile?.full_name ?? ""} avatarUrl={profile?.avatar_url ?? null} />;
}
