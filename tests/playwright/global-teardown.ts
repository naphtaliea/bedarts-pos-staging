import * as fs from "fs";
import * as path from "path";
// @ts-ignore
import { createClient } from "@supabase/supabase-js";

// UUID of "Test Cashier (Playwright)" — all test-created sales use this cashier
const TEST_CASHIER_ID = "2c185d19-7dce-4f4d-a8fd-c7d409ba6e2f";

function loadEnv(): Record<string, string> {
  const envPath = path.join(process.cwd(), ".env.local");
  if (!fs.existsSync(envPath)) return {};
  const env: Record<string, string> = {};
  for (const line of fs.readFileSync(envPath, "utf8").split("\n")) {
    const eq = line.indexOf("=");
    if (eq === -1 || line.startsWith("#")) continue;
    env[line.slice(0, eq).trim()] = line.slice(eq + 1).trim();
  }
  return env;
}

export default async function globalTeardown() {
  const env = loadEnv();
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceKey) {
    console.warn("[global-teardown] Missing Supabase credentials — skipping cleanup");
    return;
  }

  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // Delete all sales by the test cashier (cascades to sale_items + payments via DB FK)
  const { error, count } = await supabase
    .from("sales")
    .delete({ count: "exact" })
    .eq("cashier_id", TEST_CASHIER_ID);

  if (error) {
    console.error("[global-teardown] Failed to delete test sales:", error.message);
  } else {
    console.log(`[global-teardown] Cleaned up ${count ?? 0} test sale(s)`);
  }
}
