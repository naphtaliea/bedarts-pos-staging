"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ShoppingCart,
  Package,
  Users,
  Truck,
  BarChart3,
  Settings,
  Snowflake,
  LogOut,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { Profile, Role } from "@/lib/types";
import { logout } from "@/app/(auth)/login/actions";

interface NavItem {
  label: string;
  href: string;
  icon: React.ElementType;
  roles: Role[];
}

const navItems: NavItem[] = [
  { label: "POS", href: "/pos", icon: ShoppingCart, roles: ["admin", "manager", "cashier"] },
  { label: "Inventory", href: "/inventory", icon: Package, roles: ["admin", "manager"] },
  { label: "Customers", href: "/customers", icon: Users, roles: ["admin", "manager"] },
  { label: "Suppliers", href: "/suppliers", icon: Truck, roles: ["admin", "manager"] },
  { label: "Reports", href: "/reports", icon: BarChart3, roles: ["admin", "manager"] },
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

  return (
    <aside className="flex h-full w-60 flex-col bg-sidebar border-r border-white/10">
      {/* Logo */}
      <div className="flex items-center gap-3 px-5 py-5 border-b border-white/10">
        <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-sidebar-active shrink-0">
          <Snowflake className="w-5 h-5 text-white" aria-hidden="true" />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-bold text-sidebar-foreground truncate">Bedarts</p>
          <p className="text-xs text-sidebar-muted truncate">Cold Supplies</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 flex flex-col gap-1" aria-label="Main navigation">
        {visibleItems.map((item) => {
          const Icon = item.icon;
          const active = pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                active
                  ? "bg-sidebar-active text-white"
                  : "text-sidebar-muted hover:bg-white/10 hover:text-sidebar-foreground"
              )}
            >
              <Icon className="w-5 h-5 shrink-0" aria-hidden="true" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* User + Logout */}
      <div className="border-t border-white/10 px-3 py-4 flex flex-col gap-1">
        <div className="px-3 py-2">
          <p className="text-sm font-medium text-sidebar-foreground truncate">{profile.full_name}</p>
          <p className="text-xs text-sidebar-muted capitalize">{profile.role}</p>
        </div>
        <form action={logout}>
          <button
            type="submit"
            className="flex w-full items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-sidebar-muted hover:bg-white/10 hover:text-sidebar-foreground transition-colors"
          >
            <LogOut className="w-5 h-5 shrink-0" aria-hidden="true" />
            Sign out
          </button>
        </form>
      </div>
    </aside>
  );
}
