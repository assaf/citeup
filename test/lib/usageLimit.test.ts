import { describe, it, expect, beforeEach } from "vitest";
import prisma from "~/lib/prisma.server";
import { checkUsageLimits, recordUsageEvent } from "~/lib/usage/usageLimit.server";
import { UsageLimitExceededError } from "~/lib/usage/UsageLimitExceededError";

const ACCOUNT_ID = "test-usage-account-1";

beforeEach(async () => {
  await prisma.usageEvent.deleteMany({ where: { accountId: ACCOUNT_ID } });
  // Ensure account exists
  await prisma.account.upsert({
    where: { id: ACCOUNT_ID },
    create: { id: ACCOUNT_ID },
    update: {},
  });
});

describe("recordUsageEvent", () => {
  it("inserts a UsageEvent row with computed cost", async () => {
    await recordUsageEvent({
      accountId: ACCOUNT_ID,
      platform: "claude",
      model: "claude-haiku-4-5-20251001",
      inputTokens: 1_000_000,
      outputTokens: 1_000_000,
    });

    const events = await prisma.usageEvent.findMany({ where: { accountId: ACCOUNT_ID } });
    expect(events).toHaveLength(1);
    // $1.00 input + $5.00 output = $6.00
    expect(Number(events[0].costUsd)).toBeCloseTo(6.0);
    expect(events[0].inputTokens).toBe(1_000_000);
    expect(events[0].outputTokens).toBe(1_000_000);
    expect(events[0].requests).toBe(1);
  });
});

describe("checkUsageLimits", () => {
  it("passes when no events exist", async () => {
    await expect(checkUsageLimits(ACCOUNT_ID)).resolves.toBeUndefined();
  });

  it("throws UsageLimitExceededError when hourly cost is exceeded", async () => {
    // Insert enough events to exceed $2.00/hour limit
    // claude-haiku: $1/M input + $5/M output; 500k output = $2.50 > $2 limit
    await recordUsageEvent({
      accountId: ACCOUNT_ID,
      platform: "claude",
      model: "claude-haiku-4-5-20251001",
      inputTokens: 0,
      outputTokens: 500_000,
    });

    await expect(checkUsageLimits(ACCOUNT_ID)).rejects.toThrow(UsageLimitExceededError);
  });

  it("throws with correct window and limitType", async () => {
    await recordUsageEvent({
      accountId: ACCOUNT_ID,
      platform: "claude",
      model: "claude-haiku-4-5-20251001",
      inputTokens: 0,
      outputTokens: 500_000,
    });

    try {
      await checkUsageLimits(ACCOUNT_ID);
      expect.fail("Should have thrown");
    } catch (err) {
      expect(err).toBeInstanceOf(UsageLimitExceededError);
      const e = err as UsageLimitExceededError;
      expect(e.window).toBe("hourly");
      expect(e.limitType).toBe("cost");
      expect(e.current).toBeGreaterThan(2.0);
      expect(e.limit).toBe(2.0);
    }
  });
});
