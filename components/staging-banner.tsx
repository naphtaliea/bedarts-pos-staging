import { AlertTriangle } from "lucide-react";

/**
 * Persistent warning strip shown on every page when the app is running against
 * the staging Supabase project. Renders nothing in production.
 *
 * Detection is done via NEXT_PUBLIC_APP_ENV (baked in at build time), which is
 * set to "staging" in /home/prohacker/Bedarts-staging/.env.local and
 * "production" in /home/prohacker/Bedarts/.env.local.
 */
export function StagingBanner() {
  if (process.env.NEXT_PUBLIC_APP_ENV !== "staging") return null;

  return (
    <div className="w-full bg-amber-400 text-slate-900 border-b border-amber-500/60 print:hidden">
      <div className="mx-auto max-w-screen-2xl px-4 py-1.5 flex items-center justify-center gap-2.5 text-[11px] font-black uppercase tracking-widest">
        <AlertTriangle className="w-3.5 h-3.5 shrink-0" strokeWidth={2.5} aria-hidden />
        <span>Staging environment — test data only, not real customers</span>
      </div>
    </div>
  );
}
