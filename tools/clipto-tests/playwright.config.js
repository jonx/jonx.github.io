import { fileURLToPath } from "node:url";
import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "./tests",
  outputDir: fileURLToPath(new URL("./test-results/", import.meta.url)),
  fullyParallel: true,
  workers: 2,
  use: {
    baseURL: "http://127.0.0.1:8812",
    viewport: { width: 1400, height: 1100 },
  },
  projects: [
    { name: "chromium", use: { browserName: "chromium" } },
    { name: "webkit", use: { browserName: "webkit" } },
  ],
  webServer: {
    command: "python3 -m http.server 8812 --bind 127.0.0.1 --directory ../..",
    url: "http://127.0.0.1:8812/clipto/",
    reuseExistingServer: false,
  },
});
