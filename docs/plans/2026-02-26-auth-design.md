# Auth Design — 2026-02-26

## Overview

Sign-in, sign-up, and password recovery pages for citeup. Standard email/password auth with session cookies and Resend for transactional email.

---

## Database changes

Add `PasswordRecoveryToken` model to `prisma/schema.prisma`:

- `id` — cuid primary key
- `token` — unique random string
- `userId` — FK to User (cascade delete)
- `expiresAt` — 30 minutes from creation
- `usedAt` — nullable, set on first use (single-use enforcement)

Update root loader guard to exempt `/sign-up` and paths starting with `/password-recovery` in addition to the existing `/sign-in` exemption.

---

## New files

| File | Purpose |
|---|---|
| `app/lib/auth.server.ts` | `hashPassword`, `verifyPassword`, `createSession` helper |
| `app/lib/email.server.ts` | Resend client, `sendPasswordRecoveryEmail` |
| `app/routes/sign-in/route.tsx` | Email + password form, action |
| `app/routes/sign-up/route.tsx` | Email + password + confirm form, action |
| `app/routes/password-recovery/route.tsx` | Email entry form, action |
| `app/routes/password-recovery.$token/route.tsx` | Link handler: validate token → create session → redirect |

---

## Auth logic

### Sign-in

1. Find user by email.
2. Verify bcrypt hash against submitted password.
3. On mismatch: return `{ error: "email and password do not match an existing account" }`.
4. On match: call `createSession` (see below) → set session cookie → redirect to `/`.

### Sign-up

1. Validate email format (regex).
2. Validate password ≥ 6 chars.
3. Validate password === confirmation.
4. Check email uniqueness (return field error if taken).
5. Hash password with bcryptjs.
6. Prisma transaction: create `Account` → create `User` (linked to account).
7. Call `createSession` → set session cookie → redirect to `/`.

### createSession helper

Creates a `Session` row with:
- `token`: `crypto.randomUUID()`
- `userId`
- `ipAddress`: from `X-Forwarded-For` or `request.socket.remoteAddress`
- `userAgent`: from `User-Agent` header
- `referrer`: from utm cookie (captured before sign-in redirect) or `Referer` header
- `utmSource/Medium/Campaign/Term/Content`: from utm cookie

Returns the token; caller sets it in the session cookie.

### Password recovery — request

1. Find user by email (silently skip if not found — no leak).
2. Create `PasswordRecoveryToken` with `expiresAt = now + 30 minutes`.
3. Send email via Resend with link: `{APP_URL}/password-recovery/{token}`.
4. Always return `{ sent: true }` so the form shows a confirmation message.

### Password recovery — link handler (GET)

1. Find token by value. If missing: show "invalid or expired link" error.
2. Check `expiresAt > now`. If expired: show error.
3. Check `usedAt == null`. If already used: show error.
4. Set `usedAt = now`.
5. Call `createSession` for the token's user → set session cookie → redirect to `/`.

---

## Dependencies to install

- `bcryptjs` + `@types/bcryptjs` — password hashing
- `resend` — email

## New env vars

- `RESEND_API_KEY`
- `APP_URL` — base URL for recovery links (e.g. `https://app.citeup.com`)
- `EMAIL_FROM` — sender address (e.g. `noreply@citeup.com`)

---

## UI

All three pages use the existing neobrutalism design system (centered card, `Card`, `Input`, `Button`, `Label`, `FieldError` components).

**Sign-in**: email + password fields, submit button, link to sign-up, link to password recovery.

**Sign-up**: email + password + confirm password fields, submit button, link to sign-in.

**Password recovery**: email field, submit button. On success, replace form with "Check your email" message.

All validation errors display inline below the relevant field using `FieldError`.

---

## Task IDs

- Task #5: Add PasswordRecoveryToken to schema + migrate
- Task #6: Install bcryptjs + resend
- Task #7: Create app/lib/auth.server.ts
- Task #8: Create app/lib/email.server.ts
- Task #9: Update root loader guard
- Task #10: Build sign-in route
- Task #11: Build sign-up route
- Task #12: Build password-recovery route (request)
- Task #13: Build password-recovery.$token route (link handler)
