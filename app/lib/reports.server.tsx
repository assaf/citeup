import { render } from "@react-email/components";
import { Temporal } from "@js-temporal/polyfill";
import debug from "debug";
import { captureException } from "@sentry/react-router";
import type { Account, BotInsight, BotVisit, Site, User } from "~/prisma";
import DailyReportEmail from "~/lib/emails/DailyReportEmail";
import prisma from "./prisma.server";

const logger = debug("server");

/**
 * Get a 24-hour window from now
 */
function get24HourWindow() {
  const now = new Date(
    Temporal.Now.instant().epochMilliseconds
  );
  const oneDayAgo = new Date(
    Temporal.Now.instant().subtract({ hours: 24 }).epochMilliseconds
  );
  return { now, oneDayAgo };
}

/**
 * Query new users created in the past 24 hours
 */
async function queryNewUsers() {
  const { now, oneDayAgo } = get24HourWindow();

  logger("[reports:newUsers] Querying users from %s to %s", oneDayAgo, now);

  const users = await prisma.user.findMany({
    where: {
      createdAt: {
        gte: oneDayAgo,
        lte: now,
      },
    },
    orderBy: { createdAt: "desc" },
  });

  logger("[reports:newUsers] Found %d new users", users.length);
  return users;
}

/**
 * Query new sites with account and user details (past 24 hours)
 */
async function queryNewSites() {
  const { now, oneDayAgo } = get24HourWindow();

  logger("[reports:newSites] Querying sites from %s to %s", oneDayAgo, now);

  const sites = await prisma.site.findMany({
    where: {
      createdAt: {
        gte: oneDayAgo,
        lte: now,
      },
    },
    include: {
      account: {
        include: {
          users: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  logger("[reports:newSites] Found %d new sites", sites.length);
  return sites;
}

/**
 * Query top 3 bot visits by count for a site (past 24 hours)
 */
async function queryTopBotVisits(siteId: string) {
  const { now, oneDayAgo } = get24HourWindow();

  logger(
    "[reports:topBotVisits] Querying for site %s from %s to %s",
    siteId,
    oneDayAgo,
    now
  );

  const botVisits = await prisma.botVisit.findMany({
    where: {
      siteId,
      createdAt: {
        gte: oneDayAgo,
        lte: now,
      },
    },
    orderBy: { count: "desc" },
    take: 3,
  });

  logger("[reports:topBotVisits] Found %d top bot visits", botVisits.length);
  return botVisits;
}

/**
 * Query citation query scores (current 24h vs previous 24h)
 */
async function queryCitationScores(siteId: string) {
  const now = Temporal.Now.zonedDateTimeISO("UTC");
  const currentStart = now.startOfDay();
  const previousStart = currentStart.subtract({ days: 1 });
  const previousEnd = currentStart.subtract({ days: 0, milliseconds: 1 });

  const currentStartDate = new Date(currentStart.epochMilliseconds);
  const previousStartDate = new Date(previousStart.epochMilliseconds);
  const previousEndDate = new Date(previousEnd.epochMilliseconds);

  logger(
    "[reports:citationScores] Querying for site %s",
    siteId
  );

  const currentPeriod = await prisma.citationQueryRun.findMany({
    where: {
      siteId,
      createdAt: {
        gte: currentStartDate,
      },
    },
    include: {
      queries: true,
    },
  });

  const previousPeriod = await prisma.citationQueryRun.findMany({
    where: {
      siteId,
      createdAt: {
        gte: previousStartDate,
        lte: previousEndDate,
      },
    },
    include: {
      queries: true,
    },
  });

  const currentScore = calculateAverageScore(currentPeriod);
  const previousScore = calculateAverageScore(previousPeriod);

  logger(
    "[reports:citationScores] Current: %d, Previous: %d",
    currentScore,
    previousScore
  );

  return {
    current: currentScore,
    previous: previousScore,
  };
}

/**
 * Query bot insights updated in past 24 hours
 */
async function queryBotInsightsUpdated() {
  const { now, oneDayAgo } = get24HourWindow();

  logger(
    "[reports:botInsights] Querying insights updated from %s to %s",
    oneDayAgo,
    now
  );

  const insights = await prisma.botInsight.findMany({
    where: {
      updatedAt: {
        gte: oneDayAgo,
        lte: now,
      },
    },
    include: {
      site: true,
    },
    orderBy: { updatedAt: "desc" },
  });

  logger("[reports:botInsights] Found %d updated insights", insights.length);
  return insights;
}

interface CitationQueryRun {
  queries: Array<{
    citations?: string[];
  }>;
}

/**
 * Calculate average citation score from citation query runs
 */
function calculateAverageScore(runs: CitationQueryRun[]): number {
  if (runs.length === 0) return 0;

  const totalCitations = runs.reduce((sum, run) => {
    const citationCount = run.queries.filter(
      (q) => q.citations && q.citations.length > 0
    ).length;
    return sum + citationCount;
  }, 0);

  return Math.round((totalCitations / runs.length) * 100) / 100;
}

/**
 * Generate daily report HTML with all metrics
 */
export async function generateDailyReport(): Promise<string> {
  logger("[reports:generate] Starting daily report generation");

  try {
    const newUsers = await queryNewUsers();
    const newSites = await queryNewSites();
    const botInsights = await queryBotInsightsUpdated();

    // Get top bot visits for each new site
    const newSitesWithMetrics = await Promise.all(
      newSites.map(async (site) => {
        const topBotVisits = await queryTopBotVisits(site.id);
        const citationScores = await queryCitationScores(site.id);
        return {
          site,
          topBotVisits,
          citationScores,
        };
      })
    );

    logger("[reports:generate] Report data collected successfully");

    const html = render(
      <DailyReportEmail
        newUsers={newUsers}
        newSitesWithMetrics={newSitesWithMetrics}
        botInsights={botInsights}
        generatedAt={new Date()}
      />,
      { pretty: true }
    );

    logger("[reports:generate] Report HTML generated successfully");
    return html;
  } catch (error) {
    captureException(error);
    logger("[reports:generate] Error generating report: %o", error);
    throw error;
  }
}
