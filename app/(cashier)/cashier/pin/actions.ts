"use server";

import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export async function verifyCashierPin(
  cashierId: string,
  pin: string
): Promise<{ error?: string }> {
  const supabase = await createClient();

  // Use the SECURITY DEFINER RPC to verify PIN without exposing the pin column
  const { data, error } = await supabase.rpc("verify_cashier_pin", {
    p_cashier_id: cashierId,
    p_pin: pin,
  });

  if (error) return { error: error.message };
  if (!data) return { error: "Incorrect PIN" };

  const cookieStore = await cookies();
  cookieStore.set("cashier_session", cashierId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 12, // 12-hour session
  });

  return {};
}

export async function getCashierSession(): Promise<string | null> {
  const cookieStore = await cookies();
  return cookieStore.get("cashier_session")?.value ?? null;
}

export async function clearCashierSession() {
  const cookieStore = await cookies();
  cookieStore.delete("cashier_session");
  redirect("/cashier/pin");
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
