import { expect } from "@playwright/test";
import { beforeAll, describe, it } from "vitest";
import { hashPassword } from "~/lib/auth.server";
import prisma from "~/lib/prisma.server";
import { goto, port } from "../helpers/launchBrowser";

const EMAIL = "sign-in-test@example.com";
const PASSWORD = "test-password-123";

describe("sign-in route", () => {
  beforeAll(async () => {
    await prisma.user.create({
      data: {
        email: EMAIL,
        passwordHash: await hashPassword(PASSWORD),
        account: { create: {} },
      },
    });
  });

  it("shows the sign-in form", async () => {
    const page = await goto("/sign-in");
    await expect(
      page.getByRole("textbox", { name: "Email", exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole("textbox", { name: "Password", exact: true }),
    ).toBeVisible();
    await expect(page.getByRole("button", { name: "Sign in" })).toBeVisible();
  });

  it("shows error for wrong credentials", async () => {
    const page = await goto("/sign-in");
    await page.getByRole("textbox", { name: "Email", exact: true }).fill(EMAIL);
    await page
      .getByRole("textbox", { name: "Password", exact: true })
      .fill("wrong-password");
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(
      page.getByText("email and password do not match"),
    ).toBeVisible();
  });

  it("redirects to home on successful sign-in", async () => {
    const page = await goto("/sign-in");
    await page.getByRole("textbox", { name: "Email", exact: true }).fill(EMAIL);
    await page
      .getByRole("textbox", { name: "Password", exact: true })
      .fill(PASSWORD);
    await page.getByRole("button", { name: "Sign in" }).click();
    await page.waitForURL(`http://localhost:${port}/`);
    expect(new URL(page.url()).pathname).toBe("/");
  });

  it("HTML matches baseline", async () => {
    const page = await goto("/sign-in");
    await expect(page).toMatchInnerHTML();
  });

  it("screenshot matches baseline", async () => {
    const page = await goto("/sign-in");
    await expect(page).toMatchScreenshot();
  });
});
