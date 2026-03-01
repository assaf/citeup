# Coding Conventions

## Imports

- Use `import type` for type-only imports
- Use `~/` for all internal imports; relative paths only for same-directory files
- `~/` → `app/`; `~/prisma` → `prisma/generated/client`
- Order: external packages → internal (`~/`) → relative (`./`)

```ts
import { captureException } from "@sentry/react-router";
import { requireUser } from "~/lib/auth.server";
import RecentVisibility from "./RecentVisibility";
```

## Exports

- Default exports for functions and components; named exports for types
- No barrel files (`index.ts` re-exports)

```ts
export default function queryClaude(query: string) { ... }
export type QueryFn = (query: string) => Promise<...>;
```

## Braces

Omit braces when the body is a single statement — applies to `if`, `else`, `for`, `while`, and `else if`:

```ts
if (existing) return;
if (!site) throw new Response("Not found", { status: 404 });
for (const site of sites) await process(site);
```

Use braces for multi-line bodies.

## Functions

- Named parameter objects for any function with more than one argument
- Early returns over nested conditionals

```ts
async function queryPlatform({ site, platform, queries }: { ... }) {
  if (existing) return;
  if (!site) throw new Response("Not found", { status: 404 });
}
```

## TypeScript

- Prefer inference; annotate function parameters and non-obvious return types
- Inline object types for simple shapes; named types for reused or complex ones
- `as const` for config arrays and literal tuples
- `invariant()` from `es-toolkit` for runtime assertions

## Error handling

- `try/catch` + `captureException` at orchestration layer only; let errors bubble from helpers
- Return `{ error: string }` from actions for user-facing errors; throw for unexpected ones

```ts
try {
  await prisma.user.update(...);
  return { success: "Email updated" };
} catch (error) {
  captureException(error);
  return { error: "That email is already in use" };
}
```

## Logging

Printf-style with a `[context:subcontext]` prefix — no template literals:

```ts
console.info("[%s:%s] Created run %s", site.id, platform, run.id);
console.error("[%s:%s] Failed: %o", site.id, platform, error);
```

## React Router

- Loaders return plain data objects; actions return `{ error }` / `{ success }` or redirect
- Destructure `loaderData` / `actionData` in component props
- Use `useFetcher` for sub-forms that shouldn't navigate on submit
- Type fetchers as `useFetcher<typeof action>()` to get typed `.data`
- Actions return `{ ok: true as const }` / `{ ok: false as const, error: string }` — never throw for user-facing errors
- Flat route `foo.$id_.bar` (underscore after param) avoids nesting inside the `foo.$id` layout

## Naming

- Files: `kebab-case.ts`; React components: `PascalCase.tsx`
- Variables and functions: `camelCase`; types and interfaces: `PascalCase`
- Module-level constants: `SCREAMING_SNAKE_CASE`
- Blog post dates come from filenames: `app/data/blog/YYYY-MM-DD-slug.md`

## Libraries

- `es-toolkit` for array/object utilities (not lodash)
- `@js-temporal/polyfill` for date/time (not `Date`)
- `twMerge` + `cva` for conditional class names on UI components

## UI components

- Prefer components from `app/components/ui/` when available (Button, Input, Card, Table, Tabs, etc.)
- If a new UI component is needed, ask the user before creating it
- Override component styles via `className` — `twMerge` handles conflicts, so e.g. `bg-transparent shadow-none` correctly wins over defaults

## Prisma / schema

- All child relations use `onDelete: Cascade`
- Add `updatedAt DateTime @map("updated_at") @updatedAt` to every mutable model
- After schema changes: `pnpm prisma db push` then `pnpm prisma generate`

## Testing

- Prefer integration tests against a real DB over mocked unit tests
- Use fixed IDs in test seed data to avoid conflicts across test files (`id: "user-bots-1"`, etc.)
- Playwright strict mode: `getByRole` / `getByText` throw when multiple elements match — use `{ exact: true }` or scope the locator to a parent element
