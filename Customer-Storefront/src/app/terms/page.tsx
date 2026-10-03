import Link from "next/link";
import { LegalHeader } from "@/src/components/legal-header";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of service · Bedarts Cold Supplies",
};

export default function TermsPage() {
  return (
    <div className="min-h-dvh flex flex-col bg-background">
      <LegalHeader />

      <main className="flex-1 max-w-2xl mx-auto w-full px-4 sm:px-6 py-10">
        <p className="text-xs font-semibold tracking-widest uppercase text-muted-foreground">
          Terms of service
        </p>
        <h1 className="font-display-black text-3xl uppercase text-foreground mt-1">
          The short version
        </h1>
        <p className="mt-4 text-sm text-muted-foreground">
          Last updated 30 September 2026.
        </p>

        <div className="mt-8 space-y-6 text-sm text-foreground leading-relaxed">
          <section>
            <h2 className="font-display-black uppercase text-lg text-foreground">
              1. Who we are
            </h2>
            <p className="mt-2">
              Bedarts Cold Supplies is a Ghana-registered cold-storage business at Community 19 Junction, Opposite Aragon, Lashibi. When we say &quot;we&quot; or &quot;Bedarts&quot; on this site, we mean that business.
            </p>
          </section>

          <section>
            <h2 className="font-display-black uppercase text-lg text-foreground">
              2. Placing an order
            </h2>
            <p className="mt-2">
              When you place an order and pay through Paystack, you&apos;re entering into a purchase with us for the items in your cart at the prices shown. Prices are in Ghana cedis (GH¢) and include any applicable taxes.
            </p>
            <p className="mt-2">
              We&apos;ll confirm your order by phone before dispatch. If we can&apos;t reach you within a reasonable time, or if any item is unexpectedly unavailable, we may need to cancel and refund the affected part of the order.
            </p>
          </section>

          <section>
            <h2 className="font-display-black uppercase text-lg text-foreground">
              3. Payment
            </h2>
            <p className="mt-2">
              Payment for goods is taken up-front through Paystack (card or mobile money). We don&apos;t store your card details — Paystack handles that on our behalf.
            </p>
            <p className="mt-2">
              Delivery via Bolt is charged separately, based on the fare between our store and your address. We&apos;ll confirm the fare with you by phone before we send a driver.
            </p>
          </section>

          <section>
            <h2 className="font-display-black uppercase text-lg text-foreground">
              4. Cutoff and dispatch
            </h2>
            <p className="mt-2">
              Orders placed before our daily cutoff (currently 5:50pm) are dispatched the same day within store hours. Orders placed after cutoff, or while the store is closed, are dispatched first thing the next business day.
            </p>
          </section>

          <section>
            <h2 className="font-display-black uppercase text-lg text-foreground">
              5. Cancellations and returns
            </h2>
            <p className="mt-2">
              You can cancel your order any time before we&apos;ve dispatched it — go to <Link href="/account" className="text-accent hover:underline">My orders</Link> and hit Cancel. Once dispatched, please see our <Link href="/returns" className="text-accent hover:underline">returns policy</Link> for what we can do.
            </p>
          </section>

          <section>
            <h2 className="font-display-black uppercase text-lg text-foreground">
              6. Your account
            </h2>
            <p className="mt-2">
              Keep your login details private. You&apos;re responsible for what happens under your account. If you think someone else has used it, contact us and we&apos;ll help sort it out.
            </p>
          </section>

          <section>
            <h2 className="font-display-black uppercase text-lg text-foreground">
              7. Contact
            </h2>
            <p className="mt-2">
              Anything unclear? See our <Link href="/about" className="text-accent hover:underline">About page</Link> for phone and WhatsApp.
            </p>
          </section>
        </div>
      </main>
    </div>
  );
}
