import { beforeEach, describe, expect, it } from "vitest";
import { trackBotVisit } from "~/lib/botTracking.server";
import prisma from "~/lib/prisma.server";

function makeRequest(
  userAgent: string,
  url = "https://citeup.vercel.app/",
  accept?: string,
) {
  const headers: Record<string, string> = { "user-agent": userAgent };
  if (accept) headers.accept = accept;
  return new Request(url, { headers });
}

describe("trackBotVisit", () => {
  beforeEach(async () => {
    await prisma.account.deleteMany();
    await prisma.site.create({
      data: {
        account: { create: { id: "account-1" } },
        domain: "citeup.vercel.app",
      },
    });
  });

  it("ignores regular browser user agents", async () => {
    await trackBotVisit(
      makeRequest(
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36",
      ),
    );
    const last = await prisma.botVisit.findFirst();
    expect(last).toBeNull();
  });

  it("tracks a known bot by type", async () => {
    await trackBotVisit(
      makeRequest(
        "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)",
      ),
    );
    const last = await prisma.botVisit.findFirstOrThrow();
    expect(last.botType).toBe("Google");
  });

  it("skips upsert when no site matches the domain", async () => {
    await trackBotVisit(makeRequest("Googlebot/2.1", "https://example.com/"));
    const last = await prisma.botVisit.findFirst();
    expect(last).toBeNull();
  });

  it("tracks an unknown bot as 'Other Bot'", async () => {
    await trackBotVisit(makeRequest("custom-spider/1.0"));
    const last = await prisma.botVisit.findFirstOrThrow();
    expect(last.botType).toBe("Other Bot");
  });

  it("ignores Better Stack uptime checks", async () => {
    await trackBotVisit(makeRequest("Better Stack Uptime Monitor/1.0 bot"));
    const last = await prisma.botVisit.findFirst();
    expect(last).toBeNull();
  });

  it("records domain and path from request URL", async () => {
    await trackBotVisit(
      makeRequest("Googlebot/2.1", "https://citeup.vercel.app/blog/post"),
    );
    const last = await prisma.botVisit.findFirstOrThrow();
    expect(last.path).toBe("/blog/post");
  });

  it("parses Accept header into MIME type array, stripping quality values", async () => {
    await trackBotVisit(
      makeRequest(
        "Googlebot/2.1",
        "https://citeup.vercel.app/",
        "text/html,application/xhtml+xml;q=0.9,*/*;q=0.8",
      ),
    );
    const last = await prisma.botVisit.findFirstOrThrow();
    expect(last.accept).toEqual(["text/html", "application/xhtml+xml", "*/*"]);
  });
});
