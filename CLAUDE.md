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

Tests are integration tests that call real LLM APIs — require API keys in `.env`. Database: `pnpm prisma migrate dev|deploy|db seed`.

## Architecture

**citeup** tracks LLM citation visibility — queries AI platforms with predefined search queries and records which URLs appear in responses, so you can monitor whether a domain gets cited.

Data flow: `queryAccount.ts` fans out to all platforms in parallel → `queryPlatform.ts` runs one platform (idempotent, skips if run exists within 24h) → per-platform clients (`claudeClient`, `openaiClient`, `geminiClient`, `perplexityClient`) implement the `QueryFn` interface using Vercel AI SDK with web search forced on → results stored as `CitationQueryRun` → `CitationQuery[]` in Postgres.

Key files: `app/lib/llm-visibility/` contains all query logic; `app/lib/prisma.server.ts` is the singleton DB client; `prisma/schema.prisma` defines the three models. The `~/` alias maps to `app/`. Env vars are validated in `app/lib/envVars.ts` (`DATABASE_URL` required; LLM API keys optional per platform).

## Coding style

- `import type` for type-only imports; `~/` alias for internal imports; no barrel files
- Default exports for functions, named exports for types
- Named parameter objects for multi-arg functions; early returns over nested conditionals
- No explicit type annotations where they can be inferred
- `invariant()` from `es-toolkit` for runtime assertions
- `console.info/warn/error` with printf-style strings (`"[%s:%s] msg"`) — not template literals
- `try/catch` + Sentry `captureException` at orchestration layer; let errors bubble from helpers
- Prefer `es-toolkit` over `lodash`
