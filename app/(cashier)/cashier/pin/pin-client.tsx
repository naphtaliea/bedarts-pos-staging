"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Delete } from "lucide-react";
import { cn } from "@/lib/utils";
import { verifyCashierPin } from "./actions";
import { SnowflakePattern } from "@/components/snowflake-pattern";
import { BrandLogo } from "@/components/brand-logo";

interface Cashier {
  id: string;
  full_name: string;
  hasPin: boolean;
}

const NUMPAD = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0", "del"] as const;

export function PinClient({ cashiers }: { cashiers: Cashier[] }) {
  const router = useRouter();
  const [selected, setSelected] = useState<Cashier | null>(null);
  const [pin, setPin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [verifying, setVerifying] = useState(false);
  const [locked, setLocked] = useState(false);
  const [attemptsRemaining, setAttemptsRemaining] = useState<number | null>(null);
  const [lockedUntil, setLockedUntil] = useState<Date | null>(null);

  function handleSelect(cashier: Cashier) {
    if (!cashier.hasPin) return;
    setSelected(cashier);
    setPin("");
    setError(null);
    setLocked(false);
    setAttemptsRemaining(null);
    setLockedUntil(null);
  }

  function handleKey(key: string) {
    if (locked) return;
    if (key === "del") {
      setPin((p) => p.slice(0, -1));
      setError(null);
      return;
    }
    if (pin.length >= 4) return;
    const next = pin + key;
    setPin(next);
    if (next.length === 4) submitPin(next);
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
      setAttemptsRemaining(res.attemptsRemaining ?? null);
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

  return (
    <div className="min-h-screen bg-sidebar flex flex-col">
      {/* Brand header */}
      <div className="flex flex-col items-center pt-10 pb-2">
        <BrandLogo className="h-10 w-auto mb-5" />
      </div>
      <SnowflakePattern id="pin-snow" opacity={0.18} rows={2} tileSize={44} />

      {/* Main content */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-10">
        {!selected ? (
          <div className="w-full max-w-sm">
            <p className="text-center text-sidebar-foreground font-semibold text-lg mb-1">
              Who&apos;s at the register?
            </p>
            <p className="text-center text-sidebar-muted text-sm mb-7">
              Select your name to get started.
            </p>

            {cashiers.length === 0 ? (
              <p className="text-center text-sidebar-muted text-sm bg-white/5 rounded-2xl px-6 py-8">
                No cashiers with PINs set.<br />Ask your admin to set up PINs in Settings.
              </p>
            ) : (
              <div className="space-y-2">
                {cashiers.map((c) => {
                  const initials = c.full_name
                    .split(" ")
                    .slice(0, 2)
                    .map((n) => n[0] ?? "")
                    .join("")
                    .toUpperCase();
                  return (
                    <button
                      key={c.id}
                      onClick={() => handleSelect(c)}
                      disabled={!c.hasPin}
                      className={cn(
                        "w-full flex items-center gap-4 px-5 py-4 rounded-2xl border transition-all text-left",
                        c.hasPin
                          ? "border-white/10 bg-white/5 text-sidebar-foreground hover:bg-white/10 hover:border-white/20 cursor-pointer active:scale-[0.98]"
                          : "border-white/5 bg-white/[0.02] text-sidebar-muted/50 cursor-not-allowed"
                      )}
                    >
                      <div className="w-9 h-9 rounded-full bg-accent/50 flex items-center justify-center text-sm font-bold text-white shrink-0">
                        {initials}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{c.full_name}</p>
                        {!c.hasPin && (
                          <p className="text-xs text-sidebar-muted/50 mt-0.5">No PIN set</p>
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
              onClick={() => { setSelected(null); setPin(""); setError(null); }}
              className="flex items-center gap-1.5 text-xs text-sidebar-muted hover:text-sidebar-foreground transition-colors mb-8 mx-auto min-h-[44px] px-4"
            >
              ← Back to selection
            </button>

            <p className="text-center text-white font-semibold text-lg mb-0.5">
              {selected.full_name}
            </p>
            <p className="text-center text-sidebar-muted text-sm mb-7">
              Enter your 4-digit PIN
            </p>

            {/* PIN dots */}
            <div className="flex justify-center gap-5 mb-8">
              {[0, 1, 2, 3].map((i) => (
                <div
                  key={i}
                  className={cn(
                    "w-3.5 h-3.5 rounded-full transition-all duration-150",
                    i < pin.length ? "bg-primary scale-110" : "bg-white/20"
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
                  <p className="text-center text-sidebar-muted text-sm mb-5">Verifying…</p>
                )}

                {/* Numpad */}
                <div className="grid grid-cols-3 gap-3">
                  {NUMPAD.map((key, i) => {
                    if (key === "") return <div key={i} />;
                    return (
                      <button
                        key={i}
                        onClick={() => handleKey(key)}
                        disabled={verifying}
                        className={cn(
                          "h-16 rounded-2xl text-xl font-semibold transition-all disabled:opacity-40 active:scale-95",
                          key === "del"
                            ? "bg-white/5 text-sidebar-muted hover:bg-white/10 flex items-center justify-center"
                            : "bg-white/10 text-sidebar-foreground hover:bg-white/18"
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
