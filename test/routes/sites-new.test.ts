import { expect } from "@playwright/test";
import { beforeAll, describe, it } from "vitest";
import { hashPassword } from "~/lib/auth.server";
import { sessionCookie } from "~/lib/cookies.server";
import prisma from "~/lib/prisma.server";
import { goto, port } from "../helpers/launchBrowser";
import { signIn } from "../helpers/signIn";
import "../helpers/toMatchInnerHTML";
import "../helpers/toMatchScreenshot";

const EMAIL = "sites-new-test@example.com";
const PASSWORD = "correct-password-123";

describe("unauthenticated access", () => {
  it("redirects to /sign-in", async () => {
    const response = await fetch(`http://localhost:${port}/sites/new`, {
      redirect: "manual",
    });
    expect(response.status).toBe(302);
    expect(response.headers.get("location")).toContain("/sign-in");
  });
});

describe("add site form", () => {
  let page: Awaited<ReturnType<typeof goto>>;

  beforeAll(async () => {
    const user = await prisma.user.create({
      data: {
        email: EMAIL,
        passwordHash: await hashPassword(PASSWORD),
        account: { create: {} },
      },
    });
    await signIn(user.id);
    page = await goto("/sites/new");
  });

  it("shows URL input and descriptive text", async () => {
    await expect(
      page.getByRole("textbox", { name: "Website URL or domain" }),
    ).toBeVisible();
    await expect(page.getByRole("button", { name: "Add Site" })).toBeVisible();
    await expect(page.getByText("Enter a full URL")).toBeVisible();
  });

  it("shows error for invalid URL", async () => {
    await page
      .getByRole("textbox", { name: "Website URL or domain" })
      .fill("http://192.168.1.1");
    await page.getByRole("button", { name: "Add Site" }).click();
    await expect(
      page.getByText("Enter a valid website URL or domain name"),
    ).toBeVisible();
  });

  it("shows error for localhost", async () => {
    await page
      .getByRole("textbox", { name: "Website URL or domain" })
      .fill("localhost");
    await page.getByRole("button", { name: "Add Site" }).click();
    await expect(
      page.getByText("Enter a valid website URL or domain name"),
    ).toBeVisible();
  });

  it("HTML matches baseline", { timeout: 30_000 }, async () => {
    const freshPage = await goto("/sites/new");
    await expect(freshPage.locator("main")).toMatchInnerHTML();
  });

  it("screenshot matches baseline", { timeout: 30_000 }, async () => {
    const freshPage = await goto("/sites/new");
    await expect(freshPage.locator("main")).toMatchScreenshot();
  });
});

describe("add site — DNS failure", () => {
  it(
    "shows DNS error for domain with no records",
    { timeout: 20_000 },
    async () => {
      const page = await goto("/sites/new");
      await page
        .getByRole("textbox", { name: "Website URL or domain" })
        .fill("this-domain-does-not-exist.invalid");
      await page.getByRole("button", { name: "Add Site" }).click();
      await expect(
        page.getByText(/No DNS records found for.*Is the domain live\?/),
      ).toBeVisible({ timeout: 15_000 });
    },
  );
});

describe("add site — duplicate domain", () => {
  it("shows error when domain already exists", async () => {
    const user = await prisma.user.findUniqueOrThrow({ where: { email: EMAIL } });
    const domain = "duplicate-test.com";
    await prisma.site.create({ data: { domain, accountId: user.accountId } });

    const token = crypto.randomUUID();
    await prisma.session.create({
      data: { token, userId: user.id, ipAddress: "127.0.0.1", userAgent: "test" },
    });
    const cookieHeader = await sessionCookie.serialize(token);

    const form = new FormData();
    form.append("url", `https://${domain}`);

    const response = await fetch(`http://localhost:${port}/sites/new`, {
      method: "POST",
      headers: { Cookie: cookieHeader },
      body: form,
      redirect: "manual",
    });

    expect(response.status).toBe(200);
    const html = await response.text();
    expect(html).toContain("already added to your account");
  });
});

describe("add site — successful save", () => {
  it(
    "creates site and navigates to site page",
    { timeout: 30_000 },
    async () => {
      // signIn was called in "add site form" beforeAll — session persists in shared context
      const page = await goto("/sites/new");
      await page
        .getByRole("textbox", { name: "Website URL or domain" })
        .fill("example.com");
      await page.getByRole("button", { name: "Add Site" }).click();
      await page.waitForURL("**/site/**", { timeout: 25_000 });
      expect(new URL(page.url()).pathname).toMatch(/^\/site\//);

      const user = await prisma.user.findUniqueOrThrow({
        where: { email: EMAIL },
      });
      const site = await prisma.site.findFirst({
        where: { domain: "example.com", accountId: user.accountId },
      });
      expect(site).not.toBeNull();
    },
  );
});
