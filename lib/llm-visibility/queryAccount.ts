import { Temporal } from "@js-temporal/polyfill";
import { groupBy, orderBy } from "es-toolkit";
import prisma from "~/lib/prisma.server";
import type { Account } from "~/prisma/generated/client";
import queryClaude from "./claudeClient";
import queryGemini from "./geminiClient";
import openaiClient from "./openaiClient";
import queryPerplexity from "./perplexityClient";
import {
  default as runAllQueries,
  default as runPlatform,
} from "./queryPlatform";

/**
 * Query all platforms for a given account and queries.
 *
 * @param account - The account to query.
 * @param queries - The queries to query.
 * @param repetitions - The number of times to repeat each query. If the last
 *   run is newer than this date, the queries will not be run again.
 * @returns The results of the queries.
 */
export default async function queryAccount({
  account,
  queries,
  repetitions,
}: {
  account: Account;
  queries: { query: string; category: string }[];
  repetitions: number;
}) {
  const newerThan = Temporal.Now.instant()
    .subtract({ hours: 24 })
    .toZonedDateTimeISO("UTC")
    .toPlainDateTime();

  await Promise.all([
    runAllQueries({
      account,
      modelId: "gpt-5-chat-latest",
      newerThan,
      platform: "chatgpt",
      queries,
      queryFn: openaiClient,
      repetitions,
    }),

    runAllQueries({
      account,
      modelId: "sonar",
      newerThan,
      platform: "perplexity",
      queries,
      queryFn: queryPerplexity,
      repetitions,
    }),

    runPlatform({
      account,
      modelId: "claude-haiku-4-5-20251001",
      newerThan,
      platform: "claude",
      queries,
      queryFn: queryClaude,
      repetitions,
    }),

    runPlatform({
      account,
      modelId: "gemini-2.5-flash",
      newerThan,
      platform: "gemini",
      queries,
      queryFn: queryGemini,
      repetitions,
    }),
  ]);

  const all = await prisma.citationQueryRun.findMany({
    where: { accountId: account.id },
    include: { queries: true },
    orderBy: { createdAt: "asc" },
  });
  const byDate = Object.entries(
    groupBy(all, ({ createdAt }) => createdAt.toISOString().slice(0, 10)),
  );
  return orderBy(byDate, [([date]) => date], ["asc"]);
}
