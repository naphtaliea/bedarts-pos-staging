"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { ShoppingCart, User, LogOut, Package } from "lucide-react";
import { useCart } from "@/src/lib/cart-store";
import { signOut } from "@/src/lib/actions/auth";
import { useAuth } from "@/src/lib/use-auth";
import { cn } from "@/src/lib/utils";

interface NavProps {
  onAuthClick: () => void;
}

export function Nav({ onAuthClick }: NavProps) {
  const { count, open } = useCart();
  const cartCount = count();
  const { user, isLoggedIn } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const menuBtnRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (!menuOpen) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setMenuOpen(false);
        menuBtnRef.current?.focus();
      }
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [menuOpen]);

  return (
    <header
      className={cn(
        "sticky top-0 z-50 w-full bg-navy transition-shadow duration-200",
        scrolled && "shadow-float"
      )}
    >
      <nav className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
        {/* Logo — reverse (light on navy) */}
        <Link
          href="/"
          className="shrink-0 flex items-center gap-2 -ml-1 pl-1 py-1 rounded-lg"
          aria-label="Bedarts Cold Supplies — home"
        >
          <Image
            src="/logo-brand-reverse.png"
            alt="Bedarts Cold Supplies"
            width={140}
            height={40}
            className="h-9 w-auto object-contain"
            priority
          />
        </Link>

        {/* Right actions */}
        <div className="flex items-center gap-1">
          {/* Cart */}
          <button
            onClick={open}
            aria-label={`Cart, ${cartCount} item${cartCount !== 1 ? "s" : ""}`}
            className="relative h-11 w-11 flex items-center justify-center rounded-xl text-white hover:bg-white/10 active:bg-white/15 transition-colors"
          >
            <ShoppingCart className="w-5 h-5" aria-hidden="true" />
            {cartCount > 0 && (
              <span
                aria-hidden="true"
                className="absolute top-1 right-1 min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-bold flex items-center justify-center text-white bg-primary tabular-nums"
              >
                {cartCount > 99 ? "99+" : cartCount}
              </span>
            )}
          </button>

          {/* Account */}
          {isLoggedIn ? (
            <div className="relative">
              <button
                ref={menuBtnRef}
                onClick={() => setMenuOpen((p) => !p)}
                aria-label={user?.email ? `Account menu, signed in as ${user.email}` : "Account menu"}
                aria-haspopup="menu"
                aria-expanded={menuOpen}
                className="h-11 w-11 flex items-center justify-center rounded-xl text-white hover:bg-white/10 active:bg-white/15 transition-colors"
              >
                <User className="w-5 h-5" aria-hidden="true" />
              </button>
              {menuOpen && (
                <>
                  <div
                    className="fixed inset-0 z-10"
                    onClick={() => setMenuOpen(false)}
                    aria-hidden="true"
                  />
                  <div
                    role="menu"
                    aria-label="Account"
                    className="absolute right-0 top-12 z-20 w-52 rounded-xl bg-card shadow-raised border border-border py-1 animate-slide-up"
                  >
                    <Link
                      role="menuitem"
                      href="/account"
                      onClick={() => setMenuOpen(false)}
                      className="flex items-center gap-2.5 px-4 py-3 text-sm text-foreground hover:bg-background focus-visible:bg-background transition-colors"
                    >
                      <Package className="w-4 h-4 text-muted-foreground" aria-hidden="true" />
                      My orders
                    </Link>
                    <button
                      role="menuitem"
                      onClick={async () => {
                        setMenuOpen(false);
                        await signOut();
                      }}
                      className="w-full flex items-center gap-2.5 px-4 py-3 text-sm text-primary hover:bg-background focus-visible:bg-background transition-colors"
                    >
                      <LogOut className="w-4 h-4" aria-hidden="true" />
                      Sign out
                    </button>
                  </div>
                </>
              )}
            </div>
          ) : (
            <button
              onClick={onAuthClick}
              className="h-11 px-4 rounded-xl text-sm font-semibold text-white border border-white/25 hover:bg-white/10 active:bg-white/15 transition-colors"
            >
              Sign in
            </button>
          )}
        </div>
      </nav>
    </header>
  );
}
