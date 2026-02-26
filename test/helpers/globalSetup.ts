/**
 * NOTE: Setup code to run only once before all tests.
 */

import { exec } from "node:child_process";
import { promisify } from "node:util";
import prisma from "~/lib/prisma.server";

export default async function setup() {
  // Clean up database
  await prisma.account.deleteMany();
}

export async function teardown() {
  await promisify(exec)(
    'terminal-notifier -sound default -title "Test Suite" -message "Done!"',
  );
}
