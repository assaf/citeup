import bcrypt from "bcryptjs";
import { sessionCookie, utmCookie } from "~/lib/cookies.server";
import prisma from "~/lib/prisma.server";

export async function hashPassword(password: string) {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(password: string, hash: string) {
  return bcrypt.compare(password, hash);
}

export async function createSession(userId: string, request: Request) {
  const cookieHeader = request.headers.get("Cookie");
  const utm = await utmCookie.parse(cookieHeader);

  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    request.headers.get("x-real-ip") ??
    null;

  const token = crypto.randomUUID();

  await prisma.session.create({
    data: {
      token,
      userId,
      ipAddress: ip,
      userAgent: request.headers.get("user-agent"),
      referrer: utm?.referrer ?? null,
      utmSource: utm?.utmSource ?? null,
      utmMedium: utm?.utmMedium ?? null,
      utmCampaign: utm?.utmCampaign ?? null,
      utmTerm: utm?.utmTerm ?? null,
      utmContent: utm?.utmContent ?? null,
    },
  });

  return sessionCookie.serialize(token);
}
