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

describe("add site — step 1", () => {
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

  it("shows URL input form", async () => {
    await expect(page.getByRole("textbox", { name: "Website URL" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Continue" })).toBeVisible();
  });

  it("shows error for invalid URL", async () => {
    // Use an IP address which extractDomain rejects
    await page.getByRole("textbox", { name: "Website URL" }).fill("http://192.168.1.1");
    await page.getByRole("button", { name: "Continue" }).click();
    await expect(page.getByText("Enter a valid website URL")).toBeVisible();
  });

  it("shows error for localhost", async () => {
    await page.getByRole("textbox", { name: "Website URL" }).fill("http://localhost");
    await page.getByRole("button", { name: "Continue" }).click();
    await expect(page.getByText("Enter a valid website URL")).toBeVisible();
  });

  it("HTML matches baseline: sites-new-step1", { timeout: 30_000 }, async () => {
    const freshPage = await goto("/sites/new");
    await expect(freshPage.locator("main")).toMatchInnerHTML({
      name: "sites-new-step1",
    });
  });

  it("screenshot matches baseline: sites-new-step1", { timeout: 30_000 }, async () => {
    const freshPage = await goto("/sites/new");
    await expect(freshPage.locator("main")).toMatchScreenshot({
      name: "sites-new-step1",
    });
  });
});

describe("add site — DNS failure", () => {
  it("shows DNS error for domain with no records", async () => {
    // .invalid TLD will never resolve — DNS lookup returns false
    const page = await goto("/sites/new");
    await page
      .getByRole("textbox", { name: "Website URL" })
      .fill("https://this-domain-does-not-exist.invalid");
    await page.getByRole("button", { name: "Continue" }).click();
    await expect(
      page.getByText(/No DNS records found for.*Is the domain live\?/),
    ).toBeVisible();
  });
});

describe("add site — duplicate domain", () => {
  it("shows error when domain already exists — POST step=3 directly", async () => {
    const user = await prisma.user.findUniqueOrThrow({ where: { email: EMAIL } });

    // Create the site in DB first
    const domain = "duplicate-test.com";
    await prisma.site.create({ data: { domain, accountId: user.accountId } });

    // Create a session and get cookie
    const token = crypto.randomUUID();
    await prisma.session.create({
      data: { token, userId: user.id, ipAddress: "127.0.0.1", userAgent: "test" },
    });
    const cookieHeader = await sessionCookie.serialize(token);

    // POST step=3 directly with the duplicate domain
    const form = new FormData();
    form.append("step", "3");
    form.append("domain", domain);
    form.append("content", "some page content");

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
  it("creates site and redirects to /sites on step=3 submit", async () => {
    const user = await prisma.user.findUniqueOrThrow({ where: { email: EMAIL } });

    const domain = "new-site-success.com";

    // Ensure it doesn't exist
    await prisma.site.deleteMany({ where: { domain, accountId: user.accountId } });

    // Create a session and get cookie
    const token = crypto.randomUUID();
    await prisma.session.create({
      data: { token, userId: user.id, ipAddress: "127.0.0.1", userAgent: "test" },
    });
    const cookieHeader = await sessionCookie.serialize(token);

    // POST step=3 directly
    const form = new FormData();
    form.append("step", "3");
    form.append("domain", domain);
    form.append("content", "some page content");

    const response = await fetch(`http://localhost:${port}/sites/new`, {
      method: "POST",
      headers: { Cookie: cookieHeader },
      body: form,
      redirect: "manual",
    });

    // Should redirect to /sites
    expect(response.status).toBe(302);
    expect(response.headers.get("location")).toContain("/sites");

    // DB record should exist
    const site = await prisma.site.findFirst({
      where: { domain, accountId: user.accountId },
    });
    expect(site).not.toBeNull();
    expect(site?.domain).toBe(domain);
  });
});
