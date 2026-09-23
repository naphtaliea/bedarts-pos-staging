# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: pos.spec.ts >> 4. Payment & receipt >> 4.3 Print Receipt button is present and enabled
- Location: tests/playwright/pos.spec.ts:251:7

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
    112 × waiting for element to be visible, enabled and stable
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
        - generic [ref=e12]: 12:45 pm
        - button "Orders" [ref=e13]
        - button "Till counter" [ref=e17]
        - generic [ref=e20]:
          - generic [ref=e21]:
            - heading "Till Counter" [level=2] [ref=e22]
            - generic [ref=e23]:
              - button "Clear" [ref=e24]
              - button "Close" [ref=e25]
          - generic [ref=e29]:
            - generic [ref=e30]:
              - generic [ref=e31]: GH₵ 200
              - spinbutton "0" [ref=e33]
              - generic [ref=e34]: =
              - generic [ref=e35]: —
            - generic [ref=e36]:
              - generic [ref=e37]: GH₵ 100
              - spinbutton "0" [ref=e39]
              - generic [ref=e40]: =
              - generic [ref=e41]: —
            - generic [ref=e42]:
              - generic [ref=e43]: GH₵ 50
              - spinbutton "0" [ref=e45]
              - generic [ref=e46]: =
              - generic [ref=e47]: —
            - generic [ref=e48]:
              - generic [ref=e49]: GH₵ 20
              - spinbutton "0" [ref=e51]
              - generic [ref=e52]: =
              - generic [ref=e53]: —
            - generic [ref=e54]:
              - generic [ref=e55]: GH₵ 10
              - spinbutton "0" [ref=e57]
              - generic [ref=e58]: =
              - generic [ref=e59]: —
            - generic [ref=e60]:
              - generic [ref=e61]: GH₵ 5
              - spinbutton "0" [ref=e63]
              - generic [ref=e64]: =
              - generic [ref=e65]: —
            - generic [ref=e66]:
              - generic [ref=e67]: GH₵ 1
              - spinbutton "0" [ref=e69]
              - generic [ref=e70]: =
              - generic [ref=e71]: —
          - generic [ref=e73]:
            - generic [ref=e74]: Total
            - generic [ref=e75]: GH₵ 0.00
        - button "Dashboard" [ref=e76]
        - generic [ref=e82]:
          - generic [ref=e83]: T
          - generic [ref=e85]: Test Cashier (Playwright)
        - button "Sign out" [ref=e87]
    - generic [ref=e91]:
      - region "Order panel" [ref=e92]:
        - generic [ref=e93]: Order
        - generic [ref=e104]:
          - paragraph [ref=e105]: Empty order
          - paragraph [ref=e106]: Tap a product to begin
        - generic [ref=e107]:
          - paragraph [ref=e109]: Numpad
          - generic [ref=e110]:
            - button "1" [ref=e111]
            - button "2" [ref=e112]
            - button "3" [ref=e113]
            - button "Qty" [ref=e114]
            - button "4" [ref=e115]
            - button "5" [ref=e116]
            - button "6" [ref=e117]
            - button "Disc" [ref=e118]
            - button "7" [ref=e119]
            - button "8" [ref=e120]
            - button "9" [ref=e121]
            - button "Price" [ref=e122]
            - button "00" [ref=e123]
            - button "0" [ref=e124]
            - button "." [ref=e125]
            - button "Backspace" [ref=e126]
        - button "Pay —" [disabled] [ref=e132]:
          - generic [ref=e133]: Pay
          - generic [ref=e134]: —
      - region "Product browser" [ref=e137]:
        - generic [ref=e138]:
          - generic [ref=e139]: Search products
          - textbox "Search products" [ref=e141]:
            - /placeholder: Search products…
        - generic [ref=e143]:
          - button "All" [ref=e144]
          - button "Beef" [ref=e145]
          - button "Fish & Seafood" [ref=e146]
          - button "Poultry" [ref=e147]
          - button "Processed Meat" [ref=e148]
        - generic [ref=e150]:
          - button "BEEF LIPS BEEF LIPS GH₵46.00 /kg 3.50 kg left" [active] [ref=e151] [cursor=pointer]:
            - img "BEEF LIPS" [ref=e152]
            - generic [ref=e153]:
              - paragraph [ref=e154]: BEEF LIPS
              - generic [ref=e155]:
                - generic [ref=e156]: GH₵46.00
                - generic [ref=e157]: /kg
              - paragraph [ref=e158]: 3.50 kg left
          - button "BEEF MASK BEEF MASK GH₵43.00 /kg Out of stock" [disabled] [ref=e159]:
            - img "BEEF MASK" [ref=e160]
            - generic [ref=e161]:
              - paragraph [ref=e162]: BEEF MASK
              - generic [ref=e163]:
                - generic [ref=e164]: GH₵43.00
                - generic [ref=e165]: /kg
              - paragraph [ref=e166]: Out of stock
          - button "BEEF SINEWS AGRA BEEF SINEWS AGRA GH₵40.00 /kg Out of stock" [disabled] [ref=e167]:
            - img "BEEF SINEWS AGRA" [ref=e168]
            - generic [ref=e169]:
              - paragraph [ref=e170]: BEEF SINEWS AGRA
              - generic [ref=e171]:
                - generic [ref=e172]: GH₵40.00
                - generic [ref=e173]: /kg
              - paragraph [ref=e174]: Out of stock
          - button "BEEF THROAT BEEF THROAT GH₵40.00 /kg Out of stock" [disabled] [ref=e175]:
            - img "BEEF THROAT" [ref=e176]
            - generic [ref=e177]:
              - paragraph [ref=e178]: BEEF THROAT
              - generic [ref=e179]:
                - generic [ref=e180]: GH₵40.00
                - generic [ref=e181]: /kg
              - paragraph [ref=e182]: Out of stock
          - button "BEEF TRIPES-PLATE BEEF TRIPES-PLATE GH₵41.00 /kg Out of stock" [disabled] [ref=e183]:
            - img "BEEF TRIPES-PLATE" [ref=e184]
            - generic [ref=e185]:
              - paragraph [ref=e186]: BEEF TRIPES-PLATE
              - generic [ref=e187]:
                - generic [ref=e188]: GH₵41.00
                - generic [ref=e189]: /kg
              - paragraph [ref=e190]: Out of stock
          - button "BIG BEEF SAUSAGE BIG BEEF SAUSAGE GH₵40.00 /pieces Out of stock" [disabled] [ref=e191]:
            - img "BIG BEEF SAUSAGE" [ref=e192]
            - generic [ref=e193]:
              - paragraph [ref=e194]: BIG BEEF SAUSAGE
              - generic [ref=e195]:
                - generic [ref=e196]: GH₵40.00
                - generic [ref=e197]: /pieces
              - paragraph [ref=e198]: Out of stock
          - button "CASSAVA FISH CASSAVA FISH GH₵48.00 /kg 18.00 kg" [ref=e199] [cursor=pointer]:
            - img "CASSAVA FISH" [ref=e200]
            - generic [ref=e201]:
              - paragraph [ref=e202]: CASSAVA FISH
              - generic [ref=e203]:
                - generic [ref=e204]: GH₵48.00
                - generic [ref=e205]: /kg
              - paragraph [ref=e206]: 18.00 kg
          - button "CHICKEN BACKS - SOFT CHICKEN BACKS - SOFT GH₵26.00 /kg 20.00 kg" [ref=e207] [cursor=pointer]:
            - img "CHICKEN BACKS - SOFT" [ref=e208]
            - generic [ref=e209]:
              - paragraph [ref=e210]: CHICKEN BACKS - SOFT
              - generic [ref=e211]:
                - generic [ref=e212]: GH₵26.00
                - generic [ref=e213]: /kg
              - paragraph [ref=e214]: 20.00 kg
          - button "CHICKEN BREAST CHICKEN BREAST GH₵140.00 /pieces 14 pieces" [ref=e215] [cursor=pointer]:
            - img "CHICKEN BREAST" [ref=e216]
            - generic [ref=e217]:
              - paragraph [ref=e218]: CHICKEN BREAST
              - generic [ref=e219]:
                - generic [ref=e220]: GH₵140.00
                - generic [ref=e221]: /pieces
              - paragraph [ref=e222]: 14 pieces
          - button "CHICKEN FEET CHICKEN FEET GH₵28.00 /kg Out of stock" [disabled] [ref=e223]:
            - img "CHICKEN FEET" [ref=e224]
            - generic [ref=e225]:
              - paragraph [ref=e226]: CHICKEN FEET
              - generic [ref=e227]:
                - generic [ref=e228]: GH₵28.00
                - generic [ref=e229]: /kg
              - paragraph [ref=e230]: Out of stock
          - button "CHICKEN THIGHS - HARD CHICKEN THIGHS - HARD GH₵45.00 /kg 20.00 kg" [ref=e231] [cursor=pointer]:
            - img "CHICKEN THIGHS - HARD" [ref=e232]
            - generic [ref=e233]:
              - paragraph [ref=e234]: CHICKEN THIGHS - HARD
              - generic [ref=e235]:
                - generic [ref=e236]: GH₵45.00
                - generic [ref=e237]: /kg
              - paragraph [ref=e238]: 20.00 kg
          - button "CHICKEN THIGHS - SOFT CHICKEN THIGHS - SOFT GH₵36.00 /kg 20.00 kg" [ref=e239] [cursor=pointer]:
            - img "CHICKEN THIGHS - SOFT" [ref=e240]
            - generic [ref=e241]:
              - paragraph [ref=e242]: CHICKEN THIGHS - SOFT
              - generic [ref=e243]:
                - generic [ref=e244]: GH₵36.00
                - generic [ref=e245]: /kg
              - paragraph [ref=e246]: 20.00 kg
          - button "CHICKEN WINGS (SOFT) CHICKEN WINGS (SOFT) GH₵57.00 /kg Out of stock" [disabled] [ref=e247]:
            - img "CHICKEN WINGS (SOFT)" [ref=e248]
            - generic [ref=e249]:
              - paragraph [ref=e250]: CHICKEN WINGS (SOFT)
              - generic [ref=e251]:
                - generic [ref=e252]: GH₵57.00
                - generic [ref=e253]: /kg
              - paragraph [ref=e254]: Out of stock
          - button "COW LEG COW LEG GH₵34.00 /kg Out of stock" [disabled] [ref=e255]:
            - img "COW LEG" [ref=e256]
            - generic [ref=e257]:
              - paragraph [ref=e258]: COW LEG
              - generic [ref=e259]:
                - generic [ref=e260]: GH₵34.00
                - generic [ref=e261]: /kg
              - paragraph [ref=e262]: Out of stock
          - button "DRUMSTICKS DRUMSTICKS GH₵40.00 /kg 20.00 kg" [ref=e263] [cursor=pointer]:
            - img "DRUMSTICKS" [ref=e264]
            - generic [ref=e265]:
              - paragraph [ref=e266]: DRUMSTICKS
              - generic [ref=e267]:
                - generic [ref=e268]: GH₵40.00
                - generic [ref=e269]: /kg
              - paragraph [ref=e270]: 20.00 kg
          - button "GIZZARD GH₵40.00 /kg 20.00 kg" [ref=e271] [cursor=pointer]:
            - generic [aria-hidden] [ref=e273]: G
            - generic [ref=e274]:
              - paragraph [ref=e275]: GIZZARD
              - generic [ref=e276]:
                - generic [ref=e277]: GH₵40.00
                - generic [ref=e278]: /kg
              - paragraph [ref=e279]: 20.00 kg
          - button "HAKE GH₵38.00 /kg 20.00 kg" [ref=e280] [cursor=pointer]:
            - generic [aria-hidden] [ref=e282]: H
            - generic [ref=e283]:
              - paragraph [ref=e284]: HAKE
              - generic [ref=e285]:
                - generic [ref=e286]: GH₵38.00
                - generic [ref=e287]: /kg
              - paragraph [ref=e288]: 20.00 kg
          - button "HEN WINGS - HARD GH₵55.00 /kg Out of stock" [disabled] [ref=e289]:
            - generic [aria-hidden] [ref=e291]: H
            - generic [ref=e292]:
              - paragraph [ref=e293]: HEN WINGS - HARD
              - generic [ref=e294]:
                - generic [ref=e295]: GH₵55.00
                - generic [ref=e296]: /kg
              - paragraph [ref=e297]: Out of stock
          - button "KPALA 16+ GH₵39.00 /kg 20.00 kg" [ref=e298] [cursor=pointer]:
            - generic [aria-hidden] [ref=e300]: K
            - generic [ref=e301]:
              - paragraph [ref=e302]: KPALA 16+
              - generic [ref=e303]:
                - generic [ref=e304]: GH₵39.00
                - generic [ref=e305]: /kg
              - paragraph [ref=e306]: 20.00 kg
          - button "KPALA 20+ GH₵43.00 /kg 20.00 kg" [ref=e307] [cursor=pointer]:
            - generic [aria-hidden] [ref=e309]: K
            - generic [ref=e310]:
              - paragraph [ref=e311]: KPALA 20+
              - generic [ref=e312]:
                - generic [ref=e313]: GH₵43.00
                - generic [ref=e314]: /kg
              - paragraph [ref=e315]: 20.00 kg
          - button "KPALA 25+ GH₵48.00 /kg 40.00 kg" [ref=e316] [cursor=pointer]:
            - generic [aria-hidden] [ref=e318]: K
            - generic [ref=e319]:
              - paragraph [ref=e320]: KPALA 25+
              - generic [ref=e321]:
                - generic [ref=e322]: GH₵48.00
                - generic [ref=e323]: /kg
              - paragraph [ref=e324]: 40.00 kg
          - button "LOCAL SALMON 20+ GH₵45.00 /kg 20.00 kg" [ref=e325] [cursor=pointer]:
            - generic [aria-hidden] [ref=e327]: L
            - generic [ref=e328]:
              - paragraph [ref=e329]: LOCAL SALMON 20+
              - generic [ref=e330]:
                - generic [ref=e331]: GH₵45.00
                - generic [ref=e332]: /kg
              - paragraph [ref=e333]: 20.00 kg
          - button "LOCAL SALMON 25+ GH₵48.00 /kg 20.00 kg" [ref=e334] [cursor=pointer]:
            - generic [aria-hidden] [ref=e336]: L
            - generic [ref=e337]:
              - paragraph [ref=e338]: LOCAL SALMON 25+
              - generic [ref=e339]:
                - generic [ref=e340]: GH₵48.00
                - generic [ref=e341]: /kg
              - paragraph [ref=e342]: 20.00 kg
          - button "RED FISH GH₵67.00 /kg 20.00 kg" [ref=e343] [cursor=pointer]:
            - generic [aria-hidden] [ref=e345]: R
            - generic [ref=e346]:
              - paragraph [ref=e347]: RED FISH
              - generic [ref=e348]:
                - generic [ref=e349]: GH₵67.00
                - generic [ref=e350]: /kg
              - paragraph [ref=e351]: 20.00 kg
          - button "SAADIA SAUSAGE GH₵22.00 /pieces 48 pieces" [ref=e352] [cursor=pointer]:
            - generic [aria-hidden] [ref=e354]: S
            - generic [ref=e355]:
              - paragraph [ref=e356]: SAADIA SAUSAGE
              - generic [ref=e357]:
                - generic [ref=e358]: GH₵22.00
                - generic [ref=e359]: /pieces
              - paragraph [ref=e360]: 48 pieces
          - button "SEARA SAUSAGE GH₵20.00 /pieces 48 pieces" [ref=e361] [cursor=pointer]:
            - generic [aria-hidden] [ref=e363]: S
            - generic [ref=e364]:
              - paragraph [ref=e365]: SEARA SAUSAGE
              - generic [ref=e366]:
                - generic [ref=e367]: GH₵20.00
                - generic [ref=e368]: /pieces
              - paragraph [ref=e369]: 48 pieces
          - button "TILAPIA TILAPIA GH₵60.00 /kg 33.00 kg" [ref=e370] [cursor=pointer]:
            - img "TILAPIA" [ref=e371]
            - generic [ref=e372]:
              - paragraph [ref=e373]: TILAPIA
              - generic [ref=e374]:
                - generic [ref=e375]: GH₵60.00
                - generic [ref=e376]: /kg
              - paragraph [ref=e377]: 33.00 kg
          - button "TURKEY WINGS GH₵67.00 /kg 20.00 kg" [ref=e378] [cursor=pointer]:
            - generic [aria-hidden] [ref=e380]: T
            - generic [ref=e381]:
              - paragraph [ref=e382]: TURKEY WINGS
              - generic [ref=e383]:
                - generic [ref=e384]: GH₵67.00
                - generic [ref=e385]: /kg
              - paragraph [ref=e386]: 20.00 kg
  - alert [ref=e387]
```

# Test source

```ts
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
> 254 |     await page.getByRole("button", { name: /^pay/i }).click();
      |                                                       ^ Error: locator.click: Test timeout of 60000ms exceeded.
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
  339 |     await expect(receipt).toBeVisible({ timeout: 10_000 });
  340 |     await expect(receipt.getByText("BEEF LIPS")).toBeVisible();
  341 |     await expect(receipt.getByText("TOTAL")).toBeVisible();
  342 |     await page.screenshot({ path: "tests/playwright/screenshots/6.2-receipt-direct.png" });
  343 |     await receipt.screenshot({ path: "tests/playwright/screenshots/6.2-receipt-paper.png" });
  344 |   });
  345 | });
  346 | 
```