# OpenAPI Spec Design

**Date:** 2026-03-14

## Goal

Add an OpenAPI 3.1 spec for the user-facing monitoring API, generated from Zod schemas that also enforce response field filtering at runtime.

## Scope

Three routes:
- `GET /api/sites/:domain`
- `GET /api/sites/:domain/runs`
- `GET /api/sites/:domain/runs/:runId`

Admin routes (`/api/admin/*`) and `/api/track` are excluded.

## Architecture

### Schemas (`app/lib/api-schemas.ts`)

Central Zod schemas for all response shapes, extended with `.openapi()` metadata via `@asteasolutions/zod-to-openapi`:

| Schema | Fields |
|---|---|
| `SiteUserSchema` | `id`, `email`, `role` |
| `SiteSchema` | `domain`, `createdAt`, `users: SiteUserSchema[]` |
| `RunSummarySchema` | `id`, `platform`, `model`, `createdAt`, `queryCount`, `citationCount` |
| `RunsSchema` | `runs: RunSummarySchema[]` |
| `QuerySchema` | `id`, `query`, `group`, `position`, `citations` |
| `RunDetailSchema` | `id`, `platform`, `model`, `createdAt`, `queries: QuerySchema[]` |

### Response filtering

Each loader calls `Schema.parse(data)` before `Response.json(...)`. Zod's default `.strip()` mode removes unknown fields, so new DB columns never appear in API responses.

### OpenAPI builder (`app/lib/openapi.ts`)

Uses `@asteasolutions/zod-to-openapi` to register schemas and routes, then generates the spec object. Called at request time (no file generation step needed).

Declares `BearerAuth` security scheme; all 3 routes require it.

### Spec endpoint (`app/routes/api.openapi.ts`)

`GET /api/openapi.json` — no auth required, returns the generated spec as JSON.

## Libraries

- `@asteasolutions/zod-to-openapi` — extends Zod schemas with OpenAPI metadata, generates compliant spec

## Non-goals

- YAML output (JSON is sufficient for LLM consumption)
- Request body validation (all monitored routes are GET-only)
- Code generation from the spec
