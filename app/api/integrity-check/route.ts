import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

// POST /api/integrity-check
// Requires header: x-cron-secret: <CRON_SECRET env var>
// Intended for external cron services (e.g. cron-job.org, Cloudflare Cron).
// To schedule: set CRON_SECRET in Cloudflare Worker secrets, configure your
// cron to POST to https://pos.bedarts.workers.dev/api/integrity-check with
// the header x-cron-secret: <value>.
export async function POST(req: NextRequest) {
  const secret = req.headers.get("x-cron-secret");
  const expected = process.env.CRON_SECRET;

  if (!expected || secret !== expected) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createAdminClient();
  const { data, error } = await supabase.rpc("run_integrity_checks");

  if (error) {
    console.error("[integrity-check] RPC error:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, summary: data });
}
