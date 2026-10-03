"use client";

import { useState, useMemo } from "react";
import { Search, X } from "lucide-react";
import { ProductCard } from "./product-card";
import { ProductDetailDialog } from "./product-detail-dialog";
import { cn } from "@/src/lib/utils";
import type { StorefrontProduct } from "@/src/lib/types";

interface ShopClientProps {
  products: StorefrontProduct[];
  loading?: boolean;
}

const SKELETON_COUNT = 8;

function ProductSkeleton() {
  return (
    <div className="bg-card rounded-2xl shadow-card border border-border overflow-hidden animate-pulse-soft">
      <div className="aspect-[4/3] sm:aspect-square bg-background" />
      <div className="p-3 space-y-2">
        <div className="h-4 rounded-full bg-background w-3/4" />
        <div className="h-4 rounded-full bg-background w-1/2" />
        <div className="h-9 rounded-xl bg-background mt-2" />
      </div>
    </div>
  );
}

export function ShopClient({ products, loading = false }: ShopClientProps) {
  const [activeCategory, setActiveCategory] = useState<string>("All");
  const [query, setQuery] = useState("");
  const [detail, setDetail] = useState<StorefrontProduct | null>(null);

  const categories = useMemo(() => {
    const seen = new Set<string>();
    const cats: string[] = ["All"];
    for (const p of products) {
      if (!seen.has(p.category_name)) {
        seen.add(p.category_name);
        cats.push(p.category_name);
      }
    }
    return cats;
  }, [products]);

  const normalisedQuery = query.trim().toLowerCase();

  const filtered = useMemo(() => {
    let list = products;
    if (activeCategory !== "All") {
      list = list.filter((p) => p.category_name === activeCategory);
    }
    if (normalisedQuery) {
      list = list.filter(
        (p) =>
          p.name.toLowerCase().includes(normalisedQuery) ||
          p.category_name.toLowerCase().includes(normalisedQuery)
      );
    }
    return list;
  }, [products, activeCategory, normalisedQuery]);

  return (
    <section id="products" aria-labelledby="products-title" className="flex-1 flex flex-col">
      <h2 id="products-title" className="sr-only">Products</h2>

      {/* Sticky filter/search strip */}
      <div
        className="sticky z-40 px-3 sm:px-6 py-3 border-b border-border bg-background"
        style={{ top: "var(--nav-height)" }}
      >
        <div className="max-w-7xl mx-auto space-y-2">
          {/* Search */}
          <div className="relative">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground"
              aria-hidden="true"
            />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search products…"
              aria-label="Search products"
              className="w-full h-10 pl-9 pr-9 rounded-xl border border-border bg-card text-sm text-foreground placeholder-muted-foreground outline-none transition-shadow focus:ring-2 focus:ring-accent/30 focus:border-accent"
            />
            {query && (
              <button
                onClick={() => setQuery("")}
                aria-label="Clear search"
                className="absolute right-2 top-1/2 -translate-y-1/2 h-7 w-7 rounded-lg flex items-center justify-center text-muted-foreground hover:bg-background transition-colors"
              >
                <X className="w-4 h-4" aria-hidden="true" />
              </button>
            )}
          </div>

          {/* Category tabs */}
          <div
            role="tablist"
            aria-label="Filter by category"
            className="scroll-fade-right flex gap-2 overflow-x-auto no-scrollbar pb-0.5"
          >
            {categories.map((cat) => {
              const active = activeCategory === cat;
              return (
                <button
                  key={cat}
                  role="tab"
                  aria-selected={active}
                  onClick={() => setActiveCategory(cat)}
                  className={cn(
                    "shrink-0 h-9 px-4 rounded-full text-sm font-semibold border transition-colors",
                    active
                      ? "text-primary-foreground bg-primary border-primary"
                      : "bg-card text-foreground border-border hover:border-accent hover:text-accent active:bg-background"
                  )}
                >
                  {cat}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Product grid */}
      <div className="flex-1 px-3 sm:px-6 py-6 bg-background">
        <div className="max-w-7xl mx-auto">
          {loading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-3 lg:gap-4">
              {Array.from({ length: SKELETON_COUNT }).map((_, i) => (
                <ProductSkeleton key={i} />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-20">
              <p className="text-muted-foreground text-sm">
                {normalisedQuery
                  ? `No products match "${query}".`
                  : "No products in this category right now."}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-3 lg:gap-4">
              {filtered.map((product) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  onOpenDetail={setDetail}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      <ProductDetailDialog product={detail} onClose={() => setDetail(null)} />
    </section>
  );
}
