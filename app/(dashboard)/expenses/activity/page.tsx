import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { SnowflakePattern } from "@/components/snowflake-pattern";
import { formatCurrency } from "@/lib/utils";
import type { ExpenseAuditLog, ExpenseCategory } from "@/lib/types";

export const revalidate = 0;

const ACTION_LABELS: Record<string, string> = {
  created: "added",
  updated: "edited",
  deleted: "deleted",
};

const ACTION_COLORS: Record<string, string> = {
  created: "bg-success/10 text-success",
  updated: "bg-accent/10 text-accent",
  deleted: "bg-destructive/10 text-destructive",
};

function fmtDate(d: string) {
  return new Date(d).toLocaleString("en-GH", { dateStyle: "medium", timeStyle: "short" });
}

function fmtRelative(d: string): string {
  const diff = Date.now() - new Date(d).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(d).toLocaleDateString("en-GH", { month: "short", day: "numeric" });
}

interface RichLog extends ExpenseAuditLog {
  expense_id: string;
}

interface ActivityPageProps {
  searchParams: Promise<{ limit?: string }>;
}

export default async function ActivityLogPage({ searchParams }: ActivityPageProps) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  const role = profile?.role ?? "";
  if (!["admin", "manager", "accountant"].includes(role)) redirect("/dashboard");

  const params = await searchParams;
  const limit = Math.min(500, Math.max(50, parseInt(params.limit ?? "100", 10) || 100));

  const [logsRes, categoriesRes] = await Promise.all([
    supabase
      .from("expense_audit_log")
      .select(`
        id, expense_id, action, changed_by, changed_at, old_values, new_values,
        changed_by_profile:profiles!expense_audit_log_changed_by_fkey(id, full_name)
      `)
      .order("changed_at", { ascending: false })
      .limit(limit),

    supabase
      .from("expense_categories")
      .select("id, name, is_active, created_at"),
  ]);

  const logs = (logsRes.data ?? []) as unknown as RichLog[];
  const categories = (categoriesRes.data ?? []) as ExpenseCategory[];
  const catMap = new Map(categories.map((c) => [c.id, c.name]));

  function describe(log: RichLog): { headline: React.ReactNode; changes: string[] | null; amount: number | null } {
    const person = log.changed_by_profile?.full_name ?? "Someone";

    const values = log.action === "deleted" ? log.old_values : (log.new_values ?? log.old_values);
    const desc = (values?.description as string) ?? "an expense";
    const amount = (values?.amount != null) ? Number(values.amount) : null;

    if (log.action === "created" || log.action === "deleted") {
      return {
        headline: (
          <>
            <span className="font-semibold text-foreground">{person}</span>{" "}
            <span className="text-muted-foreground">{ACTION_LABELS[log.action]}</span>{" "}
            <span className="font-medium text-foreground">&quot;{desc}&quot;</span>
          </>
        ),
        changes: null,
        amount,
      };
    }

    // Updated — compact diff
    const old = log.old_values ?? {};
    const nu  = log.new_values ?? {};
    const changes: string[] = [];
    if (old.amount !== nu.amount && old.amount != null && nu.amount != null) {
      changes.push(`Amount: ${formatCurrency(Number(old.amount))} → ${formatCurrency(Number(nu.amount))}`);
    }
    if (old.description !== nu.description) {
      changes.push(`Description: "${old.description ?? ""}" → "${nu.description ?? ""}"`);
    }
    if (old.category_id !== nu.category_id) {
      const oldName = catMap.get(old.category_id as string) ?? "—";
      const newName = catMap.get(nu.category_id as string) ?? "—";
      changes.push(`Category: ${oldName} → ${newName}`);
    }
    if (old.expense_date !== nu.expense_date) {
      changes.push(`Date: ${old.expense_date} → ${nu.expense_date}`);
    }
    if (old.paid_via !== nu.paid_via) {
      changes.push(`Paid via: ${old.paid_via} → ${nu.paid_via}`);
    }
    if ((old.reference ?? "") !== (nu.reference ?? "")) {
      changes.push(`Reference: "${old.reference ?? ""}" → "${nu.reference ?? ""}"`);
    }
    if (old.is_deleted !== nu.is_deleted) {
      changes.push(nu.is_deleted ? "Marked as deleted" : "Restored from deleted");
    }

    return {
      headline: (
        <>
          <span className="font-semibold text-foreground">{person}</span>{" "}
          <span className="text-muted-foreground">edited</span>{" "}
          <span className="font-medium text-foreground">&quot;{desc}&quot;</span>
        </>
      ),
      changes: changes.length > 0 ? changes : ["No visible changes"],
      amount: null,
    };
  }

  return (
    <div className="flex flex-col h-full">
      <div className="relative bg-white overflow-hidden shrink-0">
        <div className="absolute inset-0 pointer-events-none">
          <SnowflakePattern opacity={0.06} rows={2} tileSize={52} onLight />
        </div>
        <div className="relative z-10 border-b border-border px-4 lg:px-6 py-3 lg:py-4">
          <div className="flex items-center gap-3">
            <Link
              href="/expenses"
              aria-label="Back to expenses"
              className="w-9 h-9 rounded-lg border border-border flex items-center justify-center text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors shrink-0"
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <div className="w-1 self-stretch rounded-full bg-accent shrink-0" />
            <div className="min-w-0 flex-1">
              <p className="text-muted-foreground text-[10px] font-bold uppercase tracking-widest mb-0.5">Audit</p>
              <h1 className="text-foreground text-lg lg:text-xl font-bold leading-none truncate">Activity log</h1>
            </div>
            <p className="text-[10px] sm:text-xs text-muted-foreground shrink-0 tabular-nums">
              {logs.length} {logs.length === 1 ? "event" : "events"}
            </p>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 lg:p-6 max-w-3xl w-full mx-auto">
        {logs.length === 0 ? (
          <div className="rounded-2xl border border-border bg-card p-10 text-center text-sm text-muted-foreground">
            No activity yet.
          </div>
        ) : (
          <ol className="space-y-2">
            {logs.map((log) => {
              const { headline, changes, amount } = describe(log);
              return (
                <li key={log.id} className="rounded-xl border border-border bg-card p-3 sm:p-4">
                  <div className="flex items-start gap-2.5">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide shrink-0 mt-0.5 ${ACTION_COLORS[log.action]}`}>
                      {log.action}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm leading-snug">{headline}</p>
                      {amount != null && (
                        <p className="text-sm font-semibold text-primary tabular-nums mt-1">
                          {formatCurrency(amount)}
                        </p>
                      )}
                      {changes && (
                        <ul className="mt-1.5 space-y-0.5 text-xs text-muted-foreground">
                          {changes.map((c, i) => (
                            <li key={i} className="pl-2 border-l-2 border-border">{c}</li>
                          ))}
                        </ul>
                      )}
                      <p className="text-[11px] text-muted-foreground mt-2 tabular-nums flex items-center gap-1.5">
                        <span>{fmtRelative(log.changed_at)}</span>
                        <span aria-hidden="true">·</span>
                        <span className="hidden sm:inline">{fmtDate(log.changed_at)}</span>
                        <span className="sm:hidden">{new Date(log.changed_at).toLocaleDateString("en-GH", { day: "2-digit", month: "short" })}</span>
                      </p>
                    </div>
                  </div>
                </li>
              );
            })}
          </ol>
        )}
      </div>
    </div>
  );
}
