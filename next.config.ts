import type { NextConfig } from "next";
import withPWAInit from "@ducanh2912/next-pwa";

// Unique per-build identifier — baked into both server and client bundles via
// generateBuildId + env. The /api/version endpoint returns the current server
// value; the client compares it to its own baked value and prompts a reload
// on mismatch (see components/update-banner.tsx).
const BUILD_ID = process.env.BUILD_ID || String(Date.now());

const withPWA = withPWAInit({
  dest: "public",
  disable: process.env.NODE_ENV === "development",
  cacheOnFrontEndNav: true,
  aggressiveFrontEndNavCaching: true,
  reloadOnOnline: false,
  workboxOptions: {
    disableDevLogs: true,
  },
});

const FINANCIAL_ROUTES = [
  "/dashboard",
  "/inventory",
  "/reports",
  "/suppliers",
  "/expenses",
  "/refunds",
  "/settings",
  "/cashier/:path*",
  "/customers",
];

const SECURITY_HEADERS = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-XSS-Protection", value: "1; mode=block" },
];

const nextConfig: NextConfig = {
  reactStrictMode: true,
  generateBuildId: async () => BUILD_ID,
  env: {
    NEXT_PUBLIC_BUILD_ID: BUILD_ID,
  },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "images.unsplash.com" },
    ],
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: SECURITY_HEADERS,
      },
      ...FINANCIAL_ROUTES.map((source) => ({
        source,
        headers: [
          { key: "Cache-Control", value: "no-store, no-cache, must-revalidate" },
        ],
      })),
    ];
  },
};

export default withPWA(nextConfig);

import('@opennextjs/cloudflare').then(m => m.initOpenNextCloudflareForDev());
