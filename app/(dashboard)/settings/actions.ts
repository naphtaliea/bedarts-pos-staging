"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";

// ── Guard: only admin can call these ──────────────────────────────────────────

async function requireAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "admin") throw new Error("Admin access required");
  return supabase;
}

// ── Store Settings ────────────────────────────────────────────────────────────

export async function updateStoreSettings(data: {
  store_name: string;
  address: string | null;
  phone: string | null;
  email: string | null;
  receipt_footer: string | null;
  tax_rate: number;
  tax_enabled: boolean;
}): Promise<{ error?: string }> {
  const supabase = await requireAdmin().catch((e) => { throw e; });
  const { error } = await supabase
    .from("store_settings")
    .update({ ...data, updated_at: new Date().toISOString() })
    .eq("id", 1);
  if (error) return { error: error.message };
  revalidatePath("/settings");
  return {};
}

// ── Users ─────────────────────────────────────────────────────────────────────

export async function updateUserRole(
  userId: string,
  role: "admin" | "manager" | "cashier"
): Promise<{ error?: string }> {
  await requireAdmin();
  const admin = createAdminClient();
  const { error } = await admin.from("profiles").update({ role }).eq("id", userId);
  if (error) return { error: error.message };
  revalidatePath("/settings");
  return {};
}

export async function setUserPin(userId: string, pin: string): Promise<{ error?: string }> {
  await requireAdmin();
  if (pin.length !== 4 || !/^\d{4}$/.test(pin)) return { error: "PIN must be exactly 4 digits" };
  const admin = createAdminClient();
  const { error } = await admin.from("profiles").update({ pin }).eq("id", userId);
  if (error) return { error: error.message };
  revalidatePath("/settings");
  return {};
}

export async function clearUserPin(userId: string): Promise<{ error?: string }> {
  await requireAdmin();
  const admin = createAdminClient();
  const { error } = await admin.from("profiles").update({ pin: null }).eq("id", userId);
  if (error) return { error: error.message };
  revalidatePath("/settings");
  return {};
}

export async function toggleUserActive(userId: string, isActive: boolean): Promise<{ error?: string }> {
  await requireAdmin();
  const admin = createAdminClient();
  const { error } = await admin.from("profiles").update({ is_active: isActive }).eq("id", userId);
  if (error) return { error: error.message };
  revalidatePath("/settings");
  return {};
}

export async function inviteUser(
  email: string,
  fullName: string,
  role: "admin" | "manager" | "cashier"
): Promise<{ error?: string }> {
  await requireAdmin();
  const admin = createAdminClient();
  const { data, error } = await admin.auth.admin.inviteUserByEmail(email, {
    data: { full_name: fullName, role },
  });
  if (error) return { error: error.message };

  if (data.user) {
    await admin.from("profiles").upsert({
      id: data.user.id,
      full_name: fullName,
      role,
      is_active: true,
    });
  }

  revalidatePath("/settings");
  return {};
}

