"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, Loader2, CheckCircle2 } from "lucide-react";
import { SnowflakePattern } from "@/components/snowflake-pattern";
import { BrandLogo } from "@/components/brand-logo";
import { createClient } from "@/lib/supabase/client";

export default function ResetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [pending, setPending] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");
  const [ready, setReady] = useState(false);

  // If we arrived with a recovery hash (#access_token=…&type=recovery&…),
  // establish that session so updateUser can act on the recovery grant.
  // This replaces any prior cookie session (e.g. if the user was still
  // signed in as admin when they clicked the reset link).
  useEffect(() => {
    if (typeof window === "undefined") return;
    const hash = window.location.hash;

    if (!hash || !hash.includes("access_token")) {
      setReady(true);
      return;
    }

    const params = new URLSearchParams(hash.slice(1));
    const access_token = params.get("access_token");
    const refresh_token = params.get("refresh_token");
    const type = params.get("type");

    if (!access_token || !refresh_token || type !== "recovery") {
      setReady(true);
      return;
    }

    const supabase = createClient();
    supabase.auth
      .setSession({ access_token, refresh_token })
      .then(({ error: sessErr }) => {
        if (sessErr) {
          setError("This reset link has expired. Request a new one.");
        }
        // Clean the URL so a refresh does not re-run this and expose tokens
        window.history.replaceState(null, "", "/reset-password");
        setReady(true);
      });
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords don't match.");
      return;
    }

    setPending(true);
    try {
      const supabase = createClient();
      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) {
        setError(updateError.message);
        return;
      }
      await supabase.auth.signOut();
      setDone(true);
      setTimeout(() => router.replace("/login"), 2500);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="min-h-dvh bg-white relative overflow-hidden flex flex-col items-center justify-center px-5 py-10">
      <div className="absolute inset-0 pointer-events-none">
        <SnowflakePattern opacity={0.05} rows={2} tileSize={72} height="100%" onLight />
      </div>
      <div className="absolute top-0 left-0 right-0 h-1 bg-primary z-10" />

      <div className="relative z-10 w-full max-w-xs flex flex-col items-center">
        <BrandLogo style={{ height: 52, width: "auto" }} className="mb-8" />

        <div className="w-full bg-sidebar rounded-2xl px-6 py-7 shadow-float">
          {!ready ? (
            <div className="flex flex-col items-center gap-3 py-6 text-center">
              <Loader2 className="w-6 h-6 text-white/70 animate-spin" />
              <p className="text-sidebar-muted text-sm">Verifying reset link…</p>
            </div>
          ) : done ? (
            <div className="flex flex-col items-center gap-4 py-2 text-center">
              <div className="w-12 h-12 rounded-full bg-success/20 flex items-center justify-center">
                <CheckCircle2 className="w-6 h-6 text-success" />
              </div>
              <div>
                <p className="text-white font-semibold text-base">Password updated</p>
                <p className="text-sidebar-muted text-sm mt-1">Redirecting you to sign in…</p>
              </div>
            </div>
          ) : (
            <>
              <div className="mb-6">
                <h1
                  className="text-white leading-none mb-1"
                  style={{ fontFamily: "var(--font-display)", fontWeight: 900, fontSize: "1.75rem" }}
                >
                  New password
                </h1>
                <p className="text-sidebar-muted text-sm">Choose a strong password for your account.</p>
              </div>

              <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-sidebar-muted uppercase tracking-wide">
                    New password
                  </label>
                  <div className="relative">
                    <input
                      type={showPwd ? "text" : "password"}
                      required
                      minLength={8}
                      placeholder="Min. 8 characters"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full h-11 rounded-xl border border-white/20 bg-white/8 pl-4 pr-11 text-sm text-white placeholder:text-white/30 outline-none focus:border-primary focus:ring-2 focus:ring-primary/30 transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPwd((v) => !v)}
                      aria-label={showPwd ? "Hide password" : "Show password"}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/80 transition-colors"
                    >
                      {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-sidebar-muted uppercase tracking-wide">
                    Confirm password
                  </label>
                  <div className="relative">
                    <input
                      type={showConfirm ? "text" : "password"}
                      required
                      placeholder="Repeat password"
                      value={confirm}
                      onChange={(e) => setConfirm(e.target.value)}
                      className="w-full h-11 rounded-xl border border-white/20 bg-white/8 pl-4 pr-11 text-sm text-white placeholder:text-white/30 outline-none focus:border-primary focus:ring-2 focus:ring-primary/30 transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirm((v) => !v)}
                      aria-label={showConfirm ? "Hide password" : "Show password"}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/80 transition-colors"
                    >
                      {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {error && (
                  <p className="text-sm text-white bg-destructive/90 rounded-xl px-4 py-2.5">{error}</p>
                )}

                <button
                  type="submit"
                  disabled={pending}
                  className="mt-1 w-full h-12 rounded-xl bg-primary text-white font-bold text-sm hover:bg-primary/90 active:scale-[0.98] transition-all disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {pending && <Loader2 className="w-4 h-4 animate-spin" />}
                  {pending ? "Saving…" : "Set new password"}
                </button>
              </form>
            </>
          )}
        </div>
      </div>

      <p className="absolute bottom-4 text-center text-[11px] text-muted-foreground/40 z-10 tracking-wide">
        © {new Date().getFullYear()} Bedarts Cold Supplies
      </p>
    </div>
  );
}
