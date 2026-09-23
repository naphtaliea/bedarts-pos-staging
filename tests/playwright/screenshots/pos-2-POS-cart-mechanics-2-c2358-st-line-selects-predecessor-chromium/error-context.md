# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: pos.spec.ts >> 2. POS cart mechanics >> 2.5 deleting last line selects predecessor
- Location: tests/playwright/pos.spec.ts:147:7

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: getByRole('button', { name: /change uom/i })
Expected: visible
Timeout: 3000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" getByRole('button', { name: /change uom/i }) with timeout 3000ms
  - waiting for getByRole('button', { name: /change uom/i })

```

```yaml
- banner:
  - img "Bedarts Cold Supplies"
  - button "Order 1"
  - button "Add order": +
  - text: 12:43 pm
  - button "Orders"
  - button "Till counter"
  - heading "Till Counter" [level=2]
  - button "Clear"
  - button "Close"
  - text: GH₵ 200
  - spinbutton "0"
  - text: = — GH₵ 100
  - spinbutton "0"
  - text: = — GH₵ 50
  - spinbutton "0"
  - text: = — GH₵ 20
  - spinbutton "0"
  - text: = — GH₵ 10
  - spinbutton "0"
  - text: = — GH₵ 5
  - spinbutton "0"
  - text: = — GH₵ 1
  - spinbutton "0"
  - text: = — Total GH₵ 0.00
  - button "Dashboard"
  - text: T Test Cashier (Playwright)
  - button "Sign out"
- region "Order panel":
  - text: Order
  - paragraph: Empty order
  - paragraph: Tap a product to begin
  - paragraph: Numpad
  - button "1"
  - button "2"
  - button "3"
  - button "Qty"
  - button "4"
  - button "5"
  - button "6"
  - button "Disc"
  - button "7"
  - button "8"
  - button "9"
  - button "Price"
  - button "00"
  - button "0"
  - button "."
  - button "Backspace"
  - button "Pay —" [disabled]
- region "Product browser":
  - text: Search products
  - textbox "Search products":
    - /placeholder: Search products…
  - button "All"
  - button "Beef"
  - button "Fish & Seafood"
  - button "Poultry"
  - button "Processed Meat"
  - button "BEEF LIPS BEEF LIPS GH₵46.00 /kg 4.50 kg left":
    - img "BEEF LIPS"
    - paragraph: BEEF LIPS
    - text: GH₵46.00 /kg
    - paragraph: 4.50 kg left
  - button "BEEF MASK BEEF MASK GH₵43.00 /kg Out of stock" [disabled]:
    - img "BEEF MASK"
    - paragraph: BEEF MASK
    - text: GH₵43.00 /kg
    - paragraph: Out of stock
  - button "BEEF SINEWS AGRA BEEF SINEWS AGRA GH₵40.00 /kg Out of stock" [disabled]:
    - img "BEEF SINEWS AGRA"
    - paragraph: BEEF SINEWS AGRA
    - text: GH₵40.00 /kg
    - paragraph: Out of stock
  - button "BEEF THROAT BEEF THROAT GH₵40.00 /kg Out of stock" [disabled]:
    - img "BEEF THROAT"
    - paragraph: BEEF THROAT
    - text: GH₵40.00 /kg
    - paragraph: Out of stock
  - button "BEEF TRIPES-PLATE BEEF TRIPES-PLATE GH₵41.00 /kg Out of stock" [disabled]:
    - img "BEEF TRIPES-PLATE"
    - paragraph: BEEF TRIPES-PLATE
    - text: GH₵41.00 /kg
    - paragraph: Out of stock
  - button "BIG BEEF SAUSAGE BIG BEEF SAUSAGE GH₵40.00 /pieces Out of stock" [disabled]:
    - img "BIG BEEF SAUSAGE"
    - paragraph: BIG BEEF SAUSAGE
    - text: GH₵40.00 /pieces
    - paragraph: Out of stock
  - button "CASSAVA FISH CASSAVA FISH GH₵48.00 /kg 18.00 kg":
    - img "CASSAVA FISH"
    - paragraph: CASSAVA FISH
    - text: GH₵48.00 /kg
    - paragraph: 18.00 kg
  - button "CHICKEN BACKS - SOFT CHICKEN BACKS - SOFT GH₵26.00 /kg 20.00 kg":
    - img "CHICKEN BACKS - SOFT"
    - paragraph: CHICKEN BACKS - SOFT
    - text: GH₵26.00 /kg
    - paragraph: 20.00 kg
  - button "CHICKEN BREAST CHICKEN BREAST GH₵140.00 /pieces 14 pieces":
    - img "CHICKEN BREAST"
    - paragraph: CHICKEN BREAST
    - text: GH₵140.00 /pieces
    - paragraph: 14 pieces
  - button "CHICKEN FEET CHICKEN FEET GH₵28.00 /kg Out of stock" [disabled]:
    - img "CHICKEN FEET"
    - paragraph: CHICKEN FEET
    - text: GH₵28.00 /kg
    - paragraph: Out of stock
  - button "CHICKEN THIGHS - HARD CHICKEN THIGHS - HARD GH₵45.00 /kg 20.00 kg":
    - img "CHICKEN THIGHS - HARD"
    - paragraph: CHICKEN THIGHS - HARD
    - text: GH₵45.00 /kg
    - paragraph: 20.00 kg
  - button "CHICKEN THIGHS - SOFT CHICKEN THIGHS - SOFT GH₵36.00 /kg 20.00 kg":
    - img "CHICKEN THIGHS - SOFT"
    - paragraph: CHICKEN THIGHS - SOFT
    - text: GH₵36.00 /kg
    - paragraph: 20.00 kg
  - button "CHICKEN WINGS (SOFT) CHICKEN WINGS (SOFT) GH₵57.00 /kg Out of stock" [disabled]:
    - img "CHICKEN WINGS (SOFT)"
    - paragraph: CHICKEN WINGS (SOFT)
    - text: GH₵57.00 /kg
    - paragraph: Out of stock
  - button "COW LEG COW LEG GH₵34.00 /kg Out of stock" [disabled]:
    - img "COW LEG"
    - paragraph: COW LEG
    - text: GH₵34.00 /kg
    - paragraph: Out of stock
  - button "DRUMSTICKS DRUMSTICKS GH₵40.00 /kg 20.00 kg":
    - img "DRUMSTICKS"
    - paragraph: DRUMSTICKS
    - text: GH₵40.00 /kg
    - paragraph: 20.00 kg
  - button "GIZZARD GH₵40.00 /kg 20.00 kg":
    - paragraph: GIZZARD
    - text: GH₵40.00 /kg
    - paragraph: 20.00 kg
  - button "HAKE GH₵38.00 /kg 20.00 kg":
    - paragraph: HAKE
    - text: GH₵38.00 /kg
    - paragraph: 20.00 kg
  - button "HEN WINGS - HARD GH₵55.00 /kg Out of stock" [disabled]:
    - paragraph: HEN WINGS - HARD
    - text: GH₵55.00 /kg
    - paragraph: Out of stock
  - button "KPALA 16+ GH₵39.00 /kg 20.00 kg":
    - paragraph: KPALA 16+
    - text: GH₵39.00 /kg
    - paragraph: 20.00 kg
  - button "KPALA 20+ GH₵43.00 /kg 20.00 kg":
    - paragraph: KPALA 20+
    - text: GH₵43.00 /kg
    - paragraph: 20.00 kg
  - button "KPALA 25+ GH₵48.00 /kg 40.00 kg":
    - paragraph: KPALA 25+
    - text: GH₵48.00 /kg
    - paragraph: 40.00 kg
  - button "LOCAL SALMON 20+ GH₵45.00 /kg 20.00 kg":
    - paragraph: LOCAL SALMON 20+
    - text: GH₵45.00 /kg
    - paragraph: 20.00 kg
  - button "LOCAL SALMON 25+ GH₵48.00 /kg 20.00 kg":
    - paragraph: LOCAL SALMON 25+
    - text: GH₵48.00 /kg
    - paragraph: 20.00 kg
  - button "RED FISH GH₵67.00 /kg 20.00 kg":
    - paragraph: RED FISH
    - text: GH₵67.00 /kg
    - paragraph: 20.00 kg
  - button "SAADIA SAUSAGE GH₵22.00 /pieces 48 pieces":
    - paragraph: SAADIA SAUSAGE
    - text: GH₵22.00 /pieces
    - paragraph: 48 pieces
  - button "SEARA SAUSAGE GH₵20.00 /pieces 48 pieces":
    - paragraph: SEARA SAUSAGE
    - text: GH₵20.00 /pieces
    - paragraph: 48 pieces
  - button "TILAPIA TILAPIA GH₵60.00 /kg 33.00 kg":
    - img "TILAPIA"
    - paragraph: TILAPIA
    - text: GH₵60.00 /kg
    - paragraph: 33.00 kg
  - button "TURKEY WINGS GH₵67.00 /kg 20.00 kg":
    - paragraph: TURKEY WINGS
    - text: GH₵67.00 /kg
    - paragraph: 20.00 kg
- alert
```

# Test source

```ts
  57  |     await expect(page.getByText(/who.s at the register/i)).toBeVisible({ timeout: 8_000 });
  58  |     await expect(page.locator("button").filter({ hasText: CASHIER_NAME })).toBeVisible();
  59  |     await page.screenshot({ path: "tests/playwright/screenshots/1.2-cashier-selection.png" });
  60  |   });
  61  | 
  62  | });
  63  | 
  64  | // Tests 1.3 and 1.4 cover PIN behaviour only — login flow is already covered by 1.1/1.2.
  65  | // Using storageState avoids redundant Worker login requests that throttle subsequent tests.
  66  | test.describe("1. PIN validation", () => {
  67  |   test.use({ storageState: TERMINAL_PIN_STATE });
  68  | 
  69  |   test("1.3 wrong PIN shows error and does not redirect", async ({ page }) => {
  70  |     // networkidle ensures JS bundles finish loading so React has time to hydrate
  71  |     await page.goto("/cashier/pin", { waitUntil: "networkidle" });
  72  |     await expect(page.getByText(/who.s at the register/i)).toBeVisible({ timeout: 10_000 });
  73  |     // Use Bedarts (real cashier, unknown PIN) — single attempt won't trigger lockout
  74  |     await page.locator("button").filter({ hasText: "Bedarts" }).click();
  75  |     // Wait for numpad to appear — confirms React handled the click
  76  |     await expect(page.locator("button").filter({ hasText: /^1$/ }).first()).toBeVisible({ timeout: 10_000 });
  77  |     for (const digit of "0000") {
  78  |       await page.locator("button").filter({ hasText: new RegExp(`^${digit}$`) }).first().click();
  79  |       await page.waitForTimeout(150);
  80  |     }
  81  |     await page.waitForTimeout(2000);
  82  |     expect(page.url()).not.toMatch(/\/cashier$/);
  83  |     await expect(
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
> 157 |     await expect(page.getByRole("button", { name: /change uom/i })).toBeVisible({ timeout: 3_000 });
      |                                                                     ^ Error: expect(locator).toBeVisible() failed
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
```