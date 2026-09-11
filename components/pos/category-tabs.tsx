"use client";

import { cn } from "@/lib/utils";
import type { Category } from "@/lib/types";

interface CategoryTabsProps {
  categories: Category[];
  selected: string | null;
  onSelect: (id: string | null) => void;
}

export function CategoryTabs({ categories, selected, onSelect }: CategoryTabsProps) {
  return (
    <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-hide">
      <button
        onClick={() => onSelect(null)}
        className={cn(
          "shrink-0 px-4 py-2 rounded-lg text-sm font-medium transition-colors",
          selected === null
            ? "bg-[#AB1509] text-white"
            : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
        )}
      >
        All
      </button>
      {categories.map((cat) => (
        <button
          key={cat.id}
          onClick={() => onSelect(cat.id)}
          className={cn(
            "shrink-0 px-4 py-2 rounded-lg text-sm font-medium transition-colors",
            selected === cat.id
              ? "bg-[#AB1509] text-white"
              : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
          )}
        >
          {cat.name}
        </button>
      ))}
    </div>
  );
}
