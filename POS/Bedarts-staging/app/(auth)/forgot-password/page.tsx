"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Loader2, CheckCircle2 } from "lucide-react";
import { SnowflakePattern } from "@/components/snowflake-pattern";
import { BrandLogo } from "@/components/brand-logo";
import { requestPasswordReset } from "./actions";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [pending, setPending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setPending(true);
    try {
      await requestPasswordReset(email);
      setSent(true);
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
          {sent ? (
            <div className="flex flex-col items-center gap-4 py-2 text-center">
              <div className="w-12 h-12 rounded-full bg-success/20 flex items-center justify-center">
                <CheckCircle2 className="w-6 h-6 text-success" />
              </div>
              <div>
                <p className="text-white font-semibold text-base">Check your email</p>
                <p className="text-sidebar-muted text-sm mt-1">
                  If <span className="text-white">{email}</span> is registered, you&apos;ll receive a reset link shortly.
                </p>
              </div>
              <Link
                href="/login"
                className="mt-2 text-sm text-primary hover:text-primary/80 font-semibold transition-colors flex items-center gap-1.5"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                Back to sign in
              </Link>
            </div>
          ) : (
            <>
              <div className="mb-6">
                <h1
                  className="text-white leading-none mb-1"
                  style={{ fontFamily: "var(--font-display)", fontWeight: 900, fontSize: "1.75rem" }}
                >
                  Reset password
                </h1>
                <p className="text-sidebar-muted text-sm">
                  Enter your email and we&apos;ll send a reset link.
                </p>
              </div>

              <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-sidebar-muted uppercase tracking-wide" htmlFor="email">
                    Email
                  </label>
                  <input
                    id="email"
                    type="email"
                    required
                    autoComplete="email"
                    placeholder="you@bedarts.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full h-11 rounded-xl border border-white/20 bg-white/8 px-4 text-sm text-white placeholder:text-white/30 outline-none focus:border-primary focus:ring-2 focus:ring-primary/30 transition-all"
                  />
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
                  {pending ? "Sending…" : "Send reset link"}
                </button>
              </form>
            </>
          )}
        </div>

        {!sent && (
          <Link
            href="/login"
            className="mt-6 text-sm text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1.5"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Back to sign in
          </Link>
        )}
      </div>

      <p className="absolute bottom-4 text-center text-[11px] text-muted-foreground/40 z-10 tracking-wide">
        © {new Date().getFullYear()} Bedarts Cold Supplies
      </p>
    </div>
  );
}
