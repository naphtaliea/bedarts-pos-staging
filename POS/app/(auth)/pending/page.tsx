"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Clock, CheckCircle2 } from "lucide-react";
import { BrandLogo } from "@/components/brand-logo";
import { SnowflakePattern } from "@/components/snowflake-pattern";

function PendingInner() {
  const router = useRouter();
  const search = useSearchParams();
  const email = search.get("email") ?? "";
  const [approved, setApproved] = useState(false);

  useEffect(() => {
    if (!email) return;
    let cancelled = false;

    async function check() {
      try {
        const res = await fetch(`/api/pending-check?email=${encodeURIComponent(email)}`, { cache: "no-store" });
        if (!res.ok) return;
        const { approved: ok } = await res.json();
        if (ok && !cancelled) {
          setApproved(true);
          setTimeout(() => router.push("/login"), 1800);
        }
      } catch { /* transient network error — poll again next tick */ }
    }

    check();
    const interval = setInterval(check, 15000);
    return () => { cancelled = true; clearInterval(interval); };
  }, [email, router]);

  return (
    <div className="min-h-screen bg-white relative overflow-hidden flex flex-col items-center justify-center px-6">
      <div className="absolute inset-0 pointer-events-none">
        <SnowflakePattern opacity={0.05} rows={2} tileSize={48} height="100%" onLight />
      </div>

      <div className="absolute top-0 left-0 right-0 h-1 bg-primary" />

      <div className="relative z-10 flex flex-col items-center text-center max-w-sm">
        <BrandLogo className="h-10 w-auto mb-10" />

        <div className="w-full bg-sidebar rounded-2xl px-8 py-8 shadow-float flex flex-col items-center text-center">
          <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mb-6 transition-colors ${
            approved ? "bg-success/20" : "bg-white/10"
          }`}>
            {approved ? (
              <CheckCircle2 className="w-8 h-8 text-success" />
            ) : (
              <Clock className="w-8 h-8 text-white/60" />
            )}
          </div>

          <h1
            className="text-white mb-3 leading-tight"
            style={{ fontFamily: "var(--font-display)", fontWeight: 900, fontSize: "clamp(1.75rem, 5vw, 2.25rem)" }}
          >
            {approved ? "You're In" : "Awaiting Approval"}
          </h1>

          <p className="text-sidebar-muted text-sm leading-relaxed mb-8">
            {approved
              ? "Your account has been approved. Taking you to sign in…"
              : "Your account request has been submitted. An admin will review it and activate your account shortly. This page will refresh automatically when you're approved."}
          </p>

          <Link
            href="/login"
            className="text-sm text-sidebar-muted hover:text-white transition-colors underline underline-offset-4"
          >
            Back to sign in
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function PendingPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-white flex items-center justify-center">
        <BrandLogo className="h-10 w-auto opacity-40" />
      </div>
    }>
      <PendingInner />
    </Suspense>
  );
}
