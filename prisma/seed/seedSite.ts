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
    create: { domain: "rentail.space", accountId: user.accountId },
  });

  const citeUp = await prisma.site.upsert({
    where: {
      accountId_domain: {
        accountId: user.accountId,
        domain: "citeup.vercel.app",
      },
    },
    update: {},
    create: { domain: "citeup.vercel.app", accountId: user.accountId },
  });
  console.info("✅ Sites: %s, %s", rentail.id, citeUp.id);
  return rentail;
}
