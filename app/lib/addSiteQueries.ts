import type { Site } from "~/prisma";
import prisma from "./prisma.server";

export default async function addSiteQueries(
  site: Site,
  queries: { group: string; query: string }[],
) {
  const valid = queries
    .map(({ group, query }) => ({
      group: group.trim(),
      query: query.trim(),
    }))
    .filter((q) => q.group && q.query.trim());
  const newQueries = await prisma.siteQuery.createMany({
    data: valid.map(({ group, query }) => ({ siteId: site.id, group, query })),
  });
  return newQueries.count;
}

export async function updateSiteQuery(id: string, query: string) {
  await prisma.siteQuery.update({
    where: { id },
    data: { query: query.trim() },
  });
}
