"use server";

import { createClient } from "@/src/lib/supabase/server";

interface SignUpArgs {
  email: string;
  password: string;
  fullName: string;
  phone?: string;
}

export async function signUp(
  args: SignUpArgs
): Promise<{ ok: true } | { ok: false; error: string }> {
  const { email, password, fullName, phone } = args;
  const supabase = await createClient();

  const { data, error } = await supabase.auth.signUp({ email, password });
  if (error) return { ok: false, error: error.message };
  if (!data.user) return { ok: false, error: "Signup failed — please try again." };

  const { error: profileErr } = await supabase
    .from("customer_profiles")
    .insert({ id: data.user.id, full_name: fullName, phone: phone ?? null });

  if (profileErr) return { ok: false, error: "Account created but profile setup failed. Contact support." };

  return { ok: true };
}

export async function signIn(
  email: string,
  password: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export async function signOut(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
}

export async function getCustomerProfile() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from("customer_profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  return data ?? null;
}
