import { chromium } from "@playwright/test";
import * as fs from "fs";
import * as path from "path";
import { createHmac } from "crypto";
// @ts-ignore
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://upckmqaxdgixuovrmutm.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVwY2ttcWF4ZGdpeHVvdnJtdXRtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg1OTgxNDgsImV4cCI6MjEwNDE3NDE0OH0.GpPliBE3tiMj4t-_N2kUzKEaTL3FKysOJIA6YQXG_8A";
const AUTH_COOKIE = "sb-upckmqaxdgixuovrmutm-auth-token";
const APP_DOMAIN = "pos.bedarts.workers.dev";

// The UUID of "Test Cashier (Playwright)" in the DB
const TEST_CASHIER_ID = "f1a35b4c-9940-4f88-a068-18bb0aa714d9";

/** Authenticate directly via Supabase REST API (bypasses Cloudflare Worker) */
async function supabaseLogin(email: string, password: string) {
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error || !data.session) throw new Error(`Supabase auth failed for ${email}: ${error?.message}`);
  return data.session;
}

/** Cookie attributes that match what @supabase/ssr uses in production */
function authCookie(session: object) {
  return {
    name: AUTH_COOKIE,
    value: JSON.stringify(session),
    domain: APP_DOMAIN,
    path: "/",
    httpOnly: true,
    secure: true,
    sameSite: "Lax" as const,
    // 1-year max age — the session has its own expiry in the JWT
    expires: Math.floor(Date.now() / 1000) + 365 * 24 * 3600,
  };
}

/** Signs the cashier ID identically to lib/cashier-session.ts using Node.js HMAC-SHA256 */
function signCashierSession(cashierId: string): string {
  const secret = "9TdP5H0fboCQZg-yutJq_PKkbbsLFJCVwllkQfOkz00";
  const sig = createHmac("sha256", secret).update(cashierId).digest();
  const base64url = sig.toString("base64url");
  return `${cashierId}.${base64url}`;
}

/** Cashier session cookie — mirrors what verifyCashierPin sets (expires next 6 AM) */
function cashierSessionCookie() {
  const now = new Date();
  const next6am = new Date(now);
  next6am.setHours(6, 0, 0, 0);
  if (next6am.getTime() <= now.getTime()) next6am.setDate(next6am.getDate() + 1);
  const maxAge = Math.floor((next6am.getTime() - now.getTime()) / 1000);
  return {
    name: "cashier_session",
    value: signCashierSession(TEST_CASHIER_ID),
    domain: APP_DOMAIN,
    path: "/",
    httpOnly: true,
    secure: true,
    sameSite: "Lax" as const,
    expires: Math.floor(Date.now() / 1000) + maxAge,
  };
}

export default async function globalSetup() {
  const authDir = path.join(__dirname, "auth");
  if (!fs.existsSync(authDir)) fs.mkdirSync(authDir, { recursive: true });

  const browser = await chromium.launch({ executablePath: "/usr/bin/chromium-browser" });

  // ── Terminal sessions — build entirely from Supabase API, zero Worker requests
  const terminalSession = await supabaseLogin("sales@bedarts.com", "BedartsPOS#2026!");

  // terminal.json: auth + cashier_session — lands directly on /cashier POS
  {
    const ctx = await browser.newContext();
    await ctx.addCookies([authCookie(terminalSession), cashierSessionCookie()]);
    await ctx.storageState({ path: path.join(authDir, "terminal.json") });
    await ctx.close();
    console.log("[global-setup] terminal.json written");
  }

  // terminal-pin.json: auth only, no cashier_session — lands on /cashier/pin
  {
    const ctx = await browser.newContext();
    await ctx.addCookies([authCookie(terminalSession)]);
    await ctx.storageState({ path: path.join(authDir, "terminal-pin.json") });
    await ctx.close();
    console.log("[global-setup] terminal-pin.json written");
  }

  // ── Admin session ─────────────────────────────────────────────────────────
  {
    const session = await supabaseLogin(
      "kwame.agyemang@bedarts.internal",
      "PlaywrightTest#2026"
    );
    const ctx = await browser.newContext();
    await ctx.addCookies([authCookie(session)]);
    await ctx.storageState({ path: path.join(authDir, "admin.json") });
    await ctx.close();
    console.log("[global-setup] admin.json written");
  }

  await browser.close();
}
