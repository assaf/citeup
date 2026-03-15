import type { Route } from ".react-router/types/app/routes/+types/api.sites.$domain_.runs";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import prisma from "~/lib/prisma.server";
import { loader } from "~/routes/api.sites.$domain_.runs";

const API_KEY = "cite.me.in_runs_test_key_abc";
const DOMAIN = "api-runs-test.example";

function makeRequest(token?: string, search = "") {
  return new Request(`http://localhost/api/sites/${DOMAIN}/runs${search}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
}

async function callLoader(req: Request, domain = DOMAIN) {
  try {
    return await loader({ request: req, params: { domain }, context: {} } as Route.LoaderArgs);
  } catch (error) {
    if (error instanceof Response) return error;
    throw error;
  }
}

describe("api.sites.$domain_.runs", () => {
  beforeAll(async () => {
    await prisma.user.upsert({
      where: { id: "api-runs-test-user-1" },
      create: {
        id: "api-runs-test-user-1",
        email: "api-runs-test@test.example",
        passwordHash: "test",
        apiKey: API_KEY,
        ownedSites: {
          create: {
            domain: DOMAIN,
            citationRuns: {
              create: {
                id: "api-runs-test-run-1",
                platform: "chatgpt",
                model: "gpt-4o",
                queries: {
                  create: {
                    query: "test query",
                    group: "test group",
                    extraQueries: [],
                    text: "test response",
                    citations: ["https://api-runs-test.example/page"],
                  },
                },
              },
            },
          },
        },
      },
      update: {
        apiKey: API_KEY,
      },
    });
  });

  afterAll(async () => {
    await prisma.user.deleteMany({ where: { id: "api-runs-test-user-1" } });
  });

  it("returns 401 without a token", async () => {
    const res = await callLoader(makeRequest());
    expect(res.status).toBe(401);
  });

  it("returns 404 for a domain this user doesn't own", async () => {
    const res = await callLoader(makeRequest(API_KEY), "other-domain.example");
    expect(res.status).toBe(404);
  });

  it("returns 200 with runs data", async () => {
    const res = await callLoader(makeRequest(API_KEY));
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(Array.isArray(body.runs)).toBe(true);
    expect(body.runs).toHaveLength(1);

    const run = body.runs[0];
    expect(run.id).toBe("api-runs-test-run-1");
    expect(run.platform).toBe("chatgpt");
    expect(run.model).toBe("gpt-4o");
    expect(run.queryCount).toBe(1);
    expect(run.citationCount).toBe(1);
    expect(run.createdAt).toBeDefined();
  });

  it("returns empty runs for a future ?since= date", async () => {
    const futureDate = new Date(Date.now() + 1000 * 60 * 60 * 24).toISOString();
    const res = await callLoader(makeRequest(API_KEY, `?since=${futureDate}`));
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(Array.isArray(body.runs)).toBe(true);
    expect(body.runs).toHaveLength(0);
  });
});
