import bcrypt from "bcryptjs";
import prisma from "../app/lib/prisma.server";

const HOSTNAME = "rentail.space";
const REPETITIONS = 3;

const PLATFORMS = [
  { platform: "chatgpt", model: "gpt-5-chat-latest", visibilityRate: 0.45 },
  { platform: "perplexity", model: "sonar", visibilityRate: 0.65 },
  {
    platform: "claude",
    model: "claude-haiku-4-5-20251001",
    visibilityRate: 0.25,
  },
  { platform: "gemini", model: "gemini-2.5-flash", visibilityRate: 0.35 },
] as const;

const OTHER_CITATIONS = [
  "https://popupinsider.com/mall-retail-guide",
  "https://siteselectiongroup.com/specialty-leasing",
  "https://storeshq.com/popup-retail",
  "https://mallfinder.com/available-spaces",
  "https://commercialpro.com/short-term-retail",
  "https://popuprepublic.com/find-space",
  "https://shoppingcenters.com/leasing",
];

// Deterministic integer hash — reproducible across runs
function hash(n: number): number {
  let x = n | 0;
  x = ((x >> 16) ^ x) * 0x45d9f3b;
  x = ((x >> 16) ^ x) * 0x45d9f3b;
  x = (x >> 16) ^ x;
  return Math.abs(x);
}

function generateCitations(
  seed: number,
  visibilityRate: number,
): { citations: string[]; position: number | null } {
  const numOther = 3 + (hash(seed) % 3); // 3–5 citations
  const offset = hash(seed * 7) % (OTHER_CITATIONS.length - numOther + 1);
  const others = OTHER_CITATIONS.slice(offset, offset + numOther);
  const mentioned = hash(seed * 13) % 100 < visibilityRate * 100;

  if (!mentioned) return { citations: others, position: null };

  const pos = hash(seed * 17) % (numOther + 1);
  const citations = [...others];
  citations.splice(pos, 0, `https://${HOSTNAME}/marketplace`);
  return { citations, position: pos };
}

function daysAgo(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(10, 0, 0, 0);
  return d;
}

async function main() {
  console.info("Seeding database…");

  const user = await prisma.user.upsert({
    where: { email: "assaf@labnotes.org" },
    update: {},
    create: {
      email: "assaf@labnotes.org",
      passwordHash: await bcrypt.hash("EhnGjs7JMsq3oKrkfwZk", 1),
      account: { create: {} },
    },
  });
  console.info("✅ User: %s (%s)", user.id, user.email);

  /*
  const runDates = [21, 14, 7, 0].map(daysAgo);

  for (const { platform, model, visibilityRate } of PLATFORMS) {
    for (let runIdx = 0; runIdx < runDates.length; runIdx++) {
      const createdAt = runDates[runIdx];

      // Idempotency: skip if a run already exists within ±1 h of this date
      const existingRun = await prisma.citationQueryRun.findFirst({
        where: {
          siteId: site.id,
          platform,
          createdAt: {
            gte: new Date(createdAt.getTime() - 60 * 60 * 1000),
            lte: new Date(createdAt.getTime() + 60 * 60 * 1000),
          },
        },
      });
      if (existingRun) {
        console.info(
          "  Skipping existing: %s %s",
          platform,
          createdAt.toISOString().slice(0, 10),
        );
        continue;
      }

      const platformIdx = PLATFORMS.findIndex((p) => p.platform === platform);
      const queryData = rawQueries.flatMap(({ query, category }, qi) =>
        Array.from({ length: REPETITIONS }, (_, i) => {
          const rep = i + 1;
          const seed = qi * 10_000 + rep * 1_000 + runIdx * 10 + platformIdx;
          const { citations, position } = generateCitations(
            seed,
            visibilityRate,
          );
          return {
            query,
            category,
            repetition: rep,
            text: `Based on your query about "${query.toLowerCase()}", here are some relevant resources and platforms to consider.`,
            citations,
            position,
            extraQueries: [] as string[],
          };
        }),
      );

      await prisma.citationQueryRun.create({
        data: {
          siteId: site.id,
          platform,
          model,
          createdAt,
          queries: { createMany: { data: queryData } },
        },
      });

      console.info(
        "  Created: %s %s (%d queries)",
        platform,
        createdAt.toISOString().slice(0, 10),
        queryData.length,
      );
    }
  }
    */

  console.info("✅ Done.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
