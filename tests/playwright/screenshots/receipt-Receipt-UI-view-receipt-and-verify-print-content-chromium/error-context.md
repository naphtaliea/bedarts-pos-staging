# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: receipt.spec.ts >> Receipt UI >> view receipt and verify print content
- Location: tests/playwright/receipt.spec.ts:8:7

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: locator('#receipt-print')
Expected: visible
Timeout: 10000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" locator('#receipt-print') with timeout 10000ms
  - waiting for locator('#receipt-print')

```

```yaml
- complementary:
  - img "Bedarts Cold Supplies"
  - navigation "Main navigation":
    - link "Dashboard":
      - /url: /dashboard
    - link "Cashier View":
      - /url: /cashier
    - link "Inventory":
      - /url: /inventory
    - link "Suppliers":
      - /url: /suppliers
    - link "Reports":
      - /url: /reports
    - link "Expenses":
      - /url: /expenses
    - link "Refunds":
      - /url: /refunds
    - link "Settings":
      - /url: /settings
  - text: KA
  - paragraph: Kwame Agyemang
  - paragraph: admin
  - button "Sign out"
- main:
  - paragraph: Bedarts Cold Supplies
  - heading "Dashboard" [level=1]
  - paragraph: Today's Revenue
  - paragraph: GH₵1,363.00
  - paragraph: 19 sales
  - paragraph: 7-Day Revenue
  - paragraph: GH₵1,363.00
  - paragraph: last 7 days
  - paragraph: Stock Value
  - paragraph: GH₵4,237.50
  - paragraph: cost basis
  - paragraph: Payables
  - paragraph: GH₵0.00
  - paragraph: no outstanding invoices
  - paragraph: Active Products
  - paragraph: "2"
  - paragraph: in catalogue
  - paragraph: Low Stock
  - paragraph: "0"
  - paragraph: all clear
  - paragraph: Expiring Soon
  - paragraph: "0"
  - paragraph: nothing due
  - paragraph: Profit & Loss
  - heading "Today" [level=3]
  - button "Today"
  - button "7 days"
  - text: Revenue GH₵1,363.00 − Cost of goods GH₵997.50 = Gross Profit 26.8% margin GH₵365.50 − Expenses
  - link:
    - /url: /expenses
  - text: GH₵130.00 = Net Profit 17.3% net margin GH₵235.50
  - paragraph: Expense breakdown
  - link "All":
    - /url: /expenses
  - text: Electricity GH₵80.00 Marketing GH₵50.00
  - paragraph: Revenue
  - heading "Last 7 days" [level=3]
  - text: GH₵1,363.00 total
  - application: Mon 14 Tue 15 Wed 16 Thu 17 Fri 18 Sat 19 Sun 20
  - paragraph: Category Mix
  - heading "7-day sales" [level=3]
  - application
  - text: Uncategorised 100%
  - paragraph: Peak Hours
  - heading "Sales volume by hour · 7-day average" [level=3]
  - application: 6am 8am 10am 12pm 2pm 4pm 6pm 8pm 10pm
  - paragraph: Top Products
  - heading "By revenue · 7 days" [level=3]
  - text: 1.BEEF LIPS GH₵943.00 2.TILAPIA GH₵420.00
  - paragraph: Expiry Alerts
  - heading "Stock batches expiring within 30 days" [level=3]
  - paragraph: No batches expiring in the next 30 days
  - paragraph: Low Stock
  - heading "Products below reorder threshold" [level=3]
  - paragraph: All products are adequately stocked
- alert
```

# Test source

```ts
  1  | import { test, expect } from "@playwright/test";
  2  | 
  3  | const SALE_ID = "25157cd0-3b5b-466f-9ff3-850ef3e37bdc";
  4  | 
  5  | test.describe("Receipt UI", () => {
  6  |   test.use({ storageState: "tests/playwright/auth/admin.json" });
  7  | 
  8  |   test("view receipt and verify print content", async ({ page }) => {
  9  |     // Navigate directly to the known receipt — no login needed (storageState)
  10 |     await page.goto(`/cashier/receipt?sale=${SALE_ID}`, { waitUntil: "domcontentloaded" });
  11 | 
  12 |     const receipt = page.locator("#receipt-print");
> 13 |     await expect(receipt).toBeVisible({ timeout: 10_000 });
     |                           ^ Error: expect(locator).toBeVisible() failed
  14 | 
  15 |     // ── Receipt paper content ─────────────────────────────────────────────
  16 |     await expect(receipt.getByText("BEEF LIPS")).toBeVisible();
  17 |     await expect(receipt.getByText("TOTAL", { exact: true })).toBeVisible();
  18 |     // TOTAL row renders as "GHC {amount}" (exact match avoids matching the unit price line too)
  19 |     await expect(receipt.getByText("GHC 46.00", { exact: true })).toBeVisible();
  20 | 
  21 |     // ── Sale reference and date ───────────────────────────────────────────
  22 |     await expect(receipt.getByText("#25157CD0").last()).toBeVisible();
  23 |     await expect(receipt.getByText(/20 Sep 2026/)).toBeVisible();
  24 | 
  25 |     // ── Screenshots ───────────────────────────────────────────────────────
  26 |     await page.screenshot({ path: "tests/playwright/screenshots/01-receipt-full.png", fullPage: true });
  27 |     await receipt.screenshot({ path: "tests/playwright/screenshots/02-receipt-paper.png" });
  28 | 
  29 |     // ── Print button is present and clickable ─────────────────────────────
  30 |     const printBtn = page.getByRole("button", { name: /print receipt/i });
  31 |     await expect(printBtn).toBeVisible();
  32 |     await expect(printBtn).toBeEnabled();
  33 |   });
  34 | });
  35 | 
```