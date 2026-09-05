"use client";

import { Pencil, Trash2 } from "lucide-react";
import { Supplier } from "@/lib/types";
import { cn } from "@/lib/utils";

interface SupplierTableProps {
  suppliers: Supplier[];
  onEdit: (supplier: Supplier) => void;
  onDelete: (supplier: Supplier) => void;
}

const HEADINGS = ["Name", "Phone", "Email", "Address", "Actions"];

export function SupplierTable({
  suppliers,
  onEdit,
  onDelete,
}: SupplierTableProps) {
  if (suppliers.length === 0) {
    return (
      <div className="flex items-center justify-center py-20 text-sm text-slate-400">
        No suppliers yet
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full border-separate border-spacing-0">
        <thead>
          <tr>
            {HEADINGS.map((heading) => (
              <th
                key={heading}
                className="sticky top-0 bg-white px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-400 first:pl-5 last:pr-5"
              >
                {heading}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {suppliers.map((supplier) => (
            <tr
              key={supplier.id}
              className="transition-colors hover:bg-slate-50"
            >
              {/* Name */}
              <td className="whitespace-nowrap px-4 py-3 pl-5">
                <span className="text-sm font-medium text-slate-900">
                  {supplier.name}
                </span>
              </td>

              {/* Phone */}
              <td className="whitespace-nowrap px-4 py-3 text-sm text-slate-500">
                {supplier.phone ?? "—"}
              </td>

              {/* Email */}
              <td className="whitespace-nowrap px-4 py-3 text-sm text-slate-500">
                {supplier.email ?? "—"}
              </td>

              {/* Address */}
              <td className="px-4 py-3 text-sm text-slate-500">
                <span className="line-clamp-2 max-w-xs">
                  {supplier.address ?? "—"}
                </span>
              </td>

              {/* Actions */}
              <td className="whitespace-nowrap px-4 py-3 pr-5">
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => onEdit(supplier)}
                    aria-label={`Edit ${supplier.name}`}
                    className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-blue-50 hover:text-blue-700"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => onDelete(supplier)}
                    aria-label={`Delete ${supplier.name}`}
                    className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-red-50 hover:text-red-600"
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
  );
}
