import { createClient } from "@/lib/supabase/server";

export async function requireAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "admin") throw new Error("Admin access required");
  return supabase;
}

export async function requireManagerOrAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (!["admin", "manager", "accountant"].includes(profile?.role ?? "")) throw new Error("Access required");
  return supabase;
}

/**
 * Read/insert on financial records: admin, manager, accountant.
 * Matches the RLS policies on expenses / expense_audit_log.
 */
export async function requireFinancialRole() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (!["admin", "manager", "accountant"].includes(profile?.role ?? "")) {
    throw new Error("Financial role required");
  }
  return { supabase, userId: user.id, role: profile!.role as string };
}

/**
 * Edit/soft-delete on expenses: admin, manager only (accountant excluded).
 */
export async function requireExpenseEditor() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (!["admin", "manager"].includes(profile?.role ?? "")) {
    throw new Error("Manager or admin required to edit expenses");
  }
  return { supabase, userId: user.id, role: profile!.role as string };
}
