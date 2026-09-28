"use server";

import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export async function login(
  _prevState: { error: string },
  formData: FormData
): Promise<{ error: string }> {
  const supabase = await createClient();

  const { data, error } = await supabase.auth.signInWithPassword({
    email: formData.get("email") as string,
    password: formData.get("password") as string,
  });

  if (error) {
    return { error: "Invalid email or password." };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("is_active, role")
    .eq("id", data.user.id)
    .single();

  // Block inactive accounts
  if (!profile?.is_active) {
    await supabase.auth.signOut();
    return { error: "Your account is pending admin approval. You'll be notified once it's activated." };
  }

  // Cashier accounts don't use direct login — they use the shared terminal
  if (profile?.role === "cashier") {
    await supabase.auth.signOut();
    return { error: "Cashier accounts sign in via the POS terminal PIN screen, not here." };
  }

  redirect("/");
}

export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  const cookieStore = await cookies();
  cookieStore.delete("cashier_session");
  redirect("/login");
}
