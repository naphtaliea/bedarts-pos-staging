"use client";

import { useActionState, useEffect, useState } from "react";
import Link from "next/link";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { login } from "./actions";
import { SnowflakePattern } from "@/components/snowflake-pattern";
import { BrandLogo } from "@/components/brand-logo";

export default function LoginPage() {
  const [state, formAction, pending] = useActionState(login, { error: "" });
  const [showPwd, setShowPwd] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // Purge only PWA caches that could carry authenticated content between users.
  // NEVER touch workbox-precache-* or static-* caches — deleting them forces the SW
  // to refetch every JS chunk on next navigation, which makes the app hang.
  useEffect(() => {
    if (typeof window === "undefined" || !("caches" in window)) return;
    const AUTHED_CACHES = ["pages", "pages-rsc", "pages-rsc-prefetch", "next-data", "apis", "start-url"];
    Promise.all(AUTHED_CACHES.map((k) => caches.delete(k).catch(() => false)))
      .catch(() => { /* non-fatal */ });
  }, []);

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
              Welcome back
            </h1>
            <p className="text-sidebar-muted text-sm">Sign in to your account.</p>
          </div>

          {/* Form */}
          <form action={formAction} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-sidebar-muted uppercase tracking-wide" htmlFor="email">
                Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                placeholder="you@bedarts.com"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full h-11 rounded-xl border border-white/20 bg-white/8 px-4 text-sm text-white placeholder:text-white/30 outline-none focus:border-primary focus:ring-2 focus:ring-primary/30 transition-all"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-sidebar-muted uppercase tracking-wide" htmlFor="password">
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  name="password"
                  type={showPwd ? "text" : "password"}
                  placeholder="••••••••"
                  required
                  autoComplete="current-password"
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

            {state.error.length > 0 && (
              <p className="text-sm text-white bg-destructive/90 rounded-xl px-4 py-2.5">
                {state.error}
              </p>
            )}

            <button
              type="submit"
              disabled={pending}
              className="mt-1 w-full h-12 rounded-xl bg-primary text-white font-bold text-sm hover:bg-primary/90 active:scale-[0.98] transition-all disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {pending && <Loader2 className="w-4 h-4 animate-spin" />}
              {pending ? "Signing in…" : "Sign in"}
            </button>
          </form>
        </div>

        {/* Footer link — on white bg */}
        <p className="text-center text-sm text-muted-foreground mt-6">
          Don&apos;t have an account?{" "}
          <Link href="/signup" className="text-foreground hover:text-primary font-semibold transition-colors">
            Request access
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
