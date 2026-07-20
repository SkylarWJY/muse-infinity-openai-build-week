import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: ".",
  timeout: 45_000,
  expect: { timeout: 12_000 },
  fullyParallel: false,
  reporter: "line",
  use: {
    baseURL: "http://127.0.0.1:4175",
    headless: true,
    screenshot: "only-on-failure",
    trace: "retain-on-failure"
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
