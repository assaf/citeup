import { useEffect, useRef, useState } from "react";
import { Link, useFetcher } from "react-router";
import { Button } from "~/components/ui/Button";
import { Input } from "~/components/ui/Input";
import { requireUser } from "~/lib/auth.server";
import prisma from "~/lib/prisma.server";
import type { Route } from "./+types/route";

export function meta({ data }: Route.MetaArgs) {
  return [{ title: `Citation Queries — ${data?.site.domain} | CiteUp` }];
}

export async function loader({ request, params }: Route.LoaderArgs) {
  const user = await requireUser(request);
  const site = await prisma.site.findFirst({
    where: { id: params.id, accountId: user.accountId },
  });
  if (!site) throw new Response("Not found", { status: 404 });

  const rows = await prisma.siteQuery.findMany({
    where: { siteId: site.id },
    orderBy: [{ group: "asc" }, { query: "asc" }],
  });

  const map: Record<string, typeof rows> = {};
  for (const r of rows) {
    if (!map[r.group]) map[r.group] = [];
    map[r.group].push(r);
  }
  const groups = Object.entries(map).sort(([a], [b]) => a.localeCompare(b));

  return { site, groups };
}

export async function action({ request, params }: Route.ActionArgs) {
  const user = await requireUser(request);
  const site = await prisma.site.findFirst({
    where: { id: params.id, accountId: user.accountId },
  });
  if (!site) throw new Response("Not found", { status: 404 });

  const data = await request.formData();
  const intent = String(data.get("_intent"));

  switch (intent) {
    case "add-group": {
      const group = String(data.get("group")).trim();
      if (!group) return { ok: false as const, error: "Group name is required" };
      await prisma.siteQuery.create({
        data: { siteId: site.id, group, query: "" },
      });
      return { ok: true as const };
    }
    case "rename-group": {
      const oldGroup = String(data.get("oldGroup"));
      const newGroup = String(data.get("newGroup")).trim();
      if (!newGroup || newGroup === oldGroup) return { ok: true as const };
      await prisma.siteQuery.updateMany({
        where: { siteId: site.id, group: oldGroup },
        data: { group: newGroup },
      });
      return { ok: true as const };
    }
    case "delete-group": {
      const group = String(data.get("group"));
      await prisma.siteQuery.deleteMany({ where: { siteId: site.id, group } });
      return { ok: true as const };
    }
    case "add-query": {
      const group = String(data.get("group"));
      await prisma.siteQuery.create({
        data: { siteId: site.id, group, query: "" },
      });
      return { ok: true as const };
    }
    case "update-query": {
      const id = String(data.get("id"));
      const query = String(data.get("query"));
      const existing = await prisma.siteQuery.findFirst({
        where: { id, siteId: site.id },
      });
      if (!existing) return { ok: false as const, error: "Query not found" };
      await prisma.siteQuery.update({ where: { id }, data: { query } });
      return { ok: true as const };
    }
    case "delete-query": {
      const id = String(data.get("id"));
      const existing = await prisma.siteQuery.findFirst({
        where: { id, siteId: site.id },
      });
      if (!existing) return { ok: false as const, error: "Query not found" };
      await prisma.siteQuery.delete({ where: { id } });
      return { ok: true as const };
    }
  }

  return { ok: false as const, error: "Unknown action" };
}

type SiteQueryRow = {
  id: string;
  group: string;
  query: string;
};

function QueryRow({ query }: { query: SiteQueryRow }) {
  const updateFetcher = useFetcher<typeof action>();
  const deleteFetcher = useFetcher<typeof action>();
  const [value, setValue] = useState(query.query);

  return (
    <li className="group/row space-y-0.5">
      <div className="flex items-center gap-1">
        <Input
          aria-label="Query text"
          className="h-auto flex-1 border-transparent bg-transparent px-2 py-1 text-sm shadow-none hover:border-border focus-visible:translate-x-0 focus-visible:translate-y-0 focus-visible:border-border focus-visible:shadow-none"
          placeholder="Enter query…"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onBlur={() => {
            if (value === query.query) return;
            updateFetcher.submit(
              { _intent: "update-query", id: query.id, query: value },
              { method: "post" },
            );
          }}
        />
        <Button
          className="opacity-0 transition-opacity group-hover/row:opacity-100"
          variant="ghost"
          size="sm"
          type="button"
          aria-label="Delete query"
          onClick={() => {
            deleteFetcher.submit(
              { _intent: "delete-query", id: query.id },
              { method: "post" },
            );
          }}
        >
          ×
        </Button>
      </div>
      {updateFetcher.data?.ok === false && (
        <p className="pl-2 text-red-600 text-xs">
          {updateFetcher.data.error ?? "Failed to save. Please try again."}
        </p>
      )}
      {deleteFetcher.data?.ok === false && (
        <p className="pl-2 text-red-600 text-xs">
          {deleteFetcher.data.error ?? "Failed to delete. Please try again."}
        </p>
      )}
    </li>
  );
}

function GroupSection({
  group,
  queries,
}: {
  group: string;
  queries: SiteQueryRow[];
}) {
  const renameFetcher = useFetcher<typeof action>();
  const deleteFetcher = useFetcher<typeof action>();
  const addFetcher = useFetcher<typeof action>();
  const [groupName, setGroupName] = useState(group);

  return (
    <div className="space-y-3 rounded-base border-2 border-border p-4 shadow-shadow">
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <Input
            aria-label="Group name"
            className="h-auto flex-1 rounded-none border-x-0 border-t-0 border-b-2 bg-transparent px-1 py-0.5 font-heading text-lg shadow-none hover:border-border focus-visible:translate-x-0 focus-visible:translate-y-0 focus-visible:border-border focus-visible:shadow-none"
            value={groupName}
            onChange={(e) => setGroupName(e.target.value)}
            onBlur={() => {
              if (!groupName.trim() || groupName === group) return;
              renameFetcher.submit(
                {
                  _intent: "rename-group",
                  oldGroup: group,
                  newGroup: groupName.trim(),
                },
                { method: "post" },
              );
            }}
          />
          <Button
            variant="ghost"
            size="sm"
            type="button"
            className="text-foreground/40 hover:text-red-600"
            onClick={() => {
              if (
                !confirm(
                  `Delete group "${group}" and all its queries? This cannot be undone.`,
                )
              )
                return;
              deleteFetcher.submit(
                { _intent: "delete-group", group },
                { method: "post" },
              );
            }}
          >
            Delete group
          </Button>
        </div>
        {renameFetcher.data?.ok === false && (
          <p className="pl-1 text-red-600 text-xs">
            {renameFetcher.data.error ?? "Failed to rename. Please try again."}
          </p>
        )}
        {deleteFetcher.data?.ok === false && (
          <p className="pl-1 text-red-600 text-xs">
            {deleteFetcher.data.error ??
              "Failed to delete group. Please try again."}
          </p>
        )}
      </div>

      <ul className="space-y-0.5">
        {queries.map((q) => (
          <QueryRow key={q.id} query={q} />
        ))}
      </ul>

      <div className="space-y-1">
        <Button
          variant="ghost"
          size="sm"
          type="button"
          className="text-foreground/50 hover:text-foreground"
          onClick={() => {
            addFetcher.submit(
              { _intent: "add-query", group },
              { method: "post" },
            );
          }}
        >
          + Add query
        </Button>
        {addFetcher.data?.ok === false && (
          <p className="pl-1 text-red-600 text-xs">
            {addFetcher.data.error ?? "Failed to add query. Please try again."}
          </p>
        )}
      </div>
    </div>
  );
}

export default function SiteQueriesPage({ loaderData }: Route.ComponentProps) {
  const { site, groups } = loaderData;
  const addGroupFetcher = useFetcher<typeof action>();
  const [isAddingGroup, setIsAddingGroup] = useState(false);
  const [newGroupName, setNewGroupName] = useState("");
  const newGroupInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isAddingGroup) newGroupInputRef.current?.focus();
  }, [isAddingGroup]);

  function submitNewGroup() {
    const name = newGroupName.trim();
    if (!name) return;
    addGroupFetcher.submit(
      { _intent: "add-group", group: name },
      { method: "post" },
    );
    setIsAddingGroup(false);
    setNewGroupName("");
  }

  return (
    <main className="mx-auto max-w-3xl space-y-6 px-6 py-12">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-foreground/60 text-sm">
            <Link className="hover:underline" to={`/site/${site.id}`}>
              {site.domain}
            </Link>
          </p>
          <h1 className="font-heading text-3xl">Citation Queries</h1>
        </div>
      </div>

      <p className="text-foreground/60 text-sm">
        These queries are run against AI platforms to check where your site is
        cited. Organize them into groups by topic or intent (e.g.{" "}
        <code className="font-mono">1.discovery</code>,{" "}
        <code className="font-mono">2.active_search</code>).
      </p>

      <div className="space-y-4">
        {groups.length === 0 ? (
          <div className="rounded-base border-2 border-black bg-secondary-background p-12 text-center shadow-shadow">
            <p className="mb-2 font-bold text-xl">No queries yet</p>
            <p className="text-foreground/60 text-sm">
              Add groups and queries to track your citation visibility across AI
              platforms.
            </p>
          </div>
        ) : (
          groups.map(([group, queries]) => (
            <GroupSection key={group} group={group} queries={queries} />
          ))
        )}

        {isAddingGroup ? (
          <div className="flex items-center gap-2">
            <Input
              ref={newGroupInputRef}
              placeholder="Group name, e.g. 1.discovery"
              value={newGroupName}
              onChange={(e) => setNewGroupName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") submitNewGroup();
                if (e.key === "Escape") {
                  setIsAddingGroup(false);
                  setNewGroupName("");
                }
              }}
              onBlur={submitNewGroup}
            />
            <Button
              variant="ghost"
              size="sm"
              type="button"
              onClick={() => {
                setIsAddingGroup(false);
                setNewGroupName("");
              }}
            >
              Cancel
            </Button>
          </div>
        ) : (
          <Button
            variant="outline"
            size="sm"
            type="button"
            onClick={() => setIsAddingGroup(true)}
          >
            + Add group
          </Button>
        )}

        {addGroupFetcher.data?.ok === false && (
          <p className="text-red-600 text-xs">
            {addGroupFetcher.data.error ??
              "Failed to add group. Please try again."}
          </p>
        )}
      </div>
    </main>
  );
}
