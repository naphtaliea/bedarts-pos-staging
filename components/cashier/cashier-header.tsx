"use client";

import { useEffect, useState } from "react";
import { LogOut } from "lucide-react";
import { logout } from "@/app/(auth)/login/actions";
import type { Profile } from "@/lib/types";

export function CashierHeader({ profile }: { profile: Profile }) {
  const [time, setTime] = useState("");

  useEffect(() => {
    const tick = () =>
      setTime(
        new Date().toLocaleTimeString("en-GH", {
          hour: "2-digit",
          minute: "2-digit",
          hour12: true,
        })
      );
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <header className="flex items-center justify-between px-5 h-12 bg-[#1c0a07] shrink-0">
      <div className="flex items-center gap-2.5">
        <img src="/logo-light.svg" alt="Bedarts Cold Supplies" className="h-6" />
      </div>

      <span className="text-sm font-mono font-medium text-slate-300 tabular-nums">
        {time}
      </span>

      <div className="flex items-center gap-3">
        <div className="text-right">
          <p className="text-xs font-semibold text-white leading-tight">{profile.full_name}</p>
          <p className="text-xs text-slate-500">Cashier</p>
        </div>
        <form action={logout}>
          <button
            type="submit"
            title="Sign out"
            className="flex items-center justify-center w-8 h-8 rounded-lg text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </form>
      </div>
    </header>
  );
}
