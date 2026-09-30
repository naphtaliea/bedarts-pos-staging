import { redirect } from "next/navigation";
import Link from "next/link";
import { LogOut } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { logout } from "@/app/(auth)/login/actions";
import { BrandLogo } from "@/components/brand-logo";

// Butcher shell — deliberately minimal. No sidebar, no dashboard chrome.
// Just brand + logout so the counter phone shows nothing but the thaw list.
export default async function ButcherLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  if (profileError && profileError.code !== "PGRST116") redirect("/login");
  if (!profile || !profile.is_active) {
    await supabase.auth.signOut();
    redirect("/login");
  }

  // Send anyone who isn't a butcher back to their own landing.
  if (profile.role !== "butcher") redirect("/");

  return (
    <div className="min-h-dvh flex flex-col bg-slate-50">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30">
        <div className="max-w-[900px] mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <BrandLogo className="h-7 w-auto" />
            <span className="text-[11px] font-black uppercase tracking-[0.15em] text-slate-400 hidden sm:inline">
              Counter
            </span>
          </div>
          <form action={logout}>
            <button
              type="submit"
              className="inline-flex items-center gap-1.5 h-9 px-3 rounded-lg text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors"
              aria-label="Log out"
            >
              <LogOut className="w-4 h-4" strokeWidth={2} />
              <span>Log out</span>
            </button>
          </form>
        </div>
      </header>
      <main className="flex-1 overflow-y-auto overflow-x-hidden">
        {children}
      </main>
    </div>
  );
}
