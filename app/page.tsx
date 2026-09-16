import { redirect } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { createClient } from "@/lib/supabase/server";
import { ArrowRight, ShoppingCart, Package, BarChart3 } from "lucide-react";

const RED = "#CC1B14";
const YELLOW = "#EEF3FF";
const DARK = "#060F40";

export default async function Home() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();
    if (profile?.role === "cashier") redirect("/cashier");
    redirect("/dashboard");
  }

  return (
    <div style={{ fontFamily: "var(--font-archivo)", color: DARK, overflowX: "hidden" }}>

      {/* ── NAV ─────────────────────────────────────────────────── */}
      <nav style={{
        position: "absolute", top: 0, left: 0, right: 0, zIndex: 20,
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "1.5rem 2.5rem",
      }}>
        <img src="/logo-light.svg" alt="Bedarts Cold Supplies" style={{ height: 44 }} />
        <Link href="/login" style={{
          display: "flex", alignItems: "center", gap: "0.375rem",
          color: "white", fontSize: "0.875rem", fontWeight: 600,
          textDecoration: "none", opacity: 0.9,
          transition: "opacity 0.15s",
        }}>
          Staff Sign In <ArrowRight size={14} />
        </Link>
      </nav>

      {/* ── HERO ─────────────────────────────────────────────────── */}
      <section style={{ position: "relative", height: "100vh", minHeight: 560, overflow: "hidden" }}>
        <Image
          src="https://images.unsplash.com/photo-1602470520998-f4a52199a3d6?auto=format&fit=crop&w=1920&q=85"
          alt="Fresh frozen chicken"
          fill
          priority
          style={{ objectFit: "cover", objectPosition: "center" }}
        />
        {/* gradient overlay — dark at bottom (where text lives), tinted red mid */}
        <div style={{
          position: "absolute", inset: 0,
          background: `linear-gradient(
            to top,
            rgba(28,10,7,0.92) 0%,
            rgba(171,21,9,0.35) 45%,
            rgba(0,0,0,0.15) 100%
          )`,
        }} />

        {/* hero text — bottom-left, editorial */}
        <div style={{
          position: "absolute", bottom: 0, left: 0,
          padding: "clamp(2rem, 5vw, 4rem)",
          maxWidth: 820,
        }}>
          <p style={{
            color: YELLOW, fontSize: "0.75rem", fontWeight: 700,
            letterSpacing: "0.25em", textTransform: "uppercase",
            marginBottom: "1rem", opacity: 0.85,
          }}>
            Always fresh&hellip;always in season
          </p>

          <h1 style={{
            fontFamily: "var(--font-display)",
            fontSize: "clamp(3.25rem, 9vw, 7.5rem)",
            lineHeight: 0.9,
            letterSpacing: "-0.02em",
            color: "white",
            margin: 0,
          }}>
            Fresh.<br />
            <span style={{ color: RED }}>Cold.</span><br />
            Reliable.
          </h1>

          <p style={{
            color: YELLOW, fontSize: "clamp(1rem, 1.5vw, 1.125rem)",
            marginTop: "1.5rem", marginBottom: "2rem",
            opacity: 0.85, maxWidth: 420, lineHeight: 1.6,
          }}>
            Frozen poultry, fresh fish, and cold-chain produce —
            delivered with precision to Accra and beyond.
          </p>

          <Link href="/login" style={{
            display: "inline-flex", alignItems: "center", gap: "0.5rem",
            background: RED, color: YELLOW,
            fontWeight: 700, fontSize: "0.9375rem",
            padding: "0.875rem 1.75rem", borderRadius: 10,
            textDecoration: "none", letterSpacing: "0.01em",
          }}>
            Staff Sign In <ArrowRight size={16} />
          </Link>
        </div>

        {/* scroll hint */}
        <div style={{
          position: "absolute", bottom: "2rem", right: "2.5rem",
          color: "rgba(255,247,211,0.4)", fontSize: "0.6875rem",
          letterSpacing: "0.2em", textTransform: "uppercase",
          writingMode: "vertical-rl", textOrientation: "mixed",
        }}>
          scroll
        </div>
      </section>

      {/* ── PRODUCT SHOWCASE ─────────────────────────────────────── */}
      <section style={{ background: YELLOW, padding: "5rem 2.5rem" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto" }}>
          <p style={{
            color: RED, fontSize: "0.75rem", fontWeight: 700,
            letterSpacing: "0.25em", textTransform: "uppercase", marginBottom: "0.75rem",
          }}>
            What we carry
          </p>
          <h2 style={{
            fontFamily: "var(--font-display)",
            fontSize: "clamp(2rem, 5vw, 3.5rem)",
            color: DARK, margin: "0 0 3rem",
            lineHeight: 1.0,
          }}>
            From the cold chain<br />to your door.
          </h2>

          {/* asymmetric product grid */}
          <div style={{
            display: "grid",
            gridTemplateColumns: "1.4fr 1fr 1fr",
            gridTemplateRows: "auto",
            gap: "1rem",
          }}>
            {/* large left card */}
            <ProductCard
              src="https://images.unsplash.com/photo-1529692236671-f1f6cf9683ba?auto=format&fit=crop&w=800&q=80"
              alt="Fresh beef and pork cuts"
              label="Premium Meats"
              desc="Beef, pork, and cold cuts — sourced fresh, kept cold."
              tall
            />
            {/* two stacked right cards */}
            <ProductCard
              src="https://images.unsplash.com/photo-1548550023-2bdb3c5beed7?auto=format&fit=crop&w=600&q=80"
              alt="Frozen whole chicken"
              label="Frozen Poultry"
              desc="Whole birds and cuts, blast-frozen and packed to order."
            />
            <ProductCard
              src="https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2?auto=format&fit=crop&w=600&q=80"
              alt="Fresh fish and seafood"
              label="Fish & Seafood"
              desc="Tilapia, mackerel, prawns, and shrimp — iced to order."
            />
          </div>
        </div>
      </section>

      {/* ── FEATURES ─────────────────────────────────────────────── */}
      <section style={{ background: "white", padding: "5rem 2.5rem" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto" }}>
          <p style={{
            color: RED, fontSize: "0.75rem", fontWeight: 700,
            letterSpacing: "0.25em", textTransform: "uppercase", marginBottom: "0.75rem",
          }}>
            Built for the team
          </p>
          <h2 style={{
            fontFamily: "var(--font-display)",
            fontSize: "clamp(1.75rem, 4vw, 3rem)",
            color: DARK, margin: "0 0 3rem", lineHeight: 1.05,
          }}>
            Tools that keep<br />the operation tight.
          </h2>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "1.5rem" }}>
            {[
              {
                Icon: ShoppingCart,
                title: "Point of Sale",
                desc: "Fast order entry, split payments across cash, MoMo, and POS machine. PDF receipt on every sale.",
              },
              {
                Icon: Package,
                title: "Inventory",
                desc: "Stock batches with expiry dates, low-stock alerts, and temperature zone tracking.",
              },
              {
                Icon: BarChart3,
                title: "Reports",
                desc: "Daily sales, cashier summaries, and inventory valuations — all in one place.",
              },
            ].map(({ Icon, title, desc }) => (
              <div key={title} style={{
                border: `1.5px solid #eee`,
                borderRadius: 16, padding: "2rem",
              }}>
                <div style={{
                  width: 44, height: 44, borderRadius: 10,
                  background: YELLOW, display: "flex", alignItems: "center", justifyContent: "center",
                  marginBottom: "1.25rem",
                }}>
                  <Icon size={20} color={RED} />
                </div>
                <h3 style={{ fontWeight: 700, fontSize: "1.0625rem", margin: "0 0 0.5rem" }}>{title}</h3>
                <p style={{ fontSize: "0.9rem", color: "#6b5f5c", lineHeight: 1.65, margin: 0 }}>{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA STRIP ────────────────────────────────────────────── */}
      <section style={{ background: RED, padding: "5rem 2.5rem" }}>
        <div style={{
          maxWidth: 1200, margin: "0 auto",
          display: "flex", alignItems: "center", justifyContent: "space-between",
          flexWrap: "wrap", gap: "2rem",
        }}>
          <h2 style={{
            fontFamily: "var(--font-display)",
            fontSize: "clamp(2rem, 5vw, 3.5rem)",
            color: "white", margin: 0, lineHeight: 1.0,
          }}>
            Your shift starts here.
          </h2>
          <Link href="/login" style={{
            display: "inline-flex", alignItems: "center", gap: "0.5rem",
            background: YELLOW, color: RED,
            fontWeight: 700, fontSize: "0.9375rem",
            padding: "1rem 2rem", borderRadius: 10,
            textDecoration: "none", letterSpacing: "0.01em",
            whiteSpace: "nowrap",
          }}>
            Staff Sign In <ArrowRight size={16} />
          </Link>
        </div>
      </section>

      {/* ── FOOTER ───────────────────────────────────────────────── */}
      <footer style={{
        background: DARK, padding: "2.5rem",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        flexWrap: "wrap", gap: "1rem",
      }}>
        <img src="/logo-light.svg" alt="Bedarts Cold Supplies" style={{ height: 38 }} />
        <p style={{ color: "rgba(255,247,211,0.35)", fontSize: "0.75rem", margin: 0 }}>
          © {new Date().getFullYear()} Bedarts Cold Supplies. All rights reserved.
        </p>
      </footer>

    </div>
  );
}

/* ── Product card component ─────────────────────────────────── */
function ProductCard({
  src, alt, label, desc, tall,
}: {
  src: string; alt: string; label: string; desc: string; tall?: boolean;
}) {
  return (
    <div style={{
      position: "relative",
      borderRadius: 16,
      overflow: "hidden",
      height: tall ? "min(480px, 60vw)" : "min(228px, 28vw)",
      /* the print-offset "misregistration" border — aesthetic risk */
      outline: `3px solid ${RED}`,
      outlineOffset: "6px",
    }}>
      <Image
        src={src}
        alt={alt}
        fill
        style={{ objectFit: "cover" }}
        sizes="(max-width: 768px) 100vw, 33vw"
      />
      {/* bottom label overlay */}
      <div style={{
        position: "absolute", bottom: 0, left: 0, right: 0,
        background: "linear-gradient(to top, rgba(28,10,7,0.88) 0%, transparent 100%)",
        padding: "1.5rem 1.25rem 1.25rem",
      }}>
        <p style={{
          color: RED, fontSize: "0.6875rem", fontWeight: 700,
          letterSpacing: "0.2em", textTransform: "uppercase", margin: "0 0 0.25rem",
        }}>
          {label}
        </p>
        <p style={{ color: "rgba(255,247,211,0.85)", fontSize: "0.8125rem", margin: 0, lineHeight: 1.5 }}>
          {desc}
        </p>
      </div>
    </div>
  );
}
