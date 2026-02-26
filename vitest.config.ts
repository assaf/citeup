import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "~/": new URL("./", import.meta.url).pathname,
      "~/test/*": "./test/*",
      "prisma/generated": "./prisma/generated",
    },
  },
  test: {
    include: ["test/**/*.test.ts"],
  },
});
