import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (!["admin", "manager", "accountant"].includes(profile?.role ?? "")) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const ref = (req.nextUrl.searchParams.get("ref") ?? "").trim().toLowerCase();
  if (ref.length < 6) return NextResponse.json({ error: "invalid ref" }, { status: 400 });

  // Sale IDs are UUIDs; receipt refs are the first 8 chars of the id.
  // Delegated to a SQL function that does a text-cast prefix match.
  const { data: matches } = await supabase.rpc("find_sale_by_short_ref", { p_ref: ref });

  const ids = (matches ?? []) as string[];
  if (ids.length === 0) return NextResponse.json({ error: "not found" }, { status: 404 });
  if (ids.length > 1) return NextResponse.json({ error: "ambiguous" }, { status: 409 });

  return NextResponse.json({ saleId: ids[0] });
}
