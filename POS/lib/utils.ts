import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-GH", {
    style: "currency",
    currency: "GHS",
  }).format(amount);
}

export function formatDate(date: string | Date): string {
  return new Intl.DateTimeFormat("en-GH", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(date));
}

export function formatDateOnly(date: string | Date): string {
  return new Intl.DateTimeFormat("en-GH", { dateStyle: "medium" }).format(
    new Date(date)
  );
}

// Human-friendly receipt reference derived from the sequential sale_number.
// Pads to 12 digits and splits 5-3-4, e.g. sale_number=914002155 → "00914-002-0155".
// Falls back to the short UUID prefix if sale_number is missing.
export function formatSaleRef(saleNumber: number | null | undefined, fallbackUuid?: string): string {
  if (saleNumber == null) {
    return fallbackUuid ? `#${fallbackUuid.slice(0, 8).toUpperCase()}` : "#UNKNOWN";
  }
  const s = String(saleNumber).padStart(12, "0");
  return `#${s.slice(0, 5)}-${s.slice(5, 8)}-${s.slice(8, 12)}`;
}

// Locale-independent receipt date: "20 Sep 2026, 2:58 PM" — matches the PDF generator exactly
export function formatReceiptDate(dateStr: string): string {
  const d = new Date(dateStr);
  const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  const h12 = d.getHours() % 12 || 12;
  const mins = d.getMinutes().toString().padStart(2, "0");
  const ampm = d.getHours() >= 12 ? "PM" : "AM";
  return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}, ${h12}:${mins} ${ampm}`;
}

export function daysUntilExpiry(expiryDate: string): number {
  const now = new Date();
  const expiry = new Date(expiryDate);
  return Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}
