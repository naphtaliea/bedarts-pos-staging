import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { SettingsClient } from "./settings-client";
import type { Profile, Category, Supplier, StoreSettings } from "@/lib/types";

export default async function SettingsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single();
  if (!profile || profile.role !== "admin") redirect("/dashboard");

  const [settingsRes, usersRes, categoriesRes, suppliersRes] = await Promise.all([
    supabase.from("store_settings").select("*").eq("id", 1).single(),
    supabase.from("profiles").select("*").order("full_name"),
    supabase.from("categories").select("*").order("name"),
    supabase.from("suppliers").select("*").order("name"),
  ]);

  return (
    <SettingsClient
      settings={settingsRes.data as StoreSettings}
      users={(usersRes.data as Profile[]) ?? []}
      categories={(categoriesRes.data as Category[]) ?? []}
      suppliers={(suppliersRes.data as Supplier[]) ?? []}
    />
  );
}
