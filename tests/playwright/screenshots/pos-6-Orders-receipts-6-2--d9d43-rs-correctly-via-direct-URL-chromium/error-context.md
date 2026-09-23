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
- 'heading "Error 1102 Ray ID: a3f9a6bf3ad4ee0a • 2026-09-23 12:46:17 UTC" [level=1]'
- heading "Worker exceeded resource limits" [level=2]
- heading "What happened?" [level=2]
- paragraph:
  - text: You've requested a page on a website (pos.bedarts.workers.dev) that is on the
  - link "Cloudflare":
    - /url: https://www.cloudflare.com/5xx-error-landing?utm_source=error_100x
  - text: network. An unknown error occurred while rendering the page.
- heading "What can I do?" [level=2]
- paragraph:
  - strong: "If you are the owner of this website:"
  - text: refer to
  - link "Workers - Errors and Exceptions":
    - /url: https://developers.cloudflare.com/workers/observability/errors/
  - text: and check Workers Logs for pos.bedarts.workers.dev.
- paragraph:
  - text: "Cloudflare Ray ID:"
  - strong: a3f9a6bf3ad4ee0a
  - text: "• Your IP:"
  - button "Click to reveal"
  - text: • Performance & security by
  - link "Cloudflare":
    - /url: https://www.cloudflare.com/5xx-error-landing
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