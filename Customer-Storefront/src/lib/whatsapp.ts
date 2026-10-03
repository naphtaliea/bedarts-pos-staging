import type { OnlineOrder } from "@/src/lib/types";
import { formatCurrency } from "@/src/lib/utils";

/**
 * Extract the first phone number from a settings string (e.g.
 * "0303962627 / 0559418928") and return it in international format
 * (+233...) suitable for wa.me. Returns null if nothing parseable.
 */
export function extractWhatsAppNumber(phoneField: string | null): string | null {
  if (!phoneField) return null;
  // First contiguous run of digits with 9+ digits.
  const digits = phoneField.replace(/[^0-9]/g, " ").split(/\s+/).find((s) => s.length >= 9);
  if (!digits) return null;
  // Ghana local numbers start with 0, international drops it and prefixes 233.
  if (digits.startsWith("0")) return `233${digits.slice(1)}`;
  if (digits.startsWith("233")) return digits;
  return digits;
}

export function buildOrderChatUrl(waNumber: string, order: OnlineOrder): string {
  const refLine = order.paystack_ref ? `Order ref: ${order.paystack_ref}` : `Order ID: ${order.id.slice(0, 8)}`;
  const items = (order.items ?? [])
    .map((i) => `• ${i.product_name} × ${i.quantity}`)
    .slice(0, 6)
    .join("\n");
  const text = [
    `Hi Bedarts, I have a question about my order.`,
    ``,
    refLine,
    `Total: ${formatCurrency(order.total_amount)}`,
    ``,
    items,
  ]
    .filter(Boolean)
    .join("\n");
  return `https://wa.me/${waNumber}?text=${encodeURIComponent(text)}`;
}

export function buildProductShareUrl(waNumber: string | null, productName: string, price: number, url: string): string {
  const text = `${productName} — ${formatCurrency(price)} at Bedarts Cold Supplies.\n${url}`;
  const base = waNumber ? `https://wa.me/${waNumber}` : `https://wa.me/`;
  return `${base}?text=${encodeURIComponent(text)}`;
}
