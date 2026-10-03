"use client";

import { useEffect } from "react";

/**
 * Registers /sw.js so the site is installable. The SW is a passthrough — it
 * does not cache dynamic data. See public/sw.js for the reasoning.
 */
export function ServiceWorkerRegistrar() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator)) return;
    // Register after load so it doesn't compete with critical path.
    const onLoad = () => {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        // Silent — SW is a progressive enhancement.
      });
    };
    if (document.readyState === "complete") onLoad();
    else window.addEventListener("load", onLoad, { once: true });
    return () => window.removeEventListener("load", onLoad);
  }, []);
  return null;
}
