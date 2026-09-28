"use client";

import type { Sale, SaleItem, Payment, StoreSettings } from "@/lib/types";
import { formatReceiptDate, formatSaleRef } from "@/lib/utils";

interface PrintReceiptOptions {
  sale: Sale;
  payments: Payment[];
  cashierName: string;
  settings: StoreSettings;
}

const METHOD_LABELS: Record<string, string> = {
  cash:        "Cash",
  momo:        "Mobile Money",
  pos_machine: "POS Machine",
  account:     "On Account",
};

function num(n: number) { return n.toFixed(2); }
function ghc(n: number) { return "GHC " + n.toFixed(2); }

async function logoAsDataUrl(): Promise<string> {
  try {
    const res  = await fetch("/logo-brand.png");
    const blob = await res.blob();
    return await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload  = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch {
    return ""; // print without logo if fetch fails
  }
}

function buildHtml(opts: PrintReceiptOptions, logoDataUrl: string): string {
  const { sale, payments, cashierName, settings } = opts;
  const items    = sale.sale_items ?? [];
  const saleRef  = formatSaleRef((sale as { sale_number?: number | null }).sale_number ?? null, sale.id);
  const saleDate = formatReceiptDate(sale.created_at);

  const hasCash   = payments.some((p) => p.method === "cash");
  const totalPaid = payments.reduce((s, p) => s + p.amount, 0);
  const change    = hasCash ? Math.max(0, totalPaid - sale.total_amount) : 0;

  // ── Store info ──────────────────────────────────────────────────────────────
  const storeLines: string[] = [];
  if (settings.address) storeLines.push(`<p>${esc(settings.address)}</p>`);
  if (settings.phone)   storeLines.push(`<p>Tel: ${esc(settings.phone)}</p>`);
  if (settings.vat_number) storeLines.push(`<p>VAT Reg: ${esc(settings.vat_number)}</p>`);
  const storeHtml = storeLines.length
    ? `<div class="store-info">${storeLines.join("")}</div>`
    : "";

  // ── Items ────────────────────────────────────────────────────────────────────
  const itemsHtml = items.map((item: SaleItem) => {
    const name   = (item.product?.name ?? "Unknown").toUpperCase();
    const isKg   = item.product?.unit === "kg";
    const detail = isKg
      ? `${item.quantity}kg / GHC ${num(item.unit_price)}`
      : `${item.quantity} x GHC ${num(item.unit_price)}`;
    const discountHtml = item.discount_amount > 0
      ? `<div class="item-disc">Disc: -${num(item.discount_amount)}</div>`
      : "";
    return `
      <div class="item">
        <div class="item-top">
          <span class="item-name">${esc(name)}</span>
          <span class="item-price">${num(item.total_price)}</span>
        </div>
        <div class="item-detail">${esc(detail)}</div>
        ${discountHtml}
      </div>`;
  }).join("");

  // ── Pre-total (discount / tax) ───────────────────────────────────────────────
  let preTotalHtml = "";
  if (sale.discount_amount > 0) {
    preTotalHtml += row("Subtotal", num(sale.subtotal));
    preTotalHtml += `<div class="row"><span>Discount</span><span class="disc-val">-${num(sale.discount_amount)}</span></div>`;
  }
  if (settings.tax_enabled && settings.tax_rate > 0) {
    const taxable = sale.subtotal - sale.discount_amount;
    if (settings.vat_number) {
      preTotalHtml += row("VAT (15%)", num(taxable * 0.15));
      preTotalHtml += row("NHIL/GETFL (2.5%)", num(taxable * 0.025));
    } else {
      preTotalHtml += row(`Tax (${settings.tax_rate}%)`, num(taxable * (settings.tax_rate / 100)));
    }
  }
  const preTotalSection = preTotalHtml
    ? `<div class="section pre-total">${preTotalHtml}</div>`
    : "";

  // ── Payments ─────────────────────────────────────────────────────────────────
  const paymentRows = payments.map((p) =>
    row(METHOD_LABELS[p.method] ?? p.method, num(p.amount))
  ).join("");
  const changeHtml = change > 0
    ? `<div class="row change-row"><span>Change</span><span class="change-val">${ghc(change)}</span></div>`
    : "";

  // ── Logo HTML ─────────────────────────────────────────────────────────────────
  const logoHtml = logoDataUrl
    ? `<img class="logo" src="${logoDataUrl}" alt="Bedarts Cold Supplies">`
    : `<p class="store-name">${esc(settings.store_name.toUpperCase())}</p>`;

  const footer = esc(settings.receipt_footer ?? "Thank you for shopping with us!");

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>Receipt ${saleRef}</title>
  <style>
    @page {
      size: 80mm auto;
      margin: 4mm 4mm 8mm;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
      font-size: 9pt;
      color: #111;
      background: #fff;
      width: 72mm;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }

    /* ── Header ──────────────────────────────────────────── */
    .header { text-align: center; padding: 4mm 0 1mm; }
    .logo   { width: 60mm; height: auto; display: block; margin: 0 auto; }
    .store-name { font-size: 12pt; font-weight: bold; letter-spacing: 1pt; }

    /* ── Store info ──────────────────────────────────────── */
    .store-info {
      text-align: center;
      font-size: 8pt;
      color: #000;
      line-height: 1.6;
      padding: 3mm 0;
    }

    /* ── Generic section ─────────────────────────────────── */
    .section { padding: 3mm 0; }

    /* ── Row (label / value) ─────────────────────────────── */
    .row {
      display: flex;
      justify-content: space-between;
      align-items: baseline;
      gap: 4pt;
      margin-bottom: 3pt;
      font-size: 9pt;
    }
    .row:last-child { margin-bottom: 0; }
    .row-label { color: #000; }
    .row-val   { font-family: 'Courier New', monospace; white-space: nowrap; }
    .row-val-bold { font-weight: bold; font-family: 'Courier New', monospace; white-space: nowrap; }

    /* ── Items ───────────────────────────────────────────── */
    .items { padding: 3mm 0; }
    .item  { margin-bottom: 4mm; }
    .item:last-child { margin-bottom: 0; }
    .item-top {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 4pt;
    }
    .item-name  { font-weight: bold; font-size: 9pt; text-transform: uppercase; flex: 1; line-height: 1.3; }
    .item-price { font-weight: bold; font-size: 9pt; font-family: 'Courier New', monospace; white-space: nowrap; }
    .item-detail {
      font-size: 8pt;
      color: #000;
      padding-left: 6pt;
      margin-top: 1pt;
      font-family: 'Courier New', monospace;
    }
    .item-disc  { font-size: 8pt; color: #000; padding-left: 6pt; margin-top: 1pt; }

    /* ── Pre-total ───────────────────────────────────────── */
    .pre-total .row { font-size: 8.5pt; }
    .disc-val { color: #8b4000; font-family: 'Courier New', monospace; }

    /* ── TOTAL ───────────────────────────────────────────── */
    .total-section {
      display: flex;
      justify-content: space-between;
      align-items: baseline;
      padding: 3mm 0;
      font-weight: bold;
      font-size: 14pt;
    }
    .total-amount { font-family: 'Courier New', monospace; }

    /* ── Hairline (only between TOTAL and payments) ───────── */
    .hairline {
      border: none;
      border-top: 0.5pt solid #bbb;
      margin: 2mm 0;
    }

    /* ── Payments ────────────────────────────────────────── */
    .payment-label {
      font-size: 7pt;
      font-weight: bold;
      color: #000;
      letter-spacing: 0.8pt;
      text-transform: uppercase;
      margin-bottom: 3mm;
    }
    .change-row { margin-top: 2mm; font-weight: bold; font-size: 11pt; }
    .change-val { color: #000; font-family: 'Courier New', monospace; }

    /* ── Footer ──────────────────────────────────────────── */
    .footer {
      text-align: center;
      font-size: 8pt;
      color: #000;
      padding: 4mm 0 6mm;
      line-height: 1.5;
    }
  </style>
</head>
<body>
  <div class="header">${logoHtml}</div>

  ${storeHtml}

  <div class="section">
    <div class="row"><span>Receipt</span><span class="row-val-bold">${saleRef}</span></div>
    <div class="row"><span class="row-label">Date</span><span class="row-val">${saleDate}</span></div>
    <div class="row"><span class="row-label">Cashier</span><span class="row-val">${esc(cashierName)}</span></div>
  </div>

  <div class="items">${itemsHtml}</div>

  ${preTotalSection}

  <div class="total-section">
    <span>TOTAL</span>
    <span class="total-amount">${ghc(sale.total_amount)}</span>
  </div>

  <hr class="hairline">

  <div class="section">
    <div class="payment-label">Payment</div>
    ${paymentRows}
    ${changeHtml}
  </div>

  <div class="footer">${footer}</div>

  <script>
    window.addEventListener('load', function () {
      // Wait for the logo image to fully load before printing
      var img = document.querySelector('img.logo');
      function doPrint() {
        setTimeout(function () {
          window.print();
          window.addEventListener('afterprint', function () { window.close(); });
        }, 200);
      }
      if (img) {
        if (img.complete) { doPrint(); }
        else { img.addEventListener('load', doPrint); img.addEventListener('error', doPrint); }
      } else {
        doPrint();
      }
    });
  </script>
</body>
</html>`;
}

function row(label: string, value: string): string {
  return `<div class="row"><span class="row-label">${esc(label)}</span><span class="row-val">${esc(value)}</span></div>`;
}

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export async function printReceipt(opts: PrintReceiptOptions): Promise<{ error?: string }> {
  const logoDataUrl = await logoAsDataUrl();
  const html  = buildHtml(opts, logoDataUrl);
  const blob  = new Blob([html], { type: "text/html;charset=utf-8" });
  const url   = URL.createObjectURL(blob);
  const win   = window.open(url, "_blank");
  if (!win) {
    URL.revokeObjectURL(url);
    return { error: "Popups are blocked. Allow popups for this site in your browser settings, then try again." };
  }
  setTimeout(() => URL.revokeObjectURL(url), 120_000);
  return {};
}
