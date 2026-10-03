"use server";

import { requireManagerOrAdmin } from "@/lib/auth-guards";

export interface DayStats {
  revenue: number;
  cash: number;
  momo: number;
  pos: number;
  cogs: number;
  grossProfit: number;
  expenses: number;
  netProfit: number;
  transactions: number;
}

export async function fetchCustomDayStats(
  dateStr: string
): Promise<DayStats | { error: string }> {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return { error: "Invalid date format" };

  const supabase = await requireManagerOrAdmin();

  // Africa/Accra is UTC+0 — midnight Accra = midnight UTC, always.
  const nextD = new Date(`${dateStr}T00:00:00Z`);
  nextD.setUTCDate(nextD.getUTCDate() + 1);
  const nextDayStr = nextD.toISOString().split("T")[0];

  const [salesRes, refundsRes, expensesRes] = await Promise.all([
    supabase
      .from("sales")
      .select(
        `id, total_amount, created_at,
         payments(method, amount),
         sale_items(quantity, cost_at_sale, product:products(cost_price))`
      )
      .gte("created_at", `${dateStr}T00:00:00.000Z`)
      .lt("created_at", `${nextDayStr}T00:00:00.000Z`)
      .eq("status", "completed"),

    supabase
      .from("refunds")
      .select("sale_id, refund_amount")
      .gte("created_at", `${dateStr}T00:00:00.000Z`)
      .lt("created_at", `${nextDayStr}T00:00:00.000Z`),

    supabase
      .from("expenses")
      .select("amount")
      .eq("expense_date", dateStr)
      .eq("is_deleted", false),
  ]);

  if (salesRes.error) return { error: salesRes.error.message };

  const allSales = (salesRes.data ?? []) as any[];

  const refundMap: Record<string, number> = {};
  for (const r of (refundsRes.data ?? []) as any[]) {
    refundMap[r.sale_id] = (refundMap[r.sale_id] ?? 0) + Number(r.refund_amount);
  }

  const round2 = (n: number) => Math.round(n * 100) / 100;
  const saleNet = (s: any) => Math.max(0, Number(s.total_amount) - (refundMap[s.id] ?? 0));
  const cogsOfSale = (s: any) =>
    (s.sale_items ?? []).reduce((sum: number, i: any) => {
      const unitCost =
        i.cost_at_sale != null
          ? Number(i.cost_at_sale)
          : Number(i.product?.cost_price ?? 0);
      return sum + Number(i.quantity ?? 0) * unitCost;
    }, 0);

  const revenue = round2(allSales.reduce((sum, s) => sum + saleNet(s), 0));

  let _momo = 0, _pos = 0;
  for (const s of allSales) {
    let refAmt = refundMap[s.id] ?? 0;
    let sm = 0, sp = 0;
    for (const p of (s.payments ?? []) as { method: string; amount: number }[]) {
      if (p.method === "momo") sm += Number(p.amount);
      else if (p.method === "pos_machine") sp += Number(p.amount);
    }
    const md = Math.min(refAmt, sm); refAmt -= md;
    const pd = Math.min(refAmt, sp);
    _momo += sm - md;
    _pos += sp - pd;
  }
  const momo = round2(_momo);
  const pos = round2(_pos);
  const cash = round2(Math.max(0, revenue - momo - pos));

  const cogs = round2(
    allSales.reduce((sum, s) => {
      const refunded = refundMap[s.id] ?? 0;
      const refundPct =
        Number(s.total_amount) > 0 ? Math.min(1, refunded / Number(s.total_amount)) : 0;
      return sum + cogsOfSale(s) * (1 - refundPct);
    }, 0)
  );
  const grossProfit = round2(revenue - cogs);

  const expenses = round2(
    (expensesRes.data ?? []).reduce((sum, e: any) => sum + Number(e.amount), 0)
  );

  return {
    revenue,
    cash,
    momo,
    pos,
    cogs,
    grossProfit,
    expenses,
    netProfit: round2(grossProfit - expenses),
    transactions: allSales.length,
  };
}
