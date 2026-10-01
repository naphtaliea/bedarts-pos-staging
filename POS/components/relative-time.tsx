"use client";

import { useEffect, useState } from "react";

// Tiny self-updating "updated 2 min ago" indicator. The parent passes the
// server render time as an ISO string; this component re-renders every 15s
// so the number keeps ticking without needing a fresh page fetch.
export function RelativeTime({ iso }: { iso: string }) {
  const [now, setNow] = useState<number>(() => Date.now());
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 15_000);
    return () => window.clearInterval(id);
  }, []);
  const sec = Math.max(0, Math.round((now - new Date(iso).getTime()) / 1000));
  return <>Updated {formatRelative(sec)}</>;
}

function formatRelative(sec: number): string {
  if (sec < 10) return "just now";
  if (sec < 60) return `${sec}s ago`;
  if (sec < 3600) return `${Math.floor(sec / 60)} min ago`;
  if (sec < 86400) return `${Math.floor(sec / 3600)}h ago`;
  return `${Math.floor(sec / 86400)}d ago`;
}
