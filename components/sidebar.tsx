"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Package,
  Truck,
  BarChart3,
  ReceiptText,
  Settings,
  LogOut,
  Monitor,
  Menu,
  X,
  Wallet,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { Profile, Role } from "@/lib/types";
import { logout } from "@/app/(auth)/login/actions";
import { SnowflakePattern } from "@/components/snowflake-pattern";
import { BrandLogo } from "@/components/brand-logo";

interface NavItem {
  label: string;
  href: string;
  icon: React.ElementType;
  roles: Role[];
}

const navItems: NavItem[] = [
  { label: "Dashboard",    href: "/dashboard",  icon: LayoutDashboard, roles: ["admin", "manager", "accountant"] },
  { label: "Cashier View", href: "/cashier",    icon: Monitor,         roles: ["admin", "manager", "accountant"] },
  { label: "Inventory",    href: "/inventory",  icon: Package,         roles: ["admin", "manager", "accountant"] },
  { label: "Expenses",     href: "/expenses",   icon: Wallet,          roles: ["admin", "manager", "accountant"] },
  { label: "Refunds",      href: "/refunds",    icon: ReceiptText,     roles: ["admin", "manager", "accountant"] },
  { label: "Suppliers",    href: "/suppliers",  icon: Truck,           roles: ["admin", "manager", "accountant"] },
  { label: "Reports",      href: "/reports",    icon: BarChart3,       roles: ["admin", "manager", "accountant"] },
  { label: "Settings",     href: "/settings",   icon: Settings,        roles: ["admin"] },
];

interface SidebarProps {
  profile: Profile;
}

export function Sidebar({ profile }: SidebarProps) {
  const pathname = usePathname();
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Close drawer on route change
  useEffect(() => { setDrawerOpen(false); }, [pathname]);

  // Lock body scroll while drawer is open
  useEffect(() => {
    document.body.style.overflow = drawerOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [drawerOpen]);

  const visibleItems = navItems.filter((item) => item.roles.includes(profile.role));

  const initials = profile.full_name
    .split(" ")
    .slice(0, 2)
    .map((n: string) => n[0] ?? "")
    .join("")
    .toUpperCase();

  function isActive(href: string) {
    return href === "/dashboard" ? pathname === "/dashboard" : pathname.startsWith(href);
  }

  function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
    return (
      <nav className="flex-1 py-3 flex flex-col gap-0.5 overflow-y-auto" aria-label="Main navigation">
        {visibleItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex items-center gap-3 pl-3 pr-4 py-3 mx-2 rounded-xl text-sm font-medium transition-all min-h-[48px] border-l-4",
                active
                  ? "bg-white/15 text-white border-sidebar-active"
                  : "text-sidebar-muted hover:bg-white/8 hover:text-white border-transparent"
              )}
            >
              <Icon className="w-5 h-5 shrink-0" aria-hidden="true" />
              {item.label}
            </Link>
          );
        })}
      </nav>
    );
  }

  function UserFooter() {
    return (
      <div className="border-t border-white/10 px-3 pt-3 pb-4">
        <div className="flex items-center gap-3 px-2 py-2 mb-1">
          <div className="w-9 h-9 rounded-full bg-accent flex items-center justify-center shrink-0 text-xs font-bold text-white">
            {initials}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium text-sidebar-foreground truncate">{profile.full_name}</p>
            <p className="text-xs text-sidebar-muted capitalize">{profile.role}</p>
          </div>
        </div>
        <form action={logout}>
          <button
            type="submit"
            className="flex w-full items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-sidebar-muted hover:bg-white/8 hover:text-sidebar-foreground transition-colors min-h-[44px]"
          >
            <LogOut className="w-4 h-4 shrink-0" aria-hidden="true" />
            Sign out
          </button>
        </form>
      </div>
    );
  }

  return (
    <>
      {/* ── Desktop sidebar (lg+) ───────────────────────────── */}
      <aside className="hidden lg:flex h-full w-60 flex-col bg-sidebar border-r border-white/10 shrink-0">
        <div className="px-4 pt-4 pb-3 border-b border-white/10">
          <BrandLogo className="w-full h-auto" variant="reverse" />
        </div>
        <SnowflakePattern id="sidebar-snow" opacity={0.2} rows={2} tileSize={48} />
        <NavLinks />
        <UserFooter />
      </aside>

      {/* ── Mobile: fixed top header ────────────────────────── */}
      <header className="lg:hidden fixed top-0 left-0 right-0 z-40 h-14 bg-sidebar border-b border-white/10 flex items-center justify-between px-4">
        <BrandLogo className="h-auto w-36" variant="reverse" />
        <button
          onClick={() => setDrawerOpen(true)}
          className="w-11 h-11 flex items-center justify-center rounded-xl text-white/70 hover:bg-white/10 hover:text-white transition-colors"
          aria-label="Open navigation menu"
        >
          <Menu className="w-5 h-5" />
        </button>
      </header>

      {/* ── Mobile: slide-in drawer ──────────────────────────── */}
      {drawerOpen && (
        <>
          {/* Backdrop */}
          <div
            className="lg:hidden fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
            onClick={() => setDrawerOpen(false)}
            aria-hidden="true"
          />
          {/* Drawer panel */}
          <aside className="lg:hidden fixed top-0 left-0 bottom-0 z-50 w-72 flex flex-col bg-sidebar shadow-float overflow-hidden">
            <div className="flex items-center justify-between px-5 pt-4 pb-4 border-b border-white/10 shrink-0">
              <BrandLogo className="flex-1 h-auto" variant="reverse" />
              <button
                onClick={() => setDrawerOpen(false)}
                className="w-9 h-9 flex items-center justify-center rounded-xl text-sidebar-muted hover:bg-white/10 hover:text-white transition-colors"
                aria-label="Close navigation menu"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <SnowflakePattern id="drawer-snow" opacity={0.15} rows={2} tileSize={48} />
            <NavLinks onNavigate={() => setDrawerOpen(false)} />
            <UserFooter />
          </aside>
        </>
      )}
    </>
  );
}
