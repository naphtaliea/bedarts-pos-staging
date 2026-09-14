"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Snowflake, Delete } from "lucide-react";
import { cn } from "@/lib/utils";
import { verifyCashierPin } from "./actions";

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

  function handleSelect(cashier: Cashier) {
    if (!cashier.hasPin) return;
    setSelected(cashier);
    setPin("");
    setError(null);
  }

  function handleKey(key: string) {
    if (key === "del") {
      setPin((p) => p.slice(0, -1));
      setError(null);
      return;
    }
    if (pin.length >= 4) return;
    const next = pin + key;
    setPin(next);
    if (next.length === 4) {
      submitPin(next);
    }
  }

  async function submitPin(pinValue: string) {
    if (!selected) return;
    setVerifying(true);
    setError(null);
    const res = await verifyCashierPin(selected.id, pinValue);
    setVerifying(false);
    if (res.error) {
      setError("Incorrect PIN");
      setPin("");
      return;
    }
    router.push("/cashier");
    router.refresh();
  }

  return (
    <div className="min-h-screen bg-sidebar flex flex-col items-center justify-center p-6">
      {/* Logo */}
      <div className="flex items-center gap-3 mb-10">
        <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center">
          <Snowflake className="w-5 h-5 text-white" />
        </div>
        <div>
          <p className="text-white font-bold text-sm">Bedarts</p>
          <p className="text-sidebar-muted text-xs">Cold Supplies</p>
        </div>
      </div>

      {!selected ? (
        /* Cashier selection */
        <div className="w-full max-w-sm">
          <p className="text-center text-sidebar-foreground font-semibold mb-6">Who's at the register?</p>
          {cashiers.length === 0 ? (
            <p className="text-center text-sidebar-muted text-sm">No cashiers with PINs set. Ask your admin to set up PINs in Settings.</p>
          ) : (
            <div className="space-y-2">
              {cashiers.map((c) => (
                <button
                  key={c.id}
                  onClick={() => handleSelect(c)}
                  disabled={!c.hasPin}
                  className={cn(
                    "w-full text-left px-5 py-4 rounded-2xl border transition-colors",
                    c.hasPin
                      ? "border-white/10 bg-white/5 text-sidebar-foreground hover:bg-white/10 cursor-pointer"
                      : "border-white/5 bg-white/[0.02] text-sidebar-muted cursor-not-allowed"
                  )}
                >
                  <p className="text-sm font-medium">{c.full_name}</p>
                  {!c.hasPin && <p className="text-xs text-sidebar-muted mt-0.5">No PIN set</p>}
                </button>
              ))}
            </div>
          )}
        </div>
      ) : (
        /* PIN entry */
        <div className="w-full max-w-xs">
          <button
            onClick={() => { setSelected(null); setPin(""); setError(null); }}
            className="flex items-center gap-1.5 text-xs text-sidebar-muted hover:text-sidebar-foreground transition-colors mb-6 mx-auto"
          >
            ← Back
          </button>

          <p className="text-center text-sidebar-foreground font-semibold mb-1">{selected.full_name}</p>
          <p className="text-center text-sidebar-muted text-sm mb-6">Enter your 4-digit PIN</p>

          {/* PIN dots */}
          <div className="flex justify-center gap-4 mb-8">
            {[0, 1, 2, 3].map((i) => (
              <div
                key={i}
                className={cn(
                  "w-4 h-4 rounded-full transition-all",
                  i < pin.length
                    ? "bg-primary scale-110"
                    : "bg-white/20"
                )}
              />
            ))}
          </div>

          {error && (
            <p className="text-center text-destructive text-sm mb-4">{error}</p>
          )}

          {verifying && (
            <p className="text-center text-sidebar-muted text-sm mb-4">Verifying…</p>
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
                    "h-16 rounded-2xl text-xl font-semibold transition-colors disabled:opacity-40",
                    key === "del"
                      ? "bg-white/5 text-sidebar-muted hover:bg-white/10 flex items-center justify-center"
                      : "bg-white/10 text-sidebar-foreground hover:bg-white/20 active:scale-95"
                  )}
                >
                  {key === "del" ? <Delete className="w-5 h-5" /> : key}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
