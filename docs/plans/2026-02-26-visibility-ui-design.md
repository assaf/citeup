# Visibility UI Design

**Date:** 2026-02-26

## Goal

Show LLM citation visibility for the first account found, based on all historical citation runs, in the home route.

## Route

`app/routes/home/route.tsx` — loader finds the first `Account`, loads all `CitationQueryRun`s with their `CitationQuery` children (newest first). Component renders platform tabs (chatgpt, perplexity, claude, gemini), each containing the table then charts.

## Components

### `RecentVisibility.tsx`

Per-query table for the most recent run on a given platform.

- Groups `CitationQuery` rows by `query`, computes per-query:
  - **Visibility %** — share of repetitions where `position !== null`
  - **Avg citations** — mean of `citations.length` across repetitions
  - **Score** — per rep: 50 if `position === 0`, else `10 × (citations.length - position)` when mentioned, 0 otherwise; averaged
- Card header shows run date, model, check count
- Table rows highlight green when visibility > 0%
- Footer row shows column averages

### `VisibilityCharts.tsx`

Three time-series area charts across all runs for a platform.

- Each run → one data point: visibility %, citation ratio, score
- **Citation ratio** — avg of `1 / citations.length` when mentioned
- Sorted oldest→newest, rendered with `ChartContainer` + Recharts `AreaChart`
- Three stacked responsive charts (blue, orange, green)

## Data Adaptation (rentail → citeup)

| rentail | citeup |
|---------|--------|
| `check.mentioned` | `query.position !== null` |
| `isRentail(url)` | `new URL(url).hostname === account.hostname` |
| `check.position` | `query.position` |

## Files Changed

- `app/routes/home/route.tsx` — loader + tabbed layout
- `app/routes/home/RecentVisibility.tsx` — new
- `app/routes/home/VisibilityCharts.tsx` — new
