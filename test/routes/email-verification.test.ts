import { expect } from "@playwright/test";
import { beforeAll, describe, it } from "vitest";
import { createEmailVerificationToken } from "~/lib/auth.server";
import prisma from "~/lib/prisma.server";
import { goto } from "../helpers/launchBrowser";
import { signIn } from "../helpers/signIn";

describe("email verification route", () => {
  let userId: string;
  let verifiedUserId: string;
  let expiredTokenForVerifiedUser: string;

  beforeAll(async () => {
    // Unverified user — fresh token created per test that needs one
    const account1 = await prisma.account.create({ data: {} });
    const user1 = await prisma.user.create({
      data: {
        email: "unverified@example.com",
        passwordHash: "x",
        accountId: account1.id,
      },
    });
    userId = user1.id;

    // Already-verified user with an expired token. Used to test the resend
    // confirmation UI without triggering an actual Resend API call (the action
    // skips email sending when emailVerifiedAt is already set).
    const account2 = await prisma.account.create({ data: {} });
    const user2 = await prisma.user.create({
      data: {
        email: "already-verified@example.com",
        passwordHash: "x",
        accountId: account2.id,
        emailVerifiedAt: new Date(),
      },
    });
    verifiedUserId = user2.id;
    const { token } = await prisma.emailVerificationToken.create({
      data: {
        token: crypto.randomUUID(),
        userId: verifiedUserId,
        expiresAt: new Date(Date.now() - 60_000),
      },
    });
    expiredTokenForVerifiedUser = token;
  });

  it("valid token marks user as verified and redirects to home", async () => {
    const validToken = await createEmailVerificationToken(userId);
    await signIn(userId);
    const page = await goto(`/verify-email/${validToken}`);
    expect(new URL(page.url()).pathname).toBe("/");
    const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
    expect(user.emailVerifiedAt).not.toBeNull();
  });

  it("expired token shows link-expired card with resend button", async () => {
    const { token } = await prisma.emailVerificationToken.create({
      data: {
        token: crypto.randomUUID(),
        userId,
        expiresAt: new Date(Date.now() - 60_000),
      },
    });
    const page = await goto(`/verify-email/${token}`);
    await expect(page.getByText("Link expired")).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Send new verification email" }),
    ).toBeVisible();
  });

  it("unknown token shows link-expired card", async () => {
    const page = await goto(`/verify-email/${crypto.randomUUID()}`);
    await expect(page.getByText("Link expired")).toBeVisible();
  });

  it("resend button shows confirmation (skips email when user is already verified)", async () => {
    const page = await goto(`/verify-email/${expiredTokenForVerifiedUser}`);
    await page
      .getByRole("button", { name: "Send new verification email" })
      .click();
    await expect(page.getByText("Check your email")).toBeVisible();
  });
});
