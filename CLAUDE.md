# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
pnpm dev         # react-router dev server
pnpm test        # runs check + vitest (tests live in test/)
pnpm test:watch  # vitest watch mode
pnpm check       # secretlint + biome lint + tsc (run after changes)
pnpm format      # auto-format with Biome
pnpm typecheck   # react-router typegen + tsc --noEmit --strict
pnpm build       # prisma generate + react-router build
```

Single test file: `pnpm vitest run test/llm-visibility/claudeClient.test.ts`

`test/llm-visibility/` — integration tests calling real LLM APIs (require API keys in `.env`). `test/routes/` — Playwright browser tests that spin up the full server. Database: `pnpm prisma migrate dev|deploy|db seed`.

## Architecture

**citeup** monitors whether a domain gets cited by AI platforms, by querying them with predefined search queries and recording which URLs appear.

**Query pipeline:** `queryAccount.ts` fans out to all platforms in parallel → `queryPlatform.ts` runs one platform (idempotent, skips if run exists within 24h) → per-platform clients (`claudeClient`, `openaiClient`, `geminiClient`, `perplexityClient`) implement `QueryFn` using Vercel AI SDK with web search forced on → results stored as `CitationQueryRun` + `CitationQuery[]`. Hardcoded queries live in `app/lib/llm-visibility/queries.ts`.

**Auth:** `app/lib/auth.server.ts` (bcryptjs, session tokens). Routes: `sign-in`, `sign-up`, `password-recovery`, `verify-email.$token`, `reset-password.$token`. Email via Resend (`app/lib/resend.server.ts`).

**Schema** (`prisma/schema.prisma`): Account, Site, User, Session, CitationQueryRun, CitationQuery, EmailVerificationToken, PasswordRecoveryToken.

**Path aliases:** `~/` → `app/`; `~/prisma` → `prisma/generated/client` (not `@prisma/client`); `~/test/` → `test/`. Required env vars: `DATABASE_URL`, `SESSION_SECRET`. LLM API keys optional per platform.

## Coding style

- `import type` for type-only imports; `~/` alias for internal imports; no barrel files
- Default exports for functions, named exports for types
- Named parameter objects for multi-arg functions; early returns over nested conditionals
- No explicit type annotations where they can be inferred
- `invariant()` from `es-toolkit` for runtime assertions
- `console.info/warn/error` with printf-style strings (`"[%s:%s] msg"`) — not template literals
- `try/catch` + Sentry `captureException` at orchestration layer; let errors bubble from helpers
- Prefer `es-toolkit` over `lodash`
- Single-line conditions and loops: no braces (`if (x) return y;`)
