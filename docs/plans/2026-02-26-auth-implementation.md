# Auth Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers-extended-cc:executing-plans to implement this plan task-by-task.

**Goal:** Add sign-in, sign-up, and password recovery pages with session cookies and Resend email.

**Architecture:** Standard email/password auth using bcryptjs hashes stored on the User record. Sessions are tracked in the DB; the session cookie carries the token. Password recovery issues a short-lived single-use token stored in a new `PasswordRecoveryToken` table and mailed via Resend.

**Tech Stack:** React Router v7 (loaders + actions), Prisma + Postgres, bcryptjs, Resend, existing neobrutalism UI components.

---

## Task 1: Schema — add PasswordRecoveryToken, make Account.hostname optional, migrate

**Files:**
- Modify: `prisma/schema.prisma`

**Step 1: Edit schema**

In `prisma/schema.prisma`, make `Account.hostname` optional (add `?`) and add the new model:

```prisma
model Account {
  id        String             @id @default(cuid())
  createdAt DateTime           @map("created_at") @default(now())
  hostname  String?            @map("hostname")   // ← add ?
  runs      CitationQueryRun[]
  users     User[]
  sites     Site[]

  @@map("accounts")
}

model PasswordRecoveryToken {
  id        String    @id @default(cuid())
  createdAt DateTime  @map("created_at") @default(now())
  token     String    @unique @map("token")
  userId    String    @map("user_id")
  user      User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  expiresAt DateTime  @map("expires_at")
  usedAt    DateTime? @map("used_at")

  @@index([userId])
  @@map("password_recovery_tokens")
}
```

Also add `passwordRecoveryTokens PasswordRecoveryToken[]` to the `User` model.

**Step 2: Run migration**

```bash
pnpm prisma migrate dev --name add-auth-tables
```

Expected: migration created and applied, Prisma client regenerated.

**Step 3: Typecheck**

```bash
pnpm typecheck
```

Expected: no errors.

**Step 4: Commit**

```bash
git add prisma/schema.prisma prisma/migrations/
git commit -m "feat: add PasswordRecoveryToken model, make Account.hostname optional"
```

---

## Task 2: Install dependencies

**Step 1: Install**

```bash
pnpm add bcryptjs resend
pnpm add -D @types/bcryptjs
```

**Step 2: Verify**

```bash
node -e "import('bcryptjs').then(m => console.log('bcryptjs ok', m.default.getRounds))"
node -e "import('resend').then(m => console.log('resend ok', typeof m.Resend))"
```

Expected: both print "ok".

**Step 3: Commit**

```bash
git add package.json pnpm-lock.yaml
git commit -m "chore: add bcryptjs and resend"
```

---

## Task 3: Add env vars

**Files:**
- Modify: `app/lib/envVars.ts`

**Step 1: Edit**

Add three new vars after `SESSION_SECRET`:

```ts
SESSION_SECRET: env.get("SESSION_SECRET").required().asString(),
RESEND_API_KEY: env.get("RESEND_API_KEY").required().asString(),
APP_URL: env.get("APP_URL").required().asUrlString(),
EMAIL_FROM: env.get("EMAIL_FROM").required().asString(),
```

**Step 2: Add to .env**

Add to your local `.env`:
```
RESEND_API_KEY=re_...
APP_URL=http://localhost:5173
EMAIL_FROM=noreply@yourdomain.com
```

**Step 3: Typecheck**

```bash
pnpm typecheck
```

**Step 4: Commit**

```bash
git add app/lib/envVars.ts
git commit -m "feat: add Resend and APP_URL env vars"
```

---

## Task 4: Create app/lib/auth.server.ts

**Files:**
- Create: `app/lib/auth.server.ts`

**Step 1: Write the file**

```ts
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
```

**Step 2: Typecheck**

```bash
pnpm typecheck
```

Expected: no errors.

**Step 3: Commit**

```bash
git add app/lib/auth.server.ts
git commit -m "feat: add auth helpers (hashPassword, verifyPassword, createSession)"
```

---

## Task 5: Create app/lib/email.server.ts

**Files:**
- Create: `app/lib/email.server.ts`

**Step 1: Write the file**

```ts
import { Resend } from "resend";
import envVars from "~/lib/envVars";

const resend = new Resend(envVars.RESEND_API_KEY);

export async function sendPasswordRecoveryEmail(to: string, token: string) {
  const url = `${envVars.APP_URL}/reset-password/${token}`;

  await resend.emails.send({
    from: envVars.EMAIL_FROM,
    to,
    subject: "Reset your citeup password",
    html: `<p>Click <a href="${url}">this link</a> to sign in to citeup. The link expires in 30 minutes and can only be used once.</p><p>If you didn't request this, ignore this email.</p>`,
  });
}
```

**Step 2: Typecheck**

```bash
pnpm typecheck
```

**Step 3: Commit**

```bash
git add app/lib/email.server.ts
git commit -m "feat: add Resend email helper for password recovery"
```

---

## Task 6: Update root loader guard

**Files:**
- Modify: `app/root.tsx`

**Step 1: Edit the guard check**

The current guard only exempts `/sign-in`. Replace:

```ts
if (url.pathname === "/sign-in") return { user: null };
```

With:

```ts
const PUBLIC_PATHS = ["/sign-in", "/sign-up", "/password-recovery"];
if (PUBLIC_PATHS.some((p) => url.pathname === p) || url.pathname.startsWith("/reset-password/"))
  return { user: null };
```

**Step 2: Typecheck**

```bash
pnpm typecheck
```

**Step 3: Commit**

```bash
git add app/root.tsx
git commit -m "feat: exempt sign-up and password recovery from auth redirect"
```

---

## Task 7: Sign-in route

**Files:**
- Create: `app/routes/sign-in/route.tsx`

**Step 1: Write the file**

```tsx
import { Form, Link, redirect } from "react-router";
import { Button } from "~/components/ui/Button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "~/components/ui/Card";
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldSet,
} from "~/components/ui/FieldSet";
import { Input } from "~/components/ui/Input";
import { createSession, verifyPassword } from "~/lib/auth.server";
import prisma from "~/lib/prisma.server";
import type { Route } from "./+types/route";

export async function action({ request }: Route.ActionArgs) {
  const form = await request.formData();
  const email = String(form.get("email") ?? "");
  const password = String(form.get("password") ?? "");

  const user = await prisma.user.findUnique({ where: { email } });

  if (!user || !(await verifyPassword(password, user.passwordHash)))
    return { error: "email and password do not match an existing account" };

  const setCookie = await createSession(user.id, request);

  return redirect("/", { headers: { "Set-Cookie": setCookie } });
}

export default function SignIn({ actionData }: Route.ComponentProps) {
  return (
    <main className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl">Sign in</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-6">
          <Form method="post">
            <FieldSet>
              <FieldGroup>
                <Field>
                  <FieldLabel htmlFor="email">Email</FieldLabel>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor="password">Password</FieldLabel>
                  <Input
                    id="password"
                    name="password"
                    type="password"
                    autoComplete="current-password"
                    required
                  />
                </Field>
              </FieldGroup>
              {actionData?.error && (
                <FieldError>{actionData.error}</FieldError>
              )}
              <Button type="submit" className="w-full">
                Sign in
              </Button>
            </FieldSet>
          </Form>
          <div className="flex flex-col gap-2 text-center text-sm">
            <Link to="/password-recovery" className="underline">
              Forgot your password?
            </Link>
            <Link to="/sign-up" className="underline">
              Don't have an account? Sign up
            </Link>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
```

**Step 2: Typecheck**

```bash
pnpm typecheck
```

**Step 3: Smoke test**

```bash
pnpm dev
```

Visit `http://localhost:5173/sign-in`. Form should render. Submitting bad credentials should show the error message.

**Step 4: Commit**

```bash
git add app/routes/sign-in/
git commit -m "feat: add sign-in page"
```

---

## Task 8: Sign-up route

**Files:**
- Create: `app/routes/sign-up/route.tsx`

**Step 1: Write the file**

```tsx
import { Form, Link, redirect } from "react-router";
import { Button } from "~/components/ui/Button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "~/components/ui/Card";
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldSet,
} from "~/components/ui/FieldSet";
import { Input } from "~/components/ui/Input";
import { createSession, hashPassword } from "~/lib/auth.server";
import prisma from "~/lib/prisma.server";
import type { Route } from "./+types/route";

export async function action({ request }: Route.ActionArgs) {
  const form = await request.formData();
  const email = String(form.get("email") ?? "");
  const password = String(form.get("password") ?? "");
  const confirm = String(form.get("confirm") ?? "");

  const errors: Record<string, string> = {};

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
    errors.email = "Enter a valid email address";

  if (password.length < 6)
    errors.password = "Password must be at least 6 characters";

  if (password !== confirm)
    errors.confirm = "Passwords do not match";

  if (Object.keys(errors).length > 0) return { errors };

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing)
    return { errors: { email: "An account with this email already exists" } };

  const passwordHash = await hashPassword(password);

  const user = await prisma.$transaction(async (tx) => {
    const account = await tx.account.create({ data: {} });
    return tx.user.create({
      data: { email, passwordHash, accountId: account.id },
    });
  });

  const setCookie = await createSession(user.id, request);

  return redirect("/", { headers: { "Set-Cookie": setCookie } });
}

export default function SignUp({ actionData }: Route.ComponentProps) {
  const errors = actionData?.errors ?? {};

  return (
    <main className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl">Create account</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-6">
          <Form method="post">
            <FieldSet>
              <FieldGroup>
                <Field>
                  <FieldLabel htmlFor="email">Email</FieldLabel>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                  />
                  {errors.email && <FieldError>{errors.email}</FieldError>}
                </Field>
                <Field>
                  <FieldLabel htmlFor="password">Password</FieldLabel>
                  <Input
                    id="password"
                    name="password"
                    type="password"
                    autoComplete="new-password"
                    required
                  />
                  {errors.password && (
                    <FieldError>{errors.password}</FieldError>
                  )}
                </Field>
                <Field>
                  <FieldLabel htmlFor="confirm">Confirm password</FieldLabel>
                  <Input
                    id="confirm"
                    name="confirm"
                    type="password"
                    autoComplete="new-password"
                    required
                  />
                  {errors.confirm && (
                    <FieldError>{errors.confirm}</FieldError>
                  )}
                </Field>
              </FieldGroup>
              <Button type="submit" className="w-full">
                Create account
              </Button>
            </FieldSet>
          </Form>
          <div className="text-center text-sm">
            <Link to="/sign-in" className="underline">
              Already have an account? Sign in
            </Link>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
```

**Step 2: Typecheck**

```bash
pnpm typecheck
```

**Step 3: Smoke test**

Visit `http://localhost:5173/sign-up`. Test validation errors. Submit a valid form — should redirect to `/`.

**Step 4: Commit**

```bash
git add app/routes/sign-up/
git commit -m "feat: add sign-up page"
```

---

## Task 9: Password recovery route (email form)

**Files:**
- Create: `app/routes/password-recovery/route.tsx`

**Step 1: Write the file**

```tsx
import { Form, Link } from "react-router";
import { Button } from "~/components/ui/Button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "~/components/ui/Card";
import {
  Field,
  FieldGroup,
  FieldLabel,
  FieldSet,
} from "~/components/ui/FieldSet";
import { Input } from "~/components/ui/Input";
import { sendPasswordRecoveryEmail } from "~/lib/email.server";
import prisma from "~/lib/prisma.server";
import type { Route } from "./+types/route";

export async function action({ request }: Route.ActionArgs) {
  const form = await request.formData();
  const email = String(form.get("email") ?? "");

  const user = await prisma.user.findUnique({ where: { email } });

  if (user) {
    const token = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000);

    await prisma.passwordRecoveryToken.create({
      data: { token, userId: user.id, expiresAt },
    });

    await sendPasswordRecoveryEmail(email, token);
  }

  return { sent: true };
}

export default function PasswordRecovery({ actionData }: Route.ComponentProps) {
  if (actionData?.sent) {
    return (
      <main className="flex min-h-screen items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-2xl">Check your email</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm">
              If that email is associated with an account, we've sent a sign-in
              link. It expires in 30 minutes.
            </p>
          </CardContent>
        </Card>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl">Reset password</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-6">
          <Form method="post">
            <FieldSet>
              <FieldGroup>
                <Field>
                  <FieldLabel htmlFor="email">Email</FieldLabel>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                  />
                </Field>
              </FieldGroup>
              <Button type="submit" className="w-full">
                Send recovery link
              </Button>
            </FieldSet>
          </Form>
          <div className="text-center text-sm">
            <Link to="/sign-in" className="underline">
              Back to sign in
            </Link>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
```

**Step 2: Typecheck**

```bash
pnpm typecheck
```

**Step 3: Commit**

```bash
git add app/routes/password-recovery/
git commit -m "feat: add password recovery request page"
```

---

## Task 10: Reset-password token route (link handler)

This route handles the magic link from the recovery email. It lives at `/reset-password/:token` (separate from the form at `/password-recovery`) to avoid React Router nesting conflicts.

**Files:**
- Create: `app/routes/reset-password.$token/route.tsx`

The folder name `reset-password.$token` is how flatRoutes maps a dynamic segment. The `$` prefix marks the parameter.

**Step 1: Write the file**

```tsx
import { redirect } from "react-router";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "~/components/ui/Card";
import { createSession } from "~/lib/auth.server";
import prisma from "~/lib/prisma.server";
import type { Route } from "./+types/route";

export async function loader({ params, request }: Route.LoaderArgs) {
  const { token } = params;

  const record = await prisma.passwordRecoveryToken.findUnique({
    where: { token },
  });

  if (!record || record.expiresAt < new Date() || record.usedAt !== null)
    return { invalid: true };

  await prisma.passwordRecoveryToken.update({
    where: { token },
    data: { usedAt: new Date() },
  });

  const setCookie = await createSession(record.userId, request);

  return redirect("/", { headers: { "Set-Cookie": setCookie } });
}

export default function ResetPassword({ loaderData }: Route.ComponentProps) {
  // Only rendered if the token is invalid (valid tokens redirect in the loader)
  return (
    <main className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl">Link expired</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm">
            This link is invalid or has already been used. Request a new one
            from the{" "}
            <a href="/password-recovery" className="underline">
              password recovery page
            </a>
            .
          </p>
        </CardContent>
      </Card>
    </main>
  );
}
```

**Step 2: Also update root loader guard** to exempt `/reset-password/` paths.

In `app/root.tsx`, update the guard (if not already done in Task 6):

```ts
|| url.pathname.startsWith("/reset-password/")
```

**Step 3: Typecheck**

```bash
pnpm typecheck
```

**Step 4: Smoke test**

- Request password recovery for an existing user
- Check email for the link
- Click link → should redirect to `/`

**Step 5: Commit**

```bash
git add app/routes/reset-password.$token/
git commit -m "feat: add password recovery token handler"
```

---

## Task 11: Final check and commit

**Step 1: Run full check**

```bash
pnpm check
```

Expected: secretlint + biome + tsc all pass.

**Step 2: Fix any lint issues**

Run `pnpm format` to auto-fix formatting. Address any remaining issues manually.

**Step 3: Final commit**

```bash
git add -A
git commit -m "feat: complete auth — sign-in, sign-up, password recovery"
```
