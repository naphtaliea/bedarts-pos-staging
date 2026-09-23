import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/playwright",
  globalSetup: "./tests/playwright/global-setup.ts",
  globalTeardown: "./tests/playwright/global-teardown.ts",
  timeout: 60_000,
  workers: 1,
  retries: 2,
  use: {
    baseURL: "https://pos.bedarts.workers.dev",
    headless: true,
    viewport: { width: 1280, height: 800 },
    screenshot: "on",
    video: "off",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"], executablePath: "/usr/bin/chromium-browser" },
    },
  ],
  outputDir: "./tests/playwright/screenshots",
});
