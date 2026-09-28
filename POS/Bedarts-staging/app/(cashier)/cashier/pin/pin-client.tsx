"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Delete } from "lucide-react";
import { cn } from "@/lib/utils";
import { verifyCashierPin, setTerminalPin, checkCashierLockout } from "./actions";
import { BrandLogo } from "@/components/brand-logo";

interface Cashier {
  id: string;
  full_name: string;
  hasPin: boolean;
  avatar_url: string | null;
}

const NUMPAD = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0", "del"] as const;

type Mode = "select" | "enter" | "setup-create" | "setup-confirm";

export function PinClient({ cashiers }: { cashiers: Cashier[] }) {
  const router = useRouter();
  const [selected, setSelected] = useState<Cashier | null>(null);
  const [mode, setMode] = useState<Mode>("select");
  const [pin, setPin] = useState("");
  const [firstPin, setFirstPin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [verifying, setVerifying] = useState(false);
  const [locked, setLocked] = useState(false);
  const [lockedUntil, setLockedUntil] = useState<Date | null>(null);
  const handleKeyRef = useRef<(key: string) => void>(() => {});
  handleKeyRef.current = (key: string) => handleKey(key);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (mode === "select") return;
      if (/^[0-9]$/.test(e.key)) { e.preventDefault(); handleKeyRef.current(e.key); }
      else if (e.key === "Backspace") { e.preventDefault(); handleKeyRef.current("del"); }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [mode]);

  async function handleSelect(cashier: Cashier) {
    setSelected(cashier);
    setPin("");
    setError(null);
    setLocked(false);
    setLockedUntil(null);

    const lockStatus = await checkCashierLockout(cashier.id);
    if (lockStatus.locked) {
      setLocked(true);
      setLockedUntil(lockStatus.lockedUntil ? new Date(lockStatus.lockedUntil) : null);
      setMode("enter");
      return;
    }

    setMode(cashier.hasPin ? "enter" : "setup-create");
  }

  function handleBack() {
    setSelected(null);
    setPin("");
    setFirstPin("");
    setError(null);
    setMode("select");
  }

  function handleKey(key: string) {
    if (verifying) return;
    if (locked && mode === "enter") return;
    if (key === "del") { setPin(p => p.slice(0, -1)); setError(null); return; }
    if (pin.length >= 4) return;
    const next = pin + key;
    setPin(next);
    if (next.length === 4) {
      if (mode === "enter") submitPin(next);
      else if (mode === "setup-create") { setFirstPin(next); setPin(""); setMode("setup-confirm"); }
      else if (mode === "setup-confirm") confirmSetup(next);
    }
  }

  async function confirmSetup(second: string) {
    if (second !== firstPin) {
      setError("PINs don't match — try again");
      setPin("");
      setFirstPin("");
      setMode("setup-create");
      return;
    }
    setVerifying(true);
    const res = await setTerminalPin(selected!.id, second);
    if (res.error) {
      setError(res.error);
      setPin("");
      setFirstPin("");
      setMode("setup-create");
      setVerifying(false);
      return;
    }
    // PIN saved — now verify it to issue the session
    await submitPin(second);
  }

  async function submitPin(pinValue: string) {
    if (!selected) return;
    setVerifying(true);
    setError(null);
    const res = await verifyCashierPin(selected.id, pinValue);
    setVerifying(false);

    if (res.locked) {
      setLocked(true);
      setLockedUntil(res.lockedUntil ? new Date(res.lockedUntil) : null);
      setError(res.error ?? "Account locked");
      setPin("");
      return;
    }
    if (res.error) {
      setError(
        res.attemptsRemaining != null && res.attemptsRemaining > 0
          ? `Incorrect PIN — ${res.attemptsRemaining} attempt${res.attemptsRemaining === 1 ? "" : "s"} remaining`
          : res.error
      );
      setPin("");
      return;
    }

    router.push("/cashier");
    router.refresh();
  }

  const heading =
    mode === "setup-create" ? "Create your PIN" :
    mode === "setup-confirm" ? "Confirm your PIN" :
    selected?.full_name ?? "";

  const subheading =
    mode === "setup-create" ? "Choose a 4-digit PIN to access the POS" :
    mode === "setup-confirm" ? "Enter the same PIN again to confirm" :
    "Enter your 4-digit PIN";

  const isSetupMode = mode === "setup-create" || mode === "setup-confirm";

  return (
    <div className="min-h-dvh bg-sidebar flex flex-col">
      <div className="flex flex-col items-center pt-10 pb-2">
        <BrandLogo variant="reverse" className="h-10 w-auto mb-5" />
      </div>

      <div className="flex-1 flex flex-col items-center justify-center px-6 py-10">
        {mode === "select" ? (
          <div className="w-full max-w-sm">
            <p className="text-center text-sidebar-foreground font-semibold text-lg mb-1">
              Who&apos;s at the register?
            </p>
            <p className="text-center text-sidebar-muted text-sm mb-7">
              Select your name to get started.
            </p>

            {cashiers.length === 0 ? (
              <p className="text-center text-sidebar-muted text-sm bg-white/5 rounded-2xl px-6 py-8">
                No staff added yet.<br />Head to Settings → Users to add your team.
              </p>
            ) : (
              <div className="space-y-2">
                {cashiers.map((c) => {
                  const initials = c.full_name
                    .split(" ").slice(0, 2)
                    .map((n) => n[0] ?? "").join("").toUpperCase();
                  return (
                    <button
                      key={c.id}
                      onClick={() => handleSelect(c)}
                      className="w-full flex items-center gap-4 px-5 py-4 rounded-2xl border border-white/10 bg-white/5 text-sidebar-foreground hover:bg-white/10 hover:border-white/20 cursor-pointer active:scale-[0.98] transition-all text-left"
                    >
                      <div className="w-10 h-10 rounded-full overflow-hidden bg-accent/50 flex items-center justify-center text-sm font-bold text-white shrink-0">
                        {c.avatar_url ? (
                          <img src={c.avatar_url} alt={c.full_name} className="w-full h-full object-cover" />
                        ) : initials}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{c.full_name}</p>
                        {!c.hasPin && (
                          <p className="text-xs text-sidebar-muted/70 mt-0.5">Tap to set PIN</p>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        ) : (
          <div className="w-full max-w-xs">
            <button
              onClick={handleBack}
              className="flex items-center gap-1.5 text-xs text-sidebar-muted hover:text-sidebar-foreground transition-colors mb-8 mx-auto min-h-[44px] px-4"
            >
              ← Back
            </button>

            {isSetupMode && (
              <div className="flex justify-center gap-1.5 mb-5">
                <div className={cn("h-1 w-8 rounded-full transition-colors", mode === "setup-create" ? "bg-primary" : "bg-white/30")} />
                <div className={cn("h-1 w-8 rounded-full transition-colors", mode === "setup-confirm" ? "bg-primary" : "bg-white/20")} />
              </div>
            )}

            <p className="text-center text-white font-semibold text-lg mb-0.5">{heading}</p>
            <p className="text-center text-sidebar-muted text-sm mb-7">{subheading}</p>

            <div className="flex justify-center gap-4 mb-8">
              {[0, 1, 2, 3].map((i) => (
                <div
                  key={i}
                  className={cn(
                    "w-4 h-4 rounded-full transition-all duration-200",
                    i < pin.length
                      ? "bg-primary scale-125 shadow-[0_0_16px_rgba(204,27,20,0.7)]"
                      : "bg-white/10 ring-1 ring-white/15"
                  )}
                />
              ))}
            </div>

            {locked ? (
              <div className="text-center bg-destructive/10 rounded-2xl px-5 py-6 mb-2">
                <p className="text-destructive font-semibold text-sm mb-1">Account locked</p>
                <p className="text-destructive/80 text-xs">
                  Too many incorrect attempts.
                  {lockedUntil && (
                    <> Try again after {lockedUntil.toLocaleTimeString("en-GH", { hour: "2-digit", minute: "2-digit" })}.</>
                  )}
                </p>
              </div>
            ) : (
              <>
                {error && (
                  <p className="text-center text-destructive text-sm mb-5 bg-destructive/10 rounded-xl py-2 px-3">
                    {error}
                  </p>
                )}
                {verifying && (
                  <p className="text-center text-sidebar-muted text-sm mb-5">
                    {mode === "setup-confirm" ? "Saving PIN…" : "Verifying…"}
                  </p>
                )}

                <div className="grid grid-cols-3 gap-3">
                  {NUMPAD.map((key, i) => {
                    if (key === "") return <div key={i} />;
                    return (
                      <button
                        key={i}
                        onClick={() => handleKey(key)}
                        disabled={verifying}
                        className={cn(
                          "h-16 rounded-2xl btn-tactile-dark active:btn-tactile-dark-active disabled:opacity-40",
                          key === "del"
                            ? "text-sidebar-muted hover:text-white flex items-center justify-center"
                            : "text-sidebar-foreground text-2xl font-display-black"
                        )}
                      >
                        {key === "del" ? <Delete className="w-5 h-5" /> : key}
                      </button>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
