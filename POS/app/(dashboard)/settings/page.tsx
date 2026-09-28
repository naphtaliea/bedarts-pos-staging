import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { SettingsClient } from "./settings-client";
import type { Profile, Category, Supplier, StoreSettings, IntegrityCheckResult } from "@/lib/types";
import type { PendingUser } from "./settings-client";

export default async function SettingsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single();
  if (!profile || profile.role !== "admin") redirect("/dashboard");

  const admin = createAdminClient();

  const [settingsRes, usersRes, categoriesRes, suppliersRes, pendingProfilesRes, latestRunRes] = await Promise.all([
    supabase.from("store_settings").select("*").eq("id", 1).single(),
    admin.from("profiles").select("*").eq("is_active", true).order("full_name"),
    supabase.from("categories").select("*").order("name"),
    supabase.from("suppliers").select("*").order("name"),
    admin.from("profiles").select("*").eq("is_active", false).order("created_at"),
    supabase.from("integrity_check_results").select("run_id").order("run_id", { ascending: false }).limit(1).maybeSingle(),
  ]);

  const latestRunId = latestRunRes.data?.run_id ?? null;
  const integrityResults: IntegrityCheckResult[] = latestRunId
    ? ((await supabase
        .from("integrity_check_results")
        .select("*")
        .eq("run_id", latestRunId)
        .order("check_name")
      ).data ?? []) as IntegrityCheckResult[]
    : [];

  const pendingProfiles = (pendingProfilesRes.data ?? []) as Profile[];
  let pendingUsers: PendingUser[] = [];

  if (pendingProfiles.length > 0) {
    const { data: { users: authUsers } } = await admin.auth.admin.listUsers({ perPage: 1000 });
    const pendingIds = new Set(pendingProfiles.map((p) => p.id));
    const authMap = Object.fromEntries(
      authUsers.filter((u) => pendingIds.has(u.id)).map((u) => [u.id, u.email ?? ""])
    );
    pendingUsers = pendingProfiles.map((p) => ({
      id: p.id,
      full_name: p.full_name,
      role: p.role,
      email: authMap[p.id] ?? "",
      created_at: p.created_at,
    }));
  }

  return (
    <SettingsClient
      settings={settingsRes.data as StoreSettings}
      users={(usersRes.data as Profile[]) ?? []}
      categories={(categoriesRes.data as Category[]) ?? []}
      suppliers={(suppliersRes.data as Supplier[]) ?? []}
      pendingUsers={pendingUsers}
      integrityResults={integrityResults}
    />
  );
}
