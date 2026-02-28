# Sites Page Design

**Date:** 2026-02-27
**Status:** Approved

## Overview

Add a `/sites` management section so authenticated users can view their monitored sites and add new ones. This is the primary onboarding flow — without a site, the home dashboard has nothing to show.

## Routes

### `/sites` — Site list (`app/routes/sites/route.tsx`)
- Loader: `requireUser` → fetch all `Site` records for `user.accountId`
- Component: table/card list with columns — domain, created date, link to `/sites/:id`
- Empty state: marketing copy explaining LLM citation monitoring + "Add your first site" button → `/sites/new`

### `/sites/new` — Add site (`app/routes/sites.new/route.tsx`)
- Single page, multi-step form controlled by a hidden `step` field
- All intermediate server work (DNS, fetch) handled in the action
- On success: redirects to `/sites`

### `/sites/:id` — Site detail (`app/routes/sites.$id/route.tsx`)
- Placeholder: shows domain name and created date

## Add Site Flow

Four steps driven by a hidden `step` form field:

1. **URL input** — user enters a URL; server extracts hostname, validates it's a real public domain (no localhost, no bare IPs)
2. **DNS verification** — server runs `dns.promises.resolve()` for A and CNAME records with a 5s timeout; blocks if nothing resolves
3. **Fetch page content** — server fetches the homepage with a 10s timeout; extracts and truncates text to ~5000 chars; blocks on failure
4. **Confirm & save** — shows summary (domain, DNS ✓, content snippet); user confirms → creates `Site` DB record → redirects to `/sites`

State between steps passes via hidden form fields (domain, content). No session storage.

## Error Handling

| Scenario | Behavior |
|---|---|
| Duplicate domain on same account | Error: "That domain is already added" |
| DNS no records / timeout (5s) | Error: "No DNS records found for domain.com" |
| Homepage fetch failure / timeout (10s) | Error: "Couldn't fetch your site — is it live?" |
| Content too small (<100 chars) | Warning shown, but allow proceeding |

## UI

- `/sites` — `PageLayout` with standard header/footer; table or card list; centered empty state with CTA
- `/sites/new` — `PageLayout`; centered card (`max-w-lg`); step indicator (step N of 4); completed steps show checkmark summary; uses existing `Input`, `Button`, `FieldSet` components
- `/sites/:id` — minimal placeholder

No new components needed.

## Follow-on

The current home route (`/`) throws 404 when no site exists. After this ships, change that to redirect to `/sites` instead.
