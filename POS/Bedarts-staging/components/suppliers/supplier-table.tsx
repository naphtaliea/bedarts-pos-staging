"use client";

import { Building2, Pencil, Trash2 } from "lucide-react";
import { Supplier } from "@/lib/types";

interface SupplierTableProps {
  suppliers: Supplier[];
  onEdit: (supplier: Supplier) => void;
  onDelete: (supplier: Supplier) => void;
}

function getInitials(name: string) {
  return name
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0] ?? "")
    .join("")
    .toUpperCase();
}

export function SupplierTable({ suppliers, onEdit, onDelete }: SupplierTableProps) {
  if (suppliers.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
        <div className="h-12 w-12 rounded-full bg-secondary flex items-center justify-center mb-3">
          <Building2 className="h-5 w-5 text-muted-foreground" />
        </div>
        <p className="text-sm font-medium text-foreground mb-1">No suppliers yet</p>
        <p className="text-xs text-muted-foreground">Add your first supplier to get started</p>
      </div>
    );
  }

  return (
    <>
      {/* ── Mobile: card list (< lg) ──────────────────────────────────── */}
      <div className="lg:hidden divide-y divide-border">
        {suppliers.map((supplier) => (
          <div key={supplier.id} className="flex items-center gap-3 px-4 py-3.5">
            {/* Initials avatar */}
            <div className="h-9 w-9 rounded-full bg-sidebar shrink-0 flex items-center justify-center text-[11px] font-bold text-white">
              {getInitials(supplier.name)}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-foreground truncate">{supplier.name}</p>
              <p className="text-xs text-muted-foreground mt-0.5 truncate">
                {[supplier.phone, supplier.email].filter(Boolean).join(" · ") || "No contact info"}
              </p>
              {supplier.address && (
                <p className="text-xs text-muted-foreground truncate">{supplier.address}</p>
              )}
            </div>

            {/* Actions */}
            <div className="flex items-center shrink-0">
              <button
                onClick={() => onEdit(supplier)}
                aria-label={`Edit ${supplier.name}`}
                className="flex h-10 w-10 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-primary/10 hover:text-primary"
              >
                <Pencil className="h-4 w-4" />
              </button>
              <button
                onClick={() => onDelete(supplier)}
                aria-label={`Delete ${supplier.name}`}
                className="flex h-10 w-10 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* ── Desktop: table (lg+) ──────────────────────────────────────── */}
      <div className="hidden lg:block overflow-x-auto">
        <table className="min-w-full border-separate border-spacing-0">
          <thead>
            <tr>
              {["Name", "Phone", "Email", "Address", "Actions"].map((h) => (
                <th
                  key={h}
                  className="sticky top-0 bg-card px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground first:pl-5 last:pr-5"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {suppliers.map((supplier) => (
              <tr key={supplier.id} className="transition-colors hover:bg-secondary">
                <td className="whitespace-nowrap px-4 py-3 pl-5">
                  <div className="flex items-center gap-2.5">
                    <div className="h-7 w-7 rounded-full bg-sidebar shrink-0 flex items-center justify-center text-[10px] font-bold text-white">
                      {getInitials(supplier.name)}
                    </div>
                    <span className="text-sm font-medium text-foreground">{supplier.name}</span>
                  </div>
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-sm text-muted-foreground">
                  {supplier.phone ?? "—"}
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-sm text-muted-foreground">
                  {supplier.email ?? "—"}
                </td>
                <td className="px-4 py-3 text-sm text-muted-foreground">
                  <span className="line-clamp-2 max-w-xs">{supplier.address ?? "—"}</span>
                </td>
                <td className="whitespace-nowrap px-4 py-3 pr-5">
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => onEdit(supplier)}
                      aria-label={`Edit ${supplier.name}`}
                      className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-primary/10 hover:text-primary"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => onDelete(supplier)}
                      aria-label={`Delete ${supplier.name}`}
                      className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-destructive/8 hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
