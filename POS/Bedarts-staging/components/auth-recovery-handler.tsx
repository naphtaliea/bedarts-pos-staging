"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

// Password-reset emails land the browser on some page with a URL hash like
// `#access_token=...&type=recovery&refresh_token=...`. When a user already has
// a cookie session, the Supabase SSR client will not process that hash (it
// prefers the existing cookie), so the `PASSWORD_RECOVERY` event never fires.
// We detect the hash directly and forward the whole thing to /reset-password,
// which knows how to swap the current session for the recovery one.
export function AuthRecoveryHandler() {
  const router = useRouter();

  useEffect(() => {
    if (typeof window === "undefined") return;

    const hash = window.location.hash;
    const isRecoveryHash =
      hash.includes("access_token") && hash.includes("type=recovery");

    if (isRecoveryHash && window.location.pathname !== "/reset-password") {
      // Full navigation (not router.push) so the hash survives the transition
      // — Next.js client router can strip fragments during in-app pushes.
      window.location.replace("/reset-password" + hash);
      return;
    }

    // Fallback: some flows do fire the event (e.g. no prior session). Cover it.
    const supabase = createClient();
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY" && window.location.pathname !== "/reset-password") {
        router.push("/reset-password");
      }
    });
    return () => subscription.unsubscribe();
  }, [router]);

  return null;
}
