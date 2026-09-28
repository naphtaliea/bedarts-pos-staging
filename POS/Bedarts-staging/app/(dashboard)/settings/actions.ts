"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/auth-guards";
import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

// ── Avatar Upload ─────────────────────────────────────────────────────────────

export async function uploadCashierAvatar(
  cashierId: string,
  formData: FormData
): Promise<{ error?: string; url?: string }> {
  await requireAdmin();
  const admin = createAdminClient();

  const file = formData.get("file") as File | null;
  if (!file || file.size === 0) return { error: "No file provided" };
  if (file.size > 2 * 1024 * 1024) return { error: "Image must be under 2 MB" };

  const ext = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
  const path = `${cashierId}.${ext}`;

  const { error: uploadError } = await admin.storage
    .from("avatars")
    .upload(path, file, { upsert: true, contentType: file.type });

  if (uploadError) return { error: uploadError.message };

  const { data: { publicUrl } } = admin.storage.from("avatars").getPublicUrl(path);

  const { error: updateError } = await admin
    .from("profiles")
    .update({ avatar_url: publicUrl })
    .eq("id", cashierId);

  if (updateError) return { error: updateError.message };

  revalidatePath("/settings");
  return { url: publicUrl };
}

// ── Store Settings ────────────────────────────────────────────────────────────

export async function updateStoreSettings(data: {
  store_name: string;
  address: string | null;
  phone: string | null;
  email: string | null;
  vat_number?: string | null;
  opening_hours?: string | null;
  sunday_hours?: string | null;
  receipt_footer: string | null;
  receipt_paper_size?: "58mm" | "80mm";
  tax_rate: number;
  tax_enabled: boolean;
}): Promise<{ error?: string }> {
  const supabase = await requireAdmin().catch((e) => { throw e; });

  // Hard-block tax_enabled until VAT collection is properly wired (see roadmap)
  const safeData = { ...data, tax_enabled: false };

  const { error } = await supabase
    .from("store_settings")
    .update({ ...safeData, updated_at: new Date().toISOString() })
    .eq("id", 1);
  if (error) return { error: error.message };
  revalidatePath("/settings");
  return {};
}

// ── Users ─────────────────────────────────────────────────────────────────────

export async function updateUserRole(
  userId: string,
  role: "admin" | "manager" | "cashier" | "accountant"
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

export async function approveUser(userId: string): Promise<{ error?: string }> {
  await requireAdmin();
  const admin = createAdminClient();
  const { error } = await admin.from("profiles").update({ is_active: true }).eq("id", userId);
  if (error) return { error: error.message };
  revalidatePath("/settings");
  return {};
}

export async function rejectUser(userId: string): Promise<{ error?: string }> {
  await requireAdmin();
  const admin = createAdminClient();
  const { error } = await admin.auth.admin.deleteUser(userId);
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

export async function addCashier(fullName: string): Promise<{ error?: string }> {
  await requireAdmin();
  const admin = createAdminClient();

  // Create a headless auth account — cashiers never log in with email/password
  const shortId = crypto.randomUUID().slice(0, 8);
  const email = `cashier-${shortId}@bedarts.internal`;
  const password = crypto.randomUUID() + crypto.randomUUID();

  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: fullName, role: "cashier" },
  });

  if (error) return { error: error.message };

  if (data.user) {
    const { error: profileError } = await admin.from("profiles").upsert({
      id: data.user.id,
      full_name: fullName,
      role: "cashier",
      is_active: true,
    });
    if (profileError) return { error: profileError.message };
  }

  revalidatePath("/settings");
  return {};
}

export async function createTerminal(
  email: string,
  fullName: string,
  password: string
): Promise<{ error?: string }> {
  await requireAdmin();
  if (password.length < 8) return { error: "Password must be at least 8 characters" };
  const admin = createAdminClient();

  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: fullName, role: "terminal" },
  });

  if (error) {
    const msg = error.message.toLowerCase();
    if (msg.includes("already registered") || msg.includes("already exists")) {
      return { error: "This email is already registered." };
    }
    return { error: error.message };
  }

  if (data.user) {
    const { error: profileError } = await admin.from("profiles").upsert({
      id: data.user.id,
      full_name: fullName,
      role: "terminal",
      is_active: true,
    });
    if (profileError) return { error: profileError.message };
  }

  revalidatePath("/settings");
  return {};
}

export async function inviteUser(
  email: string,
  fullName: string,
  role: "admin" | "manager" | "cashier" | "accountant"
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

// ── Integrity Checks ──────────────────────────────────────────────────────────

export async function runIntegrityChecks(): Promise<{
  error?: string;
  summary?: { errors: number; warnings: number; ok: number; total_checks: number };
}> {
  const supabase = await requireAdmin();
  const { data, error } = await supabase.rpc("run_integrity_checks");
  if (error) return { error: error.message };
  revalidatePath("/settings");
  return { summary: data as { errors: number; warnings: number; ok: number; total_checks: number } };
}

