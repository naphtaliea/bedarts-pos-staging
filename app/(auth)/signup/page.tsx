"use client";

import { useActionState } from "react";
import Link from "next/link";
import { signUpRequest } from "./actions";
import { SnowflakePattern } from "@/components/snowflake-pattern";
import { BrandLogo } from "@/components/brand-logo";

const INPUT_CLASS =
  "w-full h-11 rounded-xl border border-white/20 bg-white/8 px-4 text-sm text-white placeholder:text-white/30 outline-none focus:border-primary focus:ring-2 focus:ring-primary/30 transition-all";

export default function SignupPage() {
  const [state, formAction, pending] = useActionState(signUpRequest, { error: "" });

  return (
    <div className="min-h-dvh bg-white relative overflow-hidden flex flex-col items-center justify-center px-5 py-10">
      {/* Faint snowflake watermark on white */}
      <div className="absolute inset-0 pointer-events-none">
        <SnowflakePattern opacity={0.05} rows={2} tileSize={72} height="100%" onLight />
      </div>

      {/* Red top accent bar */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-primary z-10" />

      <div className="relative z-10 w-full max-w-xs flex flex-col items-center">
        {/* Logo — above the card */}
        <BrandLogo style={{ height: 52, width: "auto" }} className="mb-8" />

        {/* Navy card */}
        <div className="w-full bg-sidebar rounded-2xl px-6 py-7 shadow-float">
          {/* Heading */}
          <div className="mb-6">
            <h1
              className="text-white leading-none mb-1"
              style={{ fontFamily: "var(--font-display)", fontWeight: 900, fontSize: "2rem" }}
            >
              Request access
            </h1>
            <p className="text-sidebar-muted text-sm">An admin will review and activate your account.</p>
          </div>

          {/* Form */}
          <form action={formAction} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-sidebar-muted uppercase tracking-wide" htmlFor="full_name">
                Full Name
              </label>
              <input
                id="full_name"
                name="full_name"
                type="text"
                placeholder="Kwame Mensah"
                required
                autoComplete="name"
                className={INPUT_CLASS}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-sidebar-muted uppercase tracking-wide" htmlFor="email">
                Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                placeholder="kwame@bedarts.com"
                required
                autoComplete="email"
                className={INPUT_CLASS}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-sidebar-muted uppercase tracking-wide" htmlFor="password">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                placeholder="Minimum 8 characters"
                required
                autoComplete="new-password"
                minLength={8}
                className={INPUT_CLASS}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-sidebar-muted uppercase tracking-wide" htmlFor="role">
                Role
              </label>
              <select
                id="role"
                name="role"
                required
                defaultValue=""
                className="w-full h-11 rounded-xl border border-white/20 bg-white/8 px-4 text-sm text-white outline-none focus:border-primary focus:ring-2 focus:ring-primary/30 transition-all appearance-none"
              >
                <option value="" disabled className="bg-sidebar">Select your role…</option>
                <option value="manager" className="bg-sidebar">Manager</option>
                <option value="accountant" className="bg-sidebar">Accountant</option>
              </select>
            </div>

            {state.error.length > 0 && (
              <p className="text-sm text-red-300 bg-red-900/30 border border-red-500/30 rounded-xl px-4 py-2.5">
                {state.error}
              </p>
            )}

            <button
              type="submit"
              disabled={pending}
              className="mt-1 w-full h-12 rounded-xl bg-primary text-white font-bold text-sm hover:bg-primary/90 active:scale-[0.98] transition-all disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {pending ? "Submitting…" : "Request access"}
            </button>
          </form>
        </div>

        {/* Footer link — on white bg */}
        <p className="text-center text-sm text-muted-foreground mt-6">
          Already have an account?{" "}
          <Link href="/login" className="text-foreground hover:text-primary font-semibold transition-colors">
            Sign in
          </Link>
        </p>
      </div>

      {/* Bottom copyright */}
      <p className="absolute bottom-4 text-center text-[11px] text-muted-foreground/40 z-10 tracking-wide">
        © {new Date().getFullYear()} Bedarts Cold Supplies
      </p>
    </div>
  );
}
