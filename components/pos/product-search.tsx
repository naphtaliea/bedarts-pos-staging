"use client";

import { useState, useEffect, useRef } from "react";
import { Search, Plus } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useCartStore } from "@/lib/pos-store";
import { cn } from "@/lib/utils";
import type { Product } from "@/lib/types";

export function ProductSearch() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Product[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const addItem = useCartStore((s) => s.addItem);

  useEffect(() => {
    if (!query.trim()) { setResults([]); setOpen(false); return; }
    const timer = setTimeout(async () => {
      setLoading(true);
      const supabase = createClient();
      const { data } = await supabase
        .from("product_stock")
        .select("*, category:categories(name)")
        .ilike("name", `%${query}%`)
        .eq("is_active", true)
        .order("name")
        .limit(20);
      setResults((data as Product[]) ?? []);
      setOpen(true);
      setLoading(false);
    }, 250);
    return () => clearTimeout(timer);
  }, [query]);

  const select = (product: Product) => {
    addItem(product);
    setQuery("");
    setResults([]);
    setOpen(false);
    inputRef.current?.focus();
  };

  return (
    <div className="relative">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input
          ref={inputRef}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => results.length > 0 && setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          placeholder="Search products by name…"
          className="w-full pl-9 pr-4 h-11 rounded-lg border border-border bg-card text-sm focus:outline-none focus:ring-2 focus:ring-primary"
        />
        {loading && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        )}
      </div>

      {open && results.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-card border border-border rounded-lg shadow-lg z-50 max-h-72 overflow-y-auto">
          {results.map((product) => (
            <button
              key={product.id}
              onMouseDown={() => select(product)}
              className="w-full flex items-center justify-between px-4 py-3 hover:bg-secondary text-left border-b border-border last:border-0"
            >
              <div>
                <p className="text-sm font-medium text-foreground">{product.name}</p>
                <p className="text-xs text-muted-foreground">
                  {product.category?.name} · {product.unit} ·{" "}
                  <span className={cn(
                    "font-medium",
                    (product.stock_quantity ?? 0) <= product.low_stock_threshold
                      ? "text-warning"
                      : "text-success"
                  )}>
                    {product.stock_quantity ?? 0} in stock
                  </span>
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-foreground">
                  GH₵{product.selling_price.toFixed(2)}
                </span>
                <Plus className="w-4 h-4 text-primary" />
              </div>
            </button>
          ))}
        </div>
      )}

      {open && query && !loading && results.length === 0 && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-card border border-border rounded-lg shadow-lg z-50 px-4 py-3">
          <p className="text-sm text-muted-foreground">No products found for &quot;{query}&quot;</p>
        </div>
      )}
    </div>
  );
}
