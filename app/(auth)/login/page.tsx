"use client";

import { useActionState } from "react";
import { login } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Snowflake } from "lucide-react";

export default function LoginPage() {
  const [state, formAction, pending] = useActionState(login, { error: "" });

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="flex items-center justify-center w-16 h-16 rounded-2xl bg-blue-700 mb-4">
            <Snowflake className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white">Bedarts Cold Supplies</h1>
          <p className="text-slate-400 text-sm mt-1">Sign in to your account</p>
        </div>

        {/* Form */}
        <div className="bg-slate-900 rounded-2xl border border-slate-800 p-8">
          <form action={formAction} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-slate-300" htmlFor="email">
                Email
              </label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="you@bedarts.com"
                required
                autoComplete="email"
                className="bg-slate-800 border-slate-700 text-white placeholder:text-slate-500 focus:ring-blue-500"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-slate-300" htmlFor="password">
                Password
              </label>
              <Input
                id="password"
                name="password"
                type="password"
                placeholder="••••••••"
                required
                autoComplete="current-password"
                className="bg-slate-800 border-slate-700 text-white placeholder:text-slate-500 focus:ring-blue-500"
              />
            </div>

            {state.error.length > 0 && (
              <p className="text-sm text-red-400 bg-red-950 border border-red-800 rounded-lg px-3 py-2">
                {state.error}
              </p>
            )}

            <Button
              type="submit"
              size="lg"
              className="w-full mt-2"
              disabled={pending}
            >
              {pending ? "Signing in…" : "Sign in"}
            </Button>
          </form>
        </div>

        <p className="text-center text-xs text-slate-600 mt-6">
          Contact your administrator to get access.
        </p>
      </div>
    </div>
  );
}
