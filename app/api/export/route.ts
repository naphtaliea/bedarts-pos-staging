import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth-guards";
import { createAdminClient } from "@/lib/supabase/admin";

// Full data dump for admin backup. Returns a single JSON file containing every
// business-critical table. Admin only.

const TABLES = [
  "profiles",
  "store_settings",
  "categories",
  "suppliers",
  "products",
  "product_packages",
  "stock_batches",
  "stock_adjustments",
  "purchases",
  "purchase_items",
  "sales",
  "sale_items",
  "payments",
  "cashier_reconciliations",
  "expense_categories",
  "expenses",
  "expense_audit_log",
  "price_history",
  "integrity_check_results",
] as const;

export async function GET() {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  }

  const admin = createAdminClient();
  const dump: Record<string, unknown> = {
    exportedAt: new Date().toISOString(),
    schema: "bedarts-full-dump-v1",
  };

  for (const table of TABLES) {
    const { data, error } = await admin.from(table).select("*");
    if (error) {
      dump[table] = [];
      dump[`${table}__error`] = error.message;
    } else {
      dump[table] = data ?? [];
    }
  }

  const filename = `bedarts-export-${new Date().toISOString().slice(0, 10)}.json`;
  return new NextResponse(JSON.stringify(dump, null, 2), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
