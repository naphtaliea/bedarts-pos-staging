import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Snowflake, ShoppingCart, Package, BarChart3, ArrowRight } from "lucide-react";

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
    redirect("/pos");
  }

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col">
      {/* Nav */}
      <nav className="flex items-center justify-between px-8 py-5">
        <div className="flex items-center gap-2.5">
          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-blue-700">
            <Snowflake className="w-4.5 h-4.5 text-white" />
          </div>
          <span className="text-white font-bold text-sm">Bedarts Cold Supplies</span>
        </div>
        <Link
          href="/login"
          className="text-sm font-medium text-slate-300 hover:text-white transition-colors"
        >
          Staff Sign In
        </Link>
      </nav>

      {/* Hero */}
      <section className="flex-1 flex flex-col items-center justify-center px-6 text-center">
        <div className="flex items-center justify-center w-16 h-16 rounded-2xl bg-blue-700 mb-6">
          <Snowflake className="w-8 h-8 text-white" />
        </div>

        <h1 className="text-4xl sm:text-5xl font-extrabold text-white leading-tight max-w-xl">
          Bedarts Cold Supplies
        </h1>
        <p className="mt-4 text-lg text-slate-400 max-w-md">
          Point of sale and inventory management — built for the team.
        </p>

        <Link
          href="/login"
          className="mt-8 inline-flex items-center gap-2 bg-blue-700 hover:bg-blue-600 text-white font-semibold px-6 py-3 rounded-xl transition-colors"
        >
          Staff Sign In
          <ArrowRight className="w-4 h-4" />
        </Link>
      </section>

      {/* Features */}
      <section className="px-6 pb-16">
        <div className="max-w-3xl mx-auto grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            {
              icon: ShoppingCart,
              title: "Point of Sale",
              desc: "Fast order entry, split payments, PDF receipts.",
            },
            {
              icon: Package,
              title: "Inventory",
              desc: "Stock batches, expiry tracking, low-stock alerts.",
            },
            {
              icon: BarChart3,
              title: "Reports",
              desc: "Sales by day, cashier, and payment method.",
            },
          ].map(({ icon: Icon, title, desc }) => (
            <div
              key={title}
              className="bg-slate-900 border border-slate-800 rounded-2xl p-5"
            >
              <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-slate-800 mb-3">
                <Icon className="w-5 h-5 text-blue-400" />
              </div>
              <h3 className="text-sm font-semibold text-white mb-1">{title}</h3>
              <p className="text-xs text-slate-400 leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-800 px-8 py-4 text-center">
        <p className="text-xs text-slate-600">© {new Date().getFullYear()} Bedarts Cold Supplies</p>
      </footer>
    </div>
  );
}
