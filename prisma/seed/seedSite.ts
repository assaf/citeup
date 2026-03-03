import bcrypt from "bcryptjs";
import type { Site, User } from "prisma/generated/client";
import prisma from "~/lib/prisma.server";

export default async function seedSite(): Promise<Site> {
  const user = await seedAccount();
  return await seedSites(user);
}

async function seedAccount(): Promise<User> {
  const user = await prisma.user.upsert({
    where: { email: "assaf@labnotes.org" },
    update: {},
    create: {
      email: "assaf@labnotes.org",
      passwordHash: await bcrypt.hash("EhnGjs7JMsq3oKrkfwZk", 1),
      account: { create: {} },
    },
    include: { account: true },
  });
  console.info("✅ User: %s (%s)", user.id, user.email);
  return user;
}

async function seedSites(user: User): Promise<Site> {
  const rentail = await prisma.site.upsert({
    where: {
      accountId_domain: { accountId: user.accountId, domain: "rentail.space" },
    },
    update: {},
    create: {
      accountId: user.accountId,
      content:
        "rentail .space  Sign In  🎉 Rent for days, weeks, or months Find Your Next Mall Space in Under 2 Minutes Find short-term retail spaces in shopping centers—without the broker meetings or endless phone calls. Built for small businesses and seasonal sellers. Just instant matches with spaces ready for your products. Find My Match Why Choose rentail .space? Short-term retail spaces in shopping centers near you.",
      domain: "rentail.space",
    },
  });

  const citeUp = await prisma.site.upsert({
    where: {
      accountId_domain: {
        accountId: user.accountId,
        domain: "citeup.vercel.app",
      },
    },
    update: {},
    create: {
      accountId: user.accountId,
      content:
        "CiteUp Sign in Get started The Search Console for AI Does ChatGPT mention  your brand? CiteUp runs your queries across ChatGPT, Claude, Gemini, and Perplexity — and records every time they cite your website.",
      domain: "citeup.vercel.app",
    },
  });
  console.info("✅ Sites: %s, %s", rentail.id, citeUp.id);
  return rentail;
}
