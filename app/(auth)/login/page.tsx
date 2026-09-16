"use client";

import { useActionState } from "react";
import { login } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SnowflakePattern } from "@/components/snowflake-pattern";

export default function LoginPage() {
  const [state, formAction, pending] = useActionState(login, { error: "" });

  return (
    <div className="min-h-screen flex flex-col md:flex-row">
      {/* Left panel — brand identity */}
      <div className="relative hidden md:flex md:w-[55%] flex-col bg-sidebar overflow-hidden">
        {/* Full-bleed snowflake pattern */}
        <div className="absolute inset-0 pointer-events-none">
          <SnowflakePattern id="login-bg" opacity={0.14} height="100%" tileSize={56} scale={0.44} />
        </div>

        {/* Content */}
        <div className="relative flex-1 flex flex-col items-center justify-center px-14 z-10">
          <img
            src="/logo-light.svg"
            alt="Bedarts Cold Supplies"
            className="w-56 mb-5"
          />
          <p className="text-sidebar-muted text-center text-sm leading-relaxed max-w-[18rem]">
            Point-of-Sale &amp; Management System
          </p>
        </div>

        <p className="relative z-10 pb-7 text-center text-xs text-sidebar-muted/40">
          © {new Date().getFullYear()} Bedarts Cold Supplies
        </p>
      </div>

      {/* Right panel — form */}
      <div className="flex-1 flex items-center justify-center p-8 bg-background">
        <div className="w-full max-w-sm">
          {/* Mobile logo */}
          <div className="md:hidden flex justify-center mb-8">
            <img src="/logo.svg" alt="Bedarts Cold Supplies" className="h-12 w-auto" />
          </div>

          <div className="mb-8">
            <h1 className="text-foreground">Welcome back</h1>
            <p className="text-muted-foreground text-sm mt-1">
              Sign in to your account to continue.
            </p>
          </div>

          <form action={formAction} className="flex flex-col gap-5">
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-foreground" htmlFor="email">
                Email
              </label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="you@bedarts.com"
                required
                autoComplete="email"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-foreground" htmlFor="password">
                Password
              </label>
              <Input
                id="password"
                name="password"
                type="password"
                placeholder="••••••••"
                required
                autoComplete="current-password"
              />
            </div>

            {state.error.length > 0 && (
              <p className="text-sm text-destructive bg-destructive/8 border border-destructive/20 rounded-lg px-3 py-2">
                {state.error}
              </p>
            )}

            <Button
              type="submit"
              size="lg"
              className="w-full mt-1"
              disabled={pending}
            >
              {pending ? "Signing in…" : "Sign in"}
            </Button>
          </form>

          <p className="text-center text-xs text-muted-foreground/50 mt-8">
            Contact your administrator to get access.
          </p>
        </div>
      </div>
    </div>
  );
}
