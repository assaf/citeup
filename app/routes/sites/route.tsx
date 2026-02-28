import { Link } from "react-router";
import { Button } from "~/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/Card";
import { requireUser } from "~/lib/auth.server";
import prisma from "~/lib/prisma.server";
import type { Route } from "./+types/route";

export function meta(): Route.MetaDescriptors {
  return [{ title: "Your Sites | CiteUp" }];
}

export async function loader({ request }: Route.LoaderArgs) {
  const user = await requireUser(request);
  const sites = await prisma.site.findMany({
    where: { accountId: user.accountId },
    orderBy: { createdAt: "desc" },
  });
  return { sites };
}

export default function SitesPage({ loaderData }: Route.ComponentProps) {
  const { sites } = loaderData;

  if (sites.length === 0)
    return (
      <main className="mx-auto max-w-5xl px-6 py-12">
        <div className="flex items-center justify-center py-24">
          <Card className="max-w-md text-center">
            <CardHeader>
              <CardTitle className="text-xl">Monitor your AI citation visibility</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-foreground/70">
                Add your site to start tracking when and where AI platforms like
                ChatGPT, Claude, Gemini, and Perplexity cite your content.
              </p>
              <Button render={<Link to="/sites/new" />}>
                Add your first site
              </Button>
            </CardContent>
          </Card>
        </div>
      </main>
    );

  return (
    <main className="mx-auto max-w-5xl space-y-6 px-6 py-12">
      <div className="flex items-center justify-between">
        <h1 className="font-heading text-3xl">Your Sites</h1>
        <Button render={<Link to="/sites/new" />}>Add Site</Button>
      </div>
      <ul className="space-y-4">
        {sites.map((site) => (
          <li key={site.id}>
            <Card>
              <CardHeader>
                <CardTitle>{site.domain}</CardTitle>
              </CardHeader>
              <CardContent className="flex items-center justify-between">
                <span className="text-foreground/60 text-sm">
                  Added{" "}
                  {new Date(site.createdAt).toLocaleDateString("en-US", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </span>
                <Button variant="outline" size="sm" render={<Link to={`/sites/${site.id}`} />}>
                  View
                </Button>
              </CardContent>
            </Card>
          </li>
        ))}
      </ul>
    </main>
  );
}
