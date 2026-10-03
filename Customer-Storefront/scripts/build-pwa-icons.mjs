#!/usr/bin/env node
// Generate PWA icons by centering the reverse (light-on-navy) logo onto a
// solid navy square. Runs from scripts/build-pwa-icons.mjs and writes to
// public/ so the manifest can reference stable paths.

import sharp from "sharp";
import { existsSync, mkdirSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const publicDir = resolve(__dirname, "../public");
const src = resolve(publicDir, "logo-brand-reverse.png");

if (!existsSync(publicDir)) mkdirSync(publicDir, { recursive: true });

const navy = { r: 6, g: 15, b: 64 }; // #060F40

async function buildIcon(size, logoScale, filename) {
  // logoScale is fraction of the icon width the wordmark occupies.
  const wordmarkWidth = Math.round(size * logoScale);
  const logo = await sharp(src)
    .resize({ width: wordmarkWidth, fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .toBuffer();
  const logoMeta = await sharp(logo).metadata();
  const left = Math.round((size - (logoMeta.width ?? wordmarkWidth)) / 2);
  const top = Math.round((size - (logoMeta.height ?? 0)) / 2);

  await sharp({
    create: {
      width: size,
      height: size,
      channels: 4,
      background: { ...navy, alpha: 1 },
    },
  })
    .composite([{ input: logo, left, top }])
    .png()
    .toFile(resolve(publicDir, filename));

  console.log(`✓ ${filename} (${size}×${size})`);
}

// Standard icons — wordmark occupies ~72% of the icon width.
await buildIcon(192, 0.72, "icon-192.png");
await buildIcon(512, 0.72, "icon-512.png");

// Maskable — content must sit inside 80% "safe zone" per manifest spec.
await buildIcon(512, 0.55, "icon-maskable-512.png");

// Apple touch icon (iOS). iOS applies its own rounded-square mask so we use
// a slightly smaller wordmark to leave breathing room.
await buildIcon(180, 0.7, "apple-touch-icon.png");

// Favicon (browser tab).
await buildIcon(32, 0.85, "favicon-32.png");
