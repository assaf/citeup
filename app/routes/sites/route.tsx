import { useState, useEffect } from "react";
import { Link, useFetcher } from "react-router";
import { Temporal } from "@js-temporal/polyfill";
import { ActiveLink } from "~/components/ui/ActiveLink";
import { Button } from "~/components/ui/Button";
import {
  Card,
  CardContent,
} from "~/components/ui/Card";
import calculateCitationMetrics from "~/lib/llm-visibility/calculateCitationMetrics";
import { getBotMetrics } from "~/lib/llm-visibility/getBotMetrics.server";
import { requireUser } from "~/lib/auth.server";
import prisma from "~/lib/prisma.server";
import type { Route } from "./+types/route";
import type { Site } from "~/prisma";
import DeleteSiteDialog from "./DeleteSiteDialog";

export interface SiteWithMetrics {
  site: Site;
  totalCitations: number;
  avgScore: number;
  totalBotVisits: number;
  uniqueBots: number;
}

export function meta(): Route.MetaDescriptors {
  return [{ title: "Your Sites | CiteUp" }];
}

export async function loader({ request }: Route.LoaderArgs) {
  const user = await requireUser(request);
  const sites = await prisma.site.findMany({
    where: { accountId: user.accountId },
    orderBy: { createdAt: "desc" },
  });

  // Calculate metrics for each site
  const sitesWithMetrics: SiteWithMetrics[] = await Promise.all(
    sites.map(async (site) => {
      // Get citation metrics
      const now = Temporal.Now.plainDateISO();
      const from = now.subtract({ days: 14 });

      const citationRuns = await prisma.citationQueryRun.findMany({
        include: { queries: true },
        where: {
          siteId: site.id,
          createdAt: {
            gte: from.toString(),
          },
        },
      });

      const allQueries = citationRuns.flatMap((run) => run.queries);
      const citationMetrics = calculateCitationMetrics(
        allQueries,
        site.domain,
      );

      // Get bot metrics
      const botMetrics = await getBotMetrics(site.id, 14);

      return {
        site,
        totalCitations: citationMetrics.totalCitations,
        avgScore: citationMetrics.avgScore,
        totalBotVisits: botMetrics.totalBotVisits,
        uniqueBots: botMetrics.uniqueBots,
      };
    }),
  );

  return { sites: sitesWithMetrics };
}

export async function action({ request }: Route.ActionArgs) {
  if (request.method !== "POST") {
    return { ok: false, error: "Method not allowed" } as const;
  }

  const user = await requireUser(request);
  const formData = await request.formData();
  const siteId = formData.get("siteId") as string;
  const confirmDomain = formData.get("confirmDomain") as string;

  // Verify site exists and belongs to user
  const site = await prisma.site.findFirst({
    where: { id: siteId, accountId: user.accountId },
  });

  if (!site) {
    return { ok: false, error: "Site not found" } as const;
  }

  // Verify domain matches
  if (confirmDomain !== site.domain) {
    return { ok: false, error: "Domain doesn't match" } as const;
  }

  // Delete the site (cascades delete all related data)
  await prisma.site.delete({ where: { id: siteId } });

  return { ok: true } as const;
}

export default function SitesPage({ loaderData }: Route.ComponentProps) {
  const { sites } = loaderData;

  const [deleteDialog, setDeleteDialog] = useState<{
    open: boolean;
    siteId: string;
    domain: string;
  }>({ open: false, siteId: "", domain: "" });

  const deleteFetcher = useFetcher<typeof action>();
  const isSubmitting = deleteFetcher.state === "submitting";

  // Close dialog on successful delete
  useEffect(() => {
    if (deleteFetcher.data?.ok) {
      setDeleteDialog({ open: false, siteId: "", domain: "" });
    }
  }, [deleteFetcher.data]);

  if (sites.length === 0) {
    return (
      <main className="mx-auto w-full max-w-2xl space-y-6 px-6 py-12">
        <h1 className="font-heading text-3xl">Your Sites</h1>
        <div className="rounded-base border-2 border-black bg-secondary-background p-8 text-center shadow-shadow">
          <p className="mb-2 font-bold text-xl">No sites yet</p>
          <p className="mb-6 text-base text-foreground/60">
            Add your first site to start tracking when AI platforms cite you.
          </p>
          <ActiveLink variant="button" to="/sites/new" bg="yellow">
            Add your first site
          </ActiveLink>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto w-full max-w-2xl space-y-6 px-6 py-12">
      <div className="flex flex-row items-center justify-between gap-4">
        <h1 className="font-heading text-3xl">Your Sites</h1>
        <Button render={<Link to="/sites/new" />}>Add Site</Button>
      </div>
      {deleteFetcher.data?.ok === false && (
        <div className="bg-red-100 border-2 border-red-500 text-red-700 px-4 py-3 rounded-base">
          {deleteFetcher.data.error}
        </div>
      )}
      <Card>
        <CardContent className="p-0">
          <table className="w-full">
            <thead>
              <tr className="border-b border-black">
                <th className="px-4 py-2 text-left font-bold">Domain</th>
                <th className="px-4 py-2 text-right font-bold">Citations</th>
                <th className="px-4 py-2 text-right font-bold">Avg Score</th>
                <th className="px-4 py-2 text-right font-bold">Bot Visits</th>
                <th className="px-4 py-2 text-right font-bold">Unique Bots</th>
                <th className="px-4 py-2 text-right font-bold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {sites.map((item, idx) => (
                <tr
                  key={item.site.id}
                  className={idx < sites.length - 1 ? "border-b border-gray-200" : ""}
                >
                  <td className="px-4 py-2">
                    <span className="font-medium">{item.site.domain}</span>
                  </td>
                  <td className="px-4 py-2 text-right">
                    {item.totalCitations}
                  </td>
                  <td className="px-4 py-2 text-right">
                    {item.avgScore.toFixed(1)}
                  </td>
                  <td className="px-4 py-2 text-right">
                    {item.totalBotVisits}
                  </td>
                  <td className="px-4 py-2 text-right">
                    {item.uniqueBots}
                  </td>
                  <td className="px-4 py-2 text-right">
                    <div className="flex gap-2 justify-end">
                      <ActiveLink
                        size="sm"
                        to={`/site/${item.site.id}/citations`}
                        variant="button"
                      >
                        View
                      </ActiveLink>
                      <button
                        type="button"
                        onClick={() =>
                          setDeleteDialog({
                            open: true,
                            siteId: item.site.id,
                            domain: item.site.domain,
                          })
                        }
                        className="text-sm text-red-600 hover:underline"
                        disabled={isSubmitting}
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
      <DeleteSiteDialog
        isOpen={deleteDialog.open}
        domain={deleteDialog.domain}
        siteId={deleteDialog.siteId}
        onClose={() => setDeleteDialog({ open: false, siteId: "", domain: "" })}
        onConfirm={(siteId) => {
          deleteFetcher.submit(
            {
              siteId,
              confirmDomain: deleteDialog.domain,
            },
            { method: "POST" },
          );
        }}
        isSubmitting={isSubmitting}
      />
    </main>
  );
}
