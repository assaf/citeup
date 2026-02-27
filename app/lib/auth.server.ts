import bcrypt from "bcryptjs";
import { redirect } from "react-router";
import { type UtmCookieData, sessionCookie, utmCookie } from "~/lib/cookies.server";
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

export async function createEmailVerificationToken(userId: string) {
  const token = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
  await prisma.emailVerificationToken.create({
    data: { token, userId, expiresAt },
  });
  return token;
}

export async function signOut(): Promise<Headers> {
  return new Headers({
    "set-cookie": await sessionCookie.serialize("", { maxAge: 0 }),
  });
}

export async function getCurrentUser(request: Request) {
  const cookieHeader = request.headers.get("Cookie");
  const token = await sessionCookie.parse(cookieHeader);
  if (!token) return null;
  const session = await prisma.session.findUnique({
    where: { token },
    include: { user: true },
  });
  return session?.user ?? null;
}

export async function requireUser(request: Request) {
  const user = await getCurrentUser(request);
  if (user) return user;

  const url = new URL(request.url);
  const utmData: UtmCookieData = {
    referrer: request.headers.get("Referer") ?? null,
    utmSource: url.searchParams.get("utm_source"),
    utmMedium: url.searchParams.get("utm_medium"),
    utmCampaign: url.searchParams.get("utm_campaign"),
    utmTerm: url.searchParams.get("utm_term"),
    utmContent: url.searchParams.get("utm_content"),
  };
  throw redirect("/sign-in", {
    headers: { "Set-Cookie": await utmCookie.serialize(utmData) },
  });
}
