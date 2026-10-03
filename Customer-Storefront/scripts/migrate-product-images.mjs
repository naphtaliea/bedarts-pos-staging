#!/usr/bin/env node
/**
 * One-shot migration: download every product image that lives on an external
 * host (Brave-search redirects, contentstack, etc.) and rehost it in the
 * Supabase `product-images` bucket, then update `products.image_url` to point
 * to the new public URL.
 *
 * Auth options (any one):
 *   SUPABASE_SERVICE_ROLE_KEY=...   (bypasses everything)
 *   ADMIN_EMAIL=... ADMIN_PASSWORD=...  (signs in as an admin/manager)
 *
 * Required always:
 *   NEXT_PUBLIC_SUPABASE_URL
 *   NEXT_PUBLIC_SUPABASE_ANON_KEY  (only used if signing in with email/pw)
 *
 * If /home/prohacker/Bedarts/POS/.env.local exists, its values are used as
 * defaults so you rarely need to export them by hand.
 *
 * Usage:
 *   node scripts/migrate-product-images.mjs             # runs the migration
 *   node scripts/migrate-product-images.mjs --dry-run   # lists what would change
 */

import { createClient } from "@supabase/supabase-js";
import sharp from "sharp";
import { readFileSync, existsSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));

/* ── env loading ────────────────────────────────────────────────── */

function loadDotEnvInto(path) {
  if (!existsSync(path)) return;
  const raw = readFileSync(path, "utf8");
  for (const line of raw.split("\n")) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/i);
    if (!m) continue;
    const [, key, valRaw] = m;
    if (process.env[key]) continue; // don't override real env
    const val = valRaw.replace(/^"(.*)"$/, "$1").replace(/^'(.*)'$/, "$1");
    process.env[key] = val;
  }
}

loadDotEnvInto(resolve(__dirname, "../.env.local"));
loadDotEnvInto(resolve(__dirname, "../../POS/.env.local"));

const SUPABASE_URL      = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON     = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const SERVICE_ROLE_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY;
const ADMIN_EMAIL       = process.env.ADMIN_EMAIL;
const ADMIN_PASSWORD    = process.env.ADMIN_PASSWORD;

if (!SUPABASE_URL) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL");
  process.exit(1);
}

const args = new Set(process.argv.slice(2));
const dryRun = args.has("--dry-run");

/* ── client setup ───────────────────────────────────────────────── */

let supabase;

if (SERVICE_ROLE_KEY) {
  supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  console.log("• Authenticated with service role key");
} else if (ADMIN_EMAIL && ADMIN_PASSWORD) {
  if (!SUPABASE_ANON) {
    console.error("Missing NEXT_PUBLIC_SUPABASE_ANON_KEY (needed for email sign-in)");
    process.exit(1);
  }
  supabase = createClient(SUPABASE_URL, SUPABASE_ANON, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { error } = await supabase.auth.signInWithPassword({
    email: ADMIN_EMAIL,
    password: ADMIN_PASSWORD,
  });
  if (error) {
    console.error("Sign-in failed:", error.message);
    process.exit(1);
  }
  console.log(`• Authenticated as ${ADMIN_EMAIL}`);
} else {
  console.error(
    "No auth provided. Set SUPABASE_SERVICE_ROLE_KEY, or both ADMIN_EMAIL and ADMIN_PASSWORD."
  );
  process.exit(1);
}

/* ── helpers ────────────────────────────────────────────────────── */

const supabaseHost = new URL(SUPABASE_URL).hostname;

function isSupabaseHosted(url) {
  if (!url) return false;
  try {
    return new URL(url).hostname.endsWith(supabaseHost);
  } catch {
    return false;
  }
}

async function fetchImage(url) {
  const res = await fetch(url, {
    // A UA helps some CDNs (istockphoto, gettyimages) return the image
    // instead of an HTML gate.
    headers: {
      "User-Agent":
        "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128 Safari/537.36",
      Accept: "image/*",
    },
    redirect: "follow",
  });
  if (!res.ok) throw new Error(`fetch ${res.status} ${res.statusText}`);
  const ct = res.headers.get("content-type") || "";
  // Some CDNs (Brave imgs, etc.) mislabel as application/octet-stream. sharp
  // will reject anything that isn't a real image, so we allow octet-stream
  // and rely on the decode step to enforce validity.
  const looksImagey =
    ct.startsWith("image/") ||
    ct === "application/octet-stream" ||
    ct === "binary/octet-stream" ||
    ct === "";
  if (!looksImagey) throw new Error(`non-image response (${ct})`);
  const buf = Buffer.from(await res.arrayBuffer());
  if (buf.length < 512) throw new Error(`response too small (${buf.length}B)`);
  return buf;
}

async function resizeToJpeg(buf) {
  return await sharp(buf)
    .rotate() // respect EXIF
    .resize({ width: 800, height: 800, fit: "inside", withoutEnlargement: true })
    .jpeg({ quality: 85, progressive: true })
    .toBuffer();
}

async function uploadAndGetPublicUrl(buf) {
  const path = `${randomUUID()}.jpg`;
  const { error } = await supabase.storage
    .from("product-images")
    .upload(path, buf, { upsert: false, contentType: "image/jpeg" });
  if (error) throw new Error(`upload: ${error.message}`);
  const { data } = supabase.storage.from("product-images").getPublicUrl(path);
  return data.publicUrl;
}

/* ── main ───────────────────────────────────────────────────────── */

const { data: products, error: fetchErr } = await supabase
  .from("products")
  .select("id, name, image_url")
  .eq("is_active", true);

if (fetchErr) {
  console.error("Failed to list products:", fetchErr.message);
  process.exit(1);
}

const candidates = products.filter((p) => p.image_url && !isSupabaseHosted(p.image_url));

console.log(`• ${products.length} active products`);
console.log(`• ${candidates.length} with external image URLs`);
if (candidates.length === 0) {
  console.log("Nothing to migrate. Done.");
  process.exit(0);
}

if (dryRun) {
  for (const p of candidates) console.log(` - ${p.name.padEnd(28)} ${p.image_url}`);
  console.log("\n(dry run — no changes made)");
  process.exit(0);
}

const results = { ok: 0, failed: [] };

for (const p of candidates) {
  process.stdout.write(`- ${p.name.padEnd(28)} `);
  try {
    const raw = await fetchImage(p.image_url);
    const jpeg = await resizeToJpeg(raw);
    const newUrl = await uploadAndGetPublicUrl(jpeg);
    const { error: updateErr } = await supabase
      .from("products")
      .update({ image_url: newUrl })
      .eq("id", p.id);
    if (updateErr) throw new Error(`db update: ${updateErr.message}`);
    console.log(`✓  ${(jpeg.length / 1024).toFixed(0)} KB`);
    results.ok += 1;
  } catch (err) {
    console.log(`✗  ${err.message}`);
    results.failed.push({ name: p.name, id: p.id, error: err.message });
  }
}

console.log(`\n• Migrated: ${results.ok}`);
console.log(`• Failed:   ${results.failed.length}`);
if (results.failed.length > 0) {
  console.log("\nFailed products (still pointing at the old URL):");
  for (const f of results.failed) console.log(`  - ${f.name}: ${f.error}`);
  process.exit(2);
}
