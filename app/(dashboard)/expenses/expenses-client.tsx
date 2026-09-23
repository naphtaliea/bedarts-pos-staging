"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Plus, Pencil, Trash2, RotateCcw, X, AlertCircle, History, SlidersHorizontal, Download, ChevronDown } from "lucide-react";
import { SnowflakePattern } from "@/components/snowflake-pattern";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatCurrency, cn } from "@/lib/utils";
import type { Expense, ExpenseCategory, ExpensePaymentMethod } from "@/lib/types";
import { createExpense, updateExpense, deleteExpense, restoreExpense } from "./actions";

const PAYMENT_METHOD_LABELS: Record<ExpensePaymentMethod, string> = {
  cash: "Cash",
  momo: "MoMo",
  bank_transfer: "Bank Transfer",
  other: "Other",
};

const PAYMENT_METHODS: ExpensePaymentMethod[] = ["cash", "momo", "bank_transfer", "other"];

interface Props {
  expenses: Expense[];
  categories: ExpenseCategory[];
  fromDate: string;
  toDate: string;
  showDeleted: boolean;
  canEdit: boolean;
}

interface FormState {
  amount: string;
  category_id: string;
  description: string;
  expense_date: string;
  paid_via: ExpensePaymentMethod;
  reference: string;
}

function emptyForm(): FormState {
  return {
    amount: "",
    category_id: "",
    description: "",
    expense_date: new Date().toISOString().split("T")[0],
    paid_via: "cash",
    reference: "",
  };
}

function formToInput(form: FormState) {
  return {
    amount: parseFloat(form.amount),
    category_id: form.category_id,
    description: form.description,
    expense_date: form.expense_date,
    paid_via: form.paid_via,
    reference: form.reference.trim() || null,
  };
}

function expenseToForm(e: Expense): FormState {
  return {
    amount: e.amount.toFixed(2),
    category_id: e.category_id,
    description: e.description,
    expense_date: e.expense_date,
    paid_via: e.paid_via,
    reference: e.reference ?? "",
  };
}

function useToast() {
  const [toast, setToast] = useState<{ type: "success" | "error"; msg: string } | null>(null);
  const show = (type: "success" | "error", msg: string) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 3500);
  };
  return { toast, show };
}

// ── Main ─────────────────────────────────────────────────────────────────────

export function ExpensesClient({ expenses, categories, fromDate, toDate, showDeleted, canEdit }: Props) {
  const router = useRouter();
  const { toast, show } = useToast();

  const [dialogState, setDialogState] = useState<
    | { mode: "closed" }
    | { mode: "create" }
    | { mode: "edit"; expense: Expense }
    | { mode: "delete"; expense: Expense }
    | { mode: "restore"; expense: Expense }
  >({ mode: "closed" });

  const [filtersOpen, setFiltersOpen] = useState(false);
  const [localFrom, setLocalFrom] = useState(fromDate);
  const [localTo, setLocalTo] = useState(toDate);
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Category ids that currently exist. Expenses linked to a category that was
  // deleted/deactivated show up as "Uncategorised" so they can still be filtered.
  const activeCategoryIds = useMemo(
    () => new Set(categories.map((c) => c.id)),
    [categories]
  );

  const filtered = useMemo(() => {
    if (categoryFilter === "all") return expenses;
    if (categoryFilter === "__uncategorised") {
      return expenses.filter((e) => !e.category_id || !activeCategoryIds.has(e.category_id));
    }
    return expenses.filter((e) => e.category_id === categoryFilter);
  }, [expenses, categoryFilter, activeCategoryIds]);

  const total = useMemo(() =>
    filtered.reduce((sum, e) => sum + Number(e.amount), 0),
  [filtered]);

  const byCategory = useMemo(() => {
    const map = new Map<string, { name: string; total: number; count: number }>();
    for (const e of filtered) {
      const key = e.category_id;
      const name = e.category?.name ?? "Unknown";
      const existing = map.get(key) ?? { name, total: 0, count: 0 };
      existing.total += Number(e.amount);
      existing.count += 1;
      map.set(key, existing);
    }
    return Array.from(map.values()).sort((a, b) => b.total - a.total);
  }, [filtered]);

  function applyDateFilter() {
    const url = new URL(window.location.href);
    url.searchParams.set("from", localFrom);
    url.searchParams.set("to", localTo);
    router.push(url.pathname + url.search);
    setFiltersOpen(false);
  }

  function toggleDeletedView() {
    const url = new URL(window.location.href);
    if (showDeleted) url.searchParams.delete("show");
    else url.searchParams.set("show", "deleted");
    router.push(url.pathname + url.search);
  }

  function exportCSV() {
    const rows = filtered.map((e) => ({
      date: e.expense_date,
      category: e.category?.name ?? "",
      description: e.description,
      amount: e.amount.toFixed(2),
      paid_via: PAYMENT_METHOD_LABELS[e.paid_via],
      reference: e.reference ?? "",
      logged_by: e.created_by_profile?.full_name ?? "",
    }));
    if (rows.length === 0) return;
    const headers = Object.keys(rows[0]);
    const csv = [
      headers.join(","),
      ...rows.map((r) => headers.map((h) => JSON.stringify((r as any)[h] ?? "")).join(",")),
    ].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `expenses-${fromDate}-to-${toDate}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const monthLabel = new Date(fromDate).toLocaleDateString("en-GH", { month: "short", day: "numeric" })
    + " – " +
    new Date(toDate).toLocaleDateString("en-GH", { month: "short", day: "numeric" });

  return (
    <div className="flex flex-col h-full pb-24 sm:pb-0">
      {/* ── Header ─ mobile-first, compact ─────────────────────────────────── */}
      <div className="relative bg-white overflow-hidden shrink-0">
        <div className="absolute inset-0 pointer-events-none">
          <SnowflakePattern opacity={0.06} rows={2} tileSize={52} onLight />
        </div>
        <div className="relative z-10 border-b border-border px-4 lg:px-6 py-3 lg:py-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-1 self-stretch rounded-full bg-primary shrink-0" />
              <div className="min-w-0">
                <p className="text-muted-foreground text-[10px] font-bold uppercase tracking-widest mb-0.5">Operating Costs</p>
                <h1 className="text-foreground text-lg lg:text-xl font-bold leading-none truncate">Expenses</h1>
              </div>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                onClick={() => setFiltersOpen((v) => !v)}
                aria-label="Toggle filters"
                className={cn(
                  "h-9 w-9 sm:w-auto sm:px-3 rounded-lg border text-foreground text-sm font-medium transition-colors flex items-center justify-center gap-1.5",
                  filtersOpen ? "bg-secondary border-border" : "border-border bg-white hover:bg-secondary"
                )}
              >
                <SlidersHorizontal className="w-4 h-4" />
                <span className="hidden sm:inline">Filters</span>
              </button>
              <Link
                href="/expenses/activity"
                aria-label="Activity log"
                className="h-9 w-9 sm:w-auto sm:px-3 rounded-lg border border-border bg-white text-foreground text-sm font-medium hover:bg-secondary transition-colors flex items-center justify-center gap-1.5"
              >
                <History className="w-4 h-4" />
                <span className="hidden sm:inline">Activity</span>
              </Link>
            </div>
          </div>

          {/* Sub-line: period + count (always visible) */}
          <p className="text-xs text-muted-foreground mt-1.5 truncate">
            {monthLabel} · {filtered.length} {filtered.length === 1 ? "entry" : "entries"}
            {showDeleted && (
              <span className="ml-2 inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-destructive/10 text-destructive">
                Deleted
              </span>
            )}
          </p>

          {/* Collapsible filter row */}
          {filtersOpen && (
            <div className="mt-3 pt-3 border-t border-border space-y-2">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1">From</label>
                  <input
                    type="date"
                    value={localFrom}
                    onChange={(e) => setLocalFrom(e.target.value)}
                    className="h-10 w-full rounded-lg border border-border bg-white px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-accent/30"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1">To</label>
                  <input
                    type="date"
                    value={localTo}
                    onChange={(e) => setLocalTo(e.target.value)}
                    className="h-10 w-full rounded-lg border border-border bg-white px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-accent/30"
                  />
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1">Category</label>
                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="h-10 w-full rounded-lg border border-border bg-white px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-accent/30"
                >
                  <option value="all">All categories</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                  <option value="__uncategorised">Uncategorised / deleted category</option>
                </select>
              </div>
              <div className="flex gap-2 pt-1">
                <button
                  onClick={applyDateFilter}
                  className="h-10 flex-1 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors"
                >
                  Apply dates
                </button>
                <button
                  onClick={toggleDeletedView}
                  className="h-10 px-3 rounded-lg border border-border bg-white text-foreground text-sm font-medium hover:bg-secondary transition-colors whitespace-nowrap"
                >
                  {showDeleted ? "Show active" : "Show deleted"}
                </button>
                {filtered.length > 0 && (
                  <button
                    onClick={exportCSV}
                    aria-label="Export CSV"
                    className="h-10 w-10 rounded-lg border border-border bg-white text-foreground hover:bg-secondary transition-colors flex items-center justify-center"
                  >
                    <Download className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Sticky total bar (mobile only) ────────────────────────────────── */}
      <div className="sm:hidden sticky top-0 z-20 bg-card border-b border-border px-4 py-3 flex items-baseline justify-between shadow-sm">
        <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Total</span>
        <span
          className="text-2xl text-primary tabular-nums leading-none"
          style={{ fontFamily: "var(--font-display)", fontWeight: 900 }}
        >
          {formatCurrency(total)}
        </span>
      </div>

      {/* ── Body ───────────────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto p-4 lg:p-6 space-y-4 max-w-6xl w-full mx-auto">

        {/* Hero total (desktop only) */}
        <div className="hidden sm:block rounded-2xl border border-border bg-card p-5">
          <div className="flex items-end justify-between gap-4 flex-wrap">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2">
                Total expenses in period
              </p>
              <p
                className="text-4xl text-foreground tabular-nums leading-none"
                style={{ fontFamily: "var(--font-display)", fontWeight: 900 }}
              >
                {formatCurrency(total)}
              </p>
            </div>
            {canEdit && (
              <Button onClick={() => setDialogState({ mode: "create" })} size="lg">
                <Plus className="w-4 h-4 mr-1.5" />
                Add expense
              </Button>
            )}
          </div>
        </div>

        {/* Category breakdown */}
        {byCategory.length > 0 && (
          <div className="rounded-2xl border border-border bg-card p-4 sm:p-5">
            <p className="text-sm font-semibold text-foreground mb-3">By category</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2">
              {byCategory.map((c) => {
                const pct = total > 0 ? (c.total / total) * 100 : 0;
                return (
                  <div key={c.name} className="space-y-1">
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="text-sm text-foreground truncate">
                        {c.name}
                        <span className="text-xs text-muted-foreground ml-1.5">({c.count})</span>
                      </span>
                      <span className="text-sm font-semibold text-foreground tabular-nums shrink-0">{formatCurrency(c.total)}</span>
                    </div>
                    <div className="h-1 rounded-full bg-secondary overflow-hidden">
                      <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Expenses list */}
        {filtered.length === 0 ? (
          <div className="rounded-2xl border border-border bg-card p-10 text-center text-sm text-muted-foreground">
            No {showDeleted ? "deleted " : ""}expenses in this period.
            {!showDeleted && canEdit && (
              <p className="mt-2 text-xs">Tap the <strong>+</strong> button to record one.</p>
            )}
          </div>
        ) : (
          <>
            {/* ── Mobile: card list ─────────────────────────────────────── */}
            <div className="sm:hidden space-y-2">
              {filtered.map((e) => {
                const expanded = expandedId === e.id;
                return (
                  <div
                    key={e.id}
                    className={cn(
                      "rounded-xl border bg-card overflow-hidden transition-all",
                      e.is_deleted ? "border-destructive/20 opacity-70" : "border-border"
                    )}
                  >
                    <button
                      onClick={() => setExpandedId(expanded ? null : e.id)}
                      className="w-full flex items-start justify-between gap-3 px-4 py-3 text-left"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-foreground truncate">{e.description}</p>
                        <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1.5 flex-wrap">
                          <span>{e.category?.name ?? "—"}</span>
                          <span aria-hidden="true">·</span>
                          <span>{new Date(e.expense_date).toLocaleDateString("en-GH", { day: "2-digit", month: "short" })}</span>
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-base font-bold text-foreground tabular-nums leading-none">{formatCurrency(Number(e.amount))}</p>
                        <p className="text-[10px] text-muted-foreground mt-1">{PAYMENT_METHOD_LABELS[e.paid_via]}</p>
                      </div>
                      <ChevronDown className={cn("w-4 h-4 text-muted-foreground mt-1 transition-transform shrink-0", expanded && "rotate-180")} />
                    </button>

                    {expanded && (
                      <div className="px-4 pb-3 pt-1 border-t border-border/50 space-y-2">
                        <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-xs">
                          <div>
                            <span className="text-muted-foreground">Logged by</span>
                            <p className="text-foreground font-medium">{e.created_by_profile?.full_name ?? "—"}</p>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Recorded</span>
                            <p className="text-foreground font-medium">
                              {new Date(e.created_at).toLocaleDateString("en-GH", { day: "2-digit", month: "short", year: "numeric" })}
                            </p>
                          </div>
                          {e.reference && (
                            <div className="col-span-2">
                              <span className="text-muted-foreground">Reference</span>
                              <p className="text-foreground font-medium break-all">{e.reference}</p>
                            </div>
                          )}
                        </div>

                        {canEdit && (
                          <div className="flex gap-2 pt-2 border-t border-border/50">
                            {e.is_deleted ? (
                              <button
                                onClick={() => setDialogState({ mode: "restore", expense: e })}
                                className="flex-1 h-10 rounded-lg border border-border bg-secondary/50 text-sm font-medium text-foreground hover:bg-secondary flex items-center justify-center gap-1.5"
                              >
                                <RotateCcw className="w-4 h-4" /> Restore
                              </button>
                            ) : (
                              <>
                                <button
                                  onClick={() => setDialogState({ mode: "edit", expense: e })}
                                  className="flex-1 h-10 rounded-lg border border-border bg-secondary/50 text-sm font-medium text-foreground hover:bg-secondary flex items-center justify-center gap-1.5"
                                >
                                  <Pencil className="w-4 h-4" /> Edit
                                </button>
                                <button
                                  onClick={() => setDialogState({ mode: "delete", expense: e })}
                                  className="flex-1 h-10 rounded-lg border border-destructive/30 bg-destructive/5 text-sm font-medium text-destructive hover:bg-destructive/10 flex items-center justify-center gap-1.5"
                                >
                                  <Trash2 className="w-4 h-4" /> Delete
                                </button>
                              </>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* ── Desktop: table ──────────────────────────────────────── */}
            <div className="hidden sm:block rounded-2xl border border-border bg-card overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-secondary/50">
                      <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Date</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Category</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Description</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Paid via</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Logged by</th>
                      <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Amount</th>
                      {canEdit && <th className="w-24" />}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {filtered.map((e) => (
                      <tr key={e.id} className={cn("hover:bg-secondary/30 transition-colors", e.is_deleted && "opacity-60")}>
                        <td className="px-4 py-3 text-foreground whitespace-nowrap">
                          {new Date(e.expense_date).toLocaleDateString("en-GH", { day: "2-digit", month: "short", year: "numeric" })}
                        </td>
                        <td className="px-4 py-3 text-foreground">{e.category?.name ?? "—"}</td>
                        <td className="px-4 py-3 text-foreground">
                          {e.description}
                          {e.reference && <span className="ml-2 text-xs text-muted-foreground">Ref: {e.reference}</span>}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">{PAYMENT_METHOD_LABELS[e.paid_via]}</td>
                        <td className="px-4 py-3 text-muted-foreground">{e.created_by_profile?.full_name ?? "—"}</td>
                        <td className="px-4 py-3 text-right font-semibold text-foreground tabular-nums whitespace-nowrap">
                          {formatCurrency(Number(e.amount))}
                        </td>
                        {canEdit && (
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-1 justify-end">
                              {e.is_deleted ? (
                                <button
                                  onClick={() => setDialogState({ mode: "restore", expense: e })}
                                  aria-label="Restore"
                                  className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
                                >
                                  <RotateCcw className="w-3.5 h-3.5" />
                                </button>
                              ) : (
                                <>
                                  <button
                                    onClick={() => setDialogState({ mode: "edit", expense: e })}
                                    aria-label="Edit"
                                    className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
                                  >
                                    <Pencil className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    onClick={() => setDialogState({ mode: "delete", expense: e })}
                                    aria-label="Delete"
                                    className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </>
                              )}
                            </div>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-secondary/40 border-t-2 border-border">
                      <td colSpan={5} className="px-4 py-3 text-sm font-bold text-foreground text-right">Total</td>
                      <td className="px-4 py-3 text-right font-bold text-primary tabular-nums text-base">{formatCurrency(total)}</td>
                      {canEdit && <td />}
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          </>
        )}
      </div>

      {/* ── Floating action button (mobile only) ──────────────────────────── */}
      {canEdit && !showDeleted && (
        <button
          onClick={() => setDialogState({ mode: "create" })}
          aria-label="Add expense"
          className="sm:hidden fixed bottom-6 right-6 z-30 w-14 h-14 rounded-full bg-primary text-primary-foreground shadow-2xl flex items-center justify-center active:scale-95 transition-transform"
        >
          <Plus className="w-6 h-6" />
        </button>
      )}

      {/* ── Dialogs ────────────────────────────────────────────────────────── */}
      {dialogState.mode === "create" && (
        <ExpenseFormDialog
          title="Add expense"
          submitLabel="Save expense"
          categories={categories}
          initial={emptyForm()}
          onClose={() => setDialogState({ mode: "closed" })}
          onSubmit={async (form) => {
            const result = await createExpense(formToInput(form));
            if (result.error) { show("error", result.error); return false; }
            show("success", "Expense recorded.");
            router.refresh();
            return true;
          }}
        />
      )}
      {dialogState.mode === "edit" && (
        <ExpenseFormDialog
          title="Edit expense"
          submitLabel="Save changes"
          categories={categories}
          initial={expenseToForm(dialogState.expense)}
          originalExpense={dialogState.expense}
          onClose={() => setDialogState({ mode: "closed" })}
          onSubmit={async (form) => {
            const result = await updateExpense(dialogState.expense.id, formToInput(form));
            if (result.error) { show("error", result.error); return false; }
            show("success", "Expense updated.");
            router.refresh();
            return true;
          }}
        />
      )}
      {dialogState.mode === "delete" && (
        <ConfirmDialog
          title="Delete expense?"
          description={`This will soft-delete "${dialogState.expense.description}" (${formatCurrency(Number(dialogState.expense.amount))}). It stays in the database and can be restored from the deleted view.`}
          confirmLabel="Delete"
          destructive
          onClose={() => setDialogState({ mode: "closed" })}
          onConfirm={async () => {
            const result = await deleteExpense(dialogState.expense.id);
            if (result.error) { show("error", result.error); return false; }
            show("success", "Expense deleted.");
            router.refresh();
            return true;
          }}
        />
      )}
      {dialogState.mode === "restore" && (
        <ConfirmDialog
          title="Restore expense?"
          description={`Restore "${dialogState.expense.description}" (${formatCurrency(Number(dialogState.expense.amount))}) back to active expenses.`}
          confirmLabel="Restore"
          onClose={() => setDialogState({ mode: "closed" })}
          onConfirm={async () => {
            const result = await restoreExpense(dialogState.expense.id);
            if (result.error) { show("error", result.error); return false; }
            show("success", "Expense restored.");
            router.refresh();
            return true;
          }}
        />
      )}

      {/* Toast */}
      {toast && (
        <div
          className={cn(
            "fixed bottom-24 sm:bottom-6 right-6 z-50 flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-medium shadow-lg",
            toast.type === "success" ? "bg-success text-white" : "bg-destructive text-white"
          )}
        >
          {toast.msg}
        </div>
      )}
    </div>
  );
}

// ── Form Dialog — bottom sheet on mobile ─────────────────────────────────────

interface FormDialogProps {
  title: string;
  submitLabel: string;
  categories: ExpenseCategory[];
  initial: FormState;
  originalExpense?: Expense;
  onClose: () => void;
  onSubmit: (form: FormState) => Promise<boolean>;
}

function ExpenseFormDialog({ title, submitLabel, categories, initial, originalExpense, onClose, onSubmit }: FormDialogProps) {
  const [form, setForm] = useState<FormState>(initial);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmDiff, setConfirmDiff] = useState(false);

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
    setError(null);
    setConfirmDiff(false);
  }

  function computeDiff(): { field: string; from: string; to: string }[] {
    if (!originalExpense) return [];
    const changes: { field: string; from: string; to: string }[] = [];
    const currAmount = parseFloat(form.amount);
    if (!Number.isNaN(currAmount) && Math.abs(currAmount - Number(originalExpense.amount)) > 0.001) {
      changes.push({ field: "Amount", from: formatCurrency(Number(originalExpense.amount)), to: formatCurrency(currAmount) });
    }
    if (form.category_id !== originalExpense.category_id) {
      const oldCat = categories.find((c) => c.id === originalExpense.category_id)?.name ?? originalExpense.category?.name ?? "—";
      const newCat = categories.find((c) => c.id === form.category_id)?.name ?? "—";
      changes.push({ field: "Category", from: oldCat, to: newCat });
    }
    if (form.description !== originalExpense.description) {
      changes.push({ field: "Description", from: originalExpense.description, to: form.description });
    }
    if (form.expense_date !== originalExpense.expense_date) {
      changes.push({ field: "Date", from: originalExpense.expense_date, to: form.expense_date });
    }
    if (form.paid_via !== originalExpense.paid_via) {
      changes.push({ field: "Paid via", from: PAYMENT_METHOD_LABELS[originalExpense.paid_via], to: PAYMENT_METHOD_LABELS[form.paid_via] });
    }
    const oldRef = originalExpense.reference ?? "";
    const newRef = form.reference.trim();
    if (oldRef !== newRef) {
      changes.push({ field: "Reference", from: oldRef || "(none)", to: newRef || "(none)" });
    }
    return changes;
  }

  const diff = originalExpense ? computeDiff() : [];
  const isEdit = !!originalExpense;
  const needsDiffConfirm = isEdit && diff.length > 0 && !confirmDiff;

  async function handleSubmit(e?: React.FormEvent) {
    e?.preventDefault();
    setError(null);

    const amountNum = parseFloat(form.amount);
    if (!Number.isFinite(amountNum) || amountNum <= 0) { setError("Amount must be greater than zero."); return; }
    if (!form.category_id) { setError("Select a category."); return; }
    if (!form.description.trim()) { setError("Description is required."); return; }
    if (!form.expense_date) { setError("Date is required."); return; }

    if (isEdit && diff.length === 0) { setError("No changes to save."); return; }

    if (needsDiffConfirm) { setConfirmDiff(true); return; }

    setSubmitting(true);
    const ok = await onSubmit(form);
    setSubmitting(false);
    if (ok) onClose();
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="w-full sm:max-w-md sm:mx-4 bg-card rounded-t-3xl sm:rounded-2xl shadow-2xl flex flex-col max-h-[92vh] sm:max-h-[90vh]">
        {/* Grabber (mobile only) */}
        <div className="sm:hidden pt-2 pb-1 flex justify-center">
          <div className="w-10 h-1 bg-border rounded-full" aria-hidden="true" />
        </div>

        <div className="flex items-center justify-between px-5 sm:px-6 pt-3 sm:pt-5 pb-4 border-b border-border">
          <h2 className="text-base font-semibold text-foreground">{title}</h2>
          <button onClick={onClose} aria-label="Close" className="rounded-lg p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground">
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-5 sm:px-6 py-5 space-y-4">
          <div className="space-y-1.5">
            <label className="block text-xs font-medium text-muted-foreground">
              Amount (GH₵) <span className="text-destructive">*</span>
            </label>
            <Input
              type="number"
              inputMode="decimal"
              min="0.01"
              step="0.01"
              value={form.amount}
              onChange={(e) => set("amount", e.target.value)}
              placeholder="0.00"
              className="h-12 text-lg tabular-nums font-semibold"
              autoFocus
              required
            />
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-medium text-muted-foreground">
              Category <span className="text-destructive">*</span>
            </label>
            <select
              value={form.category_id}
              onChange={(e) => set("category_id", e.target.value)}
              required
              className="flex h-12 w-full rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="" disabled>Select category…</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-medium text-muted-foreground">
              Description <span className="text-destructive">*</span>
            </label>
            <Input
              type="text"
              value={form.description}
              onChange={(e) => set("description", e.target.value)}
              placeholder="e.g. Kwame's salary — March"
              maxLength={500}
              className="h-12"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-muted-foreground">
                Date <span className="text-destructive">*</span>
              </label>
              <Input
                type="date"
                value={form.expense_date}
                onChange={(e) => set("expense_date", e.target.value)}
                max={new Date().toISOString().split("T")[0]}
                className="h-12"
                required
              />
            </div>
            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-muted-foreground">Paid via</label>
              <select
                value={form.paid_via}
                onChange={(e) => set("paid_via", e.target.value as ExpensePaymentMethod)}
                className="flex h-12 w-full rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              >
                {PAYMENT_METHODS.map((m) => (
                  <option key={m} value={m}>{PAYMENT_METHOD_LABELS[m]}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-medium text-muted-foreground">
              Reference <span className="text-muted-foreground/60 font-normal">— optional</span>
            </label>
            <Input
              type="text"
              value={form.reference}
              onChange={(e) => set("reference", e.target.value)}
              placeholder="Receipt / invoice / txn ID"
              maxLength={200}
              className="h-12"
            />
          </div>

          {isEdit && diff.length > 0 && (
            <div className={cn("rounded-xl border p-3 space-y-2", confirmDiff ? "border-amber-400 bg-amber-50 dark:bg-amber-950/30" : "border-border bg-secondary/40")}>
              <p className="text-xs font-semibold text-foreground">
                {confirmDiff ? "Confirm these changes:" : "Changes to save:"}
              </p>
              <div className="space-y-1">
                {diff.map((d) => (
                  <div key={d.field} className="text-xs">
                    <span className="font-medium text-foreground">{d.field}:</span>{" "}
                    <span className="text-muted-foreground line-through">{d.from}</span>{" "}
                    <span className="text-muted-foreground">→</span>{" "}
                    <span className="text-foreground font-medium">{d.to}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {error && (
            <div className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs text-destructive">
              <AlertCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}
        </form>

        <div className="flex items-center justify-end gap-2 px-5 sm:px-6 py-4 border-t border-border">
          <Button type="button" variant="outline" onClick={onClose} disabled={submitting} className="h-11">Cancel</Button>
          <Button type="button" onClick={() => handleSubmit()} disabled={submitting} className="h-11 min-w-[8rem]">
            {submitting ? "Saving…" : needsDiffConfirm ? "Review changes" : submitLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ── Confirm Dialog — bottom sheet on mobile ─────────────────────────────────

interface ConfirmDialogProps {
  title: string;
  description: string;
  confirmLabel: string;
  destructive?: boolean;
  onClose: () => void;
  onConfirm: () => Promise<boolean>;
}

function ConfirmDialog({ title, description, confirmLabel, destructive, onClose, onConfirm }: ConfirmDialogProps) {
  const [busy, setBusy] = useState(false);
  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="w-full sm:max-w-sm sm:mx-4 bg-card rounded-t-3xl sm:rounded-2xl shadow-2xl">
        <div className="sm:hidden pt-2 pb-1 flex justify-center">
          <div className="w-10 h-1 bg-border rounded-full" aria-hidden="true" />
        </div>
        <div className="px-5 sm:px-6 pt-3 sm:pt-5 pb-3">
          <h2 className="text-base font-semibold text-foreground">{title}</h2>
          <p className="text-sm text-muted-foreground mt-2">{description}</p>
        </div>
        <div className="flex items-center justify-end gap-2 px-5 sm:px-6 py-4 border-t border-border">
          <Button type="button" variant="outline" onClick={onClose} disabled={busy} className="h-11">Cancel</Button>
          <Button
            type="button"
            onClick={async () => {
              setBusy(true);
              const ok = await onConfirm();
              setBusy(false);
              if (ok) onClose();
            }}
            disabled={busy}
            className={cn("h-11 min-w-[6rem]", destructive && "bg-destructive hover:bg-destructive/90")}
          >
            {busy ? "Working…" : confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
