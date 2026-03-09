/**
 * NOTE: This is used by `db seed` (prisma/seed.ts) but also when running test
 * suite (test/helpers/globalSetup.ts)
 */

import { PrismaPg } from "@prisma/adapter-pg";
import debug from "debug";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import pg from "pg";
import { PrismaClient } from "prisma/generated/client";
import envVars from "./envVars";

let prismaClient: PrismaClient | null = null;

function createPrismaClient(): PrismaClient {
  const url = new URL(envVars.DATABASE_URL);
  const isLocal = url.hostname === "localhost";

  // Configure pg Pool for Supabase pooler (SSL configured via DATABASE_URL)
  const pool = new pg.Pool({
    connectionString: url.toString(),
    max: 1,
    idleTimeoutMillis: 0,
    connectionTimeoutMillis: 0,
    allowExitOnIdle: true,
    ssl: isLocal
      ? false
      : {
          cert: readFileSync(resolve("prisma/prod-ca-2021.crt")),
          rejectUnauthorized: false,
        },
  });

  return new PrismaClient({
    adapter: new PrismaPg(pool),
    errorFormat: "pretty",
    log: debug.enabled("prisma") ? ["error", "warn", "query", "info"] : ["error"],
  });
}

export default new Proxy({} as PrismaClient, {
  get: (_, prop) => {
    if (!prismaClient) prismaClient = createPrismaClient();
    return Reflect.get(prismaClient, prop);
  },
});
