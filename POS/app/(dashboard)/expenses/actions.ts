"use server";

import { revalidatePath } from "next/cache";
import { requireFinancialRole, requireExpenseEditor } from "@/lib/auth-guards";
import type { ExpensePaymentMethod } from "@/lib/types";

// ── Validation ───────────────────────────────────────────────────────────────

const PAYMENT_METHODS: ExpensePaymentMethod[] = ["cash", "momo", "bank_transfer", "other"];

interface ExpenseInput {
  amount: number;
  category_id: string;
  description: string;
  expense_date: string;   // ISO date "YYYY-MM-DD"
  paid_via: ExpensePaymentMethod;
  reference: string | null;
}

function validateInput(data: ExpenseInput): string | null {
  if (!Number.isFinite(data.amount) || data.amount <= 0) {
    return "Amount must be greater than zero.";
  }
  // Guard against floating-point inputs with more than 2 decimals
  const rounded = Math.round(data.amount * 100) / 100;
  if (Math.abs(rounded - data.amount) > 0.001) {
    return "Amount cannot have more than 2 decimal places.";
  }
  if (!data.category_id || data.category_id.length < 10) {
    return "Category is required.";
  }
  if (!data.description || data.description.trim().length === 0) {
    return "Description is required.";
  }
  if (data.description.length > 500) {
    return "Description must be under 500 characters.";
  }
  if (!data.expense_date || !/^\d{4}-\d{2}-\d{2}$/.test(data.expense_date)) {
    return "Expense date must be in YYYY-MM-DD format.";
  }
  const d = new Date(data.expense_date);
  if (Number.isNaN(d.getTime())) return "Invalid expense date.";
  // No future-dated expenses beyond today (allow today itself)
  const today = new Date();
  today.setHours(23, 59, 59, 999);
  if (d.getTime() > today.getTime()) return "Expense date cannot be in the future.";
  if (!PAYMENT_METHODS.includes(data.paid_via)) return "Invalid payment method.";
  if (data.reference && data.reference.length > 200) return "Reference must be under 200 characters.";
  return null;
}

function normalize(data: ExpenseInput): ExpenseInput {
  return {
    amount: Math.round(data.amount * 100) / 100,
    category_id: data.category_id,
    description: data.description.trim(),
    expense_date: data.expense_date,
    paid_via: data.paid_via,
    reference: data.reference?.trim() || null,
  };
}

// ── Actions ──────────────────────────────────────────────────────────────────

export async function createExpense(input: ExpenseInput): Promise<{ error?: string; id?: string }> {
  const { supabase, userId } = await requireFinancialRole();

  const err = validateInput(input);
  if (err) return { error: err };
  const data = normalize(input);

  const { data: row, error } = await supabase
    .from("expenses")
    .insert({ ...data, created_by: userId })
    .select("id")
    .single();

  if (error) return { error: error.message };

  revalidatePath("/expenses");
  revalidatePath("/expenses/activity");
  revalidatePath("/reports");
  return { id: row!.id };
}

export async function updateExpense(id: string, input: ExpenseInput): Promise<{ error?: string }> {
  const { supabase } = await requireExpenseEditor();

  const err = validateInput(input);
  if (err) return { error: err };
  const data = normalize(input);

  // Verify it's not deleted before allowing edit
  const { data: existing } = await supabase
    .from("expenses")
    .select("id, is_deleted")
    .eq("id", id)
    .single();

  if (!existing) return { error: "Expense not found." };
  if (existing.is_deleted) return { error: "Cannot edit a deleted expense. Restore it first." };

  const { error } = await supabase
    .from("expenses")
    .update(data)
    .eq("id", id);

  if (error) return { error: error.message };

  revalidatePath("/expenses");
  revalidatePath("/expenses/activity");
  revalidatePath("/reports");
  return {};
}

export async function deleteExpense(id: string): Promise<{ error?: string }> {
  const { supabase } = await requireExpenseEditor();

  const { data: existing } = await supabase
    .from("expenses")
    .select("id, is_deleted")
    .eq("id", id)
    .single();

  if (!existing) return { error: "Expense not found." };
  if (existing.is_deleted) return { error: "Expense is already deleted." };

  const { error } = await supabase
    .from("expenses")
    .update({ is_deleted: true })
    .eq("id", id);

  if (error) return { error: error.message };

  revalidatePath("/expenses");
  revalidatePath("/expenses/activity");
  revalidatePath("/reports");
  return {};
}

export async function restoreExpense(id: string): Promise<{ error?: string }> {
  const { supabase } = await requireExpenseEditor();

  const { data: existing } = await supabase
    .from("expenses")
    .select("id, is_deleted")
    .eq("id", id)
    .single();

  if (!existing) return { error: "Expense not found." };
  if (!existing.is_deleted) return { error: "Expense is not deleted." };

  const { error } = await supabase
    .from("expenses")
    .update({ is_deleted: false })
    .eq("id", id);

  if (error) return { error: error.message };

  revalidatePath("/expenses");
  revalidatePath("/expenses/activity");
  revalidatePath("/reports");
  return {};
}
