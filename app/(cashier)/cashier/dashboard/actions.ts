"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { readCashierSession } from "@/lib/cashier-session";

export interface ReconciliationData {
  opening_float: number;
  cash_counted: number;
  notes?: string;
}

export async function saveReconciliation(
  data: ReconciliationData
): Promise<{ error?: string }> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  // Mirror submitSale: PIN session cashier ID takes precedence over auth user
  const pinCashierId = await readCashierSession();
  const cashierId = pinCashierId ?? user.id;

  const today = new Date().toISOString().slice(0, 10);
  const todayStart = `${today}T00:00:00.000Z`;
  const todayEnd = `${today}T23:59:59.999Z`;

  // Guard against duplicate submissions for the same shift
  const { data: existing } = await supabase
    .from("cashier_reconciliations")
    .select("id")
    .eq("cashier_id", cashierId)
    .eq("shift_date", today)
    .maybeSingle();

  if (existing) return { error: "A reconciliation has already been submitted for today's shift." };

  // Fetch today's completed sales with payments to calculate totals by method
  const { data: sales, error: salesErr } = await supabase
    .from("sales")
    .select("payments(method, amount)")
    .eq("cashier_id", cashierId)
    .eq("status", "completed")
    .gte("created_at", todayStart)
    .lte("created_at", todayEnd);

  if (salesErr) return { error: salesErr.message };

  let cash_expected = 0;
  let momo_total = 0;
  let pos_total = 0;
  let gross_sales = 0;

  for (const sale of sales ?? []) {
    for (const p of (sale as any).payments ?? []) {
      gross_sales += p.amount;
      if (p.method === "cash") cash_expected += p.amount;
      else if (p.method === "momo") momo_total += p.amount;
      else if (p.method === "pos_machine") pos_total += p.amount;
    }
  }

  const cash_variance = data.cash_counted - cash_expected;

  const { error } = await supabase.from("cashier_reconciliations").insert({
    cashier_id: cashierId,
    shift_date: today,
    opening_float: data.opening_float,
    cash_counted: data.cash_counted,
    cash_expected,
    cash_variance,
    momo_total,
    pos_total,
    account_total: 0,
    gross_sales,
    notes: data.notes?.trim() || null,
  });

  if (error) return { error: error.message };

  revalidatePath("/cashier/dashboard");
  return {};
}
