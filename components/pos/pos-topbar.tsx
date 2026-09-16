"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Receipt, LayoutDashboard, LogOut } from "lucide-react";
import { logout } from "@/app/(auth)/login/actions";
import { BrandLogo } from "@/components/brand-logo";

interface PosTopBarProps {
  cashierName: string;
  showBack?: boolean;
  backHref?: string;
  hideDashboardLink?: boolean;
}

export function PosTopBar({ cashierName, showBack, backHref, hideDashboardLink }: PosTopBarProps) {
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
    <header className="h-11 flex items-center gap-3 px-4 bg-sidebar border-b border-white/10 shrink-0">
      {/* Left: back or logo */}
      <div className="flex items-center gap-3 min-w-0">
        {showBack && (
          <Link
            href={backHref ?? "/cashier"}
            aria-label="Go back"
            className="inline-flex items-center justify-center w-9 h-9 rounded-lg border border-white/15 text-sidebar-muted hover:bg-white/10 hover:text-sidebar-foreground transition-colors shrink-0"
          >
            <ArrowLeft className="w-4 h-4" aria-hidden="true" />
          </Link>
        )}
        <BrandLogo className="h-8 w-auto" />
      </div>

      {/* Center: cashier name */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-sidebar-foreground truncate">{cashierName}</p>
        <p className="text-xs text-sidebar-muted">POS · Main Counter</p>
      </div>

      {/* Right: clock + nav + sign out */}
      <div className="flex items-center gap-2 shrink-0">
        <span className="text-sm font-mono text-sidebar-muted tabular-nums hidden sm:block">{time}</span>

        <Link
          href="/cashier/orders"
          aria-label="Orders"
          className="inline-flex items-center gap-1.5 rounded-lg border border-white/15 px-3 py-1.5 text-sm font-medium text-sidebar-muted hover:bg-white/10 hover:text-sidebar-foreground transition-colors"
        >
          <Receipt className="w-4 h-4" aria-hidden="true" />
          <span className="hidden sm:inline">Orders</span>
        </Link>

        {!hideDashboardLink && (
          <Link
            href="/cashier/dashboard"
            aria-label="Dashboard"
            className="inline-flex items-center gap-1.5 rounded-lg border border-white/15 px-3 py-1.5 text-sm font-medium text-sidebar-muted hover:bg-white/10 hover:text-sidebar-foreground transition-colors"
          >
            <LayoutDashboard className="w-4 h-4" aria-hidden="true" />
            <span className="hidden sm:inline">Dashboard</span>
          </Link>
        )}

        <form action={logout}>
          <button
            type="submit"
            aria-label="Sign out"
            className="inline-flex items-center justify-center w-9 h-9 rounded-lg border border-white/15 text-sidebar-muted hover:bg-white/10 hover:text-sidebar-foreground transition-colors"
          >
            <LogOut className="w-4 h-4" aria-hidden="true" />
          </button>
        </form>
      </div>
    </header>
  );
}
