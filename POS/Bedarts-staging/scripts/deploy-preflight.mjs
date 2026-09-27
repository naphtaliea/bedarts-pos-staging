#!/usr/bin/env node
// Refuses to let you deploy to the wrong environment.
//
// Reads:
//  - process cwd (must match expected directory)
//  - .env.local NEXT_PUBLIC_APP_ENV (must match target)
//  - .env.local NEXT_PUBLIC_SUPABASE_URL (must match target project ref)
//  - supabase/.temp/linked-project.json (production only — staging deploys to Vercel)
//
// Fails loudly with a colored error if anything is off.

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const target = process.argv[2]; // "production" | "staging"
if (target !== "production" && target !== "staging") {
  console.error("preflight: pass 'production' or 'staging' as the first argument");
  process.exit(1);
}

const EXPECTED = {
  production: {
    cwd:        "/home/prohacker/Bedarts",
    appEnv:     "production",
    projectRef: "upckmqaxdgixuovrmutm",
    target:     "Cloudflare Worker pos",
  },
  staging: {
    cwd:        "/home/prohacker/Bedarts/POS/Bedarts-staging",
    appEnv:     "staging",
    projectRef: "pfqlpmdkpykalnejqtsu",
    target:     "Vercel (bedarts-pos-staging)",
  },
}[target];

const __filename = fileURLToPath(import.meta.url);
const projectRoot = path.resolve(path.dirname(__filename), "..");

const RED = "\x1b[41m\x1b[97m";
const YELLOW = "\x1b[43m\x1b[30m";
const RESET = "\x1b[0m";
const errors = [];

// 1. cwd check
if (projectRoot !== EXPECTED.cwd) {
  errors.push(
    `directory mismatch — you're in ${projectRoot} but ${target.toUpperCase()} must be deployed from ${EXPECTED.cwd}`
  );
}

// 2. .env.local checks
const envPath = path.join(projectRoot, ".env.local");
if (!fs.existsSync(envPath)) {
  errors.push(`missing ${envPath}`);
} else {
  const env = Object.fromEntries(
    fs.readFileSync(envPath, "utf8")
      .split("\n")
      .filter((line) => line && !line.startsWith("#") && line.includes("="))
      .map((line) => {
        const idx = line.indexOf("=");
        return [line.slice(0, idx).trim(), line.slice(idx + 1).trim()];
      })
  );
  if (env.NEXT_PUBLIC_APP_ENV !== EXPECTED.appEnv) {
    errors.push(`NEXT_PUBLIC_APP_ENV=${env.NEXT_PUBLIC_APP_ENV} in .env.local, expected ${EXPECTED.appEnv}`);
  }
  if (!env.NEXT_PUBLIC_SUPABASE_URL?.includes(EXPECTED.projectRef)) {
    errors.push(`NEXT_PUBLIC_SUPABASE_URL doesn't reference ${EXPECTED.projectRef}`);
  }
}

// 3. Supabase link check — production only (staging is on Vercel, not Cloudflare/Supabase CLI)
if (target === "production") {
  const linkPath = path.join(projectRoot, "supabase", ".temp", "linked-project.json");
  if (!fs.existsSync(linkPath)) {
    errors.push(`supabase CLI not linked (${linkPath} missing) — run: supabase link --project-ref ${EXPECTED.projectRef}`);
  } else {
    const link = JSON.parse(fs.readFileSync(linkPath, "utf8"));
    if (link.ref !== EXPECTED.projectRef) {
      errors.push(`supabase link points at ${link.ref} (${link.name}), expected ${EXPECTED.projectRef}`);
    }
  }
}

if (errors.length) {
  console.error(`\n${RED} REFUSING TO DEPLOY TO ${target.toUpperCase()} ${RESET}\n`);
  for (const e of errors) console.error(`  ✗ ${e}`);
  console.error("\nFix the mismatches above, then re-run the deploy.\n");
  process.exit(1);
}

console.log(`${YELLOW} DEPLOY TARGET: ${target.toUpperCase()} → ${EXPECTED.target} → Supabase ${EXPECTED.projectRef} ${RESET}\n`);
