# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: pos.spec.ts >> 6. Orders & receipts >> 6.2 known receipt renders correctly via direct URL
- Location: tests/playwright/pos.spec.ts:335:7

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
  239 |     await expect(page.locator("#receipt-print")).toBeVisible({ timeout: 20_000 });
  240 |     const receipt = page.locator("#receipt-print");
  241 |     await expect(receipt.locator("img")).toBeVisible();
  242 |     await expect(receipt.getByText(/Lashibi|Community 19|Opp/i).first()).toBeVisible();
  243 |     await expect(receipt.getByText("BEEF LIPS")).toBeVisible();
  244 |     await expect(receipt.getByText("TOTAL")).toBeVisible();
  245 |     // TOTAL row in receipt uses literal "GHC" (not formatCurrency)
  246 |     await expect(receipt.getByText("GHC 46.00", { exact: true })).toBeVisible();
  247 |     await page.screenshot({ path: "tests/playwright/screenshots/4.2-receipt-content.png" });
  248 |     await receipt.screenshot({ path: "tests/playwright/screenshots/4.2-receipt-paper.png" });
  249 |   });
  250 | 
  251 |   test("4.3 Print Receipt button is present and enabled", async ({ page }) => {
  252 |     await clickProduct(page, "BEEF LIPS");
  253 |     await page.waitForTimeout(400);
  254 |     await page.getByRole("button", { name: /^pay/i }).click();
  255 |     await page.waitForTimeout(500);
  256 |     await page.locator("button").filter({ hasText: /^4$/ }).first().click();
  257 |     await page.locator("button").filter({ hasText: /^6$/ }).first().click();
  258 |     await page.getByRole("button", { name: /confirm/i }).click();
  259 |     await expect(page.getByText("Payment Received")).toBeVisible({ timeout: 20_000 });
  260 |     const printBtn = page.getByRole("button", { name: /print receipt/i });
  261 |     await expect(printBtn).toBeVisible();
  262 |     await expect(printBtn).toBeEnabled();
  263 |     await page.screenshot({ path: "tests/playwright/screenshots/4.3-print-button.png" });
  264 |   });
  265 | 
  266 |   test("4.4 New Order clears cart and returns to empty POS", async ({ page }) => {
  267 |     await clickProduct(page, "BEEF LIPS");
  268 |     await page.waitForTimeout(400);
  269 |     await page.getByRole("button", { name: /^pay/i }).click();
  270 |     await page.waitForTimeout(500);
  271 |     await page.locator("button").filter({ hasText: /^4$/ }).first().click();
  272 |     await page.locator("button").filter({ hasText: /^6$/ }).first().click();
  273 |     await page.getByRole("button", { name: /confirm/i }).click();
  274 |     await expect(page.getByText("Payment Received")).toBeVisible({ timeout: 20_000 });
  275 |     await page.getByRole("button", { name: /new order/i }).click();
  276 |     await page.waitForTimeout(500);
  277 |     expect(page.url()).toMatch(/\/cashier$/);
  278 |     await expect(page.getByText(/empty order/i)).toBeVisible({ timeout: 5_000 });
  279 |     await page.screenshot({ path: "tests/playwright/screenshots/4.4-new-order-empty.png" });
  280 |   });
  281 | });
  282 | 
  283 | // ── Suite 5: Role guards ──────────────────────────────────────────────────────
  284 | test.describe("5a. Role guards (terminal)", () => {
  285 |   test.use({ storageState: TERMINAL_STATE });
  286 | 
  287 |   test("5.1 terminal account cannot access /dashboard", async ({ page }) => {
  288 |     try {
  289 |       await page.goto("/dashboard", { waitUntil: "commit" });
  290 |     } catch {
  291 |       // redirect loop = guard working
  292 |     }
  293 |     await page.waitForTimeout(500);
  294 |     expect(page.url()).not.toMatch(/\/dashboard(?:\/|$)/);
  295 |     await page.screenshot({ path: "tests/playwright/screenshots/5.1-terminal-blocked.png" });
  296 |   });
  297 | });
  298 | 
  299 | test.describe("5b. Role guards (admin)", () => {
  300 |   test.use({ storageState: ADMIN_STATE });
  301 | 
  302 |   test("5.2 admin can reach /dashboard", async ({ page }) => {
  303 |     await page.goto("/dashboard", { waitUntil: "domcontentloaded" });
  304 |     await expect(page).toHaveURL(/\/dashboard/);
  305 |     await page.screenshot({ path: "tests/playwright/screenshots/5.2-admin-dashboard.png" });
  306 |   });
  307 | 
  308 |   test("5.3 admin can access /dashboard/settings", async ({ page }) => {
  309 |     await page.goto("/dashboard/settings", { waitUntil: "domcontentloaded" });
  310 |     await expect(page).toHaveURL(/\/dashboard\/settings/, { timeout: 10_000 });
  311 |     await expect(page.locator("h1, h2, input, textarea, button, [role='switch']").first()).toBeVisible({ timeout: 15_000 });
  312 |     await page.screenshot({ path: "tests/playwright/screenshots/5.3-settings-page.png" });
  313 |   });
  314 | });
  315 | 
  316 | test.describe("5c. Role guards (unauthenticated)", () => {
  317 |   test("5.4 unauthenticated user is redirected to /login", async ({ page }) => {
  318 |     await page.goto("/dashboard", { waitUntil: "domcontentloaded" });
  319 |     await page.waitForTimeout(1000);
  320 |     await expect(page).toHaveURL(/\/login/);
  321 |     await page.screenshot({ path: "tests/playwright/screenshots/5.4-unauth-redirect.png" });
  322 |   });
  323 | });
  324 | 
  325 | // ── Suite 6: Orders & receipts ────────────────────────────────────────────────
  326 | test.describe("6. Orders & receipts", () => {
  327 |   test.use({ storageState: ADMIN_STATE });
  328 | 
  329 |   test("6.1 /cashier/orders loads and shows a list", async ({ page }) => {
  330 |     await page.goto("/cashier/orders", { waitUntil: "domcontentloaded" });
  331 |     await expect(page).toHaveURL(/\/cashier\/orders/);
  332 |     await page.screenshot({ path: "tests/playwright/screenshots/6.1-orders-list.png" });
  333 |   });
  334 | 
  335 |   test("6.2 known receipt renders correctly via direct URL", async ({ page }) => {
  336 |     const SALE_ID = "25157cd0-3b5b-466f-9ff3-850ef3e37bdc";
  337 |     await page.goto(`/cashier/receipt?sale=${SALE_ID}`, { waitUntil: "domcontentloaded" });
  338 |     const receipt = page.locator("#receipt-print");
> 339 |     await expect(receipt).toBeVisible({ timeout: 10_000 });
      |                           ^ Error: expect(locator).toBeVisible() failed
  340 |     await expect(receipt.getByText("BEEF LIPS")).toBeVisible();
  341 |     await expect(receipt.getByText("TOTAL")).toBeVisible();
  342 |     await page.screenshot({ path: "tests/playwright/screenshots/6.2-receipt-direct.png" });
  343 |     await receipt.screenshot({ path: "tests/playwright/screenshots/6.2-receipt-paper.png" });
  344 |   });
  345 | });
  346 | 
```