import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: ".",
  timeout: 120_000,
  expect: { timeout: 12_000 },
  fullyParallel: false,
  workers: 1,
  reporter: "line",
  use: {
    baseURL: "http://127.0.0.1:4175",
    headless: true,
    screenshot: "only-on-failure",
    trace: "off"
  },
  webServer: {
    command: "node ../server.mjs",
    cwd: "./e2e",
    url: "http://127.0.0.1:4175/api/status",
    reuseExistingServer: true,
    timeout: 15_000,
    env: { PORT: "4175" }
  },
  projects: [{ name: "chromium", use: { browserName: "chromium" } }]
});
