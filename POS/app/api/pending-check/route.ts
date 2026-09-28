import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

// Given an email, returns whether the associated profile is_active.
// Used by the /pending page to poll for admin approval and auto-redirect.
// This does leak "email exists on this system" — acceptable for an internal
// POS app where the /signup page already implicitly leaks the same info.

export async function GET(req: NextRequest) {
  const email = req.nextUrl.searchParams.get("email")?.trim().toLowerCase();
  if (!email) return NextResponse.json({ approved: false }, { status: 400 });

  const admin = createAdminClient();

  // Look up the auth user by email (paginated listUsers is expensive for
  // large installs; fine for this scale).
  const { data: userList } = await admin.auth.admin.listUsers({ perPage: 1000 });
  const user = userList?.users?.find((u) => u.email?.toLowerCase() === email);
  if (!user) return NextResponse.json({ approved: false });

  const { data: profile } = await admin
    .from("profiles")
    .select("is_active")
    .eq("id", user.id)
    .single();

  return NextResponse.json({ approved: !!profile?.is_active });
}
