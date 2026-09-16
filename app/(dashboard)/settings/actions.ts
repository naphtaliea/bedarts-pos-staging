"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/auth-guards";
import { revalidatePath } from "next/cache";

// ── Store Settings ────────────────────────────────────────────────────────────

export async function updateStoreSettings(data: {
  store_name: string;
  address: string | null;
  phone: string | null;
  email: string | null;
  vat_number?: string | null;
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
  const supabase = await requireAdmin();
  if (pin.length !== 4 || !/^\d{4}$/.test(pin)) return { error: "PIN must be exactly 4 digits" };
  const { error } = await supabase.rpc("set_cashier_pin", { p_user_id: userId, p_pin: pin });
  if (error) return { error: error.message };
  revalidatePath("/settings");
  return {};
}

export async function clearUserPin(userId: string): Promise<{ error?: string }> {
  await requireAdmin();
  const admin = createAdminClient();
  const { error } = await admin.from("profiles").update({ pin: null }).eq("id", userId);
  if (error) return { error: error.message };
  // Clear any active lockout so the next PIN starts fresh
  await admin.from("pin_lockouts").delete().eq("cashier_id", userId);
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

  if (error) {
    const msg = error.message.toLowerCase();
    if (msg.includes("already registered") || msg.includes("already exists")) {
      return { error: "This email is already registered. If the user needs a different role, update it from the user list." };
    }
    return { error: error.message };
  }

  if (data.user) {
    const { error: upsertError } = await admin.from("profiles").upsert({
      id: data.user.id,
      full_name: fullName,
      role,
      is_active: true,
    });
    if (upsertError) {
      return { error: `User invited but profile could not be saved: ${upsertError.message}` };
    }
  }

  revalidatePath("/settings");
  return {};
}

