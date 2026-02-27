# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
pnpm dev         # react-router dev server
pnpm test        # runs check + vitest (tests live in test/)
pnpm check       # secretlint + biome lint + tsc (run after changes)
pnpm format      # auto-format with Biome
pnpm typecheck   # react-router typegen + tsc --noEmit --strict
pnpm build       # prisma generate + react-router build
```

Single test file: `pnpm vitest run test/llm-visibility/claudeClient.test.ts`

Tests: `test/llm-visibility/` — LLM integration (real API keys); `test/routes/` — Playwright browser; `test/*.test.ts` — direct HTTP fetch. Database: `pnpm prisma migrate dev|deploy|db seed`.

## Architecture

**CiteUp** queries AI platforms with predefined search queries and records which URLs appear in responses, so you can monitor whether a domain gets cited.

**Query pipeline:** `queryAccount.ts` fans out to all platforms → `queryPlatform.ts` runs one platform (idempotent, skips if run exists within 24h) → per-platform clients (`claudeClient`, `openaiClient`, `geminiClient`, `perplexityClient`) implement `QueryFn` via Vercel AI SDK with web search forced on → stored as `CitationQueryRun` + `CitationQuery[]`. Queries in `app/lib/llm-visibility/queries.ts`.

**Auth:** session tokens via `app/lib/auth.server.ts` (bcryptjs). Email via Resend. Schema: Account, Site, User, Session, CitationQueryRun, CitationQuery, EmailVerificationToken, PasswordRecoveryToken.

**Blog:** `app/data/blog/YYYY-MM-DD-slug.md` with YAML front matter (`title`, `image`, `alt`, `summary`). Date parsed from filename, published at 8am PT. Routes: `blog._index`, `blog.$slug`, `blog.$slug[.]png` (OG), `blog.$slug[.]md`, `blog.feed` (Atom), `blog.sitemap[.]xml`, `blog.sitemap[.]md`. Images served from `public/blog/`. `streamdown` + `rehype-harden` must be in `vite.config.ts` `ssr.noExternal`.

**Public paths** (no auth, in `root.tsx`): `/sign-in`, `/sign-up`, `/password-recovery`, `/terms`, `/privacy`, `/about`, `/pricing`, `/faq`, `/blog` (prefix-matched).

**Aliases:** `~/` → `app/`; `~/prisma` → `prisma/generated/client`; `~/test/` → `test/`. Required env: `DATABASE_URL`, `SESSION_SECRET`.

## Coding style

- `import type` for type-only imports; `~/` alias; no barrel files
- Default exports for functions, named exports for types
- Named parameter objects for multi-arg functions; early returns over nesting
- No explicit type annotations where inferable; `invariant()` from `es-toolkit`
- `console.info/warn/error` with printf-style strings — not template literals
- `try/catch` + Sentry at orchestration layer; let errors bubble from helpers
- Prefer `es-toolkit` over lodash; no braces on single-line conditions
