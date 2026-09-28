"use server";

import { createClient } from "@/lib/supabase/server";

export async function requestPasswordReset(
  email: string
): Promise<{ error?: string }> {
  const supabase = await createClient();

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL ?? "https://pos.bedarts.workers.dev"}/auth/confirm?next=/reset-password`,
  });

  // Never reveal whether the email exists — always return success.
  if (error && process.env.NODE_ENV === "development") {
    console.error("resetPasswordForEmail error:", error.message);
  }

  return {};
}
