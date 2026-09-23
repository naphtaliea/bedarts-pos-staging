# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: pos.spec.ts >> 3. SPA navigation >> 3.2 back from payment returns to POS cart without URL change
- Location: tests/playwright/pos.spec.ts:181:7

# Error details

```
Test timeout of 60000ms exceeded.
```

```
Error: locator.click: Test timeout of 60000ms exceeded.
Call log:
  - waiting for getByRole('button', { name: /^pay/i })
    - locator resolved to <button disabled class="w-full h-16 rounded-xl flex items-center justify-between px-5 gap-3 transition-all bg-primary hover:bg-primary/90 active:scale-[0.98] disabled:opacity-25 shadow-lg shadow-primary/20">…</button>
  - attempting click action
    2 × waiting for element to be visible, enabled and stable
      - element is not enabled
    - retrying click action
    - waiting 20ms
    2 × waiting for element to be visible, enabled and stable
      - element is not enabled
    - retrying click action
      - waiting 100ms
    113 × waiting for element to be visible, enabled and stable
        - element is not enabled
      - retrying click action
        - waiting 500ms

```

# Page snapshot

```yaml
- generic [ref=e1]:
  - generic [ref=e2]:
    - banner [ref=e3]:
      - img "Bedarts Cold Supplies" [ref=e5]
      - generic [ref=e6]:
        - button "Order 1" [ref=e7]
        - button "Add order" [ref=e9]: +
      - generic [ref=e11]:
        - generic [ref=e12]: 11:09 pm
        - link "Orders" [ref=e13] [cursor=pointer]:
          - /url: /cashier/orders
        - link "Dashboard" [ref=e17] [cursor=pointer]:
          - /url: /cashier/dashboard
        - generic [ref=e23]:
          - generic [ref=e24]: T
          - generic [ref=e26]: Test Cashier (Playwright)
        - button "Sign out" [ref=e28]
    - generic [ref=e32]:
      - region "Order panel" [ref=e33]:
        - generic [ref=e34]: Order
        - generic [ref=e45]:
          - paragraph [ref=e46]: Empty order
          - paragraph [ref=e47]: Tap a product to begin
        - generic [ref=e48]:
          - paragraph [ref=e50]: Numpad
          - generic [ref=e51]:
            - button "1" [ref=e52]
            - button "2" [ref=e53]
            - button "3" [ref=e54]
            - button "Qty" [ref=e55]
            - button "4" [ref=e56]
            - button "5" [ref=e57]
            - button "6" [ref=e58]
            - button "Disc" [ref=e59]
            - button "7" [ref=e60]
            - button "8" [ref=e61]
            - button "9" [ref=e62]
            - button "Price" [ref=e63]
            - button "00" [ref=e64]
            - button "0" [ref=e65]
            - button "." [ref=e66]
            - button "Backspace" [ref=e67]
        - button "Pay —" [disabled] [ref=e73]:
          - generic [ref=e74]: Pay
          - generic [ref=e75]: —
      - region "Product browser" [ref=e78]:
        - generic [ref=e79]:
          - generic [ref=e80]: Search products
          - textbox "Search products" [ref=e82]:
            - /placeholder: Search products…
        - button "All" [ref=e85]
        - generic [ref=e87]:
          - generic [active] [ref=e88] [cursor=pointer]:
            - img "BEEF LIPS" [ref=e89]
            - generic [ref=e90]:
              - paragraph [ref=e91]: BEEF LIPS
              - generic [ref=e92]:
                - generic [ref=e93]: GH₵46.00
                - generic [ref=e94]: /kg
              - paragraph [ref=e95]: 67.50 kg
          - generic [ref=e96] [cursor=pointer]:
            - img "TILAPIA" [ref=e97]
            - generic [ref=e98]:
              - paragraph [ref=e99]: TILAPIA
              - generic [ref=e100]:
                - generic [ref=e101]: GH₵60.00
                - generic [ref=e102]: /kg
              - paragraph [ref=e103]: 53.00 kg
  - alert [ref=e104]
```

# Test source

```ts
  84  |       page.locator("p").filter({ hasText: /incorrect|wrong|attempt/i }).first()
  85  |     ).toBeVisible({ timeout: 5_000 });
  86  |     await page.screenshot({ path: "tests/playwright/screenshots/1.3-wrong-pin.png" });
  87  |   });
  88  | 
  89  |   test("1.4 correct PIN logs in and shows cashier name in topbar", async ({ page }) => {
  90  |     // networkidle ensures JS bundles finish loading so React has time to hydrate
  91  |     await page.goto("/cashier/pin", { waitUntil: "networkidle" });
  92  |     await expect(page.getByText(/who.s at the register/i)).toBeVisible({ timeout: 10_000 });
  93  |     await selectAndEnterPin(page);
  94  |     await expect(page.locator("header").getByText(CASHIER_NAME)).toBeVisible({ timeout: 8_000 });
  95  |     await page.screenshot({ path: "tests/playwright/screenshots/1.4-cashier-name-in-topbar.png" });
  96  |   });
  97  | });
  98  | 
  99  | // ── Suite 2: POS cart mechanics ───────────────────────────────────────────────
  100 | // Uses pre-authenticated terminal+PIN state — no login needed per test.
  101 | test.describe("2. POS cart mechanics", () => {
  102 |   test.use({ storageState: TERMINAL_STATE });
  103 | 
  104 |   test.beforeEach(async ({ page }) => {
  105 |     await page.goto("/cashier", { waitUntil: "domcontentloaded" });
  106 |     await expect(page.getByText("BEEF LIPS", { exact: true }).first()).toBeVisible({ timeout: 10_000 });
  107 |   });
  108 | 
  109 |   test("2.1 tapping a product adds it to the cart panel", async ({ page }) => {
  110 |     await clickProduct(page, "BEEF LIPS");
  111 |     await page.waitForTimeout(400);
  112 |     await expect(page.locator("text=BEEF LIPS").first()).toBeVisible({ timeout: 5_000 });
  113 |     await expect(page.getByRole("button", { name: /^pay/i })).toBeEnabled({ timeout: 10_000 });
  114 |     await page.screenshot({ path: "tests/playwright/screenshots/2.1-product-added.png" });
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
> 184 |     await page.getByRole("button", { name: /^pay/i }).click();
      |                                                       ^ Error: locator.click: Test timeout of 60000ms exceeded.
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
  215 |     await expect(page.getByText("BEEF LIPS", { exact: true }).first()).toBeVisible({ timeout: 10_000 });
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
```