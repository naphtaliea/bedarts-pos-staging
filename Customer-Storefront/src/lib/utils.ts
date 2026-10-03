import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const currencyFormatter = new Intl.NumberFormat("en-GH", {
  style: "currency",
  currency: "GHS",
  currencyDisplay: "narrowSymbol",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export function formatCurrency(amount: number): string {
  // Intl uses "GH₵" on some Ghana locales — normalise to the POS's GH¢.
  return currencyFormatter.format(amount).replace(/GH[₵¢]?\s?/, "GH¢");
}

const dateFormatter = new Intl.DateTimeFormat("en-GH", {
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

export function formatDate(iso: string): string {
  return dateFormatter.format(new Date(iso));
}

const shortDateFormatter = new Intl.DateTimeFormat("en-GH", {
  day: "numeric",
  month: "short",
});

export function formatShortDate(iso: string): string {
  return shortDateFormatter.format(new Date(iso));
}
