"use server";

import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";
import { readCashierSession } from "@/lib/cashier-session";

export interface ReconciliationData {
  cash_counted: number;
  momo_change: number;
  expenses: { description: string; amount: number }[];
}

export async function endShift(): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const cookieStore = await cookies();
  cookieStore.delete("cashier_session");
  return {};
}

export async function saveReconciliation(
  data: ReconciliationData
): Promise<{ error?: string }> {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, is_active")
    .eq("id", user.id)
    .single();
  if (!profile || !profile.is_active) return { error: "Account inactive" };
  if (!["admin", "manager", "cashier", "terminal"].includes(profile.role)) {
    return { error: "Access denied" };
  }

  const pinCashierId = await readCashierSession();
  if ((profile.role === "cashier" || profile.role === "terminal") && !pinCashierId) {
    return { error: "PIN session required" };
  }
  const cashierId = pinCashierId ?? user.id;

  const today = new Date().toISOString().slice(0, 10);
  const todayStart = `${today}T00:00:00.000Z`;
  const todayEnd = `${today}T23:59:59.999Z`;

  const { data: existing } = await supabase
    .from("cashier_reconciliations")
    .select("id")
    .eq("cashier_id", cashierId)
    .eq("shift_date", today)
    .maybeSingle();

  if (existing) return { error: "A reconciliation has already been submitted for today." };

  const [{ data: sales, error: salesErr }, { data: todayRefunds }] = await Promise.all([
    supabase
      .from("sales")
      .select("id, total_amount, payments(method, amount)")
      .eq("status", "completed")
      .gte("created_at", todayStart)
      .lte("created_at", todayEnd),
    supabase
      .from("refunds")
      .select("sale_id, refund_amount")
      .gte("created_at", todayStart)
      .lte("created_at", todayEnd),
  ]);

  if (salesErr) return { error: salesErr.message };

  const refundMap: Record<string, number> = {};
  for (const r of todayRefunds ?? []) {
    refundMap[(r as any).sale_id] = (refundMap[(r as any).sale_id] ?? 0) + Number((r as any).refund_amount);
  }

  // First pass: gross totals and per-sale payment classification.
  let gross_sales = 0, momo_total = 0, pos_total = 0;
  // Tracks how much of each sale was paid via non-cash methods (for refund attribution).
  const saleMomo: Record<string, number> = {};
  const salePos: Record<string, number> = {};
  for (const sale of sales ?? []) {
    gross_sales += Number((sale as any).total_amount ?? 0);
    for (const p of (sale as any).payments ?? []) {
      if (p.method === "momo") {
        momo_total += Number(p.amount);
        saleMomo[(sale as any).id] = (saleMomo[(sale as any).id] ?? 0) + Number(p.amount);
      } else if (p.method === "pos_machine") {
        pos_total += Number(p.amount);
        salePos[(sale as any).id] = (salePos[(sale as any).id] ?? 0) + Number(p.amount);
      }
    }
  }

  // Attribute each refund to the original payment method.
  // MoMo-paid sales → refund deducts from momo_total (MoMo reversal).
  // POS-paid sales  → refund deducts from pos_total.
  // Cash-paid sales → refund reduces gross revenue (less cash came in).
  let momo_refunded = 0, pos_refunded = 0, cash_refunded = 0;
  for (const r of todayRefunds ?? []) {
    const sid = (r as any).sale_id;
    const amt = Number((r as any).refund_amount);
    if (saleMomo[sid]) momo_refunded += amt;
    else if (salePos[sid]) pos_refunded += amt;
    else cash_refunded += amt;
  }
  momo_total = Math.max(0, momo_total - momo_refunded);
  pos_total  = Math.max(0, pos_total  - pos_refunded);
  gross_sales -= (momo_refunded + pos_refunded + cash_refunded); // net revenue for record

  const momo_change = Math.max(0, data.momo_change ?? 0);
  const cash_expected = Math.max(0, gross_sales - momo_total - pos_total - momo_change);

  const expenses_total = data.expenses.reduce((s, e) => s + e.amount, 0);
  const cash_variance = data.cash_counted - cash_expected;

  const admin = createAdminClient();
  const { error } = await admin.from("cashier_reconciliations").insert({
    cashier_id: cashierId,
    shift_date: today,
    opening_float: 0,
    cash_counted: data.cash_counted,
    cash_expected,
    cash_variance,
    momo_total,
    pos_total,
    account_total: 0,
    gross_sales,
    momo_change,
    notes: null,
    expenses: data.expenses,
    expenses_total,
  });

  if (error) return { error: error.message };

  // Write EOD expenses into the main expenses table so they appear in P&L and the expenses page.
  const validExpenses = data.expenses.filter(e => e.description.trim() && e.amount > 0);
  if (validExpenses.length > 0) {
    const { data: otherCat } = await admin
      .from("expense_categories")
      .select("id")
      .eq("name", "Other")
      .single();
    if (otherCat) {
      await admin.from("expenses").insert(
        validExpenses.map(e => ({
          amount: Math.round(e.amount * 100) / 100,
          category_id: otherCat.id,
          description: e.description.trim(),
          expense_date: today,
          paid_via: "cash",
          created_by: cashierId,
        }))
      );
    }
  }

  const cookieStore = await cookies();
  cookieStore.delete("cashier_session");

  revalidatePath("/cashier/dashboard");
  return {};
}

export interface DashboardSalesRow {
  id: string;
  total_amount: number;
  created_at: string;
  sale_items: { product_id: string; quantity: number; products: { name: string } | null }[];
  payments: { method: string; amount: number }[];
}

export interface CashierSubmission {
  cashier_id: string;
  cashier_name: string;
  cash_counted: number;
  cash_expected: number;
  momo_change: number;
  submitted_at: string;
}

export async function getTodayCashierSubmissions(): Promise<{
  submissions: CashierSubmission[];
  error?: string;
}> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { submissions: [], error: "Not authenticated" };

  const { data: profile } = await supabase
    .from("profiles").select("role").eq("id", user.id).single();
  if (!["admin", "manager"].includes(profile?.role ?? "")) {
    return { submissions: [], error: "Access denied" };
  }

  const today = new Date().toISOString().slice(0, 10);
  const admin = createAdminClient();

  const { data: recs, error } = await admin
    .from("cashier_reconciliations")
    .select("cashier_id, cash_counted, cash_expected, momo_change, created_at")
    .eq("shift_date", today)
    .order("created_at", { ascending: true });

  if (error) return { submissions: [], error: error.message };
  if (!recs || recs.length === 0) return { submissions: [] };

  const cashierIds = [...new Set(recs.map((r: any) => r.cashier_id))];
  const { data: profiles } = await admin
    .from("profiles")
    .select("id, full_name")
    .in("id", cashierIds);

  const nameMap = Object.fromEntries((profiles ?? []).map((p: any) => [p.id, p.full_name]));

  return {
    submissions: recs.map((r: any) => ({
      cashier_id: r.cashier_id,
      cashier_name: nameMap[r.cashier_id] ?? "Unknown",
      cash_counted: Number(r.cash_counted),
      cash_expected: Number(r.cash_expected),
      momo_change: Number(r.momo_change ?? 0),
      submitted_at: r.created_at,
    })),
  };
}

export async function getDashboardSales(): Promise<{
  canSeeRevenue: boolean;
  sales: DashboardSalesRow[];
  error?: string;
}> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { canSeeRevenue: false, sales: [], error: "Not authenticated" };

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, is_active")
    .eq("id", user.id)
    .single();
  if (!profile || !profile.is_active) return { canSeeRevenue: false, sales: [], error: "Account inactive" };

  // PIN session may be a different person logged into a shared terminal
  const pinCashierId = await readCashierSession();
  let effectiveRole: string = profile.role;
  if (pinCashierId && pinCashierId !== user.id) {
    const { data: pinProfile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", pinCashierId)
      .single();
    if (pinProfile) effectiveRole = pinProfile.role;
  }

  const canSeeRevenue = ["admin", "manager", "accountant"].includes(effectiveRole);

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayIso = today.toISOString();

  if (canSeeRevenue) {
    const [{ data, error }, { data: todayRefunds }] = await Promise.all([
      supabase
        .from("sales")
        .select("id, total_amount, created_at, sale_items(product_id, quantity, products(name)), payments(method, amount)")
        .gte("created_at", todayIso)
        .eq("status", "completed"),
      supabase
        .from("refunds")
        .select("sale_id, refund_amount")
        .gte("created_at", todayIso),
    ]);
    if (error) return { canSeeRevenue, sales: [], error: error.message };
    const refundMap: Record<string, number> = {};
    for (const r of todayRefunds ?? []) {
      refundMap[(r as any).sale_id] = (refundMap[(r as any).sale_id] ?? 0) + Number((r as any).refund_amount);
    }
    // For each refunded sale, reduce the momo/pos payment amount by the refund so that
    // the client's cash computation (total_amount - momo - pos) stays correct.
    const sales = (data ?? []).map((s: any) => {
      const refundAmt = refundMap[s.id] ?? 0;
      if (refundAmt === 0) return { ...s, total_amount: Number(s.total_amount) };
      // Determine how much of this sale was non-cash
      const saleMomo = (s.payments ?? []).reduce((sum: number, p: any) => p.method === "momo" ? sum + Number(p.amount) : sum, 0);
      const salePos  = (s.payments ?? []).reduce((sum: number, p: any) => p.method === "pos_machine" ? sum + Number(p.amount) : sum, 0);
      const isMomo = saleMomo > 0;
      const isPos  = salePos > 0 && !isMomo;
      return {
        ...s,
        total_amount: Math.max(0, Number(s.total_amount) - refundAmt),
        payments: (s.payments ?? []).map((p: any) => {
          if (p.method === "momo" && isMomo)
            return { ...p, amount: Math.max(0, Number(p.amount) - refundAmt) };
          if (p.method === "pos_machine" && isPos)
            return { ...p, amount: Math.max(0, Number(p.amount) - refundAmt) };
          return p;
        }),
      };
    });
    return { canSeeRevenue, sales: sales as unknown as DashboardSalesRow[] };
  }

  // Non-revenue roles: order count and top products only, no financial data
  const { data, error } = await supabase
    .from("sales")
    .select("id, created_at, sale_items(product_id, quantity, products(name))")
    .gte("created_at", todayIso)
    .eq("status", "completed");
  if (error) return { canSeeRevenue, sales: [], error: error.message };

  return {
    canSeeRevenue,
    sales: (data ?? []).map((s: any) => ({ ...s, total_amount: 0, payments: [] })),
  };
}
