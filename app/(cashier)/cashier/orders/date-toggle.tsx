"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";

interface DateToggleProps {
  active: "today" | "yesterday";
}

export function DateToggle({ active }: DateToggleProps) {
  return (
    <div className="flex gap-1 rounded-lg border border-border bg-card p-1" role="group" aria-label="Select date">
      <Link
        href="/cashier/orders"
        className={cn(
          "px-3 py-1.5 rounded-md text-sm font-medium transition-colors",
          active === "today"
            ? "bg-primary text-primary-foreground"
            : "text-foreground hover:bg-secondary"
        )}
        aria-current={active === "today" ? "page" : undefined}
      >
        Today
      </Link>
      <Link
        href="/cashier/orders?date=yesterday"
        className={cn(
          "px-3 py-1.5 rounded-md text-sm font-medium transition-colors",
          active === "yesterday"
            ? "bg-primary text-primary-foreground"
            : "text-foreground hover:bg-secondary"
        )}
        aria-current={active === "yesterday" ? "page" : undefined}
      >
        Yesterday
      </Link>
    </div>
  );
}
