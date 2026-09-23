import { test, expect } from "@playwright/test";

const SALE_ID = "25157cd0-3b5b-466f-9ff3-850ef3e37bdc";

test.describe("Receipt UI", () => {
  test.use({ storageState: "tests/playwright/auth/admin.json" });

  test("view receipt and verify print content", async ({ page }) => {
    // Navigate directly to the known receipt — no login needed (storageState)
    await page.goto(`/cashier/receipt?sale=${SALE_ID}`, { waitUntil: "domcontentloaded" });

    const receipt = page.locator("#receipt-print");
    await expect(receipt).toBeVisible({ timeout: 10_000 });

    // ── Receipt paper content ─────────────────────────────────────────────
    await expect(receipt.getByText("BEEF LIPS")).toBeVisible();
    await expect(receipt.getByText("TOTAL", { exact: true })).toBeVisible();
    // TOTAL row renders as "GHC {amount}" (exact match avoids matching the unit price line too)
    await expect(receipt.getByText("GHC 46.00", { exact: true })).toBeVisible();

    // ── Sale reference and date ───────────────────────────────────────────
    await expect(receipt.getByText("#25157CD0").last()).toBeVisible();
    await expect(receipt.getByText(/20 Sep 2026/)).toBeVisible();

    // ── Screenshots ───────────────────────────────────────────────────────
    await page.screenshot({ path: "tests/playwright/screenshots/01-receipt-full.png", fullPage: true });
    await receipt.screenshot({ path: "tests/playwright/screenshots/02-receipt-paper.png" });

    // ── Print button is present and clickable ─────────────────────────────
    const printBtn = page.getByRole("button", { name: /print receipt/i });
    await expect(printBtn).toBeVisible();
    await expect(printBtn).toBeEnabled();
  });
});
