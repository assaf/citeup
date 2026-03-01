import { captureException } from "@sentry/react-router";
import envVars from "~/lib/envVars";
import defaultQueries from "~/lib/llm-visibility/queries";
import queryAccount from "~/lib/llm-visibility/queryAccount";
import prisma from "~/lib/prisma.server";
import type { Route } from "./+types/api.cron.citation-runs";

// Vercel Cron fires a GET with Authorization: Bearer <CRON_SECRET>.
export async function loader({ request }: Route.LoaderArgs) {
  const cronSecret = envVars.CRON_SECRET;
  if (cronSecret) {
    const auth = request.headers.get("Authorization");
    if (auth !== `Bearer ${cronSecret}`)
      return new Response("Unauthorized", { status: 401 });
  }

  const sites = await prisma.site.findMany({
    where: { account: { users: { some: {} } } },
  });

  console.info("[cron:citation-runs] Starting — %d site(s)", sites.length);

  const results: { siteId: string; ok: boolean; error?: string }[] = [];

  for (const site of sites) {
    try {
      const siteQueryRows = await prisma.siteQuery.findMany({
        where: { siteId: site.id },
        orderBy: [{ group: "asc" }, { query: "asc" }],
      });
      const effectiveQueries =
        siteQueryRows.length > 0
          ? siteQueryRows
              .filter((q) => q.query.trim())
              .map((q) => ({ query: q.query, category: q.group }))
          : defaultQueries;
      await queryAccount({ site, queries: effectiveQueries, repetitions: 3 });
      console.info("[cron:citation-runs] Done — %s (%s)", site.id, site.domain);
      results.push({ siteId: site.id, ok: true });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(
        "[cron:citation-runs] Failed — %s (%s): %s",
        site.id,
        site.domain,
        message,
      );
      captureException(error, { extra: { siteId: site.id } });
      results.push({ siteId: site.id, ok: false, error: message });
    }
  }

  return Response.json({ ok: true, results });
}
