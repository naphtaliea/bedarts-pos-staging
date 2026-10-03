"use client";

import { useState, useEffect, useId } from "react";
import { X, Eye, EyeOff, Loader2, UserRound } from "lucide-react";
import { createClient } from "@/src/lib/supabase/client";
import { cn } from "@/src/lib/utils";
import { Dialog } from "@/src/components/dialog";

interface AuthModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  defaultTab?: "signin" | "signup";
}

export function AuthModal({ open, onClose, onSuccess, defaultTab = "signin" }: AuthModalProps) {
  const [tab, setTab] = useState<"signin" | "signup">(defaultTab);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPw, setShowPw] = useState(false);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");

  const titleId = useId();
  const errorId = useId();
  const nameId = useId();
  const emailId = useId();
  const phoneId = useId();
  const passwordId = useId();

  useEffect(() => {
    if (open) {
      setError("");
      setTab(defaultTab);
    }
  }, [open, defaultTab]);

  async function handleGuest() {
    setError("");
    setLoading(true);
    const supabase = createClient();
    try {
      const { error: anonErr } = await supabase.auth.signInAnonymously();
      if (anonErr) {
        setError(anonErr.message);
        return;
      }
      onSuccess?.();
      onClose();
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const supabase = createClient();
    try {
      if (tab === "signin") {
        const { error: signInErr } = await supabase.auth.signInWithPassword({ email, password });
        if (signInErr) {
          setError(signInErr.message);
          return;
        }
      } else {
        // Profile row is auto-created by a DB trigger on auth.users insert;
        // pass name/phone via user metadata so the trigger picks them up.
        const { data, error: signUpErr } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              full_name: fullName,
              phone: phone || null,
            },
          },
        });
        if (signUpErr) {
          setError(signUpErr.message);
          return;
        }
        if (!data.user) {
          setError("Signup failed — please try again.");
          return;
        }
        // If email confirmation is required, session is null after signUp.
        // Tell the user to confirm before signing in rather than closing.
        if (!data.session) {
          setError("Check your email to confirm your account, then sign in.");
          return;
        }
      }
      onSuccess?.();
      onClose();
    } finally {
      setLoading(false);
    }
  }

  const inputClass =
    "w-full h-11 px-3.5 rounded-xl border border-border bg-input text-sm text-foreground placeholder-muted-foreground outline-none transition-shadow focus:ring-2 focus:ring-accent/30 focus:border-accent";

  return (
    <Dialog
      open={open}
      onClose={onClose}
      variant="sheet-bottom"
      labelledById={titleId}
      panelClassName="w-full max-w-sm"
    >
      <div className="bg-card rounded-t-3xl sm:rounded-2xl shadow-float overflow-hidden">
        {/* Header */}
        <div className="flex items-start justify-between px-5 pt-5 pb-4">
          <div>
            <p className="text-[11px] font-semibold tracking-widest uppercase text-muted-foreground">
              Bedarts Cold Supplies
            </p>
            <h2 id={titleId} className="font-display-black text-xl uppercase text-foreground mt-0.5">
              {tab === "signin" ? "Welcome back" : "Create account"}
            </h2>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="h-10 w-10 -mr-2 -mt-1 rounded-lg flex items-center justify-center text-muted-foreground hover:bg-background active:bg-background transition-colors"
          >
            <X className="w-5 h-5" aria-hidden="true" />
          </button>
        </div>

        {/* Tabs */}
        <div role="tablist" aria-label="Authentication" className="flex px-5 gap-1 mb-4">
          {(["signin", "signup"] as const).map((t) => (
            <button
              key={t}
              role="tab"
              aria-selected={tab === t}
              onClick={() => {
                setTab(t);
                setError("");
              }}
              className={cn(
                "flex-1 h-10 rounded-lg text-xs font-semibold transition-colors",
                tab === t
                  ? "text-white bg-navy"
                  : "text-muted-foreground hover:bg-background"
              )}
            >
              {t === "signin" ? "Sign in" : "Create account"}
            </button>
          ))}
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="px-5 pb-6 space-y-3">
          {tab === "signup" && (
            <div>
              <label htmlFor={nameId} className="sr-only">Full name</label>
              <input
                id={nameId}
                required
                type="text"
                placeholder="Full name"
                autoComplete="name"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className={inputClass}
              />
            </div>
          )}

          <div>
            <label htmlFor={emailId} className="sr-only">Email address</label>
            <input
              id={emailId}
              required
              type="email"
              placeholder="Email address"
              autoComplete="email"
              inputMode="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={inputClass}
              aria-invalid={!!error && tab === "signin" || undefined}
              aria-describedby={error ? errorId : undefined}
            />
          </div>

          {tab === "signup" && (
            <div>
              <label htmlFor={phoneId} className="sr-only">Phone number (optional)</label>
              <input
                id={phoneId}
                type="tel"
                placeholder="Phone (optional)"
                autoComplete="tel"
                inputMode="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className={inputClass}
              />
            </div>
          )}

          <div>
            <label htmlFor={passwordId} className="sr-only">Password</label>
            <div className="relative">
              <input
                id={passwordId}
                required
                type={showPw ? "text" : "password"}
                placeholder="Password"
                autoComplete={tab === "signin" ? "current-password" : "new-password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={cn(inputClass, "pr-12")}
                minLength={6}
                aria-describedby={error ? errorId : undefined}
              />
              <button
                type="button"
                onClick={() => setShowPw((p) => !p)}
                aria-label={showPw ? "Hide password" : "Show password"}
                aria-pressed={showPw}
                className="absolute right-1 top-1/2 -translate-y-1/2 h-10 w-10 flex items-center justify-center rounded-lg text-muted-foreground hover:bg-background active:bg-background transition-colors"
              >
                {showPw ? <EyeOff className="w-4 h-4" aria-hidden="true" /> : <Eye className="w-4 h-4" aria-hidden="true" />}
              </button>
            </div>
          </div>

          {error && (
            <p
              id={errorId}
              role="alert"
              className="text-xs font-medium rounded-lg px-3 py-2 bg-primary/10 text-primary"
            >
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full h-11 rounded-xl text-sm font-semibold text-primary-foreground bg-primary flex items-center justify-center gap-2 transition-transform hover:opacity-90 active:scale-[0.98] disabled:opacity-60"
          >
            {loading && <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />}
            {tab === "signin" ? "Sign in" : "Create account"}
          </button>

          {tab === "signup" && (
            <p className="text-xs text-center text-muted-foreground leading-relaxed">
              By creating an account you agree to our{" "}
              <a href="/terms" className="text-accent hover:underline">Terms</a>
              {" and "}
              <a href="/returns" className="text-accent hover:underline">Returns policy</a>.
            </p>
          )}
        </form>

        {/* Guest option */}
        <div className="px-5 pb-5 -mt-2">
          <div className="relative my-4">
            <div className="absolute inset-x-0 top-1/2 border-t border-border" aria-hidden="true" />
            <span className="relative bg-card px-3 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground mx-auto block w-fit">
              or
            </span>
          </div>
          <button
            type="button"
            onClick={handleGuest}
            disabled={loading}
            className="w-full h-11 rounded-xl text-sm font-semibold text-foreground border border-border bg-card flex items-center justify-center gap-2 hover:bg-background active:bg-background transition-colors disabled:opacity-60"
          >
            <UserRound className="w-4 h-4" aria-hidden="true" />
            Continue as guest
          </button>
          <p className="mt-2 text-[11px] text-center text-muted-foreground leading-relaxed">
            You&apos;ll enter your name, phone and email at checkout.
          </p>
        </div>
      </div>
    </Dialog>
  );
}
