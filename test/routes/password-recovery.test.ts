import { expect } from "@playwright/test";
import { beforeAll, describe, it } from "vitest";
import { hashPassword } from "~/lib/auth.server";
import prisma from "~/lib/prisma.server";
import { goto, port } from "../helpers/launchBrowser";

const EMAIL = "recovery-test@example.com";
const PASSWORD = "test-password-123";

describe("password recovery route", () => {
  beforeAll(async () => {
    const passwordHash = await hashPassword(PASSWORD);
    const account = await prisma.account.create({ data: {} });
    await prisma.user.create({
      data: { email: EMAIL, passwordHash, accountId: account.id },
    });
  });

  it("shows the recovery form", async () => {
    const page = await goto("/password-recovery");
    await expect(page.getByLabel("Email")).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Send recovery link" }),
    ).toBeVisible();
  });

  it("shows confirmation for unknown email without creating a token", async () => {
    const page = await goto("/password-recovery");
    await page.getByLabel("Email").fill("nobody@example.com");
    await page.getByRole("button", { name: "Send recovery link" }).click();
    await expect(page.getByText("Check your email")).toBeVisible();
    const count = await prisma.passwordRecoveryToken.count({
      where: { user: { email: "nobody@example.com" } },
    });
    expect(count).toBe(0);
  });

  it("shows confirmation for known email and creates a recovery token", async () => {
    const page = await goto("/password-recovery");
    await page.getByLabel("Email").fill(EMAIL);
    await page.getByRole("button", { name: "Send recovery link" }).click();
    await expect(page.getByText("Check your email")).toBeVisible();
    const token = await prisma.passwordRecoveryToken.findFirst({
      where: { user: { email: EMAIL } },
      orderBy: { createdAt: "desc" },
    });
    expect(token).not.toBeNull();
    expect(token?.usedAt).toBeNull();
  });

  it("valid reset link signs user in and redirects to home", async () => {
    const token = await prisma.passwordRecoveryToken.findFirst({
      where: { user: { email: EMAIL }, usedAt: null },
      orderBy: { createdAt: "desc" },
    });
    expect(token).not.toBeNull();
    const page = await goto(`/reset-password/${token!.token}`);
    expect(new URL(page.url()).pathname).toBe("/");
  });

  it("expired reset link shows link-expired card", async () => {
    const user = await prisma.user.findUniqueOrThrow({ where: { email: EMAIL } });
    const { token } = await prisma.passwordRecoveryToken.create({
      data: {
        token: crypto.randomUUID(),
        userId: user.id,
        expiresAt: new Date(Date.now() - 60_000),
      },
    });
    const page = await goto(`/reset-password/${token}`);
    await expect(page.getByText("Link expired")).toBeVisible();
  });
});
