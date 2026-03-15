import { sortBy } from "es-toolkit";
import { verifyUserAccess } from "~/lib/api/apiAuth.server";
import { UserSchema } from "~/lib/api/schemas";
import type { Route } from "./+types/api.me.$email";

export async function loader({ request, params }: Route.LoaderArgs) {
  const user = await verifyUserAccess({ email: params.email, request });
  const sites = sortBy(
    [
      ...user.ownedSites.map(({ domain, createdAt }) => ({
        domain,
        createdAt: createdAt.toISOString().split("T")[0],
      })),
      ...user.siteUsers.map(({ site }) => ({
        domain: site.domain,
        createdAt: site.createdAt.toISOString().split("T")[0],
      })),
    ],
    ["domain"],
  );

  return Response.json(UserSchema.parse({ email: params.email, sites }));
}
