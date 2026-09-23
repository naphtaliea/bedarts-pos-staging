# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: pos.spec.ts >> 4. Payment & receipt >> 4.3 Print Receipt button is present and enabled
- Location: tests/playwright/pos.spec.ts:251:7

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: getByText('BEEF LIPS', { exact: true }).first()
Expected: visible
Timeout: 10000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" getByText('BEEF LIPS', { exact: true }).first() with timeout 10000ms
  - waiting for getByText('BEEF LIPS', { exact: true }).first()

```

```yaml
- 'heading "Error 1102 Ray ID: a3f9a482de73ee07 • 2026-09-23 12:44:45 UTC" [level=1]'
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
  - strong: a3f9a482de73ee07
  - text: "• Your IP:"
  - button "Click to reveal"
  - text: • Performance & security by
  - link "Cloudflare":
    - /url: https://www.cloudflare.com/5xx-error-landing
```

# Test source

```ts
  115 |   });
  116 | 
  117 |   test("2.2 tapping same product twice creates two cart lines", async ({ page }) => {
  118 |     await clickProduct(page, "BEEF LIPS");
  119 |     await page.waitForTimeout(300);
  120 |     await clickProduct(page, "BEEF LIPS");
  121 |     await page.waitForTimeout(300);
  122 |     const count = await page.locator("text=BEEF LIPS").count();
  123 |     expect(count).toBeGreaterThanOrEqual(3); // grid tile + 2 cart lines
  124 |     await page.screenshot({ path: "tests/playwright/screenshots/2.2-duplicate-lines.png" });
  125 |   });
  126 | 
  127 |   test("2.3 backspace zeros qty then removes line on second press", async ({ page }) => {
  128 |     await clickProduct(page, "BEEF LIPS");
  129 |     await page.waitForTimeout(400);
  130 |     const bsp = page.getByRole("button", { name: /backspace/i });
  131 |     await bsp.click();
  132 |     await page.waitForTimeout(300);
  133 |     await page.screenshot({ path: "tests/playwright/screenshots/2.3a-first-backspace.png" });
  134 |     await bsp.click();
  135 |     await page.waitForTimeout(300);
  136 |     await expect(page.getByText(/empty order/i)).toBeVisible({ timeout: 3_000 });
  137 |     await page.screenshot({ path: "tests/playwright/screenshots/2.3b-second-backspace.png" });
  138 |   });
  139 | 
  140 |   test("2.4 Change UOM button is visible when a line is selected", async ({ page }) => {
  141 |     await clickProduct(page, "BEEF LIPS");
  142 |     await page.waitForTimeout(400);
  143 |     await expect(page.getByRole("button", { name: /change uom/i })).toBeVisible({ timeout: 5_000 });
  144 |     await page.screenshot({ path: "tests/playwright/screenshots/2.4-change-uom-visible.png" });
  145 |   });
  146 | 
  147 |   test("2.5 deleting last line selects predecessor", async ({ page }) => {
  148 |     await clickProduct(page, "BEEF LIPS");
  149 |     await page.waitForTimeout(300);
  150 |     await clickProduct(page, "TILAPIA");
  151 |     await page.waitForTimeout(300);
  152 |     const bsp = page.getByRole("button", { name: /backspace/i });
  153 |     // One backspace removes TILAPIA (buffer empty on fresh selection → immediate remove)
  154 |     // and auto-selects BEEF LIPS as the predecessor
  155 |     await bsp.click();
  156 |     await page.waitForTimeout(400);
  157 |     await expect(page.getByRole("button", { name: /change uom/i })).toBeVisible({ timeout: 3_000 });
  158 |     await page.screenshot({ path: "tests/playwright/screenshots/2.5-predecessor-selected.png" });
  159 |   });
  160 | });
  161 | 
  162 | // ── Suite 3: SPA navigation ───────────────────────────────────────────────────
  163 | test.describe("3. SPA navigation", () => {
  164 |   test.use({ storageState: TERMINAL_STATE });
  165 | 
  166 |   test.beforeEach(async ({ page }) => {
  167 |     await page.goto("/cashier", { waitUntil: "domcontentloaded" });
  168 |     await expect(page.getByText("BEEF LIPS", { exact: true }).first()).toBeVisible({ timeout: 10_000 });
  169 |   });
  170 | 
  171 |   test("3.1 Pay button transitions to payment without URL change", async ({ page }) => {
  172 |     await clickProduct(page, "BEEF LIPS");
  173 |     await page.waitForTimeout(400);
  174 |     await page.getByRole("button", { name: /^pay/i }).click();
  175 |     await page.waitForTimeout(600);
  176 |     expect(page.url()).toMatch(/\/cashier$/);
  177 |     await expect(page.getByRole("button", { name: /confirm/i })).toBeVisible({ timeout: 5_000 });
  178 |     await page.screenshot({ path: "tests/playwright/screenshots/3.1-payment-view.png" });
  179 |   });
  180 | 
  181 |   test("3.2 back from payment returns to POS cart without URL change", async ({ page }) => {
  182 |     await clickProduct(page, "BEEF LIPS");
  183 |     await page.waitForTimeout(400);
  184 |     await page.getByRole("button", { name: /^pay/i }).click();
  185 |     await page.waitForTimeout(500);
  186 |     await page.getByRole("button", { name: /go back/i }).click();
  187 |     await page.waitForTimeout(400);
  188 |     expect(page.url()).toMatch(/\/cashier$/);
  189 |     await expect(page.getByText("BEEF LIPS").first()).toBeVisible({ timeout: 3_000 });
  190 |     await page.screenshot({ path: "tests/playwright/screenshots/3.2-back-from-payment.png" });
  191 |   });
  192 | 
  193 |   test("3.3 completing payment shows receipt on same /cashier URL", async ({ page }) => {
  194 |     await clickProduct(page, "BEEF LIPS");
  195 |     await page.waitForTimeout(400);
  196 |     await page.getByRole("button", { name: /^pay/i }).click();
  197 |     await page.waitForTimeout(500);
  198 |     await page.locator("button").filter({ hasText: /^4$/ }).first().click();
  199 |     await page.waitForTimeout(100);
  200 |     await page.locator("button").filter({ hasText: /^6$/ }).first().click();
  201 |     await page.waitForTimeout(100);
  202 |     await page.getByRole("button", { name: /confirm/i }).click();
  203 |     await expect(page.getByText("Payment Received")).toBeVisible({ timeout: 20_000 });
  204 |     expect(page.url()).toMatch(/\/cashier$/);
  205 |     await page.screenshot({ path: "tests/playwright/screenshots/3.3-receipt-same-url.png" });
  206 |   });
  207 | });
  208 | 
  209 | // ── Suite 4: Payment & receipt ────────────────────────────────────────────────
  210 | test.describe("4. Payment & receipt", () => {
  211 |   test.use({ storageState: TERMINAL_STATE });
  212 | 
  213 |   test.beforeEach(async ({ page }) => {
  214 |     await page.goto("/cashier", { waitUntil: "domcontentloaded" });
> 215 |     await expect(page.getByText("BEEF LIPS", { exact: true }).first()).toBeVisible({ timeout: 10_000 });
      |                                                                        ^ Error: expect(locator).toBeVisible() failed
  216 |   });
  217 | 
  218 |   test("4.1 cash overtender shows correct change (GHC 50 for GHC 46 = GHC 4)", async ({ page }) => {
  219 |     await clickProduct(page, "BEEF LIPS");
  220 |     await page.waitForTimeout(400);
  221 |     await page.getByRole("button", { name: /^pay/i }).click();
  222 |     await page.waitForTimeout(500);
  223 |     await page.locator("button").filter({ hasText: /^5$/ }).first().click();
  224 |     await page.locator("button").filter({ hasText: /^0$/ }).first().click();
  225 |     await page.waitForTimeout(300);
  226 |     // formatCurrency("GHS", "en-GH") renders as "GH₵4.00"
  227 |     await expect(page.getByText(/GH.4\.00/).first()).toBeVisible({ timeout: 5_000 });
  228 |     await page.screenshot({ path: "tests/playwright/screenshots/4.1-change-displayed.png" });
  229 |   });
  230 | 
  231 |   test("4.2 receipt shows logo, store address, items, total", async ({ page }) => {
  232 |     await clickProduct(page, "BEEF LIPS");
  233 |     await page.waitForTimeout(400);
  234 |     await page.getByRole("button", { name: /^pay/i }).click();
  235 |     await page.waitForTimeout(500);
  236 |     await page.locator("button").filter({ hasText: /^4$/ }).first().click();
  237 |     await page.locator("button").filter({ hasText: /^6$/ }).first().click();
  238 |     await page.getByRole("button", { name: /confirm/i }).click();
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
```