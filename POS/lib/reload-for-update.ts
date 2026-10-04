"use client";

// When a till's page is older than the server (after a deploy), server actions
// fail with "Server action not found". Reload onto the new build, clearing the
// cached shell first — the same steps the update banner takes. Returns false
// (and does nothing) if we already reloaded in the last minute, so a genuinely
// broken deploy can't cause a reload loop. Carts and the offline queue live in
// localStorage / IndexedDB and survive the reload.
export async function reloadForUpdate(): Promise<boolean> {
  try {
    const last = Number(sessionStorage.getItem("bedarts-update-reload") ?? 0);
    if (Date.now() - last < 60_000) return false;
    sessionStorage.setItem("bedarts-update-reload", String(Date.now()));
  } catch {
    /* sessionStorage unavailable — fall through and reload once */
  }
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
  return true;
}
