# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What is CiteUp

SaaS tool that tracks whether a brand's domain gets cited when AI platforms (ChatGPT, Perplexity, Claude, Gemini) answer relevant queries. Runs predefined queries, records which URLs appear in responses, and plots visibility over time.

## Commands

```bash
pnpm dev                  # dev server
pnpm check                # lint + typecheck — run after every change
pnpm test                 # full suite
pnpm build                # production build
pnpm prisma migrate dev   # apply DB migrations
```

Single file: `pnpm vitest run test/routes/home.test.ts`

## Key conventions

- `~/` → `app/`; `~/prisma` → `prisma/generated/client`
- Auth: `getCurrentUser(request)` (root loader, nullable) and `requireUser(request)` (protected routes, throws redirect) — see `app/lib/auth.server.ts`
- Tests: `test/routes/` = Playwright browser; `test/*.test.ts` = HTTP; `test/llm-visibility/` = LLM integration (needs real API keys in `.env`)
- Blog post dates come from filenames: `app/data/blog/YYYY-MM-DD-slug.md`
- Do NOT add `react`/`react-dom` to `optimizeDeps.include` in `vite.config.ts` — creates duplicate React instances that break all hooks
