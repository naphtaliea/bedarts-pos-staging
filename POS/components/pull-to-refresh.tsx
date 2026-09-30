"use client";

import { useEffect, useRef, useState, useTransition, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw } from "lucide-react";

const THRESHOLD = 72;
const MAX_PULL = 120;
const RESISTANCE = 0.55;

export function PullToRefresh({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [pullY, setPullY] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const [dragging, setDragging] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  const startY = useRef<number | null>(null);
  const pullYRef = useRef(0);
  const scrollElRef = useRef<HTMLElement | Window | null>(null);
  const refreshingRef = useRef(false);

  useEffect(() => { refreshingRef.current = refreshing; }, [refreshing]);
  useEffect(() => { pullYRef.current = pullY; }, [pullY]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    // Walk up from our root to find the actual scrolling ancestor. Falls back
    // to window if none has overflow-y auto/scroll.
    const findScrollParent = (el: HTMLElement | null): HTMLElement | Window => {
      let cur = el?.parentElement ?? null;
      while (cur) {
        const style = getComputedStyle(cur);
        if (/(auto|scroll)/.test(style.overflowY) && cur.scrollHeight > cur.clientHeight) {
          return cur;
        }
        cur = cur.parentElement;
      }
      return window;
    };

    const scrollEl = findScrollParent(rootRef.current);
    scrollElRef.current = scrollEl;

    const getScrollTop = (): number =>
      scrollEl === window
        ? window.scrollY || document.documentElement.scrollTop
        : (scrollEl as HTMLElement).scrollTop;

    const onTouchStart = (e: TouchEvent) => {
      if (refreshingRef.current) return;
      if (getScrollTop() > 0) return;
      if (e.touches.length !== 1) return;
      startY.current = e.touches[0].clientY;
    };

    const onTouchMove = (e: TouchEvent) => {
      if (startY.current === null || refreshingRef.current) return;
      // If the scroll container has drifted off top, cancel the pull.
      if (getScrollTop() > 0) {
        startY.current = null;
        setDragging(false);
        setPullY(0);
        return;
      }
      const dy = e.touches[0].clientY - startY.current;
      if (dy <= 0) {
        // Reset origin if the user reverses so a subsequent downward drag
        // starts fresh — prevents the pull sticking after an up-and-down.
        startY.current = e.touches[0].clientY;
        setPullY(0);
        pullYRef.current = 0;
        return;
      }
      // We're actively pulling from the top: take over scroll.
      e.preventDefault();
      if (!dragging) setDragging(true);
      const y = Math.min(MAX_PULL, dy * RESISTANCE);
      pullYRef.current = y;
      setPullY(y);
    };

    const onTouchEnd = () => {
      if (startY.current === null) return;
      startY.current = null;
      setDragging(false);
      if (pullYRef.current >= THRESHOLD && !refreshingRef.current) {
        setRefreshing(true);
        setPullY(THRESHOLD);
        pullYRef.current = THRESHOLD;
        startTransition(() => { router.refresh(); });
      } else {
        setPullY(0);
        pullYRef.current = 0;
      }
    };

    // Attach at document so we catch every touch that starts anywhere in the
    // shell, but decisions are made against the real scrolling ancestor above.
    // touchmove must be non-passive so we can preventDefault when pulling.
    document.addEventListener("touchstart", onTouchStart, { passive: true });
    document.addEventListener("touchmove", onTouchMove, { passive: false });
    document.addEventListener("touchend", onTouchEnd, { passive: true });
    document.addEventListener("touchcancel", onTouchEnd, { passive: true });

    return () => {
      document.removeEventListener("touchstart", onTouchStart);
      document.removeEventListener("touchmove", onTouchMove);
      document.removeEventListener("touchend", onTouchEnd);
      document.removeEventListener("touchcancel", onTouchEnd);
    };
  }, [router, dragging]);

  // Release once the RSC payload lands and the router transition ends.
  useEffect(() => {
    if (!refreshing) return;
    if (isPending) return;
    // Small hold so the user actually sees the spinner finish.
    const t = window.setTimeout(() => {
      setRefreshing(false);
      setPullY(0);
      pullYRef.current = 0;
    }, 250);
    return () => window.clearTimeout(t);
  }, [refreshing, isPending]);

  const progress = Math.min(1, pullY / THRESHOLD);
  const indicatorY = refreshing ? THRESHOLD : pullY;
  const indicatorOpacity = Math.min(1, pullY / (THRESHOLD * 0.5));
  const rotate = progress * 280;

  return (
    <div ref={rootRef} className="touch-pan-y">
      {/* Pull indicator — pinned inside the scroll area's viewport.
         Uses fixed positioning so it stays visible above content while the
         children below translate down. z-index is below the mobile nav (z-50). */}
      <div
        aria-hidden={!refreshing && pullY === 0}
        className="fixed left-1/2 top-2 -translate-x-1/2 z-40 pointer-events-none"
        style={{
          transform: `translate(-50%, ${Math.max(0, indicatorY - 44)}px)`,
          transition: dragging ? "none" : "transform 220ms cubic-bezier(0.2, 0.9, 0.3, 1), opacity 180ms",
          opacity: indicatorOpacity,
        }}
      >
        <div className="w-9 h-9 rounded-full bg-white shadow-md border border-slate-200 flex items-center justify-center">
          {refreshing ? (
            <RefreshCw className="w-4 h-4 text-accent animate-spin" strokeWidth={2.25} />
          ) : (
            <RefreshCw
              className="w-4 h-4 text-accent"
              strokeWidth={2.25}
              style={{ transform: `rotate(${rotate}deg)`, transition: "transform 80ms linear" }}
            />
          )}
        </div>
      </div>

      {/* Content translated by the current pull amount. Snaps back with a
         soft easing when the user releases below threshold. */}
      <div
        style={{
          transform: `translate3d(0, ${pullY}px, 0)`,
          transition: dragging ? "none" : "transform 220ms cubic-bezier(0.2, 0.9, 0.3, 1)",
          willChange: "transform",
        }}
      >
        {children}
      </div>
    </div>
  );
}
