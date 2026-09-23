"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Receipt, LayoutDashboard, LogOut, X, Undo2 } from "lucide-react";
import { DenomCalculator } from "@/components/pos/denom-calculator";
import { cn } from "@/lib/utils";
import { logout } from "@/app/(auth)/login/actions";
import { BrandLogo } from "@/components/brand-logo";
import { useCartStore } from "@/lib/pos-store";

interface PosTopBarProps {
  cashierName: string;
  avatarUrl?: string | null;
  showBack?: boolean;
  backHref?: string;
  onBack?: () => void;
  title?: string;
  hideDashboardLink?: boolean;
  showTabs?: boolean;
  onTabChange?: () => void;
  onOrders?: () => void;
  onDashboard?: () => void;
  showRefunds?: boolean;
}

export function PosTopBar({
  cashierName,
  avatarUrl,
  showBack,
  backHref,
  onBack,
  title,
  hideDashboardLink,
  showTabs,
  onTabChange,
  onOrders,
  onDashboard,
  showRefunds,
}: PosTopBarProps) {
  const [time, setTime] = useState("");
  const { tabs, activeTabId, addTab, removeTab, setActiveTab, snapshots, items, paymentTabIds } = useCartStore();

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
    <header className="h-12 flex items-stretch bg-white border-b border-border shrink-0 overflow-hidden">

      {/* ── Left: logo (+ back if needed) ── */}
      <div className="flex items-center gap-2 px-3 border-r border-border shrink-0 min-w-[140px]">
        {showBack ? (
          onBack ? (
            <button
              onClick={onBack}
              aria-label="Go back"
              className="flex items-center justify-center w-7 h-7 rounded-md text-slate-500 hover:bg-slate-100 hover:text-slate-900 transition-colors shrink-0"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
          ) : (
            <Link
              href={backHref ?? "/cashier"}
              aria-label="Go back"
              className="flex items-center justify-center w-7 h-7 rounded-md text-slate-500 hover:bg-slate-100 hover:text-slate-900 transition-colors shrink-0"
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>
          )
        ) : (
          <div className="w-7 shrink-0" />
        )}
        <BrandLogo className="h-7 w-auto" />
      </div>

      {/* ── Middle: order tabs OR page info ── */}
      {showTabs ? (
        <div className="flex items-stretch flex-1 min-w-0 overflow-x-auto">
          {tabs.map((tab) => {
            const active = tab.id === activeTabId;
            const tabItemCount = active ? items.length : (snapshots[tab.id]?.items?.length ?? 0);
            const inPayment = paymentTabIds.includes(tab.id);
            return (
              <button
                key={tab.id}
                onClick={() => { setActiveTab(tab.id); onTabChange?.(); }}
                className={cn(
                  "flex items-center gap-2 h-full px-4 text-[13px] font-semibold border-r border-border shrink-0 transition-colors relative",
                  active
                    ? "text-primary bg-primary/5 after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-primary"
                    : "text-slate-500 hover:text-slate-900 hover:bg-slate-50"
                )}
              >
                {inPayment && (
                  <span className="w-1.5 h-1.5 rounded-full bg-warning shrink-0" title="Awaiting payment" aria-hidden />
                )}
                <span>{tab.name}</span>
                {tabItemCount > 0 && (
                  <span
                    className={cn(
                      "text-[10px] font-black leading-none px-1.5 py-0.5 rounded-full tabular-nums shrink-0",
                      active ? "bg-primary text-white" : "bg-slate-200 text-slate-600"
                    )}
                  >
                    {tabItemCount}
                  </span>
                )}
                {tabs.length > 1 && (
                  <span
                    role="button"
                    onClick={(e) => { e.stopPropagation(); removeTab(tab.id); onTabChange?.(); }}
                    className="w-4 h-4 rounded flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition-colors"
                    aria-label={`Close ${tab.name}`}
                  >
                    <X className="w-2.5 h-2.5" />
                  </span>
                )}
              </button>
            );
          })}
          <button
            onClick={() => { addTab(); onTabChange?.(); }}
            aria-label="Add order"
            className="h-full px-3.5 text-slate-400 hover:text-primary hover:bg-primary/5 border-r border-border text-base font-bold transition-colors shrink-0"
          >
            +
          </button>
          <div className="flex-1" />
        </div>
      ) : (
        <div className="flex-1 flex items-center px-4 min-w-0">
          <div className="min-w-0">
            {title && <p className="text-[13px] font-semibold text-slate-900 truncate leading-tight">{title}</p>}
            <p className={cn("truncate", title ? "text-xs text-slate-500" : "text-[13px] font-semibold text-slate-900")}>
              {cashierName}
            </p>
          </div>
        </div>
      )}

      {/* ── Right: clock + actions ── */}
      <div className="flex items-stretch border-l border-border shrink-0">
        <span className="hidden sm:flex items-center px-3 border-r border-border text-xs font-mono text-slate-400 tabular-nums">
          {time}
        </span>

        {onOrders ? (
          <button
            onClick={onOrders}
            aria-label="Orders"
            className="flex items-center justify-center w-11 border-r border-border text-slate-500 hover:bg-slate-50 hover:text-slate-900 transition-colors"
          >
            <Receipt className="w-4 h-4" />
          </button>
        ) : (
          <Link
            href="/cashier/orders"
            aria-label="Orders"
            className="flex items-center justify-center w-11 border-r border-border text-slate-500 hover:bg-slate-50 hover:text-slate-900 transition-colors"
          >
            <Receipt className="w-4 h-4" />
          </Link>
        )}

        <DenomCalculator />

        {showRefunds && (
          <Link
            href="/refunds"
            aria-label="Refunds"
            title="Refunds (manager)"
            className="flex items-center justify-center w-11 border-r border-border text-slate-500 hover:bg-slate-50 hover:text-slate-900 transition-colors"
          >
            <Undo2 className="w-4 h-4" />
          </Link>
        )}

        {!hideDashboardLink && (
          onDashboard ? (
            <button
              onClick={onDashboard}
              aria-label="Dashboard"
              className="flex items-center justify-center w-11 border-r border-border text-slate-500 hover:bg-slate-50 hover:text-slate-900 transition-colors"
            >
              <LayoutDashboard className="w-4 h-4" />
            </button>
          ) : (
            <Link
              href="/cashier/dashboard"
              aria-label="Dashboard"
              className="flex items-center justify-center w-11 border-r border-border text-slate-500 hover:bg-slate-50 hover:text-slate-900 transition-colors"
            >
              <LayoutDashboard className="w-4 h-4" />
            </Link>
          )
        )}

        {/* Cashier avatar + name */}
        <div className="flex items-center gap-2 px-3 border-l border-border">
          {avatarUrl ? (
            <img
              src={avatarUrl}
              alt={cashierName}
              className="w-7 h-7 rounded-full object-cover ring-1 ring-border shrink-0"
            />
          ) : (
            <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center ring-1 ring-border shrink-0">
              <span className="text-[11px] font-bold text-primary">
                {cashierName.charAt(0).toUpperCase()}
              </span>
            </div>
          )}
          <span className="hidden sm:block text-xs font-semibold text-slate-700 max-w-[100px] truncate">
            {cashierName}
          </span>
        </div>

        <form action={logout} className="flex">
          <button
            type="submit"
            aria-label="Sign out"
            className="flex items-center justify-center w-11 text-slate-500 hover:bg-slate-50 hover:text-slate-900 transition-colors"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </form>
      </div>
    </header>
  );
}
