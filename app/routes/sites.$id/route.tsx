import { requireUser } from "~/lib/auth.server";
import prisma from "~/lib/prisma.server";
import type { Route } from "./+types/route";

export function meta({ data }: Route.MetaArgs) {
  return [{ title: `${data?.site.domain} | CiteUp` }];
}

export async function loader({ request, params }: Route.LoaderArgs) {
  const user = await requireUser(request);
  const site = await prisma.site.findFirst({
    where: { id: params.id, accountId: user.accountId },
  });
  if (!site) throw new Response("Not found", { status: 404 });
  return { site };
}

export default function SiteDetailPage({ loaderData }: Route.ComponentProps) {
  const { site } = loaderData;
  return (
    <main className="mx-auto max-w-5xl space-y-6 px-6 py-12">
      <h1 className="font-heading text-3xl">{site.domain}</h1>
      <p className="text-foreground/60">
        Added{" "}
        {new Date(site.createdAt).toLocaleDateString("en-US", {
          year: "numeric",
          month: "long",
          day: "numeric",
        })}
      </p>
    </main>
  );
}
