import { defineConfig } from "@playwright/test";
import { fileURLToPath } from "node:url";

const projectRoot = fileURLToPath(new URL("..", import.meta.url));
const port = process.env.MUSE_E2E_PORT || "4175";
const baseURL = process.env.MUSE_E2E_BASE_URL || `http://127.0.0.1:${port}`;

export default defineConfig({
  testDir: ".",
  timeout: 120_000,
  expect: { timeout: 12_000 },
  fullyParallel: false,
  workers: 1,
  reporter: "line",
  use: {
    baseURL,
    headless: true,
    screenshot: "only-on-failure",
    trace: "off"
  },
  webServer: {
    command: "node server.mjs",
    cwd: projectRoot,
    url: `${baseURL}/api/status`,
    reuseExistingServer: true,
    timeout: 15_000,
    env: {
      PORT: port,
      HOST: "127.0.0.1",
      OPENAI_API_KEY: "",
      WORLDLABS_API_KEY: "",
      INTEGRATION_ADMIN_TOKEN: ""
    }
  },
  projects: [{ name: "chromium", use: { browserName: "chromium" } }]
});
