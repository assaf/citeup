import { defineConfig, devices } from "@playwright/test";
import debug from "debug";
import { port } from "./test/helpers/launchBrowser";

export default defineConfig({
  testDir: "./test/e2e",
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
  webServer: {
    command: `pnpm dev --port ${port}`,
    port,
    env: {
      NODE_ENV: "test",
      PORT: port.toString(),
      VITE_TEST_MODE: "1",
    },
    reuseExistingServer: !process.env.CI,
    stdout: debug.enabled("server") ? "pipe" : "ignore",
    stderr: debug.enabled("server") ? "pipe" : "ignore",
  },
});
