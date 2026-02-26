/**
 * NOTE: Setup code to run only once before all tests.
 */

import { exec, execFile } from "node:child_process";
import { promisify } from "node:util";
import prisma from "~/lib/prisma.server";
import { port } from "./launchBrowser";
import { closeServer, launchServer } from "./launchServer";
import { removeNewHTML } from "./toMatchInnerHTML";
import { removeDiffImages } from "./toMatchScreenshot";

export default async function setup() {
  try {
    const { stdout } = await promisify(execFile)("lsof", [`-ti:${port}`]);
    const pid = stdout.trim().match(/^\s*(\d+)/m)?.[1];
    if (pid) await promisify(exec)(`kill -9 ${pid}`);
  } catch {}

  // Clean up database
  await prisma.account.deleteMany();

  // Remove regression testing diff images
  await removeDiffImages();
  await removeNewHTML();

  // Launch server and start test env MSW handlers
  await launchServer(port);
}

export async function teardown() {
  await promisify(exec)(
    'terminal-notifier -sound default -title "Test Suite" -message "Done!"',
  );
  await closeServer();
}
