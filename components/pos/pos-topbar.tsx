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
    <header className="h-14 flex items-center gap-3 px-4 bg-card border-b border-border shrink-0">
      {/* Left: back button + logo */}
      <div className="flex items-center gap-3 min-w-0">
        {showBack ? (
          <Link
            href={backHref ?? "/cashier"}
            className="inline-flex items-center justify-center w-9 h-9 rounded-lg border border-border text-muted-foreground hover:bg-secondary transition-colors shrink-0"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
        ) : (
          <Link
            href="/cashier"
            className="inline-flex items-center justify-center w-9 h-9 rounded-lg border border-border text-muted-foreground hover:bg-secondary transition-colors shrink-0"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
        )}
        <img src="/logo.svg" alt="Bedarts Cold Supplies" style={{ height: 34 }} />
      </div>

      {/* Center: cashier name */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-foreground truncate">{cashierName}</p>
        <p className="text-xs text-muted-foreground">Main Counter / POS-01</p>
      </div>

      {/* Right: clock + nav + sign out */}
      <div className="flex items-center gap-2 shrink-0">
        <span className="text-sm text-muted-foreground tabular-nums hidden sm:block">{time}</span>

        <Link
          href="/cashier/orders"
          className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-sm font-medium text-foreground hover:bg-secondary transition-colors"
        >
          <Receipt className="w-4 h-4" />
          <span className="hidden sm:inline">Orders</span>
        </Link>

        <Link
          href="/cashier/dashboard"
          className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          <LayoutDashboard className="w-4 h-4" />
          <span className="hidden sm:inline">Dashboard</span>
        </Link>

        <form action={logout}>
          <button
            type="submit"
            className="inline-flex items-center justify-center w-9 h-9 rounded-lg border border-border text-muted-foreground hover:bg-secondary transition-colors"
            title="Sign out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </form>
      </div>
    </header>
  );
}
