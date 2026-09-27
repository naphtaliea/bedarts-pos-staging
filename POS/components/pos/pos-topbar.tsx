"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Receipt, LayoutDashboard, LayoutGrid, LogOut, X, Undo2, Plus } from "lucide-react";
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
  showAdminLink?: boolean;
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
  showAdminLink,
  showTabs,
  onTabChange,
  onOrders,
  onDashboard,
  showRefunds,
}: PosTopBarProps) {
  const [time, setTime] = useState("");
  const [confirmLogout, setConfirmLogout] = useState(false);
  const { tabs, activeTabId, addTab, removeTab, setActiveTab, snapshots, items, paymentTabIds } =
    useCartStore();

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

  useEffect(() => {
    if (!confirmLogout) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setConfirmLogout(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [confirmLogout]);

  // Cluster button: used for action icons inside the grouped pill
  const clusterBtn =
    "w-9 h-9 flex items-center justify-center rounded-[10px] text-white/55 hover:bg-white/[0.1] hover:text-white transition-all duration-100 shrink-0";

  const initials = cashierName.charAt(0).toUpperCase();

  return (
    <header className="h-14 flex items-stretch bg-sidebar border-b border-white/[0.07] shrink-0 overflow-hidden">

      {/* ── Left: logo (+ optional back) ── */}
      <div className="flex items-center gap-2.5 px-4 border-r border-white/[0.07] shrink-0">
        {showBack ? (
          onBack ? (
            <button
              onClick={onBack}
              aria-label="Go back"
              title="Go back"
              className="flex items-center justify-center w-8 h-8 rounded-lg text-white/50 hover:bg-white/[0.09] hover:text-white transition-colors shrink-0"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
          ) : (
            <Link
              href={backHref ?? "/cashier"}
              aria-label="Go back"
              title="Go back"
              className="flex items-center justify-center w-8 h-8 rounded-lg text-white/50 hover:bg-white/[0.09] hover:text-white transition-colors shrink-0"
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>
          )
        ) : null}
        <BrandLogo variant="reverse" className="h-7 w-auto shrink-0" />
      </div>

      {/* ── Middle: tab strip or page context ── */}
      {showTabs ? (
        <div
          role="tablist"
          aria-label="Orders"
          className="flex items-center flex-1 min-w-0 gap-1 px-2 overflow-x-auto"
        >
          {tabs.map((tab) => {
            const active = tab.id === activeTabId;
            const tabItemCount = active
              ? items.length
              : (snapshots[tab.id]?.items?.length ?? 0);
            const inPayment = paymentTabIds.includes(tab.id);

            return (
              <div key={tab.id} className="flex items-center shrink-0">
                <button
                  role="tab"
                  aria-selected={active}
                  onClick={() => { setActiveTab(tab.id); onTabChange?.(); }}
                  className={cn(
                    "flex items-center gap-2 h-8 text-[13px] font-semibold transition-all duration-100 rounded-lg",
                    tabs.length > 1 ? "pl-3.5 pr-2" : "px-3.5",
                    active
                      ? "bg-white/[0.12] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]"
                      : "text-white/55 hover:bg-white/[0.06] hover:text-white/80"
                  )}
                >
                  {inPayment && (
                    <>
                      <span
                        className="w-1.5 h-1.5 rounded-full bg-warning shrink-0"
                        aria-hidden="true"
                      />
                      <span className="sr-only">Awaiting payment — </span>
                    </>
                  )}
                  <span>{tab.name}</span>
                  {tabItemCount > 0 && (
                    <span
                      className={cn(
                        "text-[11px] font-black leading-none min-w-[18px] h-[18px] px-1 flex items-center justify-center rounded-full tabular-nums shrink-0",
                        active ? "bg-primary text-white" : "bg-white/15 text-white/65"
                      )}
                    >
                      {tabItemCount}
                    </span>
                  )}
                </button>

                {tabs.length > 1 && (
                  <button
                    onClick={(e) => { e.stopPropagation(); removeTab(tab.id); onTabChange?.(); }}
                    aria-label={`Close ${tab.name}`}
                    title={`Close ${tab.name}`}
                    className="ml-0.5 w-6 h-6 flex items-center justify-center rounded-md text-white/30 hover:text-white hover:bg-white/10 transition-colors shrink-0"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            );
          })}

          <button
            onClick={() => { addTab(); onTabChange?.(); }}
            aria-label="Add order"
            title="New order"
            className="w-8 h-8 flex items-center justify-center rounded-lg text-white/40 hover:text-white/65 hover:bg-white/[0.06] transition-all shrink-0 ml-1"
          >
            <Plus className="w-4 h-4" />
          </button>

          <div className="flex-1" />
        </div>
      ) : (
        <div className="flex-1 flex items-center px-4 min-w-0">
          <div className="min-w-0">
            {title && (
              <p className="text-[10px] font-bold text-white/40 uppercase tracking-[0.12em] truncate leading-none mb-1">
                {title}
              </p>
            )}
            <p
              className={cn(
                "truncate font-semibold",
                title ? "text-[13px] text-white/70" : "text-[13px] text-white"
              )}
            >
              {cashierName}
            </p>
          </div>
        </div>
      )}

      {/* ── Right: clock · action cluster · avatar · logout ── */}
      <div className="flex items-center gap-2 px-3 border-l border-white/[0.07] shrink-0">

        {/* Ambient clock — large screens only */}
        <span className="hidden lg:flex items-center text-[11px] font-mono font-medium text-white/60 tabular-nums tracking-wide select-none mr-1">
          {time}
        </span>

        {/* Action cluster — grouped pill */}
        <div className="flex items-center gap-0.5 bg-white/[0.04] border border-white/[0.07] rounded-xl p-0.5">
          {onOrders && (
            <button
              onClick={onOrders}
              aria-label="Orders"
              title="Orders"
              className={clusterBtn}
            >
              <Receipt className="w-[18px] h-[18px]" />
            </button>
          )}

          <DenomCalculator triggerClassName={clusterBtn} />

          {showRefunds && (
            <Link
              href="/refunds"
              aria-label="Refunds"
              title="Refunds"
              className={clusterBtn}
            >
              <Undo2 className="w-[18px] h-[18px]" />
            </Link>
          )}

          {!hideDashboardLink && onDashboard && (
            <button
              onClick={onDashboard}
              aria-label="Dashboard"
              title="Dashboard"
              className={cn(clusterBtn, "hidden sm:flex")}
            >
              <LayoutDashboard className="w-[18px] h-[18px]" />
            </button>
          )}

          {showAdminLink && (
            <Link
              href="/dashboard"
              aria-label="Management dashboard"
              title="Management dashboard"
              className={cn(clusterBtn, "hidden sm:flex")}
            >
              <LayoutGrid className="w-[18px] h-[18px]" />
            </Link>
          )}
        </div>

        {/* Avatar pill */}
        <div className="flex items-center gap-2 h-9 px-2.5 bg-white/[0.05] border border-white/[0.08] rounded-xl shrink-0">
          {avatarUrl ? (
            <img
              src={avatarUrl}
              alt={cashierName}
              className="w-[22px] h-[22px] rounded-full object-cover ring-1 ring-white/20 shrink-0"
            />
          ) : (
            <div
              className="w-[22px] h-[22px] rounded-full bg-primary/20 border border-primary/35 flex items-center justify-center shrink-0"
              aria-hidden="true"
            >
              <span className="text-[10px] font-bold text-white leading-none">
                {initials}
              </span>
            </div>
          )}
          <span className="hidden sm:block text-[13px] font-semibold text-white/75 max-w-[100px] truncate">
            {cashierName}
          </span>
        </div>

        {/* Logout — two-step confirm so accidental taps don't end the session */}
        {confirmLogout ? (
          <div className="flex items-center gap-1 shrink-0">
            <button
              onClick={() => setConfirmLogout(false)}
              className="h-9 px-2.5 text-xs font-semibold text-white/50 hover:text-white rounded-lg hover:bg-white/[0.06] transition-colors"
            >
              Cancel
            </button>
            <form action={logout} className="flex">
              <button
                type="submit"
                className="h-9 px-3 text-xs font-bold bg-destructive hover:bg-destructive/85 text-white rounded-lg transition-colors flex items-center gap-1.5"
              >
                <LogOut className="w-3.5 h-3.5" aria-hidden="true" />
                Sign out
              </button>
            </form>
          </div>
        ) : (
          <button
            onClick={() => setConfirmLogout(true)}
            aria-label="Sign out"
            title="Sign out"
            className="w-9 h-9 flex items-center justify-center rounded-xl text-white/35 hover:text-white/65 hover:bg-white/[0.05] transition-all shrink-0"
          >
            <LogOut className="w-[18px] h-[18px]" />
          </button>
        )}
      </div>
    </header>
  );
}
