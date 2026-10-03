"use client";

import { useEffect } from "react";

let lockCount = 0;
let prevOverflow = "";
let prevPaddingRight = "";

function applyLock() {
  if (lockCount > 0) return;
  const body = document.body;
  prevOverflow = body.style.overflow;
  prevPaddingRight = body.style.paddingRight;
  // Compensate for scrollbar removal so the page doesn't shift.
  const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
  if (scrollbarWidth > 0) {
    body.style.paddingRight = `${scrollbarWidth}px`;
  }
  body.style.overflow = "hidden";
}

function releaseLock() {
  if (lockCount > 0) return;
  const body = document.body;
  body.style.overflow = prevOverflow;
  body.style.paddingRight = prevPaddingRight;
}

/**
 * Locks body scroll for as long as `active` is true. Refcounted, so
 * two overlays open at once won't fight each other on close.
 */
export function useLockBodyScroll(active: boolean) {
  useEffect(() => {
    if (!active) return;
    applyLock();
    lockCount += 1;
    return () => {
      lockCount -= 1;
      releaseLock();
    };
  }, [active]);
}
