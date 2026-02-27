import { expect } from "@playwright/test";
import { beforeAll, describe, it } from "vitest";
import { hashPassword } from "~/lib/auth.server";
import prisma from "~/lib/prisma.server";
import type { User } from "~/prisma";
import { goto, port } from "../helpers/launchBrowser";
import { signIn } from "../helpers/signIn";
import "../helpers/toMatchInnerHTML";
import "../helpers/toMatchScreenshot";

const EMAIL = "profile-test@example.com";
const PASSWORD = "correct-password-123";

describe("unauthenticated access", () => {
  it("redirects to /sign-in", async () => {
    const response = await fetch(`http://localhost:${port}/profile`, {
      redirect: "manual",
    });
    expect(response.status).toBe(302);
    expect(response.headers.get("location")).toContain("/sign-in");
  });
});

describe("profile route", () => {
  let user: User;

  beforeAll(async () => {
    user = await prisma.user.create({
      data: {
        email: EMAIL,
        passwordHash: await hashPassword(PASSWORD),
        account: { create: {} },
      },
    });
  });

  it("shows email tab with current email pre-filled", async () => {
    await signIn(user.id);
    const page = await goto("/profile");
    const emailInput = page.getByLabel("Email address");
    await expect(emailInput).toBeVisible();
    await expect(emailInput).toHaveValue(EMAIL);
    await expect(page.getByRole("button", { name: "Update email" })).toBeVisible();
  });

  it("shows password fields after switching to password tab", async () => {
    const page = await goto("/profile");
    await page.getByRole("tab", { name: "Password" }).click();
    await expect(page.getByLabel("Current password")).toBeVisible();
    await expect(page.getByLabel("New password")).toBeVisible();
    await expect(page.getByLabel("Confirm new password")).toBeVisible();
    await expect(page.getByRole("button", { name: "Change password" })).toBeVisible();
  });

  it("shows error for wrong current password", async () => {
    const page = await goto("/profile");
    await page.getByRole("tab", { name: "Password" }).click();
    await page.getByLabel("Current password").fill("wrong-password");
    await page.getByLabel("New password").fill("newpassword123");
    await page.getByLabel("Confirm new password").fill("newpassword123");
    await page.getByRole("button", { name: "Change password" }).click();
    await expect(page.getByText("Current password is incorrect")).toBeVisible();
  });

  it("shows error when passwords do not match", async () => {
    const page = await goto("/profile");
    await page.getByRole("tab", { name: "Password" }).click();
    await page.getByLabel("Current password").fill(PASSWORD);
    await page.getByLabel("New password").fill("newpassword123");
    await page.getByLabel("Confirm new password").fill("different456");
    await page.getByRole("button", { name: "Change password" }).click();
    await expect(page.getByText("Passwords do not match")).toBeVisible();
  });

  it("shows success after correct password change", async () => {
    const page = await goto("/profile");
    await page.getByRole("tab", { name: "Password" }).click();
    await page.getByLabel("Current password").fill(PASSWORD);
    await page.getByLabel("New password").fill("newpassword456");
    await page.getByLabel("Confirm new password").fill("newpassword456");
    await page.getByRole("button", { name: "Change password" }).click();
    await expect(page.getByText("Password changed successfully")).toBeVisible();
  });

  it("HTML matches baseline", { timeout: 30_000 }, async () => {
    const page = await goto("/profile");
    await expect(page.locator("main")).toMatchInnerHTML();
  });

  it("screenshot matches baseline", { timeout: 30_000 }, async () => {
    const page = await goto("/profile");
    await expect(page.locator("main")).toMatchScreenshot();
  });
});
