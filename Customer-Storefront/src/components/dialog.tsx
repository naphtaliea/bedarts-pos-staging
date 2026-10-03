"use client";

import { useEffect, useId, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { useLockBodyScroll } from "@/src/lib/use-lock-scroll";
import { cn } from "@/src/lib/utils";

interface DialogProps {
  open: boolean;
  onClose: () => void;
  labelledById?: string;
  /** Where to align on mobile: bottom sheet or centered card. */
  variant?: "sheet-bottom" | "sheet-right" | "center";
  className?: string;
  panelClassName?: string;
  children: ReactNode;
}

const FOCUSABLE =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Accessible modal container. Handles:
 *  - role="dialog" + aria-modal
 *  - Escape to close
 *  - Focus trap (Tab / Shift+Tab cycle inside)
 *  - Initial focus on first focusable element
 *  - Restore focus to trigger on close
 *  - Body scroll lock (refcounted)
 *  - Backdrop click to close
 */
export function Dialog({
  open,
  onClose,
  labelledById,
  variant = "center",
  className,
  panelClassName,
  children,
}: DialogProps) {
  const panelRef = useRef<HTMLDivElement | null>(null);
  const returnFocusRef = useRef<HTMLElement | null>(null);
  const fallbackId = useId();
  const labelId = labelledById ?? fallbackId;

  useLockBodyScroll(open);

  // Capture the element that had focus when the dialog opened
  useEffect(() => {
    if (!open) return;
    returnFocusRef.current = document.activeElement as HTMLElement | null;

    // Focus the first focusable element inside on next paint
    const raf = requestAnimationFrame(() => {
      const panel = panelRef.current;
      if (!panel) return;
      const first = panel.querySelector<HTMLElement>(FOCUSABLE);
      first?.focus();
    });

    return () => {
      cancelAnimationFrame(raf);
      returnFocusRef.current?.focus?.();
    };
  }, [open]);

  // Escape + focus trap
  useEffect(() => {
    if (!open) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.stopPropagation();
        onClose();
        return;
      }
      if (e.key !== "Tab") return;
      const panel = panelRef.current;
      if (!panel) return;
      const focusables = Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
        (el) => !el.hasAttribute("data-focus-guard")
      );
      if (focusables.length === 0) {
        e.preventDefault();
        return;
      }
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      const active = document.activeElement as HTMLElement | null;
      if (e.shiftKey && active === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && active === last) {
        e.preventDefault();
        first.focus();
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  if (!open) return null;
  if (typeof document === "undefined") return null;

  const backdropAlign =
    variant === "sheet-bottom"
      ? "items-end sm:items-center justify-center"
      : variant === "sheet-right"
      ? "items-stretch justify-end"
      : "items-center justify-center";

  const panelAnimation =
    variant === "sheet-bottom"
      ? "animate-sheet-up sm:animate-slide-up"
      : variant === "sheet-right"
      ? "animate-sheet-up md:animate-slide-right"
      : "animate-slide-up";

  return createPortal(
    <div
      role="presentation"
      className={cn(
        "fixed inset-0 z-50 bg-black/50 animate-fade-in flex",
        backdropAlign,
        variant === "center" && "p-4",
        className
      )}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelId}
        className={cn("outline-none", panelAnimation, panelClassName)}
      >
        {children}
      </div>
    </div>,
    document.body
  );
}
