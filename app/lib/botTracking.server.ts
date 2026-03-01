import { Temporal } from "@js-temporal/polyfill";
import { captureException } from "@sentry/react-router";
import prisma from "~/lib/prisma.server";

/**
 * Known bot patterns for classification
 *
 * @see https://www.xseek.io/docs
 * @see https://plainsignal.com/agents/
 */
const BOT_PATTERNS = [
  { pattern: /ahrefsbot/i, type: "Ahrefs" },
  { pattern: /amazonbot/i, type: "Amazon" },
  { pattern: /anthropic-ai/i, type: "Claude AI" },
  { pattern: /applebot/i, type: "Apple" },
  { pattern: /archive\.org_bot/i, type: "Archive.org" },
  { pattern: /baiduspider/i, type: "Baidu" },
  { pattern: /bingbot/i, type: "Bing" },
  { pattern: /bytespider/i, type: "ByteDance" },
  { pattern: /chrome-lighthouse/i, type: "Lighthouse" },
  { pattern: /claude-searchbot/i, type: "Claude Search" },
  { pattern: /claude-user/i, type: "Claude User" },
  { pattern: /claudebot/i, type: "Claude Bot" },
  { pattern: /curl/i, type: "cURL" },
  { pattern: /discordbot/i, type: "Discord" },
  { pattern: /dotbot/i, type: "DotBot" },
  { pattern: /duckduckbot/i, type: "DuckDuck" },
  { pattern: /ev-crawler/i, type: "Headline" },
  { pattern: /exabot/i, type: "Exabot" },
  { pattern: /facebookexternalhit/i, type: "Facebook" },
  { pattern: /findfiles.net/i, type: "FindFiles" },
  { pattern: /googlebot/i, type: "Google" },
  { pattern: /gptbot|chatgpt-user/i, type: "ChatGPT" },
  { pattern: /headlesschrome/i, type: "Headless Chrome" },
  { pattern: /ia_archiver/i, type: "Alexa" },
  { pattern: /lighthouse/i, type: "Lighthouse" },
  { pattern: /linkedinbot/i, type: "LinkedIn" },
  { pattern: /meta-externalagent/i, type: "Meta" },
  { pattern: /mj12bot/i, type: "MajesticBot" },
  { pattern: /oai-searchbot/i, type: "OpenAI Search" },
  { pattern: /perplexitybot/i, type: "Perplexity" },
  { pattern: /phantomjs/i, type: "PhantomJS" },
  { pattern: /pingdom/i, type: "Pingdom" },
  { pattern: /python-requests/i, type: "Python Requests" },
  { pattern: /rogerbot/i, type: "Rogerbot" },
  { pattern: /rss-is-dead.lol/i, type: "RSS is Dead" },
  { pattern: /saasbrowser.com/i, type: "SaaS Browser" },
  { pattern: /scrapy/i, type: "Scrapy" },
  { pattern: /selenium/i, type: "Selenium" },
  { pattern: /semrushbot/i, type: "SEMrush" },
  { pattern: /slackbot/i, type: "Slack" },
  { pattern: /slurp/i, type: "Yahoo Slurp" },
  { pattern: /telegrambot/i, type: "Telegram" },
  { pattern: /twitterbot/i, type: "Twitter" },
  { pattern: /uptimerobot/i, type: "UptimeRobot" },
  { pattern: /webdriver/i, type: "WebDriver" },
  { pattern: /wget/i, type: "wget" },
  { pattern: /whatsapp/i, type: "WhatsApp" },
  { pattern: /yandexbot/i, type: "Yandex" },
  { pattern: /seranking/i, type: "SE Ranking" },
  { pattern: /bot|crawl|spider|scrape/i, type: "Other Bot" },
] as const;

function classifyBot(userAgent: string): string | null {
  return (
    BOT_PATTERNS.find(({ pattern }) => pattern.test(userAgent))?.type ?? null
  );
}

/**
 * Track a bot visit.
 *
 * @param request - The request to track.
 * @returns The bot type if it is a bot, otherwise null.
 */
export async function trackBotVisit(request: Request): Promise<void> {
  const userAgent = request.headers.get("user-agent");
  if (!userAgent) return;

  const botType = classifyBot(userAgent);
  if (!botType) return;
  if (/Better Stack/i.test(userAgent)) return;

  const url = new URL(request.url);
  const domain = url.hostname.toLowerCase();
  const path = url.pathname;

  const site = await prisma.site.findFirst({ where: { domain } });
  if (!site) return;

  const date = new Date(
    Temporal.Now.zonedDateTimeISO("UTC").startOfDay().epochMilliseconds,
  );
  const accept = getAccept(request);
  const ip = request.headers.get("x-real-ip") ?? undefined;
  const referer = getReferer(request);

  try {
    await prisma.botVisit.upsert({
      where: {
        date_siteId_userAgent_path: { date, siteId: site.id, userAgent, path },
      },
      update: { count: { increment: 1 }, lastSeen: new Date() },
      create: {
        accept,
        botType,
        count: 1,
        date,
        ip,
        path,
        referer,
        site: { connect: { id: site.id } },
        userAgent,
      },
    });
  } catch (error) {
    captureException(error, { extra: { botType, domain, path, userAgent } });
  }
}

function getAccept(request: Request): string[] {
  return (request.headers.get("accept") ?? "")
    .split(",")
    .map((t) => t.split(";")[0].trim())
    .filter(Boolean);
}

function getReferer(request: Request): string | undefined {
  let referer: string | undefined = request.headers.get("referer") ?? undefined;
  if (referer) {
    try {
      const requestURL = new URL(request.url);
      const refererURL = new URL(referer);
      if (
        refererURL.hostname.toLowerCase() === requestURL.hostname.toLowerCase()
      )
        referer = undefined;
    } catch {
      // ignore parse errors, keep referer as is
    }
  }
  return referer;
}
