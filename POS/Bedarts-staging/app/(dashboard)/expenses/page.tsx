import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ExpensesClient } from "./expenses-client";
import type { Expense, ExpenseCategory } from "@/lib/types";

export const revalidate = 0;

interface ExpensesPageProps {
  searchParams: Promise<{ from?: string; to?: string; show?: string }>;
}

export default async function ExpensesPage({ searchParams }: ExpensesPageProps) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, full_name")
    .eq("id", user.id)
    .single();

  const role = profile?.role ?? "";
  if (!["admin", "manager", "accountant"].includes(role)) redirect("/dashboard");

  // Default date window: current month
  const params = await searchParams;
  const today = new Date();
  const firstOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  const fromDate = params.from ?? firstOfMonth.toISOString().split("T")[0];
  const toDate   = params.to   ?? today.toISOString().split("T")[0];
  const showDeleted = params.show === "deleted";

  const [expensesRes, categoriesRes] = await Promise.all([
    supabase
      .from("expenses")
      .select(`
        id, amount, category_id, description, expense_date, paid_via, reference,
        is_deleted, created_by, created_at, updated_at,
        category:expense_categories(id, name, is_active, created_at),
        created_by_profile:profiles!expenses_created_by_fkey(id, full_name)
      `)
      .gte("expense_date", fromDate)
      .lte("expense_date", toDate)
      .eq("is_deleted", showDeleted)
      .order("expense_date", { ascending: false })
      .order("created_at", { ascending: false }),

    supabase
      .from("expense_categories")
      .select("id, name, is_active, created_at")
      .eq("is_active", true)
      .order("name"),
  ]);

  const expenses = (expensesRes.data ?? []) as unknown as Expense[];
  const categories = (categoriesRes.data ?? []) as ExpenseCategory[];

  return (
    <ExpensesClient
      expenses={expenses}
      categories={categories}
      fromDate={fromDate}
      toDate={toDate}
      showDeleted={showDeleted}
      canEdit={role === "admin" || role === "manager"}
    />
  );
}
