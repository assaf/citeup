# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

See @README.md for project overview.
See @package.json for available scripts.
See @docs/coding-conventions.md for coding style.

Single test file: `pnpm vitest run test/routes/home.test.ts`

## Key conventions

- `~/` → `app/`; `~/prisma` → `prisma/generated/client`
- Auth: `getCurrentUser(request)` (root loader, nullable) and `requireUser(request)` (protected routes, throws redirect) — see `app/lib/auth.server.ts`
- Tests: `test/routes/` = Playwright browser; `test/*.test.ts` = HTTP; `test/llm-visibility/` = LLM integration (needs real API keys in `.env`)
- Blog post dates come from filenames: `app/data/blog/YYYY-MM-DD-slug.md`
- Do NOT add `react`/`react-dom` to `optimizeDeps.include` in `vite.config.ts` — creates duplicate React instances that break all hooks
