/**
 * NOTE: Setup code to run before every test suite.
 */

import * as Sentry from "@sentry/react-router";
import { afterAll, beforeAll } from "vitest";
import prisma from "~/lib/prisma.server";
import "./trimConsole";

Sentry.init({ enabled: false });

beforeAll(async () => {
  // Cleanup database
  await prisma.account.deleteMany();
});

afterAll(async () => {
  await prisma.$disconnect();
  // Must run with NODE_OPTIONS="--expose-gc"
  if ("gc" in global && global.gc) global.gc();
});
