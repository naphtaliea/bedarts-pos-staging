"use client";

import { useCallback, useEffect, useState } from "react";
import { RefreshCw } from "lucide-react";

const CLIENT_BUILD_ID = process.env.NEXT_PUBLIC_BUILD_ID ?? "";
const CHECK_INTERVAL_MS = 3 * 60 * 1000;

export function UpdateBanner() {
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [updating, setUpdating] = useState(false);

  const check = useCallback(async () => {
    if (!CLIENT_BUILD_ID) return;
    try {
      const res = await fetch("/api/version", { cache: "no-store" });
      if (!res.ok) return;
      const { buildId } = (await res.json()) as { buildId?: string };
      if (buildId && buildId !== CLIENT_BUILD_ID) setUpdateAvailable(true);
    } catch {
      /* offline / transient — retry on next tick */
    }
  }, []);

  useEffect(() => {
    check();
    const id = setInterval(check, CHECK_INTERVAL_MS);
    const onFocus = () => check();
    window.addEventListener("focus", onFocus);
    return () => {
      clearInterval(id);
      window.removeEventListener("focus", onFocus);
    };
  }, [check]);

  async function applyUpdate() {
    if (updating) return;
    setUpdating(true);
    try {
      if ("serviceWorker" in navigator) {
        const regs = await navigator.serviceWorker.getRegistrations();
        await Promise.all(regs.map((r) => r.unregister()));
      }
      if ("caches" in window) {
        const keys = await caches.keys();
        await Promise.all(keys.map((k) => caches.delete(k)));
      }
    } catch {
      /* best effort — reload anyway */
    }
    window.location.reload();
  }

  if (!updateAvailable) return null;

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[9999] w-[calc(100%-2rem)] max-w-sm print:hidden">
      <button
        onClick={applyUpdate}
        disabled={updating}
        className="w-full flex items-center gap-3 rounded-2xl bg-sidebar text-white px-4 py-3 shadow-2xl border border-white/10 hover:bg-sidebar/90 active:scale-[0.98] transition-all disabled:opacity-70"
      >
        <div className="w-9 h-9 rounded-full bg-primary flex items-center justify-center shrink-0">
          <RefreshCw
            className={`w-4 h-4 text-white ${updating ? "animate-spin" : ""}`}
            aria-hidden="true"
          />
        </div>
        <div className="flex-1 text-left min-w-0">
          <p className="text-sm font-semibold leading-tight">
            {updating ? "Updating…" : "New version available"}
          </p>
          <p className="text-xs text-white/70 truncate mt-0.5">
            {updating ? "Reloading in a moment" : "Tap to update when idle"}
          </p>
        </div>
      </button>
    </div>
  );
}
