import { expect } from "@playwright/test";
import { beforeAll, describe, it } from "vitest";
import { hashPassword } from "~/lib/auth.server";
import prisma from "~/lib/prisma.server";
import { goto, port } from "../helpers/launchBrowser";

const EXISTING_EMAIL = "sign-up-existing@example.com";

describe("sign-up route", () => {
  beforeAll(async () => {
    const passwordHash = await hashPassword("some-password");
    const account = await prisma.account.create({ data: {} });
    await prisma.user.create({
      data: { email: EXISTING_EMAIL, passwordHash, accountId: account.id },
    });
  });

  it("shows the sign-up form", async () => {
    const page = await goto("/sign-up");
    await expect(page.getByLabel("Email")).toBeVisible();
    await expect(page.getByLabel("Password")).toBeVisible();
    await expect(page.getByLabel("Confirm password")).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Create account" }),
    ).toBeVisible();
  });

  it("shows error when password is too short", async () => {
    const page = await goto("/sign-up");
    await page.getByLabel("Email").fill("newuser@example.com");
    await page.getByLabel("Password").fill("abc");
    await page.getByLabel("Confirm password").fill("abc");
    await page.getByRole("button", { name: "Create account" }).click();
    await expect(
      page.getByText("Password must be at least 6 characters"),
    ).toBeVisible();
  });

  it("shows error when passwords do not match", async () => {
    const page = await goto("/sign-up");
    await page.getByLabel("Email").fill("newuser@example.com");
    await page.getByLabel("Password").fill("password123");
    await page.getByLabel("Confirm password").fill("different");
    await page.getByRole("button", { name: "Create account" }).click();
    await expect(page.getByText("Passwords do not match")).toBeVisible();
  });

  it("shows error for already-registered email", async () => {
    const page = await goto("/sign-up");
    await page.getByLabel("Email").fill(EXISTING_EMAIL);
    await page.getByLabel("Password").fill("password123");
    await page.getByLabel("Confirm password").fill("password123");
    await page.getByRole("button", { name: "Create account" }).click();
    await expect(
      page.getByText("An account with this email already exists"),
    ).toBeVisible();
  });

  it("creates account and redirects to home", async () => {
    const page = await goto("/sign-up");
    await page.getByLabel("Email").fill("brand-new@example.com");
    await page.getByLabel("Password").fill("password123");
    await page.getByLabel("Confirm password").fill("password123");
    await page.getByRole("button", { name: "Create account" }).click();
    await page.waitForURL(`http://localhost:${port}/`);
    expect(new URL(page.url()).pathname).toBe("/");
  });
});
