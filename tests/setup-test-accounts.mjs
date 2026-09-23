#!/usr/bin/env node
// Idempotent test account seeding for Playwright.
// Creates: sales@bedarts.com (terminal), kwame.agyemang@bedarts.internal (admin),
// test.cashier@bedarts.internal (cashier with PIN 1234).
// Also writes the actual cashier UUID back to global-setup.ts.

import { createClient } from "@supabase/supabase-js";
import fs from "fs";
import path from "path";
import { config } from "dotenv";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

config({ path: path.join(__dirname, "..", ".env.local") });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SUPABASE_URL || !SERVICE_ROLE) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local");
  process.exit(1);
}

const admin = createClient(SUPABASE_URL, SERVICE_ROLE, { auth: { autoRefreshToken: false, persistSession: false } });

const ACCOUNTS = [
  { email: "sales@bedarts.com",                     password: "BedartsPOS#2026!",     full_name: "Terminal (Sales)",            role: "terminal" },
  { email: "kwame.agyemang@bedarts.internal",       password: "PlaywrightTest#2026",  full_name: "Kwame Agyemang",              role: "admin" },
  { email: "test.cashier@bedarts.internal",         password: "PlaywrightTest#2026",  full_name: "Test Cashier (Playwright)",   role: "cashier", pin: "5678" },
];

async function findOrCreateUser({ email, password, full_name, role }) {
  const { data: existing } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
  const existingUser = existing.users.find((u) => u.email === email);
  if (existingUser) {
    // Ensure password is what we expect (in case a prior run set a different one)
    await admin.auth.admin.updateUserById(existingUser.id, { password, email_confirm: true });
    return existingUser.id;
  }
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name, role },
  });
  if (error) throw new Error(`createUser(${email}): ${error.message}`);
  return data.user.id;
}

async function upsertProfile(id, { full_name, role }) {
  const { error } = await admin.from("profiles").upsert(
    { id, full_name, role, is_active: true },
    { onConflict: "id" }
  );
  if (error) throw new Error(`upsert profile(${id}): ${error.message}`);
}

async function setPin(cashierId, pin) {
  const { error } = await admin.rpc("set_cashier_pin", { p_user_id: cashierId, p_pin: pin });
  if (error) throw new Error(`set_cashier_pin(${cashierId}): ${error.message}`);
}

async function updateGlobalSetup(cashierId) {
  const p = path.join(__dirname, "playwright", "global-setup.ts");
  let s = fs.readFileSync(p, "utf8");
  const before = s;
  s = s.replace(
    /const TEST_CASHIER_ID = ".*";/,
    `const TEST_CASHIER_ID = "${cashierId}";`
  );
  if (s !== before) {
    fs.writeFileSync(p, s);
    console.log(`  ↳ updated global-setup.ts TEST_CASHIER_ID = ${cashierId}`);
  }
}

const results = {};
for (const a of ACCOUNTS) {
  console.log(`▶ ${a.email} (${a.role})`);
  const id = await findOrCreateUser(a);
  await upsertProfile(id, a);
  if (a.pin) await setPin(id, a.pin);
  results[a.role] = { id, email: a.email };
  console.log(`  ✓ ${id}`);
}

if (results.cashier) {
  await updateGlobalSetup(results.cashier.id);
}

console.log("\nDone. Accounts ready:");
for (const [role, r] of Object.entries(results)) {
  console.log(`  ${role.padEnd(10)} ${r.email}  →  ${r.id}`);
}
