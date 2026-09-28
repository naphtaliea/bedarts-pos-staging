import { PDFDocument, rgb, StandardFonts } from "pdf-lib";
import type { Sale, SaleItem, Payment, StoreSettings } from "@/lib/types";
import { formatReceiptDate, formatSaleRef } from "@/lib/utils";

// pdf-lib StandardFonts use WinAnsi — ₵ (U+20B5) is outside that set; use "GHC" instead.
function ghc(amount: number): string {
  return "GHC " + amount.toFixed(2);
}

function num(amount: number): string {
  return amount.toFixed(2);
}

interface ReceiptData {
  sale: Sale;
  items: SaleItem[];
  payments: Payment[];
  cashierName: string;
  settings: StoreSettings;
}

export async function generateReceipt(data: ReceiptData): Promise<Uint8Array> {
  const { sale, items, payments, cashierName, settings } = data;

  const doc     = await PDFDocument.create();
  const page    = doc.addPage([226, estimateHeight(items.length)]);
  const { width, height } = page.getSize();

  const regular = await doc.embedFont(StandardFonts.Helvetica);
  const bold    = await doc.embedFont(StandardFonts.HelveticaBold);

  const LEFT  = 14;
  const RIGHT = width - 14;
  let y = height - 14;

  // ── Helpers ──────────────────────────────────────────────────────────────────

  const draw = (text: string, x: number, font = regular, size = 9, color = rgb(0, 0, 0)) =>
    page.drawText(text, { x, y, font, size, color });

  const center = (text: string, font = regular, size = 9, color = rgb(0, 0, 0)) => {
    const w = font.widthOfTextAtSize(text, size);
    page.drawText(text, { x: Math.max(LEFT, (width - w) / 2), y, font, size, color });
  };

  const drawRight = (text: string, font = regular, size = 9, color = rgb(0, 0, 0)) => {
    const w = font.widthOfTextAtSize(text, size);
    page.drawText(text, { x: RIGHT - w, y, font, size, color });
  };

  const row = (label: string, value: string, labelFont = regular, valueFont = regular, size = 9) => {
    draw(label, LEFT, labelFont, size);
    drawRight(value, valueFont, size);
  };

  const gap = (n = 9) => { y -= n; };

  // Centered word-wrapped text
  const centeredText = (text: string, font = regular, size = 8, color = rgb(0, 0, 0)) => {
    const maxWidth = RIGHT - LEFT;
    const words = text.split(" ");
    let line = "";
    for (const word of words) {
      const test = line ? `${line} ${word}` : word;
      if (font.widthOfTextAtSize(test, size) > maxWidth) {
        center(line, font, size, color);
        gap(size + 3);
        line = word;
      } else {
        line = test;
      }
    }
    if (line) { center(line, font, size, color); gap(size + 3); }
  };

  // Thin hairline rule — used only once, between TOTAL and payments
  const thinRule = () => {
    y -= 5;
    page.drawLine({
      start: { x: LEFT, y },
      end:   { x: RIGHT, y },
      thickness: 0.4,
      color: rgb(0.75, 0.75, 0.75),
    });
    y -= 8;
  };

  // ── 1. Logo ───────────────────────────────────────────────────────────────────

  let logoLoaded = false;
  try {
    const imgBytes = await fetch("/logo-brand.png").then((r) => r.arrayBuffer());
    const img      = await doc.embedPng(new Uint8Array(imgBytes));
    const logoW    = Math.min(170, width - 28);
    const logoH    = img.height * (logoW / img.width);
    page.drawImage(img, { x: (width - logoW) / 2, y: y - logoH, width: logoW, height: logoH });
    y -= logoH + 6;
    logoLoaded = true;
  } catch { /* fall through to text */ }

  if (!logoLoaded) {
    center(settings.store_name.toUpperCase(), bold, 11);
    gap(14);
    center("Always fresh...always in season", regular, 8, rgb(0.45, 0.45, 0.45));
    gap(8);
  }

  // ── 2. Store info ─────────────────────────────────────────────────────────────

  gap(14);

  if (settings.address) {
    centeredText(settings.address, regular, 8, rgb(0.25, 0.25, 0.25));
  }
  if (settings.phone) {
    center(`Tel: ${settings.phone}`, regular, 8, rgb(0.25, 0.25, 0.25));
    gap(11);
  }
  if (settings.vat_number) {
    center(`VAT Reg: ${settings.vat_number}`, regular, 8, rgb(0.25, 0.25, 0.25));
    gap(11);
  }

  // ── 3. Sale meta ──────────────────────────────────────────────────────────────

  gap(16);

  const saleRef = formatSaleRef((sale as { sale_number?: number | null }).sale_number ?? null, sale.id);

  row("Receipt", saleRef, regular, bold, 9);
  gap(13);
  row("Date", formatReceiptDate(sale.created_at), regular, regular, 9);
  gap(13);
  row("Cashier", cashierName, regular, regular, 9);
  gap(18);

  // ── 4. Items ──────────────────────────────────────────────────────────────────

  const METHOD_LABELS: Record<string, string> = {
    cash:        "Cash",
    momo:        "Mobile Money",
    pos_machine: "POS Machine",
    account:     "On Account",
  };

  for (const item of items) {
    const name   = (item.product?.name ?? "Unknown").toUpperCase();
    const isKg   = item.product?.unit === "kg";
    const detail = isKg
      ? `  ${item.quantity}kg  /  GHC ${num(item.unit_price)}`
      : `  ${item.quantity} x  GHC ${num(item.unit_price)}`;

    // Word-wrap the product name; price on the right of the first line
    const maxNameWidth = RIGHT - LEFT - bold.widthOfTextAtSize("999.99", 9) - 8;
    const words = name.split(" ");
    let nameLine = "";
    let firstLine = true;
    for (const w of words) {
      const test = nameLine ? `${nameLine} ${w}` : w;
      if (bold.widthOfTextAtSize(test, 9) > maxNameWidth) {
        if (firstLine) {
          draw(nameLine, LEFT, bold, 9);
          drawRight(num(item.total_price), bold, 9);
          firstLine = false;
        } else {
          draw(nameLine, LEFT, bold, 9);
        }
        gap(12);
        nameLine = w;
      } else {
        nameLine = test;
      }
    }
    if (nameLine) {
      if (firstLine) {
        draw(nameLine, LEFT, bold, 9);
        drawRight(num(item.total_price), bold, 9);
      } else {
        draw(nameLine, LEFT, bold, 9);
      }
      gap(12);
    }

    draw(detail, LEFT, regular, 8, rgb(0.45, 0.45, 0.45));
    gap(10);

    if (item.discount_amount > 0) {
      draw(`  Disc: -${num(item.discount_amount)}`, LEFT, regular, 8, rgb(0.55, 0.35, 0));
      gap(10);
    }

    gap(4); // item breathing room
  }

  // ── 5. Pre-total lines (discount / tax) ───────────────────────────────────────

  gap(6);

  if (sale.discount_amount > 0) {
    row("Subtotal", num(sale.subtotal), regular, regular, 9);
    gap(12);
    draw("Discount", LEFT, regular, 9);
    drawRight(`-${num(sale.discount_amount)}`, regular, 9, rgb(0.55, 0.35, 0));
    gap(12);
  }

  if (settings.tax_enabled && settings.tax_rate > 0) {
    const taxable = sale.subtotal - sale.discount_amount;
    if (settings.vat_number) {
      row("VAT (15%)", num(taxable * 0.15), regular, regular, 8);
      gap(12);
      row("NHIL/GETFL (2.5%)", num(taxable * 0.025), regular, regular, 8);
      gap(12);
    } else {
      row(`Tax (${settings.tax_rate}%)`, num(taxable * (settings.tax_rate / 100)), regular, regular, 9);
      gap(12);
    }
  }

  // ── 6. TOTAL ──────────────────────────────────────────────────────────────────

  gap(4);
  draw("TOTAL", LEFT, bold, 13);
  drawRight(ghc(sale.total_amount), bold, 13);
  gap(22);

  thinRule();

  // ── 7. Payments ───────────────────────────────────────────────────────────────

  draw("PAYMENT", LEFT, bold, 7, rgb(0.5, 0.5, 0.5));
  gap(13);

  for (const p of payments) {
    row(METHOD_LABELS[p.method] ?? p.method, num(p.amount), regular, regular, 9);
    gap(12);
  }

  const hasCash   = payments.some((p) => p.method === "cash");
  const totalPaid = payments.reduce((s, p) => s + p.amount, 0);
  const change    = hasCash ? Math.max(0, totalPaid - sale.total_amount) : 0;

  if (change > 0) {
    gap(4);
    draw("Change", LEFT, bold, 11);
    drawRight(ghc(change), bold, 11, rgb(0, 0.45, 0.2));
    gap(18);
  } else {
    gap(8);
  }

  // ── 8. Footer ─────────────────────────────────────────────────────────────────

  const footer = settings.receipt_footer ?? "Thank you for shopping with us!";
  centeredText(footer, regular, 8, rgb(0.45, 0.45, 0.45));

  return doc.save();
}

function estimateHeight(itemCount: number): number {
  return Math.max(560, 390 + itemCount * 70);
}
