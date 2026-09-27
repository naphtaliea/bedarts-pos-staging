#!/usr/bin/env node
// Re-applies usage_model=unbound after every wrangler deploy.
// wrangler resets the Worker to the plan default ("standard" = 10 ms CPU cap)
// on each upload; this patches it back via the CF API immediately after.

import fs from "fs";
import os from "os";
import path from "path";

const target = process.argv[2]; // "production" | "staging"

const WORKER = {
  production: "pos",
  staging: "pos-staging",
}[target];

if (!WORKER) {
  console.error("post-deploy: pass 'production' or 'staging'");
  process.exit(1);
}

const ACCOUNT_ID = "c2b75b61233b1a1a81438b0b7e7235de";

function getToken() {
  if (process.env.CLOUDFLARE_API_TOKEN) return process.env.CLOUDFLARE_API_TOKEN;
  try {
    const raw = fs.readFileSync(
      path.join(os.homedir(), ".config", ".wrangler", "config", "default.toml"),
      "utf8"
    );
    const m = raw.match(/oauth_token\s*=\s*"([^"]+)"/);
    if (m) return m[1];
  } catch { /* fall through */ }
  throw new Error("No Cloudflare API token. Set CLOUDFLARE_API_TOKEN or run: npx wrangler login");
}

const token = getToken();
const url = `https://api.cloudflare.com/client/v4/accounts/${ACCOUNT_ID}/workers/scripts/${WORKER}/settings`;

const body = new FormData();
body.append(
  "settings",
  new Blob([JSON.stringify({ usage_model: "unbound" })], { type: "application/json" })
);

const res = await fetch(url, {
  method: "PATCH",
  headers: { Authorization: `Bearer ${token}` },
  body,
});

const json = await res.json();
if (!json.success) {
  console.error("post-deploy: failed to set usage_model=unbound:", json.errors);
  process.exit(1);
}

console.log(`post-deploy: ${WORKER} → usage_model=${json.result.usage_model} ✓`);
