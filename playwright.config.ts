import { defineConfig, devices } from "@playwright/test";
import { port } from "./test/helpers/launchBrowser";

export default defineConfig({
  globalSetup: "test/helpers/setupGlobal.ts",
  testDir: "test/e2e",
  testMatch: /.*\.test\.ts$/,
  use: {
    baseURL: `http://localhost:${port}`,
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
