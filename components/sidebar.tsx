"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Package,
  Users,
  Truck,
  BarChart3,
  ReceiptText,
  Settings,
  LogOut,
  Monitor,
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
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard, roles: ["admin", "manager"] },
  { label: "Cashier View", href: "/cashier", icon: Monitor, roles: ["admin", "manager"] },
  { label: "Inventory", href: "/inventory", icon: Package, roles: ["admin", "manager"] },
  { label: "Customers", href: "/customers", icon: Users, roles: ["admin", "manager"] },
  { label: "Suppliers", href: "/suppliers", icon: Truck, roles: ["admin", "manager"] },
  { label: "Reports", href: "/reports", icon: BarChart3, roles: ["admin", "manager"] },
  { label: "Refunds", href: "/refunds", icon: ReceiptText, roles: ["admin"] },
  { label: "Settings", href: "/settings", icon: Settings, roles: ["admin"] },
];

interface SidebarProps {
  profile: Profile;
}

export function Sidebar({ profile }: SidebarProps) {
  const pathname = usePathname();
  const visibleItems = navItems.filter((item) =>
    item.roles.includes(profile.role)
  );

  const initials = profile.full_name
    .split(" ")
    .slice(0, 2)
    .map((n: string) => n[0] ?? "")
    .join("")
    .toUpperCase();

  return (
    <aside className="flex h-full w-60 flex-col bg-sidebar border-r border-white/10">
      {/* Logo */}
      <div className="px-5 pt-5 pb-4 border-b border-white/10">
        <BrandLogo className="h-9 w-auto" />
      </div>

      {/* Brand pattern strip */}
      <SnowflakePattern id="sidebar-snow" opacity={0.2} rows={2} tileSize={48} />

      {/* Navigation */}
      <nav
        className="flex-1 py-3 flex flex-col gap-0.5 overflow-y-auto"
        aria-label="Main navigation"
      >
        {visibleItems.map((item) => {
          const Icon = item.icon;
          const active =
            item.href === "/dashboard"
              ? pathname === "/dashboard"
              : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex items-center gap-3 pl-5 pr-3 py-2.5 mr-2 rounded-r-xl text-sm font-medium transition-all border-l-[3px]",
                active
                  ? "border-primary bg-primary/10 text-white"
                  : "border-transparent text-sidebar-muted hover:bg-white/8 hover:text-white/80"
              )}
            >
              <Icon
                className={cn("w-5 h-5 shrink-0", active && "text-primary")}
                aria-hidden="true"
              />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* User + Logout */}
      <div className="border-t border-white/10 px-3 pt-3 pb-4">
        <div className="flex items-center gap-3 px-2 py-2 mb-1">
          <div className="w-8 h-8 rounded-full bg-accent flex items-center justify-center shrink-0 text-xs font-bold text-white">
            {initials}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium text-sidebar-foreground truncate">
              {profile.full_name}
            </p>
            <p className="text-xs text-sidebar-muted capitalize">{profile.role}</p>
          </div>
        </div>
        <form action={logout}>
          <button
            type="submit"
            className="flex w-full items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-sidebar-muted hover:bg-white/8 hover:text-sidebar-foreground transition-colors"
          >
            <LogOut className="w-4 h-4 shrink-0" aria-hidden="true" />
            Sign out
          </button>
        </form>
      </div>
    </aside>
  );
}
