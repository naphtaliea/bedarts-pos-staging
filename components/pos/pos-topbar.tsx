"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, LayoutDashboard, Receipt, LogOut } from "lucide-react";
import { logout } from "@/app/(auth)/login/actions";

interface PosTopBarProps {
  cashierName: string;
  showBack?: boolean;
  backHref?: string;
}

export function PosTopBar({ cashierName, showBack, backHref }: PosTopBarProps) {
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
    <header className="h-14 flex items-center gap-3 px-5 bg-[#1c0a07] shrink-0">
      {/* Left: back + logo */}
      <div className="flex items-center gap-3 min-w-0">
        {showBack && (
          <Link
            href={backHref ?? "/cashier"}
            className="inline-flex items-center gap-1.5 rounded-lg border border-white/20 px-3 py-1.5 text-xs font-medium text-white/80 hover:bg-white/10 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Back
          </Link>
        )}
        <img
          src="/logo-light.svg"
          alt="Bedarts Cold Supplies"
          style={{ height: 36 }}
        />
      </div>

      {/* Center: cashier info */}
      <div className="flex-1 flex flex-col items-center leading-tight">
        <span className="text-white/90 text-sm font-semibold truncate">{cashierName}</span>
        <span className="text-white/50 text-xs">Cashier</span>
      </div>

      {/* Right: clock + nav + sign out */}
      <div className="flex items-center gap-2 shrink-0">
        <span className="text-white/60 text-xs tabular-nums w-16 text-right">{time}</span>

        <Link
          href="/cashier/orders"
          className="inline-flex items-center gap-1.5 rounded-lg border border-white/20 px-3 py-1.5 text-xs font-medium text-white/80 hover:bg-white/10 transition-colors"
        >
          <Receipt className="w-3.5 h-3.5" />
          Orders
        </Link>

        <Link
          href="/cashier/dashboard"
          className="inline-flex items-center gap-1.5 rounded-lg border-primary bg-primary/80 px-3 py-1.5 text-xs font-medium text-white hover:bg-primary/90 transition-colors border"
        >
          <LayoutDashboard className="w-3.5 h-3.5" />
          Dashboard
        </Link>

        <form action={logout}>
          <button
            type="submit"
            className="inline-flex items-center justify-center rounded-lg border border-white/20 p-1.5 text-white/70 hover:bg-white/10 transition-colors"
            title="Sign out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </form>
      </div>
    </header>
  );
}
