"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { redirect } from "next/navigation";

export async function signUpRequest(
  _prevState: { error: string },
  formData: FormData
): Promise<{ error: string }> {
  const full_name = (formData.get("full_name") as string)?.trim();
  const email = (formData.get("email") as string)?.trim();
  const password = formData.get("password") as string;
  const role = formData.get("role") as string;

  if (!full_name || !email || !password || !role) {
    return { error: "All fields are required." };
  }
  if (password.length < 8) {
    return { error: "Password must be at least 8 characters." };
  }
  if (!["manager", "accountant"].includes(role)) {
    return { error: "Invalid role selected." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { full_name, role } },
  });

  if (error) {
    const msg = error.message.toLowerCase();
    if (msg.includes("already registered") || msg.includes("already exists") || msg.includes("user already")) {
      return { error: "This email is already registered." };
    }
    return { error: error.message };
  }

  if (!data.user) {
    return { error: "Sign up failed. Please try again." };
  }

  // Override the profile the trigger just created — admin must approve before access
  const admin = createAdminClient();
  await admin.from("profiles").update({ is_active: false }).eq("id", data.user.id);

  // Sign out immediately so they can't access anything
  await supabase.auth.signOut();

  redirect(`/pending?email=${encodeURIComponent(email)}`);
}
