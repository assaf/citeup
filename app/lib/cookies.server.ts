import { createCookie } from "react-router";
import envVars from "~/lib/envVars";

export const sessionCookie = createCookie("session", {
  httpOnly: true,
  secure: import.meta.env.PROD,
  sameSite: "lax",
  maxAge: 60 * 60 * 24 * 180, // 180 days
  secrets: [envVars.SESSION_SECRET],
});

export type UtmCookieData = {
  referrer: string | null;
  utmSource: string | null;
  utmMedium: string | null;
  utmCampaign: string | null;
  utmTerm: string | null;
  utmContent: string | null;
};

export const utmCookie = createCookie("utm", {
  httpOnly: true,
  secure: import.meta.env.PROD,
  sameSite: "lax",
  maxAge: 60 * 60 * 24 * 7, // 7 days
});
