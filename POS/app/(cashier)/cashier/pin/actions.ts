"use server";

import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { signCashierSession, readCashierSession } from "@/lib/cashier-session";

export async function verifyCashierPin(
  cashierId: string,
  pin: string
): Promise<{ error?: string; locked?: boolean; lockedUntil?: string; attemptsRemaining?: number }> {
  const supabase = await createClient();

  const { data, error } = await supabase.rpc("verify_cashier_pin", {
    p_cashier_id: cashierId,
    p_pin: pin,
  });

  if (error) return { error: error.message };

  const result = data as { success: boolean; locked?: boolean; locked_until?: string; attempts_remaining?: number };

  if (result.locked) {
    return {
      error: "Account locked — too many incorrect attempts",
      locked: true,
      lockedUntil: result.locked_until,
    };
  }

  if (!result.success) {
    return {
      error: "Incorrect PIN",
      locked: false,
      attemptsRemaining: result.attempts_remaining,
    };
  }

  // Block re-entry once the cashier has reconciled for the day
  const today = new Date().toISOString().slice(0, 10);
  const { data: existingRecon } = await supabase
    .from("cashier_reconciliations")
    .select("id")
    .eq("cashier_id", cashierId)
    .eq("shift_date", today)
    .maybeSingle();
  if (existingRecon) {
    return { error: "You've already closed out for today. See you tomorrow." };
  }

  // Session expires at 6AM each day — forces PIN re-entry at the start of each business day
  const now = new Date();
  const next6am = new Date(now);
  next6am.setHours(6, 0, 0, 0);
  if (next6am.getTime() <= now.getTime()) next6am.setDate(next6am.getDate() + 1);
  const secondsUntil6am = Math.floor((next6am.getTime() - now.getTime()) / 1000);

  const signed = await signCashierSession(cashierId);
  const cookieStore = await cookies();
  cookieStore.set("cashier_session", signed, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: secondsUntil6am,
  });

  return {};
}

export async function getCashierSession(): Promise<string | null> {
  return readCashierSession();
}

export async function clearCashierSession() {
  const cookieStore = await cookies();
  cookieStore.delete("cashier_session");
  redirect("/cashier/pin");
}

export async function setTerminalPin(
  cashierId: string,
  pin: string
): Promise<{ error?: string }> {
  if (!/^\d{4}$/.test(pin)) return { error: "PIN must be exactly 4 digits" };

  // AUTHORIZATION — only admin/manager can set another user's PIN
  const { requireManagerOrAdmin } = await import("@/lib/auth-guards");
  try {
    await requireManagerOrAdmin();
  } catch {
    return { error: "You don't have permission to set PINs" };
  }

  // Verify the target is an active cashier (not an admin etc.)
  const supabase = await createClient();
  const { data: profile } = await supabase
    .from("profiles")
    .select("role, is_active")
    .eq("id", cashierId)
    .single();

  if (!profile || profile.role !== "cashier" || !profile.is_active) {
    return { error: "Invalid cashier account" };
  }

  const { createAdminClient } = await import("@/lib/supabase/admin");
  const admin = createAdminClient();
  const { error } = await admin.rpc("set_cashier_pin", { p_user_id: cashierId, p_pin: pin });
  if (error) return { error: error.message };

  return {};
}

export async function checkCashierLockout(
  cashierId: string
): Promise<{ locked: boolean; lockedUntil?: string }> {
  const { createAdminClient } = await import("@/lib/supabase/admin");
  const admin = createAdminClient();
  const { data } = await admin
    .from("pin_lockouts")
    .select("locked_until")
    .eq("cashier_id", cashierId)
    .maybeSingle();

  if (data?.locked_until && new Date(data.locked_until) > new Date()) {
    return { locked: true, lockedUntil: data.locked_until };
  }
  return { locked: false };
}

export async function getActiveCashiers() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("profiles")
    .select("id, full_name, pin")
    .eq("is_active", true)
    .eq("role", "cashier")
    .order("full_name");
  return (data ?? []).map((p) => ({ id: p.id, full_name: p.full_name, hasPin: !!p.pin }));
}
