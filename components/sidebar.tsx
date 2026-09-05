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
    <aside className="flex h-full w-60 flex-col bg-slate-950 border-r border-slate-800">
      {/* Logo */}
      <div className="flex items-center gap-3 px-5 py-5 border-b border-slate-800">
        <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-blue-700 shrink-0">
          <Snowflake className="w-5 h-5 text-white" />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-bold text-white truncate">Bedarts</p>
          <p className="text-xs text-slate-500 truncate">Cold Supplies</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 flex flex-col gap-1">
        {visibleItems.map((item) => {
          const Icon = item.icon;
          const active = pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                active
                  ? "bg-blue-700 text-white"
                  : "text-slate-400 hover:bg-slate-800 hover:text-white"
              )}
            >
              <Icon className="w-5 h-5 shrink-0" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* User + Logout */}
      <div className="border-t border-slate-800 px-3 py-4 flex flex-col gap-1">
        <div className="px-3 py-2">
          <p className="text-sm font-medium text-white truncate">{profile.full_name}</p>
          <p className="text-xs text-slate-500 capitalize">{profile.role}</p>
        </div>
        <form action={logout}>
          <button
            type="submit"
            className="flex w-full items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
          >
            <LogOut className="w-5 h-5 shrink-0" />
            Sign out
          </button>
        </form>
      </div>
    </aside>
  );
}
