# Daily Email Report Design

## Overview

A daily email report that aggregates metrics across all accounts and sends to a personal email inbox at 6 AM Pacific each morning. Shows new users, new sites, bot traffic, and citation query performance comparisons.

## Requirements

- **Recipient**: Single email to user's personal address
- **Schedule**: 6 AM Pacific daily
- **Data window**: Past 24 hours for current metrics; past 24 hours + previous 24 hours for comparisons
- **Scope**: All accounts

## Report Sections

### 1. New Users (past 24 hours)
List all newly created users with creation timestamp.

### 2. New Sites (past 24 hours)
For each new site:
- Site domain
- Account ID and email addresses of all users in that account
- Top 3 bot visits (ranked by visit count from past 24h)
- Bot insight summary (only if `BotInsight.updatedAt` is within past 24h) — first two sentences

### 3. Account Metrics (past 24 hours)
For each account:
- Average citation query score
  - Current 24 hours
  - Previous 24 hours (24-48 hours ago)
  - Direction indicator (up/down/same)
- Score calculation: 50 points for position 1 citations, 10 points for other positions (uses existing function)

## Architecture

### Cron Route: `/cron.daily-report`
- Protected by `CRON_SECRET` in Authorization header (matches existing cron pattern)
- Executes as GET request
- Returns JSON with success/failure status and results

### Report Generation: `app/lib/reports.server.ts`
Exported functions:
- `generateDailyReport()` — queries all data and returns HTML string
- Helper: query new users
- Helper: query new sites with account details
- Helper: query top bot visits by count
- Helper: query bot insights updated in past 24h
- Helper: query and score citation queries (current vs previous 24h)

### Email Sending
- Uses existing `Resend` client from `app/lib/resend.server`
- HTML template with responsive design
- From: `envVars.EMAIL_FROM`
- To: new env var `REPORT_EMAIL` (user's personal email)

### Scheduling: `vercel.json`
```json
{
  "crons": [
    {
      "path": "/cron/daily-report",
      "schedule": "0 6 * * *"
    }
  ]
}
```
The cron expression `0 6 * * *` is UTC-based. Since we need 6 AM Pacific, we'll use 2 PM UTC (6 AM PST) or 1 PM UTC (6 AM PDT), requiring timezone handling or manual offset adjustment.

## Data Queries

All queries use `prisma` with date filters:
- `new Date(Date.now() - 24 * 60 * 60 * 1000)` for "past 24 hours"
- `new Date(Date.now() - 48 * 60 * 60 * 1000)` for "24-48 hours ago"

## Error Handling

- Catch errors at route level, log via debug logger
- Capture via Sentry (existing pattern)
- Return 500 response if report generation fails
- Resend send errors are thrown (route handler catches)

## Testing

No special testing needed beyond manual verification. Can test by:
1. Manually hitting the cron endpoint with CRON_SECRET
2. Verifying email receipt
3. Checking data accuracy against database

## Environment Variables

New:
- `REPORT_EMAIL` — recipient email address
