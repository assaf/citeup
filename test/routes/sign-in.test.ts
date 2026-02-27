import { expect } from "@playwright/test";
import { beforeAll, describe, it } from "vitest";
import { hashPassword } from "~/lib/auth.server";
import prisma from "~/lib/prisma.server";
import { goto, port } from "../helpers/launchBrowser";

const EMAIL = "sign-in-test@example.com";
const PASSWORD = "test-password-123";

describe("sign-in route", () => {
  beforeAll(async () => {
    const passwordHash = await hashPassword(PASSWORD);
    const account = await prisma.account.create({ data: {} });
    await prisma.user.create({
      data: { email: EMAIL, passwordHash, accountId: account.id },
    });
  });

  it("shows the sign-in form", async () => {
    const page = await goto("/sign-in");
    await expect(page.getByLabel("Email")).toBeVisible();
    await expect(page.getByLabel("Password")).toBeVisible();
    await expect(page.getByRole("button", { name: "Sign in" })).toBeVisible();
  });

  it("shows error for wrong credentials", async () => {
    const page = await goto("/sign-in");
    await page.getByLabel("Email").fill(EMAIL);
    await page.getByLabel("Password").fill("wrong-password");
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(
      page.getByText("email and password do not match"),
    ).toBeVisible();
  });

  it("redirects to home on successful sign-in", async () => {
    const page = await goto("/sign-in");
    await page.getByLabel("Email").fill(EMAIL);
    await page.getByLabel("Password").fill(PASSWORD);
    await page.getByRole("button", { name: "Sign in" }).click();
    await page.waitForURL(`http://localhost:${port}/`);
    expect(new URL(page.url()).pathname).toBe("/");
  });
});
