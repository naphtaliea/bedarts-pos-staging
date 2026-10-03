// Minimal service worker: registers so browsers offer "Add to Home Screen"
// and satisfies PWA installability, without caching product/order data
// (which must stay live). Static assets get standard HTTP cache handling
// from the browser and Vercel's CDN.

self.addEventListener("install", (event) => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

// Passthrough: don't intercept fetches. Keeps the catalog and cart
// perfectly live, no stale-cache bugs. If we later want offline browsing
// we'd cache /icon-* and /manifest.webmanifest only.
self.addEventListener("fetch", () => {});
