export function Hero() {
  return (
    <section
      aria-labelledby="hero-title"
      className="relative w-full bg-navy px-4 sm:px-6 pt-16 pb-14 sm:pt-20 sm:pb-16 overflow-hidden"
    >
      {/* Subtle cold radial glow — deep blue, not distracting */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 60% 50% at 70% 50%, rgba(27,80,192,0.18) 0%, transparent 70%)",
        }}
      />

      <div className="relative max-w-7xl mx-auto">
        <p className="text-xs font-semibold tracking-[0.2em] uppercase mb-5 text-navy-muted">
          Bedarts Cold Supplies
        </p>

        <h1
          id="hero-title"
          className="font-display-black leading-[0.92] uppercase text-white"
          style={{ fontSize: "clamp(3rem, 10vw, 7rem)" }}
        >
          Always fresh.
          <br />
          <span className="relative inline-block">
            Always in
            <br />
            <span className="text-primary">season.</span>
          </span>
        </h1>

        <p
          className="mt-6 text-base sm:text-lg max-w-md leading-relaxed text-navy-muted"
          style={{ fontFamily: "var(--font-archivo)" }}
        >
          Order online. We deliver to your door or hold it for pickup — your
          choice.
        </p>

        <a
          href="#products"
          className="mt-8 inline-flex items-center gap-2 h-12 px-7 rounded-xl font-semibold text-sm text-primary-foreground bg-primary transition-transform active:scale-[0.98] hover:opacity-90"
        >
          Shop now
        </a>
      </div>

      {/* Bottom fade to ice background */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute bottom-0 inset-x-0 h-12"
        style={{
          background: "linear-gradient(to bottom, transparent, var(--color-background))",
        }}
      />
    </section>
  );
}
