import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { StockMovementClient, type DailyRow } from "./stock-movement-client";

export const revalidate = 0;

export default async function StockMovementPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!["admin", "manager"].includes(profile?.role ?? "")) redirect("/dashboard");

  const now = new Date();
  const todayStart = new Date(now); todayStart.setHours(0, 0, 0, 0);
  const todayStr = todayStart.toISOString().slice(0, 10);

  // Chain starts from the first day a sale was made on the new POS — not from migration batches
  const { data: firstSaleData } = await supabase
    .from("sales")
    .select("created_at")
    .eq("status", "completed")
    .order("created_at", { ascending: true })
    .limit(1);

  const firstSaleDate = firstSaleData?.[0]?.created_at?.slice(0, 10) ?? todayStr;

  const [productsRes, receivedRes, adjustedRes, salesRes] = await Promise.all([
    supabase
      .from("product_stock")
      .select("id, selling_price, stock_quantity")
      .eq("is_active", true),

    supabase
      .from("stock_batches")
      .select("product_id, quantity_received, received_date, notes")
      .gte("received_date", firstSaleDate),

    supabase
      .from("stock_adjustments")
      .select("product_id, quantity_change, created_at, reason")
      .gte("created_at", firstSaleDate + "T00:00:00"),

    supabase
      .from("sales")
      .select("total_amount, created_at")
      .eq("status", "completed")
      .gte("created_at", firstSaleDate + "T00:00:00"),
  ]);

  const products = (productsRes.data ?? []) as { id: string; selling_price: number; stock_quantity: number }[];

  const priceMap = new Map<string, number>();
  for (const p of products) priceMap.set(p.id, Number(p.selling_price ?? 0));

  let closingValue = 0;
  for (const p of products) closingValue += Number(p.stock_quantity ?? 0) * Number(p.selling_price ?? 0);

  type AdjRow = { product_id: string; quantity_change: number; created_at: string; reason?: string };
  type BatchRow = { product_id: string; quantity_received: number; received_date: string; notes: string | null };

  // Build a set of (product_id::date) for stock_adjustments with reason='found'.
  // Matching stock_batches entries (no notes) represent the same stock and must be
  // skipped from "received" to prevent double-counting.
  const foundKeys = new Set<string>();
  for (const a of (adjustedRes.data ?? []) as AdjRow[]) {
    if (a.reason === "found") {
      foundKeys.add(`${a.product_id}::${a.created_at.slice(0, 10)}`);
    }
  }

  type Bucket = { date: string; received: number; sales: number; adjusted: number };
  const daysMap = new Map<string, Bucket>();
  function ensureDay(day: string): Bucket {
    const existing = daysMap.get(day);
    if (existing) return existing;
    const created: Bucket = { date: day, received: 0, sales: 0, adjusted: 0 };
    daysMap.set(day, created);
    return created;
  }

  let receivedValue = 0;
  let adjustedValue = 0;
  let salesValue = 0;

  for (const r of (receivedRes.data ?? []) as BatchRow[]) {
    const notes = (r.notes ?? "").toLowerCase();
    const price = priceMap.get(r.product_id) ?? 0;
    const v = Number(r.quantity_received) * price;
    const date = r.received_date;

    if (notes.includes("refund") || notes.includes("returned") || notes.includes("quick adjustment")) {
      // Refund returns and quick inventory adjustments are not real purchases —
      // put them in adjusted so they don't inflate the received line.
      adjustedValue += v;
      ensureDay(date).adjusted += v;
    } else if (foundKeys.has(`${r.product_id}::${date}`)) {
      // This batch entry duplicates a stock_adjustments row with reason='found' — skip it.
    } else {
      receivedValue += v;
      ensureDay(date).received += v;
    }
  }

  for (const a of (adjustedRes.data ?? []) as AdjRow[]) {
    const v = Number(a.quantity_change) * (priceMap.get(a.product_id) ?? 0);
    adjustedValue += v;
    ensureDay(a.created_at.slice(0, 10)).adjusted += v;
  }

  for (const s of (salesRes.data ?? []) as { total_amount: number; created_at: string }[]) {
    const v = Number(s.total_amount ?? 0);
    salesValue += v;
    ensureDay(s.created_at.slice(0, 10)).sales += v;
  }

  ensureDay(todayStr);

  // Work backwards from the current actual stock value to derive the opening of the
  // first tracked day: closing = opening + received - sales + adjusted
  // → opening = closing - received + sales - adjusted
  const openingValue = closingValue - receivedValue + salesValue - adjustedValue;

  const daysAsc = Array.from(daysMap.values()).sort((a, b) => a.date.localeCompare(b.date));
  let running = openingValue;
  const dailyAsc: DailyRow[] = daysAsc.map((d) => {
    const opening = running;
    const closing = opening + d.received - d.sales + d.adjusted;
    running = closing;
    return { ...d, opening, closing };
  });
  const dailyRows = [...dailyAsc].reverse();

  return (
    <StockMovementClient
      closingValue={closingValue}
      dailyRows={dailyRows}
      todayStr={todayStr}
    />
  );
}
