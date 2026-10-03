import Link from "next/link";
import { LegalHeader } from "@/src/components/legal-header";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Returns policy · Bedarts Cold Supplies",
};

export default function ReturnsPage() {
  return (
    <div className="min-h-dvh flex flex-col bg-background">
      <LegalHeader />

      <main className="flex-1 max-w-2xl mx-auto w-full px-4 sm:px-6 py-10">
        <p className="text-xs font-semibold tracking-widest uppercase text-muted-foreground">
          Returns policy
        </p>
        <h1 className="font-display-black text-3xl uppercase text-foreground mt-1">
          Frozen goods
          <br />
          are sold as-is.
        </h1>
        <p className="mt-4 text-sm text-muted-foreground">
          Last updated 30 September 2026.
        </p>

        <div className="mt-8 space-y-6 text-sm text-foreground leading-relaxed">
          <section>
            <p>
              Because we sell chilled and frozen goods, we can&apos;t take back items after they&apos;ve left our cold room. The short version is: <span className="font-semibold">goods sold are not returnable.</span>
            </p>
          </section>

          <section>
            <h2 className="font-display-black uppercase text-lg text-foreground">
              Damaged or spoiled on arrival
            </h2>
            <p className="mt-2">
              If your order arrives obviously spoiled, damaged, or with the wrong item, tell us within 2 hours of delivery. Keep the item as-is and send us a photo on WhatsApp. We&apos;ll refund or replace the affected item.
            </p>
          </section>

          <section>
            <h2 className="font-display-black uppercase text-lg text-foreground">
              We got the order wrong
            </h2>
            <p className="mt-2">
              If we packed the wrong product, wrong quantity, or missed something — let us know and we&apos;ll make it right at no cost. Photo helps us investigate.
            </p>
          </section>

          <section>
            <h2 className="font-display-black uppercase text-lg text-foreground">
              You changed your mind
            </h2>
            <p className="mt-2">
              You can cancel any order that hasn&apos;t been dispatched yet — see <Link href="/account" className="text-accent hover:underline">My orders</Link>. Once dispatched, we can&apos;t take frozen goods back for safety reasons.
            </p>
          </section>

          <section>
            <h2 className="font-display-black uppercase text-lg text-foreground">
              Refunds
            </h2>
            <p className="mt-2">
              Refunds go back to the same Paystack payment method used at checkout, usually within 3–5 working days. Bolt fares (which you pay to the driver, not to us) can&apos;t be refunded through us.
            </p>
          </section>

          <section>
            <h2 className="font-display-black uppercase text-lg text-foreground">
              Getting in touch
            </h2>
            <p className="mt-2">
              Fastest way is WhatsApp — see the <Link href="/about" className="text-accent hover:underline">About page</Link> for our number.
            </p>
          </section>
        </div>
      </main>
    </div>
  );
}
