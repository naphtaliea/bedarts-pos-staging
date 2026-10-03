import Link from "next/link";
import { MapPin, Phone, Clock, MessageCircle } from "lucide-react";
import { LegalHeader } from "@/src/components/legal-header";
import { getStoreSettings } from "@/src/lib/actions/settings";
import { extractWhatsAppNumber } from "@/src/lib/whatsapp";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "About · Bedarts Cold Supplies",
  description:
    "Bedarts Cold Supplies — always fresh, always in season. Chicken, fish, beef and more, direct from our Lashibi cold store.",
};

export default async function AboutPage() {
  const settings = await getStoreSettings();
  const waNumber = extractWhatsAppNumber(settings?.phone ?? null);
  const phones = (settings?.phone ?? "")
    .split(/[\s/,]+/)
    .filter(Boolean);

  return (
    <div className="min-h-dvh flex flex-col bg-background">
      <LegalHeader />

      <main className="flex-1 max-w-2xl mx-auto w-full px-4 sm:px-6 py-10 space-y-8">
        <div>
          <p className="text-xs font-semibold tracking-widest uppercase text-muted-foreground">
            About us
          </p>
          <h1 className="font-display-black text-3xl sm:text-4xl uppercase text-foreground mt-1 leading-[0.95]">
            Cold storage,
            <br />
            done properly.
          </h1>
          <p className="mt-5 text-sm sm:text-base text-foreground leading-relaxed">
            Bedarts Cold Supplies is a family-run cold store serving households and caterers around Accra. Chicken, fish, sausages and beef — kept in-date, priced fairly, and delivered when you need them.
          </p>
          <p className="mt-3 text-sm sm:text-base text-foreground leading-relaxed">
            We buy directly from importers and reputable wholesalers, and we track every batch by expiry so nothing near-date ever leaves our door.
          </p>
        </div>

        {/* Facts */}
        <div className="grid sm:grid-cols-2 gap-3">
          <div className="rounded-2xl bg-card border border-border p-4">
            <div className="flex items-center gap-2 text-muted-foreground text-xs font-semibold uppercase tracking-widest">
              <MapPin className="w-3.5 h-3.5" aria-hidden="true" />
              Store
            </div>
            <p className="mt-2 text-sm text-foreground leading-relaxed">
              {settings?.address ?? "Community 19 Junction, Opp. Aragon, Lashibi"}
            </p>
          </div>

          <div className="rounded-2xl bg-card border border-border p-4">
            <div className="flex items-center gap-2 text-muted-foreground text-xs font-semibold uppercase tracking-widest">
              <Clock className="w-3.5 h-3.5" aria-hidden="true" />
              Hours
            </div>
            <p className="mt-2 text-sm text-foreground leading-relaxed">
              Mon – Sat: {settings?.opening_hours ?? "7:30am – 6pm"}
              <br />
              Sun: {settings?.sunday_hours ?? "9:30am – 6pm"}
            </p>
          </div>

          <div className="rounded-2xl bg-card border border-border p-4 sm:col-span-2">
            <div className="flex items-center gap-2 text-muted-foreground text-xs font-semibold uppercase tracking-widest">
              <Phone className="w-3.5 h-3.5" aria-hidden="true" />
              Call us
            </div>
            <div className="mt-2 flex flex-wrap gap-2">
              {phones.map((num) => (
                <a
                  key={num}
                  href={`tel:${num.replace(/\s/g, "")}`}
                  className="inline-flex items-center h-9 px-3 rounded-lg text-sm font-semibold text-foreground bg-background hover:bg-background/70 transition-colors tabular-nums"
                >
                  {num}
                </a>
              ))}
            </div>
          </div>
        </div>

        {/* WhatsApp CTA */}
        {waNumber && (
          <a
            href={`https://wa.me/${waNumber}?text=${encodeURIComponent("Hi Bedarts, I'd like to ask about your products.")}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 w-full h-12 rounded-xl text-sm font-semibold text-success bg-success/10 hover:bg-success/20 transition-colors"
          >
            <MessageCircle className="w-4 h-4" aria-hidden="true" />
            Message us on WhatsApp
          </a>
        )}

        {/* Delivery blurb */}
        <div>
          <h2 className="font-display-black text-xl uppercase text-foreground">
            Delivery
          </h2>
          <p className="mt-2 text-sm text-foreground leading-relaxed">
            We use Bolt to send your order to your address. The Bolt fare is separate — we&apos;ll confirm it with you by phone before we dispatch. You can also collect at the store or send your own Bolt driver.
          </p>
        </div>

        <div>
          <h2 className="font-display-black text-xl uppercase text-foreground">
            Policies
          </h2>
          <ul className="mt-2 text-sm text-foreground space-y-1">
            <li>
              <Link href="/terms" className="text-accent hover:underline">Terms of service</Link>
            </li>
            <li>
              <Link href="/returns" className="text-accent hover:underline">Returns policy</Link>
            </li>
          </ul>
        </div>
      </main>
    </div>
  );
}
