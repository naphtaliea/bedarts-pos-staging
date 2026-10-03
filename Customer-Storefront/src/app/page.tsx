"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Nav } from "@/src/components/nav";
import { Hero } from "@/src/components/hero";
import { ShopClient } from "@/src/components/shop-client";
import { CartDrawer } from "@/src/components/cart-drawer";
import { AuthModal } from "@/src/components/auth-modal";
import { getStorefrontProducts } from "@/src/lib/actions/products";
import { useAuth } from "@/src/lib/use-auth";
import type { StorefrontProduct } from "@/src/lib/types";

export default function HomePage() {
  const router = useRouter();
  const { isLoggedIn } = useAuth();

  const [products, setProducts] = useState<StorefrontProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [authOpen, setAuthOpen] = useState(false);

  // Where to send the user after a successful sign-in.
  // Set when they hit "Sign in to checkout" from the cart footer.
  const postAuthRedirect = useRef<string | null>(null);

  useEffect(() => {
    getStorefrontProducts()
      .then(setProducts)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  function requestCheckoutAuth() {
    postAuthRedirect.current = "/checkout";
    setAuthOpen(true);
  }

  return (
    <div className="min-h-dvh flex flex-col bg-background">
      <Nav onAuthClick={() => setAuthOpen(true)} />

      <Hero />

      <ShopClient products={products} loading={loading} />

      <footer className="px-6 py-10 text-center bg-navy space-y-4">
        <div>
          <p className="font-display-black text-lg uppercase text-white tracking-wide">
            Bedarts Cold Supplies
          </p>
          <p className="text-sm mt-1 text-navy-muted">
            Always fresh. Always in season.
          </p>
        </div>
        <nav aria-label="Footer" className="flex justify-center gap-5 text-xs text-navy-muted">
          <a href="/about" className="hover:text-white transition-colors">About</a>
          <a href="/terms" className="hover:text-white transition-colors">Terms</a>
          <a href="/returns" className="hover:text-white transition-colors">Returns</a>
        </nav>
      </footer>

      <CartDrawer isLoggedIn={isLoggedIn} onAuthRequired={requestCheckoutAuth} />
      <AuthModal
        open={authOpen}
        onClose={() => {
          setAuthOpen(false);
          postAuthRedirect.current = null;
        }}
        onSuccess={() => {
          const target = postAuthRedirect.current;
          postAuthRedirect.current = null;
          if (target) router.push(target);
        }}
      />
    </div>
  );
}
