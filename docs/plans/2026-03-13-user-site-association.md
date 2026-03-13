# User-Site Association Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers-extended-cc:executing-plans to implement this plan task-by-task.

**Goal:** Replace Account-based architecture with direct User-Site associations — sites are owned by a user, support many-many membership via a join table, each site has its own API key, and users can invite others to their sites.

**Architecture:** Remove the `Account` model entirely. `Site` gains `ownerId` (FK → `User`) and `apiKey`. A new `SiteUser` join table handles shared access. A `SiteInvitation` model drives the email-based invite flow. `UsageEvent` moves from account-scoped to site-scoped.

**Tech Stack:** Prisma (PostgreSQL), React Router v7, React Email + Resend, TypeScript, Vitest

**Design doc:** `docs/plans/2026-03-13-user-site-association-design.md`

---

### Task 1: Update Prisma schema

**Files:**
- Modify: `prisma/schema.prisma`

**Step 1: Edit the schema**

Make ALL of the following changes together:

1. **Delete the `Account` model** (lines 17-27)

2. **Update `Site` model** — replace `account`/`accountId` fields with `owner`/`ownerId`, add `apiKey`, change unique constraint:
```prisma
model Site {
  owner                User                  @relation("OwnedSites", fields: [ownerId], references: [id], onDelete: Cascade)
  ownerId              String                @map("owner_id")
  apiKey               String                @map("api_key") @unique @default("")
  botInsight           BotInsight?
  botVisits            BotVisit[]
  citationRuns         CitationQueryRun[]
  content              String?               @map("content")
  createdAt            DateTime              @map("created_at") @default(now())
  domain               String                @map("domain")
  id                   String                @id @default(cuid())
  siteQueries          SiteQuery[]
  siteQuerySuggestions SiteQuerySuggestion[]
  siteUsers            SiteUser[]
  siteInvitations      SiteInvitation[]
  usageEvents          UsageEvent[]
  updatedAt            DateTime              @map("updated_at") @updatedAt

  @@index([domain])
  @@unique([ownerId, domain])
  @@map("sites")
}
```

3. **Update `User` model** — remove `account`/`accountId`, add back-relations for owned sites, site memberships, sent invitations:
```prisma
model User {
  createdAt               DateTime                 @map("created_at")        @default(now())
  email                   String                   @map("email")             @unique
  emailVerificationTokens EmailVerificationToken[]
  emailVerifiedAt         DateTime?                @map("email_verified_at")
  id                      String                                             @id @default(cuid())
  ownedSites              Site[]                   @relation("OwnedSites")
  passwordHash            String                   @map("password_hash")
  passwordRecoveryTokens  PasswordRecoveryToken[]
  sessions                Session[]
  siteUsers               SiteUser[]
  sentInvitations         SiteInvitation[]         @relation("SentInvitations")
  updatedAt               DateTime                 @map("updated_at")        @updatedAt

  @@map("users")
}
```

4. **Update `UsageEvent` model** — replace `accountId`/`account` with `siteId`/`site`:
```prisma
model UsageEvent {
  id           String                         @id @default(cuid())
  createdAt    DateTime @map("created_at")    @default(now())
  siteId       String   @map("site_id")
  site         Site     @relation(fields: [siteId], references: [id], onDelete: Cascade)
  model        String   @map("model")
  inputTokens  Int      @map("input_tokens")  @default(0)
  outputTokens Int      @map("output_tokens") @default(0)
  cost         Decimal  @map("cost")          @db.Decimal(10, 6)

  @@index([siteId, createdAt])
  @@map("usage_events")
}
```

5. **Add `SiteUser` model** (after `Site`):
```prisma
model SiteUser {
  siteId    String   @map("site_id")
  userId    String   @map("user_id")
  createdAt DateTime @map("created_at") @default(now())

  site      Site     @relation(fields: [siteId], references: [id], onDelete: Cascade)
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@id([siteId, userId])
  @@map("site_users")
}
```

6. **Add `SiteInvitation` model and `InvitationStatus` enum** (after `SiteUser`):
```prisma
enum InvitationStatus {
  PENDING
  ACCEPTED
  EXPIRED
}

model SiteInvitation {
  id          String           @id @default(cuid())
  siteId      String           @map("site_id")
  invitedById String           @map("invited_by_id")
  email       String           @map("email")
  token       String           @map("token") @unique
  status      InvitationStatus @default(PENDING)
  createdAt   DateTime         @map("created_at") @default(now())
  acceptedAt  DateTime?        @map("accepted_at")

  site        Site             @relation(fields: [siteId], references: [id], onDelete: Cascade)
  invitedBy   User             @relation("SentInvitations", fields: [invitedById], references: [id])

  @@map("site_invitations")
}
```

**Step 2: Push schema to database and regenerate client**

```bash
pnpm prisma db push
pnpm prisma generate
```

Expected: both commands succeed with no errors.

**Step 3: Commit**

```bash
git add prisma/schema.prisma
git commit -m "feat: update schema — remove Account, add SiteUser and SiteInvitation"
```

---

### Task 2: Write and run data migration script

**Files:**
- Create: `scripts/migrate-user-site.ts`

**Step 1: Write the migration script**

```typescript
#!/usr/bin/env tsx
import { generateApiKey } from "random-password-toolkit";
import { PrismaClient } from "../prisma/generated/client/index.js";

const prisma = new PrismaClient();

async function main() {
  // @ts-expect-error Account model is being removed — this script runs before the code is updated
  const accounts = await (prisma as any).account.findMany({
    include: { users: { orderBy: { createdAt: "asc" } }, sites: true, usageEvents: true },
  });

  console.log(`Migrating ${accounts.length} accounts...`);

  for (const account of accounts) {
    if (account.users.length === 0) {
      console.log(`Skipping account ${account.id} — no users`);
      continue;
    }

    const owner = account.users[0];
    const otherUsers = account.users.slice(1);
    console.log(`Account ${account.id}: owner=${owner.email}, sites=${account.sites.length}, extra users=${otherUsers.length}`);

    for (const site of account.sites) {
      // Set ownerId + generate apiKey for each site
      await (prisma as any).site.update({
        where: { id: site.id },
        data: {
          ownerId: owner.id,
          apiKey: `cite.me.in_${generateApiKey(16)}`,
        },
      });

      // Create SiteUser records for additional users
      for (const user of otherUsers) {
        await prisma.siteUser.upsert({
          where: { siteId_userId: { siteId: site.id, userId: user.id } },
          create: { siteId: site.id, userId: user.id },
          update: {},
        });
      }
    }

    // Migrate usage events to the first site (best-effort)
    if (account.sites.length > 0 && account.usageEvents.length > 0) {
      const firstSite = account.sites[0];
      await (prisma as any).usageEvent.updateMany({
        where: { accountId: account.id },
        data: { siteId: firstSite.id },
      });
    }
  }

  // Clear accountId from users
  await (prisma as any).user.updateMany({ data: { accountId: null } });

  console.log("Migration complete.");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
```

Note: This script uses `as any` casts because the new Prisma client no longer has Account. It needs to be run BEFORE the Account table is dropped. The schema still has `accountId` nullable at the DB level from the previous `db push`.

**Step 2: Run the migration (development only)**

```bash
npx tsx scripts/migrate-user-site.ts
```

Expected: prints account migration summary, no errors.

**Step 3: Commit**

```bash
git add scripts/migrate-user-site.ts
git commit -m "chore: add account-to-user migration script"
```

---

### Task 3: Update auth.server.ts

**Files:**
- Modify: `app/lib/auth.server.ts`

**Step 1: Update `getCurrentUser` and `requireUser`**

Remove `include: { account: true }` from both functions. Update return types to plain `User`.

Replace lines 108-145 with:
```typescript
export async function getCurrentUser(request: Request): Promise<User | null> {
  const cookieHeader = request.headers.get("Cookie");
  const token = await sessionCookie.parse(cookieHeader);
  if (!token) return null;
  const session = await prisma.session.findUnique({
    where: { token },
    include: { user: true },
  });
  return session?.user ?? null;
}

export async function requireUser(request: Request): Promise<User> {
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
```

Add `import type { User } from "~/prisma";` at top (replace `import type { Prisma } from "~/prisma";` if no longer needed).

**Step 2: Run typecheck**

```bash
pnpm typecheck
```

Expected: errors only about `user.accountId` / `user.account` usages elsewhere — those are fixed in subsequent tasks.

**Step 3: Commit**

```bash
git add app/lib/auth.server.ts
git commit -m "refactor: remove account relation from auth — return plain User"
```

---

### Task 4: Update sign-up route

**Files:**
- Modify: `app/routes/sign-up/route.tsx`

**Step 1: Remove Account creation from sign-up transaction**

Replace the `prisma.$transaction` block (lines 48-57):
```typescript
const user = await prisma.user.create({
  data: { email, passwordHash },
});
```

Remove the `import { generateApiKey } from "random-password-toolkit";` line.

**Step 2: Handle invite param — after successful sign-up, redirect to invite if present**

In the action, after `return redirect("/sites", ...)`, check for `?invite` param first:
```typescript
const inviteToken = (form.get("inviteToken") ?? "").toString().trim();

// ... existing validation + user creation ...

const setCookie = await createSession(user.id, request);

// ... send verification email ...

const redirectTo = inviteToken ? `/invite/${inviteToken}` : "/sites";
return redirect(redirectTo, { headers: { "Set-Cookie": setCookie } });
```

In the JSX, add a hidden field if the invite token is in the URL:
```typescript
// In loader:
export async function loader({ request }: Route.LoaderArgs) {
  const url = new URL(request.url);
  return { inviteToken: url.searchParams.get("invite") ?? "" };
}

// In component, inside <Form>:
{loaderData.inviteToken && (
  <input type="hidden" name="inviteToken" value={loaderData.inviteToken} />
)}
```

**Step 3: Run typecheck**

```bash
pnpm typecheck
```

**Step 4: Commit**

```bash
git add app/routes/sign-up/route.tsx
git commit -m "feat: sign-up creates user directly, no account; support invite redirect"
```

---

### Task 5: Update sign-in route for invite redirect

**Files:**
- Modify: `app/routes/sign-in/route.tsx`

**Step 1: Read sign-in route**

Read `app/routes/sign-in/route.tsx` first to understand current structure.

**Step 2: Add invite param handling**

After successful sign-in and session creation, redirect to `/invite/$token` if an invite token was passed. Same pattern as sign-up:
- Loader returns `inviteToken` from URL
- Action reads `inviteToken` from form, redirects to `/invite/$token` instead of `/sites` if present
- Hidden input in form

**Step 3: Run typecheck and commit**

```bash
pnpm typecheck
git add app/routes/sign-in/route.tsx
git commit -m "feat: sign-in redirects to invite after auth if invite token present"
```

---

### Task 6: Update sites.server.ts

**Files:**
- Modify: `app/lib/sites.server.ts`

**Step 1: Replace `addSiteToAccount` with `addSiteToUser`**

```typescript
export async function addSiteToUser(
  user: { id: string },
  url: string,
): Promise<{ site: Site; existing: boolean }> {
  const domain = extractDomain(url);
  if (!domain) throw new Error("Enter a valid website URL or domain name");

  const existing = await prisma.site.findFirst({
    where: { ownerId: user.id, domain },
  });
  if (existing) return { site: existing, existing: true };

  const content = await fetchSiteContent({ domain, maxWords: 5_000 });
  const site = await prisma.site.create({
    data: {
      owner: { connect: { id: user.id } },
      apiKey: `cite.me.in_${generateApiKey(16)}`,
      content,
      domain,
    },
  });
  return { site, existing: false };
}
```

Add `import { generateApiKey } from "random-password-toolkit";` at the top.

**Step 2: Update `loadSitesWithMetrics`**

Change the signature and query — userId instead of accountId, OR pattern for owner/member:

```typescript
export async function loadSitesWithMetrics(userId: string): Promise<...> {
  // ...
  const sites = await prisma.site.findMany({
    include: { ... },
    orderBy: [{ domain: "asc" }, { createdAt: "desc" }],
    where: {
      OR: [
        { ownerId: userId },
        { siteUsers: { some: { userId } } },
      ],
    },
  });
  // rest is unchanged
```

**Step 3: Update `deleteSite`**

```typescript
export async function deleteSite({
  userId,
  siteId,
}: {
  userId: string;
  siteId: string;
}): Promise<void> {
  const site = await prisma.site.findFirst({
    where: { id: siteId, ownerId: userId },
  });
  if (site) await prisma.site.delete({ where: { id: siteId } });
}
```

Note: Only owner can delete a site. Members cannot.

Remove `import type { Account, Site } from "~/prisma";` — replace with just `Site`.

**Step 4: Run typecheck**

```bash
pnpm typecheck
```

**Step 5: Commit**

```bash
git add app/lib/sites.server.ts
git commit -m "refactor: sites.server — user-scoped site operations, site generates its own API key"
```

---

### Task 7: Update usage tracking (usageLimit.server.ts + queryPlatform.ts + queryAccount.ts)

**Files:**
- Modify: `app/lib/usage/usageLimit.server.ts`
- Modify: `app/lib/llm-visibility/queryPlatform.ts`
- Modify: `app/lib/llm-visibility/queryAccount.ts`

**Step 1: Update `usageLimit.server.ts`**

Replace `accountId` with `siteId` throughout:
- `recordUsageEvent({ siteId, model, inputTokens, outputTokens })`
- `checkUsageLimits(siteId: string)`
- All Prisma queries: `where: { siteId, ... }`

**Step 2: Update `queryPlatform.ts`**

Replace `accountId: string` param with `siteId: string` in both `queryPlatform` and `singleQueryRepetition` function signatures. Update all calls to `recordUsageEvent` and `checkUsageLimits` to pass `siteId`.

**Step 3: Update `queryAccount.ts`**

Replace `accountId: site.accountId` with `siteId: site.id` in all four `queryPlatform` calls.

**Step 4: Run typecheck**

```bash
pnpm typecheck
```

**Step 5: Commit**

```bash
git add app/lib/usage/usageLimit.server.ts app/lib/llm-visibility/queryPlatform.ts app/lib/llm-visibility/queryAccount.ts
git commit -m "refactor: usage events and limits are now site-scoped instead of account-scoped"
```

---

### Task 8: Update api.track.ts

**Files:**
- Modify: `app/routes/api.track.ts`

**Step 1: Change site lookup**

Replace:
```typescript
const site = await prisma.site.findFirst({
  where: { domain: hostname, account: { apiKey } },
});
```

With:
```typescript
const site = await prisma.site.findFirst({
  where: { domain: hostname, apiKey },
});
```

**Step 2: Run typecheck and commit**

```bash
pnpm typecheck
git add app/routes/api.track.ts
git commit -m "fix: api.track looks up site by site.apiKey instead of account.apiKey"
```

---

### Task 9: Update root.tsx and all site.$id_ routes

**Files:**
- Modify: `app/root.tsx`
- Modify: `app/routes/site.$id_.citations/route.tsx`
- Modify: `app/routes/site.$id_.queries/route.tsx`
- Modify: `app/routes/site.$id_.bots/route.tsx`
- Modify: `app/routes/site.$id_.suggestions/route.tsx`

**Step 1: Update root.tsx**

Change:
```typescript
where: { accountId: user.accountId },
```
To:
```typescript
where: {
  OR: [
    { ownerId: user.id },
    { siteUsers: { some: { userId: user.id } } },
  ],
},
```

**Step 2: Update each site.$id_ route**

In each loader, change the site authorization check from:
```typescript
where: { id: params.id, accountId: user.accountId },
```
To:
```typescript
where: {
  id: params.id,
  OR: [
    { ownerId: user.id },
    { siteUsers: { some: { userId: user.id } } },
  ],
},
```

Do this for all four site routes. Read each file first to locate the exact line.

**Step 3: Run typecheck**

```bash
pnpm typecheck
```

**Step 4: Commit**

```bash
git add app/root.tsx app/routes/site.$id_.citations/route.tsx app/routes/site.$id_.queries/route.tsx app/routes/site.$id_.bots/route.tsx app/routes/site.$id_.suggestions/route.tsx
git commit -m "refactor: site authorization — OR check for owner or member"
```

---

### Task 10: Update sites dashboard route

**Files:**
- Modify: `app/routes/sites/route.tsx`
- Modify: `app/routes/sites/SiteEntry.tsx` (if exists, else just route.tsx)

**Step 1: Update loader and action**

In the loader, change `loadSitesWithMetrics(user.accountId)` → `loadSitesWithMetrics(user.id)`.

In the POST action, change `addSiteToAccount(user.account, url)` → `addSiteToUser(user, url)`.

In the DELETE action, change `deleteSite({ accountId: user.accountId, siteId })` → `deleteSite({ userId: user.id, siteId })`.

Update imports accordingly.

**Step 2: Add owner/member badge to site list**

The `loadSitesWithMetrics` return type needs to include whether the user is the owner. Update the function to include `isOwner: boolean` in the return:
```typescript
// In loadSitesWithMetrics, return:
return sites.map((site) => ({
  // ... existing fields ...
  isOwner: site.ownerId === userId,
}));
```

Pass `isOwner` through to `SiteEntry` and show a small badge — read `SiteEntry.tsx` first to see where it fits.

**Step 3: Run typecheck**

```bash
pnpm typecheck
```

**Step 4: Commit**

```bash
git add app/routes/sites/
git commit -m "feat: dashboard uses user-scoped site loading, shows owner/member badge"
```

---

### Task 11: Remove account route, update AccountMenu

**Files:**
- Delete: `app/routes/account/route.tsx`
- Modify: `app/components/layout/AccountMenu.tsx`

**Step 1: Delete the account route**

```bash
rm app/routes/account/route.tsx
```

If there's a directory `app/routes/account/`, remove the whole directory.

**Step 2: Update AccountMenu**

Remove the "Account" menu item (the `<li>` containing `to="/account"` and `label="Account"`).

**Step 3: Run typecheck**

```bash
pnpm typecheck
```

**Step 4: Commit**

```bash
git add app/components/layout/AccountMenu.tsx
git rm app/routes/account/route.tsx
git commit -m "feat: remove account settings page and menu link"
```

---

### Task 12: Create site settings route (API key + members)

**Files:**
- Create: `app/routes/site.$id_.settings/route.tsx`
- Modify: `app/components/layout/PageHeader.tsx`

**Step 1: Create the settings route**

```typescript
import { CheckIcon, XIcon } from "lucide-react";
import { useState } from "react";
import { Form, useFetcher } from "react-router";
import { Button } from "~/components/ui/Button";
import Main from "~/components/ui/Main";
import SitePageHeader from "~/components/ui/SitePageHeader";
import { requireUser } from "~/lib/auth.server";
import envVars from "~/lib/envVars";
import prisma from "~/lib/prisma.server";
import type { Route } from "./+types/route";

export const handle = { siteNav: true };

export function meta({ loaderData }: Route.MetaArgs) {
  return [{ title: `Settings — ${loaderData?.site.domain} | Cite.me.in` }];
}

export async function loader({ request, params }: Route.LoaderArgs) {
  const user = await requireUser(request);
  const site = await prisma.site.findFirst({
    where: {
      id: params.id,
      OR: [{ ownerId: user.id }, { siteUsers: { some: { userId: user.id } } }],
    },
    include: {
      siteUsers: { include: { user: { select: { id: true, email: true } } } },
      siteInvitations: {
        where: { status: "PENDING" },
        orderBy: { createdAt: "desc" },
      },
    },
  });
  if (!site) throw new Response("Not found", { status: 404 });

  const isOwner = site.ownerId === user.id;
  const script = buildScript(site.apiKey, envVars.BOT_TRACKER_URL);
  return { site, isOwner, script };
}

function buildScript(apiKey: string, endpoint: string) {
  return `// Use this where you're handling HTTP requests:
function requestHandler(request) {
  // fire-and-forget, production only
  if (import.meta.env.PROD) trackBotVisit(request);
  …
}

function trackBotVisit(request: Request) {
  const apiKey = "${apiKey}";
  const endpoint = "${endpoint}";
  fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: \`Bearer \${apiKey}\`,
    },
    body: JSON.stringify({
      accept: request.headers.get("accept"),
      ip: request.headers.get("x-forwarded-for"),
      referer: request.headers.get("referer"),
      url: request.url.toString(),
      userAgent: request.headers.get("user-agent"),
    }),
  }).catch(() => {});
}`.trim();
}

export async function action({ request, params }: Route.ActionArgs) {
  const user = await requireUser(request);
  const site = await prisma.site.findFirst({
    where: { id: params.id, ownerId: user.id },
  });
  if (!site) throw new Response("Forbidden", { status: 403 });

  const formData = await request.formData();
  const intent = formData.get("intent")?.toString();

  if (intent === "remove-member") {
    const userId = formData.get("userId")?.toString();
    if (!userId) return { ok: false as const, error: "User ID required" };
    await prisma.siteUser.deleteMany({ where: { siteId: site.id, userId } });
    return { ok: true as const };
  }

  return { ok: false as const, error: "Unknown intent" };
}

export default function SiteSettingsPage({ loaderData }: Route.ComponentProps) {
  const { site, isOwner, script } = loaderData;
  const [copied, setCopied] = useState(false);
  const fetcher = useFetcher<typeof action>();

  const handleCopy = () => {
    navigator.clipboard.writeText(script);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Main>
      <SitePageHeader site={site} />

      <section className="space-y-4">
        <h2 className="font-heading text-2xl">Bot Tracking API Key</h2>
        <p className="font-bold font-mono text-lg">{site.apiKey}</p>
        <p>Copy and paste this code into your website to track bot traffic.</p>
        <pre className="rounded-base bg-gray-100 p-4 font-mono text-base whitespace-pre-wrap">
          {script}
        </pre>
        <Button onClick={handleCopy} variant="secondary">
          {copied && <CheckIcon className="size-4" />}
          {copied ? "Copied!" : "Copy to clipboard"}
        </Button>
      </section>

      <section className="mt-8 space-y-4">
        <h2 className="font-heading text-2xl">Members</h2>
        <ul className="space-y-2">
          <li className="flex items-center justify-between rounded-base border-2 border-black px-4 py-2">
            <span>You (owner)</span>
          </li>
          {site.siteUsers.map(({ user: member }) => (
            <li key={member.id} className="flex items-center justify-between rounded-base border-2 border-black px-4 py-2">
              <span>{member.email}</span>
              {isOwner && (
                <fetcher.Form method="post">
                  <input type="hidden" name="intent" value="remove-member" />
                  <input type="hidden" name="userId" value={member.id} />
                  <Button type="submit" variant="secondary" size="sm">
                    <XIcon className="size-4" />
                    Remove
                  </Button>
                </fetcher.Form>
              )}
            </li>
          ))}
        </ul>

        {isOwner && (
          <div className="mt-4">
            <h3 className="font-heading text-xl mb-2">Invite a user</h3>
            <Form method="post" action={`/site/${site.id}/invite`} className="flex gap-2">
              <input
                type="email"
                name="email"
                required
                placeholder="their@email.com"
                className="flex-1 rounded-base border-2 border-black px-3 py-2"
              />
              <Button type="submit">Send Invite</Button>
            </Form>

            {site.siteInvitations.length > 0 && (
              <div className="mt-4">
                <h4 className="font-medium mb-2">Pending invitations</h4>
                <ul className="space-y-1">
                  {site.siteInvitations.map((inv) => (
                    <li key={inv.id} className="flex items-center justify-between text-sm">
                      <span>{inv.email}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </section>
    </Main>
  );
}
```

**Step 2: Add "Settings" link to PageHeader nav**

In `app/components/layout/PageHeader.tsx`, in the `HeaderLinks` function, add after "Bot Traffic":
```typescript
{ to: `/site/${siteId}/settings`, label: "Settings" },
```

**Step 3: Run typecheck**

```bash
pnpm typecheck
```

**Step 4: Commit**

```bash
git add app/routes/site.$id_.settings/ app/components/layout/PageHeader.tsx
git commit -m "feat: site settings page — API key, members list, invite form"
```

---

### Task 13: Create invite action route + email

**Files:**
- Create: `app/lib/emails/SiteInvitation.tsx`
- Create: `app/routes/site.$id_.invite.ts`

**Step 1: Create invitation email template**

```typescript
// app/lib/emails/SiteInvitation.tsx
import { Button, Section, Text } from "@react-email/components";
import EmailLayout from "./EmailLayout";
import { sendEmail } from "./sendEmails.server";

export default async function sendSiteInvitationEmail({
  to,
  siteDomain,
  invitedByEmail,
  url,
}: {
  to: string;
  siteDomain: string;
  invitedByEmail: string;
  url: string;
}) {
  await sendEmail({
    to,
    subject: `${invitedByEmail} invited you to ${siteDomain} on Cite.me.in`,
    render: ({ subject }) => (
      <SiteInvitationEmail
        subject={subject}
        siteDomain={siteDomain}
        invitedByEmail={invitedByEmail}
        url={url}
      />
    ),
  });
}

function SiteInvitationEmail({
  subject,
  siteDomain,
  invitedByEmail,
  url,
}: {
  subject: string;
  siteDomain: string;
  invitedByEmail: string;
  url: string;
}) {
  return (
    <EmailLayout subject={subject}>
      <Text className="my-4 text-base text-text leading-relaxed">Hello,</Text>
      <Text className="my-4 text-base text-text leading-relaxed">
        {invitedByEmail} has invited you to join <strong>{siteDomain}</strong> on Cite.me.in.
      </Text>
      <Section className="my-8 text-center">
        <Button
          href={url}
          className="rounded-md bg-primary px-4 py-2 text-white hover:bg-primary-hover"
        >
          Accept Invitation
        </Button>
      </Section>
      <Text className="my-4 text-base text-text leading-relaxed">
        This invitation expires in 7 days. If you don't have an account yet, you'll be asked to create one.
      </Text>
      <Text className="my-4 text-base text-text leading-relaxed">
        Best regards,
        <br />
        The Cite.me.in Team
      </Text>
    </EmailLayout>
  );
}
```

**Step 2: Create the invite action route**

```typescript
// app/routes/site.$id_.invite.ts
import { redirect } from "react-router";
import captureException from "~/lib/captureException.server";
import sendSiteInvitationEmail from "~/lib/emails/SiteInvitation";
import prisma from "~/lib/prisma.server";
import { requireUser } from "~/lib/auth.server";
import type { Route } from "./+types/site.$id_.invite";

export async function action({ request, params }: Route.ActionArgs) {
  const user = await requireUser(request);
  const site = await prisma.site.findFirst({
    where: { id: params.id, ownerId: user.id },
  });
  if (!site) throw new Response("Forbidden", { status: 403 });

  const formData = await request.formData();
  const email = formData.get("email")?.toString().trim().toLowerCase() ?? "";
  if (!email) return redirect(`/site/${site.id}/settings`);

  // Check if already a member
  const existingUser = await prisma.user.findUnique({ where: { email } });
  if (existingUser) {
    const alreadyMember = await prisma.siteUser.findUnique({
      where: { siteId_userId: { siteId: site.id, userId: existingUser.id } },
    });
    if (alreadyMember || existingUser.id === site.ownerId)
      return redirect(`/site/${site.id}/settings`);
  }

  // Cancel any existing pending invite for this email+site
  await prisma.siteInvitation.updateMany({
    where: { siteId: site.id, email, status: "PENDING" },
    data: { status: "EXPIRED" },
  });

  const token = crypto.randomUUID();
  await prisma.siteInvitation.create({
    data: { siteId: site.id, invitedById: user.id, email, token },
  });

  try {
    await sendSiteInvitationEmail({
      to: email,
      siteDomain: site.domain,
      invitedByEmail: user.email,
      url: new URL(`/invite/${token}`, request.url).toString(),
    });
  } catch (error) {
    captureException(error);
  }

  return redirect(`/site/${site.id}/settings`);
}

export async function loader() {
  throw new Response("Not Found", { status: 404 });
}
```

**Step 3: Run typecheck**

```bash
pnpm typecheck
```

**Step 4: Commit**

```bash
git add app/lib/emails/SiteInvitation.tsx app/routes/site.$id_.invite.ts
git commit -m "feat: invite action route — creates SiteInvitation and sends email"
```

---

### Task 14: Create invite acceptance route

**Files:**
- Create: `app/routes/invite.$token/route.tsx`

**Step 1: Create the acceptance route**

```typescript
import { redirect } from "react-router";
import AuthForm from "~/components/ui/AuthForm";
import { Button } from "~/components/ui/Button";
import { getCurrentUser } from "~/lib/auth.server";
import prisma from "~/lib/prisma.server";
import type { Route } from "./+types/route";
import { Link } from "react-router";

export function meta() {
  return [{ title: "Accept Invitation | Cite.me.in" }];
}

export async function loader({ request, params }: Route.LoaderArgs) {
  const invitation = await prisma.siteInvitation.findUnique({
    where: { token: params.token },
    include: { site: { select: { id: true, domain: true } } },
  });

  if (!invitation || invitation.status !== "PENDING")
    return { status: "invalid" as const };

  // Check expiry (7 days)
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  if (invitation.createdAt < sevenDaysAgo) {
    await prisma.siteInvitation.update({
      where: { id: invitation.id },
      data: { status: "EXPIRED" },
    });
    return { status: "expired" as const };
  }

  const user = await getCurrentUser(request);

  if (user) {
    if (user.email.toLowerCase() !== invitation.email.toLowerCase())
      return { status: "wrong-user" as const, invitedEmail: invitation.email };

    // Accept immediately
    await prisma.$transaction([
      prisma.siteUser.upsert({
        where: { siteId_userId: { siteId: invitation.siteId, userId: user.id } },
        create: { siteId: invitation.siteId, userId: user.id },
        update: {},
      }),
      prisma.siteInvitation.update({
        where: { id: invitation.id },
        data: { status: "ACCEPTED", acceptedAt: new Date() },
      }),
    ]);
    throw redirect(`/site/${invitation.siteId}/citations`);
  }

  // Not logged in — check if user exists
  const existingUser = await prisma.user.findUnique({
    where: { email: invitation.email },
  });

  return {
    status: "pending" as const,
    email: invitation.email,
    siteDomain: invitation.site.domain,
    hasAccount: !!existingUser,
    token: params.token,
  };
}

export default function InvitePage({ loaderData }: Route.ComponentProps) {
  if (loaderData.status === "invalid")
    return (
      <AuthForm title="Invalid invitation" form={
        <p>This invitation link is invalid or has already been used.</p>
      } footer={<Link to="/sign-in">Sign in</Link>} />
    );

  if (loaderData.status === "expired")
    return (
      <AuthForm title="Invitation expired" form={
        <p>This invitation has expired. Ask the site owner to send a new one.</p>
      } footer={<Link to="/sign-in">Sign in</Link>} />
    );

  if (loaderData.status === "wrong-user")
    return (
      <AuthForm title="Wrong account" form={
        <p>This invitation was sent to {loaderData.invitedEmail}. Sign in with that email to accept it.</p>
      } footer={<Link to="/sign-in">Sign in</Link>} />
    );

  // status === "pending"
  const { email, siteDomain, hasAccount, token } = loaderData;
  const authPath = hasAccount
    ? `/sign-in?invite=${token}`
    : `/sign-up?invite=${token}`;

  return (
    <AuthForm
      title={`Join ${siteDomain}`}
      form={
        <div className="space-y-4">
          <p>You've been invited to join <strong>{siteDomain}</strong> on Cite.me.in.</p>
          <p className="text-gray-600">This invite was sent to {email}.</p>
          <Button asChild className="w-full">
            <Link to={authPath}>
              {hasAccount ? "Sign in to accept" : "Create account to accept"}
            </Link>
          </Button>
        </div>
      }
    />
  );
}
```

**Step 2: Run typecheck**

```bash
pnpm typecheck
```

**Step 3: Commit**

```bash
git add app/routes/invite.$token/
git commit -m "feat: invitation acceptance route — handles all auth states"
```

---

### Task 15: Run all tests

**Step 1: Run typecheck + lint**

```bash
pnpm typecheck
pnpm lint
```

Fix any remaining issues.

**Step 2: Run vitest**

```bash
pnpm vitest run
```

Review failures. Fix any test that references `user.accountId`, `user.account`, `addSiteToAccount`, or `deleteSite({ accountId })`.

**Step 3: Run playwright tests**

```bash
pnpm playwright test
```

Review failures and fix.

**Step 4: Final commit**

```bash
git add -A
git commit -m "test: fix tests for user-site association refactor"
```
