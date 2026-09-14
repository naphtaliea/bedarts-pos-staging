import { PDFDocument, rgb, StandardFonts } from "pdf-lib";
import type { Sale, SaleItem, Payment, StoreSettings } from "@/lib/types";
import { formatCurrency, formatDate } from "@/lib/utils";

interface ReceiptData {
  sale: Sale;
  items: SaleItem[];
  payments: Payment[];
  cashierName: string;
  customerName?: string;
  settings: StoreSettings;
}

export async function generateReceipt(data: ReceiptData): Promise<Uint8Array> {
  const { sale, items, payments, cashierName, customerName, settings } = data;

  const doc = await PDFDocument.create();
  const page = doc.addPage([226, estimateHeight(items.length)]);
  const { width, height } = page.getSize();

  const regular = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);

  let y = height - 20;
  const left = 10;
  const right = width - 10;
  const col2 = right - 50;

  const line = (
    text: string,
    x: number,
    font = regular,
    size = 8,
    color = rgb(0, 0, 0)
  ) => {
    page.drawText(text, { x, y, font, size, color });
  };

  const rule = () => {
    y -= 4;
    page.drawLine({
      start: { x: left, y },
      end: { x: right, y },
      thickness: 0.5,
      color: rgb(0.7, 0.7, 0.7),
    });
    y -= 6;
  };

  const gap = (n = 10) => { y -= n; };

  // Header
  line(settings.store_name, left, bold, 11);
  gap(12);
  if (settings.address) { line(settings.address, left, regular, 7); gap(9); }
  if (settings.phone) { line(`Tel: ${settings.phone}`, left, regular, 7); gap(9); }

  rule();

  line(`Date: ${formatDate(sale.created_at)}`, left, regular, 7);
  gap(9);
  line(`Receipt #: ${sale.id.slice(0, 8).toUpperCase()}`, left, regular, 7);
  gap(9);
  line(`Cashier: ${cashierName}`, left, regular, 7);
  gap(9);
  if (customerName) { line(`Customer: ${customerName}`, left, regular, 7); gap(9); }

  rule();

  // Column headers
  line("ITEM", left, bold, 7);
  line("QTY", 110, bold, 7);
  line("PRICE", 140, bold, 7);
  line("TOTAL", col2, bold, 7);
  gap(10);

  // Items
  for (const item of items) {
    const name = (item.product?.name ?? "Unknown").slice(0, 22);
    const qty = String(item.quantity);
    const price = formatCurrency(item.unit_price);
    const total = formatCurrency(item.total_price);

    line(name, left, regular, 7);
    line(qty, 110, regular, 7);
    line(price, 140, regular, 7);
    line(total, col2, regular, 7);
    gap(9);

    if (item.discount_amount > 0) {
      line(`  Discount: -${formatCurrency(item.discount_amount)}`, left, regular, 7, rgb(0.5, 0, 0));
      gap(9);
    }
  }

  rule();

  // Totals
  const twoCol = (label: string, value: string, f = regular, s = 8) => {
    line(label, left, f, s);
    line(value, col2, f, s);
    gap(s + 3);
  };

  twoCol("Subtotal", formatCurrency(sale.subtotal));
  if (sale.discount_amount > 0) {
    twoCol("Discount", `-${formatCurrency(sale.discount_amount)}`, regular, 8);
  }
  if (settings.tax_enabled && settings.tax_rate > 0) {
    const taxable = sale.subtotal - sale.discount_amount;
    const taxAmt = taxable * (settings.tax_rate / 100);
    twoCol(`Tax (${settings.tax_rate}%)`, formatCurrency(taxAmt), regular, 8);
  }
  twoCol("TOTAL", formatCurrency(sale.total_amount), bold, 10);

  rule();

  // Payments
  line("PAYMENT", left, bold, 7);
  gap(9);
  for (const p of payments) {
    const method =
      p.method === "momo" ? "Mobile Money" :
      p.method === "pos_machine" ? "POS Machine" : "Cash";
    twoCol(method, formatCurrency(p.amount), regular, 7);
    if (p.reference) { line(`  Ref: ${p.reference}`, left, regular, 7); gap(9); }
  }

  rule();

  // Footer
  const footer = settings.receipt_footer ?? "Thank you for shopping with us!";
  const words = footer.split(" ");
  let currentLine = "";
  for (const word of words) {
    const test = currentLine ? `${currentLine} ${word}` : word;
    if (test.length > 32) {
      const centerX = left + (width - left * 2 - regular.widthOfTextAtSize(currentLine, 7)) / 2;
      line(currentLine, Math.max(left, centerX), regular, 7);
      gap(9);
      currentLine = word;
    } else {
      currentLine = test;
    }
  }
  if (currentLine) {
    const centerX = left + (width - left * 2 - regular.widthOfTextAtSize(currentLine, 7)) / 2;
    line(currentLine, Math.max(left, centerX), regular, 7);
    gap(9);
  }

  return doc.save();
}

function estimateHeight(itemCount: number): number {
  return Math.max(400, 220 + itemCount * 40);
}

