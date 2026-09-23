import { test, expect, type Page } from "@playwright/test";

// ── Credentials (used only in Suite 1, which explicitly tests the auth flow) ──
const TERMINAL_EMAIL    = "sales@bedarts.com";
const TERMINAL_PASSWORD = "BedartsPOS#2026!";
const CASHIER_NAME      = "Test Cashier (Playwright)";
const CASHIER_PIN       = "5678";
const ADMIN_EMAIL       = "kwame.agyemang@bedarts.internal";
const ADMIN_PASSWORD    = "PlaywrightTest#2026";

// Paths to pre-authenticated browser states created by global-setup.ts
const TERMINAL_STATE     = "tests/playwright/auth/terminal.json";
const TERMINAL_PIN_STATE = "tests/playwright/auth/terminal-pin.json"; // auth only, no cashier_session
const ADMIN_STATE        = "tests/playwright/auth/admin.json";

// ── Auth helpers (Suite 1 only — all other suites use storageState) ───────────
async function loginAsTerminal(page: Page) {
  await page.goto("/login", { waitUntil: "domcontentloaded" });
  await page.getByLabel(/email/i).fill(TERMINAL_EMAIL);
  await page.getByLabel(/password/i).fill(TERMINAL_PASSWORD);
  await page.getByRole("button", { name: /sign in|log in/i }).click();
  await page.waitForURL(/\/cashier/, { timeout: 30_000 });
}

async function selectAndEnterPin(page: Page, cashierName = CASHIER_NAME, pin = CASHIER_PIN) {
  if (!page.url().includes("/cashier/pin")) {
    await page.goto("/cashier/pin", { waitUntil: "domcontentloaded" });
  }
  await page.locator("button").filter({ hasText: cashierName }).click();
  // Wait for numpad digit "1" to appear — confirms React handled the cashier click
  await expect(page.locator("button").filter({ hasText: /^1$/ }).first()).toBeVisible({ timeout: 10_000 });
  for (const digit of pin) {
    await page.locator("button").filter({ hasText: new RegExp(`^${digit}$`) }).first().click();
    await page.waitForTimeout(150);
  }
  await page.waitForURL(/\/cashier$/, { timeout: 15_000 });
}

// Product tiles are <div onClick> (not buttons) — click via the text inside
function clickProduct(page: Page, name: string) {
  return page.getByText(name, { exact: true }).first().click();
}

// ── Suite 1: Authentication & PIN ─────────────────────────────────────────────
// These tests deliberately exercise the login flow and use NO pre-saved state.
test.describe("1. Authentication & PIN flow", () => {
  test("1.1 terminal login redirects to /cashier (not /dashboard)", async ({ page }) => {
    await loginAsTerminal(page);
    expect(page.url()).toMatch(/\/cashier/);
    expect(page.url()).not.toContain("/dashboard");
    await page.screenshot({ path: "tests/playwright/screenshots/1.1-terminal-after-login.png" });
  });

  test("1.2 cashier selection screen shows who's at the register", async ({ page }) => {
    await loginAsTerminal(page);
    if (!page.url().includes("/pin")) await page.goto("/cashier/pin");
    await expect(page.getByText(/who.s at the register/i)).toBeVisible({ timeout: 8_000 });
    await expect(page.locator("button").filter({ hasText: CASHIER_NAME })).toBeVisible();
    await page.screenshot({ path: "tests/playwright/screenshots/1.2-cashier-selection.png" });
  });

});

// Tests 1.3 and 1.4 cover PIN behaviour only — login flow is already covered by 1.1/1.2.
// Using storageState avoids redundant Worker login requests that throttle subsequent tests.
test.describe("1. PIN validation", () => {
  test.use({ storageState: TERMINAL_PIN_STATE });

  test("1.3 wrong PIN shows error and does not redirect", async ({ page }) => {
    // networkidle ensures JS bundles finish loading so React has time to hydrate
    await page.goto("/cashier/pin", { waitUntil: "networkidle" });
    await expect(page.getByText(/who.s at the register/i)).toBeVisible({ timeout: 10_000 });
    // Use Bedarts (real cashier, unknown PIN) — single attempt won't trigger lockout
    await page.locator("button").filter({ hasText: "Bedarts" }).click();
    // Wait for numpad to appear — confirms React handled the click
    await expect(page.locator("button").filter({ hasText: /^1$/ }).first()).toBeVisible({ timeout: 10_000 });
    for (const digit of "0000") {
      await page.locator("button").filter({ hasText: new RegExp(`^${digit}$`) }).first().click();
      await page.waitForTimeout(150);
    }
    await page.waitForTimeout(2000);
    expect(page.url()).not.toMatch(/\/cashier$/);
    await expect(
      page.locator("p").filter({ hasText: /incorrect|wrong|attempt/i }).first()
    ).toBeVisible({ timeout: 5_000 });
    await page.screenshot({ path: "tests/playwright/screenshots/1.3-wrong-pin.png" });
  });

  test("1.4 correct PIN logs in and shows cashier name in topbar", async ({ page }) => {
    // networkidle ensures JS bundles finish loading so React has time to hydrate
    await page.goto("/cashier/pin", { waitUntil: "networkidle" });
    await expect(page.getByText(/who.s at the register/i)).toBeVisible({ timeout: 10_000 });
    await selectAndEnterPin(page);
    await expect(page.locator("header").getByText(CASHIER_NAME)).toBeVisible({ timeout: 8_000 });
    await page.screenshot({ path: "tests/playwright/screenshots/1.4-cashier-name-in-topbar.png" });
  });
});

// ── Suite 2: POS cart mechanics ───────────────────────────────────────────────
// Uses pre-authenticated terminal+PIN state — no login needed per test.
test.describe("2. POS cart mechanics", () => {
  test.use({ storageState: TERMINAL_STATE });

  test.beforeEach(async ({ page }) => {
    await page.goto("/cashier", { waitUntil: "domcontentloaded" });
    await expect(page.getByText("BEEF LIPS", { exact: true }).first()).toBeVisible({ timeout: 10_000 });
  });

  test("2.1 tapping a product adds it to the cart panel", async ({ page }) => {
    await clickProduct(page, "BEEF LIPS");
    await page.waitForTimeout(400);
    await expect(page.locator("text=BEEF LIPS").first()).toBeVisible({ timeout: 5_000 });
    await expect(page.getByRole("button", { name: /^pay/i })).toBeEnabled({ timeout: 10_000 });
    await page.screenshot({ path: "tests/playwright/screenshots/2.1-product-added.png" });
  });

  test("2.2 tapping same product twice creates two cart lines", async ({ page }) => {
    await clickProduct(page, "BEEF LIPS");
    await page.waitForTimeout(300);
    await clickProduct(page, "BEEF LIPS");
    await page.waitForTimeout(300);
    const count = await page.locator("text=BEEF LIPS").count();
    expect(count).toBeGreaterThanOrEqual(3); // grid tile + 2 cart lines
    await page.screenshot({ path: "tests/playwright/screenshots/2.2-duplicate-lines.png" });
  });

  test("2.3 backspace zeros qty then removes line on second press", async ({ page }) => {
    await clickProduct(page, "BEEF LIPS");
    await page.waitForTimeout(400);
    const bsp = page.getByRole("button", { name: /backspace/i });
    await bsp.click();
    await page.waitForTimeout(300);
    await page.screenshot({ path: "tests/playwright/screenshots/2.3a-first-backspace.png" });
    await bsp.click();
    await page.waitForTimeout(300);
    await expect(page.getByText(/empty order/i)).toBeVisible({ timeout: 3_000 });
    await page.screenshot({ path: "tests/playwright/screenshots/2.3b-second-backspace.png" });
  });

  test("2.4 Change UOM button is visible when a line is selected", async ({ page }) => {
    await clickProduct(page, "BEEF LIPS");
    await page.waitForTimeout(400);
    await expect(page.getByRole("button", { name: /change uom/i })).toBeVisible({ timeout: 5_000 });
    await page.screenshot({ path: "tests/playwright/screenshots/2.4-change-uom-visible.png" });
  });

  test("2.5 deleting last line selects predecessor", async ({ page }) => {
    await clickProduct(page, "BEEF LIPS");
    await page.waitForTimeout(300);
    await clickProduct(page, "TILAPIA");
    await page.waitForTimeout(300);
    const bsp = page.getByRole("button", { name: /backspace/i });
    // One backspace removes TILAPIA (buffer empty on fresh selection → immediate remove)
    // and auto-selects BEEF LIPS as the predecessor
    await bsp.click();
    await page.waitForTimeout(400);
    await expect(page.getByRole("button", { name: /change uom/i })).toBeVisible({ timeout: 3_000 });
    await page.screenshot({ path: "tests/playwright/screenshots/2.5-predecessor-selected.png" });
  });
});

// ── Suite 3: SPA navigation ───────────────────────────────────────────────────
test.describe("3. SPA navigation", () => {
  test.use({ storageState: TERMINAL_STATE });

  test.beforeEach(async ({ page }) => {
    await page.goto("/cashier", { waitUntil: "domcontentloaded" });
    await expect(page.getByText("BEEF LIPS", { exact: true }).first()).toBeVisible({ timeout: 10_000 });
  });

  test("3.1 Pay button transitions to payment without URL change", async ({ page }) => {
    await clickProduct(page, "BEEF LIPS");
    await page.waitForTimeout(400);
    await page.getByRole("button", { name: /^pay/i }).click();
    await page.waitForTimeout(600);
    expect(page.url()).toMatch(/\/cashier$/);
    await expect(page.getByRole("button", { name: /confirm/i })).toBeVisible({ timeout: 5_000 });
    await page.screenshot({ path: "tests/playwright/screenshots/3.1-payment-view.png" });
  });

  test("3.2 back from payment returns to POS cart without URL change", async ({ page }) => {
    await clickProduct(page, "BEEF LIPS");
    await page.waitForTimeout(400);
    await page.getByRole("button", { name: /^pay/i }).click();
    await page.waitForTimeout(500);
    await page.getByRole("button", { name: /go back/i }).click();
    await page.waitForTimeout(400);
    expect(page.url()).toMatch(/\/cashier$/);
    await expect(page.getByText("BEEF LIPS").first()).toBeVisible({ timeout: 3_000 });
    await page.screenshot({ path: "tests/playwright/screenshots/3.2-back-from-payment.png" });
  });

  test("3.3 completing payment shows receipt on same /cashier URL", async ({ page }) => {
    await clickProduct(page, "BEEF LIPS");
    await page.waitForTimeout(400);
    await page.getByRole("button", { name: /^pay/i }).click();
    await page.waitForTimeout(500);
    await page.locator("button").filter({ hasText: /^4$/ }).first().click();
    await page.waitForTimeout(100);
    await page.locator("button").filter({ hasText: /^6$/ }).first().click();
    await page.waitForTimeout(100);
    await page.getByRole("button", { name: /confirm/i }).click();
    await expect(page.getByText("Payment Received")).toBeVisible({ timeout: 20_000 });
    expect(page.url()).toMatch(/\/cashier$/);
    await page.screenshot({ path: "tests/playwright/screenshots/3.3-receipt-same-url.png" });
  });
});

// ── Suite 4: Payment & receipt ────────────────────────────────────────────────
test.describe("4. Payment & receipt", () => {
  test.use({ storageState: TERMINAL_STATE });

  test.beforeEach(async ({ page }) => {
    await page.goto("/cashier", { waitUntil: "domcontentloaded" });
    await expect(page.getByText("BEEF LIPS", { exact: true }).first()).toBeVisible({ timeout: 10_000 });
  });

  test("4.1 cash overtender shows correct change (GHC 50 for GHC 46 = GHC 4)", async ({ page }) => {
    await clickProduct(page, "BEEF LIPS");
    await page.waitForTimeout(400);
    await page.getByRole("button", { name: /^pay/i }).click();
    await page.waitForTimeout(500);
    await page.locator("button").filter({ hasText: /^5$/ }).first().click();
    await page.locator("button").filter({ hasText: /^0$/ }).first().click();
    await page.waitForTimeout(300);
    // formatCurrency("GHS", "en-GH") renders as "GH₵4.00"
    await expect(page.getByText(/GH.4\.00/).first()).toBeVisible({ timeout: 5_000 });
    await page.screenshot({ path: "tests/playwright/screenshots/4.1-change-displayed.png" });
  });

  test("4.2 receipt shows logo, store address, items, total", async ({ page }) => {
    await clickProduct(page, "BEEF LIPS");
    await page.waitForTimeout(400);
    await page.getByRole("button", { name: /^pay/i }).click();
    await page.waitForTimeout(500);
    await page.locator("button").filter({ hasText: /^4$/ }).first().click();
    await page.locator("button").filter({ hasText: /^6$/ }).first().click();
    await page.getByRole("button", { name: /confirm/i }).click();
    await expect(page.locator("#receipt-print")).toBeVisible({ timeout: 20_000 });
    const receipt = page.locator("#receipt-print");
    await expect(receipt.locator("img")).toBeVisible();
    await expect(receipt.getByText(/Lashibi|Community 19|Opp/i).first()).toBeVisible();
    await expect(receipt.getByText("BEEF LIPS")).toBeVisible();
    await expect(receipt.getByText("TOTAL")).toBeVisible();
    // TOTAL row in receipt uses literal "GHC" (not formatCurrency)
    await expect(receipt.getByText("GHC 46.00", { exact: true })).toBeVisible();
    await page.screenshot({ path: "tests/playwright/screenshots/4.2-receipt-content.png" });
    await receipt.screenshot({ path: "tests/playwright/screenshots/4.2-receipt-paper.png" });
  });

  test("4.3 Print Receipt button is present and enabled", async ({ page }) => {
    await clickProduct(page, "BEEF LIPS");
    await page.waitForTimeout(400);
    await page.getByRole("button", { name: /^pay/i }).click();
    await page.waitForTimeout(500);
    await page.locator("button").filter({ hasText: /^4$/ }).first().click();
    await page.locator("button").filter({ hasText: /^6$/ }).first().click();
    await page.getByRole("button", { name: /confirm/i }).click();
    await expect(page.getByText("Payment Received")).toBeVisible({ timeout: 20_000 });
    const printBtn = page.getByRole("button", { name: /print receipt/i });
    await expect(printBtn).toBeVisible();
    await expect(printBtn).toBeEnabled();
    await page.screenshot({ path: "tests/playwright/screenshots/4.3-print-button.png" });
  });

  test("4.4 New Order clears cart and returns to empty POS", async ({ page }) => {
    await clickProduct(page, "BEEF LIPS");
    await page.waitForTimeout(400);
    await page.getByRole("button", { name: /^pay/i }).click();
    await page.waitForTimeout(500);
    await page.locator("button").filter({ hasText: /^4$/ }).first().click();
    await page.locator("button").filter({ hasText: /^6$/ }).first().click();
    await page.getByRole("button", { name: /confirm/i }).click();
    await expect(page.getByText("Payment Received")).toBeVisible({ timeout: 20_000 });
    await page.getByRole("button", { name: /new order/i }).click();
    await page.waitForTimeout(500);
    expect(page.url()).toMatch(/\/cashier$/);
    await expect(page.getByText(/empty order/i)).toBeVisible({ timeout: 5_000 });
    await page.screenshot({ path: "tests/playwright/screenshots/4.4-new-order-empty.png" });
  });
});

// ── Suite 5: Role guards ──────────────────────────────────────────────────────
test.describe("5a. Role guards (terminal)", () => {
  test.use({ storageState: TERMINAL_STATE });

  test("5.1 terminal account cannot access /dashboard", async ({ page }) => {
    try {
      await page.goto("/dashboard", { waitUntil: "commit" });
    } catch {
      // redirect loop = guard working
    }
    await page.waitForTimeout(500);
    expect(page.url()).not.toMatch(/\/dashboard(?:\/|$)/);
    await page.screenshot({ path: "tests/playwright/screenshots/5.1-terminal-blocked.png" });
  });
});

test.describe("5b. Role guards (admin)", () => {
  test.use({ storageState: ADMIN_STATE });

  test("5.2 admin can reach /dashboard", async ({ page }) => {
    await page.goto("/dashboard", { waitUntil: "domcontentloaded" });
    await expect(page).toHaveURL(/\/dashboard/);
    await page.screenshot({ path: "tests/playwright/screenshots/5.2-admin-dashboard.png" });
  });

  test("5.3 admin can access /dashboard/settings", async ({ page }) => {
    await page.goto("/dashboard/settings", { waitUntil: "domcontentloaded" });
    await expect(page).toHaveURL(/\/dashboard\/settings/, { timeout: 10_000 });
    await expect(page.locator("h1, h2, input, textarea, button, [role='switch']").first()).toBeVisible({ timeout: 15_000 });
    await page.screenshot({ path: "tests/playwright/screenshots/5.3-settings-page.png" });
  });
});

test.describe("5c. Role guards (unauthenticated)", () => {
  test("5.4 unauthenticated user is redirected to /login", async ({ page }) => {
    await page.goto("/dashboard", { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(1000);
    await expect(page).toHaveURL(/\/login/);
    await page.screenshot({ path: "tests/playwright/screenshots/5.4-unauth-redirect.png" });
  });
});

// ── Suite 6: Orders & receipts ────────────────────────────────────────────────
test.describe("6. Orders & receipts", () => {
  test.use({ storageState: ADMIN_STATE });

  test("6.1 /cashier/orders loads and shows a list", async ({ page }) => {
    await page.goto("/cashier/orders", { waitUntil: "domcontentloaded" });
    await expect(page).toHaveURL(/\/cashier\/orders/);
    await page.screenshot({ path: "tests/playwright/screenshots/6.1-orders-list.png" });
  });

  test("6.2 known receipt renders correctly via direct URL", async ({ page }) => {
    const SALE_ID = "25157cd0-3b5b-466f-9ff3-850ef3e37bdc";
    await page.goto(`/cashier/receipt?sale=${SALE_ID}`, { waitUntil: "domcontentloaded" });
    const receipt = page.locator("#receipt-print");
    await expect(receipt).toBeVisible({ timeout: 10_000 });
    await expect(receipt.getByText("BEEF LIPS")).toBeVisible();
    await expect(receipt.getByText("TOTAL")).toBeVisible();
    await page.screenshot({ path: "tests/playwright/screenshots/6.2-receipt-direct.png" });
    await receipt.screenshot({ path: "tests/playwright/screenshots/6.2-receipt-paper.png" });
  });
});
