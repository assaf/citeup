import type { Temporal } from "@js-temporal/polyfill";
import { captureException } from "@sentry/node";
import { ms } from "convert";
import { delay } from "es-toolkit";
import prisma from "~/lib/prisma.server";
import type { Account } from "~/prisma/generated/client";
import type { QueryFn } from "./llmVisibility";

/**
 * Query a given platform for a given account and queries.
 *
 * @param account - The account to query.
 * @param modelId - The model to use for the queries.
 * @param newerThan - The date to start querying from. If the last run is
 *   newer than this date, the queries will not be queried again.
 * @param platform - The platform to query.
 * @param queries - The queries to query.
 * @param queryFn - The function to use to query the LLM.
 * @param repetitions - The number of times to repeat each query. If the last
 *   query is newer than this date, the queries will not be queried again.
 */
export default async function queryPlatform({
  account,
  modelId,
  newerThan,
  platform,
  queries,
  queryFn,
  repetitions,
}: {
  account: Account;
  modelId: string;
  newerThan: Temporal.PlainDateTime;
  platform: string;
  queries: { query: string; category: string }[];
  queryFn: QueryFn;
  repetitions: number;
}) {
  try {
    const existing = await prisma.citationQueryRun.findFirst({
      where: {
        platform,
        accountId: account.id,
        createdAt: { gte: new Date(`${newerThan.toString()}Z`) },
      },
      orderBy: { createdAt: "desc" },
    });
    if (existing) {
      console.info(
        "[%s:%s] Skipping — citation query run already exists: %s",
        account.id,
        platform,
        existing.id,
      );
      return;
    }

    const run = await prisma.citationQueryRun.create({
      data: { platform, model: modelId, accountId: account.id },
    });
    console.info(
      "[%s:%s] Created citation query run %s",
      account.id,
      platform,
      run.id,
    );

    for (let qi = 0; qi < queries.length; qi++) {
      const query = queries[qi];
      for (let repetition = 1; repetition <= repetitions; repetition++) {
        await singleQueryRepetition({
          account,
          category: query.category,
          platform,
          query: query.query,
          queryFn,
          repetition,
          runId: run.id,
        });
        await delay(ms("2s"));
      }
    }
  } catch (error) {
    console.error("[%s:%s] Error: %s", account.id, platform, error);
    captureException(error, {
      extra: { accountId: account.id, platform },
    });
  }
}

async function singleQueryRepetition({
  account,
  category,
  platform,
  query,
  queryFn,
  repetition,
  runId,
}: {
  account: Account;
  category: string;
  platform: string;
  query: string;
  queryFn: QueryFn;
  repetition: number;
  runId: string;
}): Promise<void> {
  const existing = await prisma.citationQuery.findFirst({
    where: { query, repetition, runId },
  });
  if (existing) {
    console.info(
      "[%s:%s] Repetition %d: %s (category: %s) — already exists",
      account.id,
      platform,
      repetition,
      query,
      category,
    );
    return;
  }

  try {
    const { citations, extraQueries, text } = await queryFn(query);
    console.info(
      "[%s:%s] Repetition %d: %s (category: %s)",
      account.id,
      platform,
      repetition,
      query,
      category,
    );
    const index = citations.findIndex(
      (url) => new URL(url).hostname === account.hostname,
    );

    await prisma.citationQuery.create({
      data: {
        runId,
        repetition: repetition,
        query,
        category: category,
        text,
        position: index >= 0 ? index : null,
        citations,
        extraQueries,
      },
    });
  } catch (error) {
    console.error(
      "[%s:%s] Repetition %d: %s (category: %s) — error: %s",
      account.id,
      platform,
      repetition,
      query,
      category,
      error,
    );
    captureException(error, {
      extra: {
        accountId: account.id,
        platform,
        runId,
        query,
        category,
        repetition,
      },
    });
  }
}
