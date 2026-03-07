# Daily Email Report Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers-extended-cc:executing-plans to implement this plan task-by-task.

**Goal:** Implement a daily email report sent at 6 AM Pacific showing new users, new sites, bot traffic, and citation query score comparisons across all accounts.

**Architecture:** A cron route (`/cron.daily-report`) triggered by Vercel's scheduler that queries the database for metrics, generates an HTML email via a helper library, and sends it to a personal email address. Follows the existing cron pattern used by citation-runs and bot-insights.

**Tech Stack:** Prisma (queries), Resend (email), Temporal (date math), debug (logging), Sentry (error tracking)

---

## Task 1: Create Report Library with Helper Functions

**Files:**
- Create: `app/lib/reports.server.ts`

**Acceptance Criteria:**
- [ ] Function to query new users (past 24 hours)
- [ ] Function to query new sites with account and user details
- [ ] Function to query top 3 bot visits by count for a site (past 24 hours)
- [ ] Function to query citation query scores (current 24h vs previous 24h)
- [ ] Function to query bot insights updated in past 24 hours
- [ ] Main `generateDailyReport()` function that assembles all data and returns HTML
- [ ] All functions use Temporal for date calculations
- [ ] Includes logging via debug logger

**Step 1: Read existing code patterns**

Read:
- `app/lib/llm-visibility/queryAccount.ts` (understand how queries are structured)
- `app/lib/prisma.server.ts` (verify prisma import)
- `prisma/schema.prisma` (review User, Site, BotVisit, BotInsight, CitationQuery models)

**Step 2: Write the report library**

Create `app/lib/reports.server.ts`:

```typescript
import { Temporal } from "@js-temporal/polyfill";
import debug from "debug";
import prisma from "~/lib/prisma.server";

const logger = debug("server");

interface ReportData {
  newUsers: {
    id: string;
    email: string;
    createdAt: Date;
    accountId: string;
  }[];
  newSites: {
    id: string;
    domain: string;
    createdAt: Date;
    account: {
      id: string;
      users: { email: string }[];
    };
    topBotVisits: {
      botType: string;
      count: number;
    }[];
    botInsight: {
      content: string;
      updatedAt: Date;
    } | null;
  }[];
  accountMetrics: {
    accountId: string;
    hostname: string | null;
    currentScore: number;
    previousScore: number;
    change: number;
    changePercent: number;
  }[];
}

async function getNewUsers(since: Date): Promise<ReportData["newUsers"]> {
  return prisma.user.findMany({
    where: { createdAt: { gte: since } },
    select: { id: true, email: true, createdAt: true, accountId: true },
    orderBy: { createdAt: "desc" },
  });
}

async function getNewSites(since: Date): Promise<ReportData["newSites"]> {
  const sites = await prisma.site.findMany({
    where: { createdAt: { gte: since } },
    select: {
      id: true,
      domain: true,
      createdAt: true,
      account: {
        select: {
          id: true,
          users: { select: { email: true } },
        },
      },
      botInsight: {
        select: { content: true, updatedAt: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  const result = [];
  for (const site of sites) {
    // Get top 3 bot visits by count for this site in past 24 hours
    const visits = await prisma.botVisit.groupBy({
      by: ["botType"],
      where: {
        siteId: site.id,
        date: { gte: since },
      },
      _sum: { count: true },
      orderBy: { _sum: { count: "desc" } },
      take: 3,
    });

    result.push({
      ...site,
      topBotVisits: visits.map((v) => ({
        botType: v.botType,
        count: v._sum.count || 0,
      })),
      botInsight:
        site.botInsight && site.botInsight.updatedAt >= since
          ? site.botInsight
          : null,
    });
  }

  return result;
}

async function calculateAccountScore(
  accountId: string,
  since: Date,
): Promise<number> {
  const runs = await prisma.citationQueryRun.findMany({
    where: {
      site: { accountId },
      createdAt: { gte: since },
    },
    select: {
      queries: {
        select: { position: true },
      },
    },
  });

  let score = 0;
  for (const run of runs) {
    for (const query of run.queries) {
      if (query.position === 1) {
        score += 50;
      } else if (query.position !== null) {
        score += 10;
      }
    }
  }
  return score;
}

async function getAccountMetrics(
  since24h: Date,
  since48h: Date,
): Promise<ReportData["accountMetrics"]> {
  const accounts = await prisma.account.findMany({
    where: { users: { some: {} } },
    select: { id: true, hostname: true },
  });

  const metrics = [];
  for (const account of accounts) {
    const currentScore = await calculateAccountScore(account.id, since24h);
    const previousScore = await calculateAccountScore(account.id, since48h);

    const change = currentScore - previousScore;
    const changePercent =
      previousScore === 0
        ? currentScore > 0
          ? 100
          : 0
        : (change / previousScore) * 100;

    metrics.push({
      accountId: account.id,
      hostname: account.hostname,
      currentScore,
      previousScore,
      change,
      changePercent: Math.round(changePercent * 100) / 100,
    });
  }

  return metrics;
}

export async function generateDailyReport(): Promise<string> {
  const now = new Date();
  const since24h = new Date(
    Temporal.Now.instant().subtract({ hours: 24 }).epochMilliseconds,
  );
  const since48h = new Date(
    Temporal.Now.instant().subtract({ hours: 48 }).epochMilliseconds,
  );

  logger("[report] Generating daily report");

  const newUsers = await getNewUsers(since24h);
  const newSites = await getNewSites(since24h);
  const accountMetrics = await getAccountMetrics(since24h, since48h);

  logger(
    "[report] Found %d new users, %d new sites, %d accounts",
    newUsers.length,
    newSites.length,
    accountMetrics.length,
  );

  const html = generateHtml({
    newUsers,
    newSites,
    accountMetrics,
    generatedAt: now,
  });

  return html;
}

interface HtmlParams {
  newUsers: ReportData["newUsers"];
  newSites: ReportData["newSites"];
  accountMetrics: ReportData["accountMetrics"];
  generatedAt: Date;
}

function generateHtml({
  newUsers,
  newSites,
  accountMetrics,
  generatedAt,
}: HtmlParams): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>CiteUp Daily Report</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 800px; margin: 0 auto; padding: 20px; }
    h1 { color: #1a1a1a; border-bottom: 2px solid #007bff; padding-bottom: 10px; }
    h2 { color: #444; margin-top: 30px; margin-bottom: 15px; }
    .section { margin-bottom: 30px; }
    table { width: 100%; border-collapse: collapse; margin: 15px 0; }
    th, td { text-align: left; padding: 10px; border-bottom: 1px solid #ddd; }
    th { background-color: #f5f5f5; font-weight: 600; }
    .metric-row { background-color: #f9f9f9; padding: 15px; margin: 10px 0; border-radius: 4px; }
    .positive { color: #28a745; }
    .negative { color: #dc3545; }
    .neutral { color: #6c757d; }
    .timestamp { font-size: 0.85em; color: #666; margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; }
  </style>
</head>
<body>
  <div class="container">
    <h1>CiteUp Daily Report</h1>
    <p>Generated: ${generatedAt.toLocaleString("en-US", { timeZone: "America/Los_Angeles" })}</p>

    ${
      newUsers.length > 0
        ? `
    <div class="section">
      <h2>New Users (Past 24h)</h2>
      <table>
        <thead>
          <tr><th>Email</th><th>Account ID</th><th>Created</th></tr>
        </thead>
        <tbody>
          ${newUsers.map((u) => `<tr><td>${u.email}</td><td>${u.accountId}</td><td>${u.createdAt.toLocaleDateString()}</td></tr>`).join("")}
        </tbody>
      </table>
    </div>
    `
        : "<div class='section'><h2>New Users</h2><p>None in the past 24 hours.</p></div>"
    }

    ${
      newSites.length > 0
        ? `
    <div class="section">
      <h2>New Sites (Past 24h)</h2>
      ${newSites
        .map(
          (site) => `
        <div class="metric-row">
          <strong>${site.domain}</strong><br>
          <small>Account: ${site.account.id} | Users: ${site.account.users.map((u) => u.email).join(", ")}</small>
          ${
            site.topBotVisits.length > 0
              ? `
          <h3>Top Bot Visits</h3>
          <ul>
            ${site.topBotVisits.map((v) => `<li>${v.botType}: ${v.count} visits</li>`).join("")}
          </ul>
          `
              : ""
          }
          ${
            site.botInsight
              ? `
          <h3>Bot Insight (Updated today)</h3>
          <p>${site.botInsight.content.split("\n").slice(0, 2).join(" ")}</p>
          `
              : ""
          }
        </div>
      `,
        )
        .join("")}
    </div>
    `
        : "<div class='section'><h2>New Sites</h2><p>None in the past 24 hours.</p></div>"
    }

    <div class="section">
      <h2>Account Metrics (Citation Query Score)</h2>
      ${accountMetrics
        .map(
          (metric) => `
        <div class="metric-row">
          <strong>${metric.hostname || metric.accountId}</strong><br>
          Current: <strong>${metric.currentScore}</strong> | Previous 24h: ${metric.previousScore}
          <br>
          Change: <span class="${metric.change > 0 ? "positive" : metric.change < 0 ? "negative" : "neutral"}">
            ${metric.change > 0 ? "+" : ""}${metric.change} (${metric.changePercent > 0 ? "+" : ""}${metric.changePercent}%)
          </span>
        </div>
      `,
        )
        .join("")}
    </div>

    <div class="timestamp">
      <em>This is an automated report sent daily at 6 AM Pacific. Do not reply to this email.</em>
    </div>
  </div>
</body>
</html>
  `;
}
```

**Step 3: Run tests to verify the module loads**

Run: `pnpm typecheck`

Expected: No TypeScript errors

---

## Task 2: Add Email Function to email.server.ts

**Files:**
- Modify: `app/lib/email.server.ts`

**Acceptance Criteria:**
- [ ] New `sendDailyReportEmail()` function
- [ ] Accepts HTML content and recipient email
- [ ] Uses Resend client
- [ ] Throws on error (following existing pattern)

**Step 1: Read existing email functions**

Read: `app/lib/email.server.ts` (lines 1-27)

**Step 2: Add new email function**

Edit `app/lib/email.server.ts` and add after the existing functions:

```typescript
export async function sendDailyReportEmail(to: string, html: string) {
  const { error } = await resend.emails.send({
    from: envVars.EMAIL_FROM,
    to,
    subject: "CiteUp Daily Report",
    html,
  });
  if (error) throw new Error(error.message);
}
```

**Step 3: Verify TypeScript**

Run: `pnpm typecheck`

Expected: No errors

---

## Task 3: Create the Cron Route

**Files:**
- Create: `app/routes/cron.daily-report.ts`

**Acceptance Criteria:**
- [ ] Protected by CRON_SECRET (matches existing pattern)
- [ ] Calls `generateDailyReport()` from reports.server.ts
- [ ] Calls `sendDailyReportEmail()` with generated HTML
- [ ] Logs via debug logger
- [ ] Captures errors to Sentry
- [ ] Returns JSON response with status and results

**Step 1: Read existing cron route**

Read: `app/routes/cron.citation-runs.ts` (entire file)

**Step 2: Create the cron route**

Create `app/routes/cron.daily-report.ts`:

```typescript
import { captureException } from "@sentry/react-router";
import debug from "debug";
import envVars from "~/lib/envVars";
import { sendDailyReportEmail } from "~/lib/email.server";
import { generateDailyReport } from "~/lib/reports.server";
import type { Route } from "./+types/cron.daily-report";

const logger = debug("server");

// Vercel Cron fires a GET with Authorization: Bearer <CRON_SECRET>.
export async function loader({ request }: Route.LoaderArgs) {
  const cronSecret = envVars.CRON_SECRET;
  if (cronSecret) {
    const auth = request.headers.get("Authorization");
    if (auth !== `Bearer ${cronSecret}`)
      return new Response("Unauthorized", { status: 401 });
  }

  try {
    logger("[cron:daily-report] Generating report");
    const html = await generateDailyReport();

    const reportEmail = envVars.REPORT_EMAIL;
    if (!reportEmail) {
      logger("[cron:daily-report] REPORT_EMAIL not configured");
      return Response.json({
        ok: false,
        error: "REPORT_EMAIL not configured",
      });
    }

    await sendDailyReportEmail(reportEmail, html);
    logger("[cron:daily-report] Report sent to %s", reportEmail);

    return Response.json({ ok: true, sentTo: reportEmail });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger("[cron:daily-report] Failed: %s", message);
    captureException(error);
    return Response.json(
      { ok: false, error: message },
      { status: 500 },
    );
  }
}
```

**Step 3: Generate React Router types**

Run: `pnpm react-router typegen`

Expected: No errors, `+types/cron.daily-report.ts` is generated

**Step 4: Verify TypeScript**

Run: `pnpm typecheck`

Expected: No errors

---

## Task 4: Add REPORT_EMAIL to Environment Variables

**Files:**
- Modify: `app/lib/envVars.ts`

**Acceptance Criteria:**
- [ ] REPORT_EMAIL added to envVars
- [ ] Uses env-var validation
- [ ] Follows existing pattern

**Step 1: Read envVars**

Read: `app/lib/envVars.ts` (check pattern for adding new vars)

**Step 2: Add REPORT_EMAIL variable**

Edit `app/lib/envVars.ts` and add the REPORT_EMAIL variable following the existing pattern. Example (exact location depends on file structure):

```typescript
REPORT_EMAIL: env.asString("REPORT_EMAIL").required(),
```

**Step 3: Update .env**

Add to your `.env` file:

```
REPORT_EMAIL=your-email@example.com
```

**Step 4: Verify TypeScript**

Run: `pnpm typecheck`

Expected: No errors

---

## Task 5: Configure Vercel Cron Schedule

**Files:**
- Modify: `vercel.json` (create if it doesn't exist)

**Acceptance Criteria:**
- [ ] Cron schedule configured to call `/cron/daily-report`
- [ ] Schedule set to 6 AM Pacific time
- [ ] Matches existing cron pattern

**Step 1: Check for vercel.json**

Run: `ls -la vercel.json`

If it exists, read it. If not, it will be created.

**Step 2: Add or update vercel.json**

The schedule `0 6 * * *` is in UTC. For 6 AM Pacific:
- During PST (winter): 6 AM PST = 2 PM UTC → `0 14 * * *`
- During PDT (summer): 6 AM PDT = 1 PM UTC → `0 13 * * *`

Since we can't account for DST in a static config, use `0 14 * * *` (2 PM UTC = 6 AM PST, which covers winter). Add to `vercel.json`:

```json
{
  "crons": [
    {
      "path": "/cron/daily-report",
      "schedule": "0 14 * * *"
    }
  ]
}
```

If other crons already exist in `vercel.json`, add this to the `crons` array.

---

## Task 6: Manual Testing

**Files:**
- None (testing only)

**Acceptance Criteria:**
- [ ] Can hit cron endpoint with valid CRON_SECRET
- [ ] Receives JSON response with status
- [ ] Email is sent to REPORT_EMAIL
- [ ] Email HTML renders correctly

**Step 1: Test the endpoint manually**

Run this curl command (replace `YOUR_SECRET` and `YOUR_EMAIL`):

```bash
curl -H "Authorization: Bearer YOUR_SECRET" http://localhost:5173/cron/daily-report
```

Expected: JSON response like `{"ok":true,"sentTo":"your-email@example.com"}`

**Step 2: Check your inbox**

Verify the email arrived with:
- Subject: "CiteUp Daily Report"
- HTML content with sections for new users, new sites, bot visits, and account metrics
- Timestamp in Pacific time

**Step 3: Verify data accuracy**

- Check database for users/sites created in past 24 hours
- Compare with email content
- Verify citation scores are calculated correctly

**Step 4: Test with missing REPORT_EMAIL**

Temporarily remove `REPORT_EMAIL` from `.env` and test again:

```bash
curl -H "Authorization: Bearer YOUR_SECRET" http://localhost:5173/cron/daily-report
```

Expected: JSON response `{"ok":false,"error":"REPORT_EMAIL not configured"}`

Restore `REPORT_EMAIL` after testing.

---

## Summary of Changes

- **New files**: `app/lib/reports.server.ts`, `app/routes/cron.daily-report.ts`
- **Modified files**: `app/lib/email.server.ts`, `app/lib/envVars.ts`, `vercel.json`
- **New env var**: `REPORT_EMAIL`
- **Total tasks**: 6 (each 2-15 minutes)

## Testing Strategy

No new test files needed. Manual testing via curl confirms the entire flow works end-to-end.
