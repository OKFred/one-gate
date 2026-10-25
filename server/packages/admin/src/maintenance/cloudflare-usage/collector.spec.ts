import { beforeAll, beforeEach, describe, expect, it } from "vitest";
import db from "@hodor/core/db/index";
import { setupTestDb, clearTestData } from "@hodor/core/db/testHelper";
import snapshotSql from "@hodor/core/db/sql/admin/cloudflare_usage_snapshot.sql?raw";
import dailySql from "@hodor/core/db/sql/admin/cloudflare_usage_daily.sql?raw";
import syncSql from "@hodor/core/db/sql/admin/cloudflare_usage_sync.sql?raw";
import { runCloudflareUsageMaintenance } from "./collector";
import { getUsageRepository } from "./repository";
import { record } from "./types";
import type { Fetcher } from "./client";
const config = {
  accountId: "a".repeat(32),
  analyticsToken: "synthetic-analytics-secret",
  billingToken: "synthetic-billing-secret",
};
const now = Date.UTC(2026, 9, 25, 12);
const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), { status });
describe("bounded persisted Cloudflare collector", () => {
  beforeAll(() => setupTestDb(db, [snapshotSql, dailySql, syncSql]));
  beforeEach(() =>
    clearTestData(db, [
      "cloudflare_usage_snapshot",
      "cloudflare_usage_daily",
      "cloudflare_usage_sync",
    ])
  );
  function fixture(customFirst = true): Fetcher {
    return async (url, init) => {
      const path = new URL(url).pathname;
      const plans = [
        {
          state: "Paid",
          rate_plan: { public_name: "Workers Enterprise", is_contract: true },
        },
        {
          state: "Paid",
          current_period_start: "2026-10-08T00:00:00Z",
          current_period_end: "2026-11-08T00:00:00Z",
          rate_plan: { public_name: "Workers Standard", is_contract: false },
        },
      ];
      if (path.endsWith("/subscriptions"))
        return json({
          success: true,
          result: customFirst ? plans : plans.reverse(),
        });
      if (path.endsWith("/billable-usage/info"))
        return json({
          success: true,
          result: {
            covered: true,
            subscriptions: [
              { billing_cycle_anchor_timestamp: "2024-09-08T00:00:00Z" },
            ],
          },
        });
      if (path.endsWith("/billable/usage"))
        return json({ success: false }, 403);
      if (path.endsWith("/billable-usage"))
        return json({
          success: true,
          result: [
            {
              BillingAccountId: config.accountId,
              ServiceName: "Unknown meter",
              ServiceFamilyName: "Other",
              ConsumedUnit: "count",
              ConsumedQuantity: 12,
              BillingPeriodStart: "2026-10-08T00:00:00Z",
              BillingPeriodEnd: "2026-11-08T00:00:00Z",
              ChargePeriodStart: "2026-10-24T00:00:00Z",
              ChargePeriodEnd: "2026-10-25T00:00:00Z",
              BillingCurrency: "USD",
              BilledCost: 0,
            },
          ],
        });
      const request: unknown = JSON.parse(String(init?.body));
      const query = record(request) ? String(request.query) : "";
      if (query.includes("__typename"))
        return json({
          data: {
            viewer: { accounts: [{ __typename: "SyntheticAccountType" }] },
          },
        });
      if (query.includes("__type"))
        return json({ data: { __type: { fields: [] } } });
      throw new Error("Unexpected fixture route");
    };
  }
  it("bounds each tick, checkpoints every advance, keeps sources independent and never treats custom plan as standard", async () => {
    const repository = getUsageRepository();
    const events: Record<string, string | number | null>[] = [];
    const first = await runCloudflareUsageMaintenance({
      runId: "minute-one",
      now,
      config,
      repository,
      fetcher: fixture(),
      onEvent: (e) => events.push(e),
    });
    expect(first.processedCount).toBe(6);
    expect(first.state).toBe("pending");
    const lease = (await repository.claim(
      config.accountId,
      now + 30000,
      "inspect"
    ))!;
    expect(lease.generation).toBe(7);
    expect(lease.cursor.metadata?.plan).toBe("unknown");
    await repository.checkpoint(lease, lease.cursor, now + 30001);
    const second = await runCloudflareUsageMaintenance({
      runId: "minute-two",
      now: now + 60000,
      config,
      repository,
      fetcher: fixture(),
      onEvent: (e) => events.push(e),
    });
    expect(second.jobId).toBe(first.jobId);
    expect(second.state).toBe("partial");
    expect(second.processedCount).toBeLessThanOrEqual(6);
    const stored = await repository.read(config.accountId, 0);
    expect(stored.snapshots).toHaveLength(2);
    expect(
      stored.snapshots.find((s) => s.source === "billing-usage")?.metrics[0]
        .used
    ).toBe(12);
    expect(
      stored.snapshots.find((s) => s.source === "billing-cost")?.costs[0].amount
    ).toBe("0");
    expect(
      events.some((e) => e.event === "cloudflare_usage_source_failure")
    ).toBe(true);
    expect(JSON.stringify(events)).not.toContain(config.analyticsToken);
    expect(JSON.stringify(events)).not.toContain(config.billingToken);
  });
  it("keeps ambiguous plans sticky in either subscription order", async () => {
    const repository = getUsageRepository();
    await runCloudflareUsageMaintenance({
      runId: "minute-one",
      now,
      config,
      repository,
      fetcher: fixture(false),
      onEvent: () => undefined,
    });
    const lease = (await repository.claim(
      config.accountId,
      now + 30000,
      "inspect"
    ))!;
    expect(lease.cursor.metadata?.plan).toBe("unknown");
  });
  it("persists Retry-After and does not issue another provider request before eligibility", async () => {
    const repository = getUsageRepository();
    let calls = 0;
    const fetcher: Fetcher = async () => {
      calls++;
      return new Response(null, {
        status: 429,
        headers: { "retry-after": "120" },
      });
    };
    const first = await runCloudflareUsageMaintenance({
      runId: "first",
      now,
      config,
      repository,
      fetcher,
      onEvent: () => undefined,
    });
    expect(first.retryTimeUtc).toBeGreaterThanOrEqual(now + 120000);
    await runCloudflareUsageMaintenance({
      runId: "early",
      now: now + 60000,
      config,
      repository,
      fetcher,
      onEvent: () => undefined,
    });
    expect(calls).toBe(1);
  });
  it("persists publication failure backoff and replays the same job without duplicate snapshots", async () => {
    const repository = getUsageRepository();
    let rejectPublication = true;
    const events: Record<string, string | number | null>[] = [];
    const retryRepository = {
      ...repository,
      publish: async (...args: Parameters<typeof repository.publish>) => {
        if (rejectPublication) {
          rejectPublication = false;
          throw new Error("D1_ERROR: synthetic publication rejection");
        }
        return repository.publish(...args);
      },
    };
    const options = {
      config,
      repository: retryRepository,
      fetcher: fixture(),
      onEvent: (e: Record<string, string | number | null>) => events.push(e),
    };
    const first = await runCloudflareUsageMaintenance({
      ...options,
      runId: "first",
      now,
    });
    const failed = await runCloudflareUsageMaintenance({
      ...options,
      runId: "second",
      now: now + 60000,
    });
    expect(failed.state).toBe("pending");
    expect(failed.jobId).toBe(first.jobId);
    expect(failed.retryTimeUtc).not.toBeNull();
    expect((await repository.read(config.accountId, 0)).snapshots).toEqual([]);
    const early = await runCloudflareUsageMaintenance({
      ...options,
      runId: "early",
      now: failed.retryTimeUtc! - 30000,
    });
    expect(early.processedCount).toBe(0);
    const retry = await runCloudflareUsageMaintenance({
      ...options,
      runId: "retry",
      now: failed.retryTimeUtc! + 1,
    });
    expect(retry.jobId).toBe(first.jobId);
    expect(retry.state).toBe("partial");
    const stored = await repository.read(config.accountId, 0);
    expect(stored.snapshots).toHaveLength(2);
    expect(stored.history).toHaveLength(2);
    expect(stored.history.filter((h) => h.kind === "daily_usage")).toHaveLength(
      1
    );
    expect(
      stored.history.find((h) => h.kind === "cumulative_snapshot")
    ).toMatchObject({
      source: "quota-observation:billing-v1",
      dayUtc: Math.floor(now / 86_400_000) * 86_400_000,
      value: 12,
    });
    expect(events).toContainEqual({
      event: "cloudflare_usage_publication_failed",
      stage: "publish",
      runId: "second",
      jobId: first.jobId,
      causeCode: "D1_ERROR",
    });
    expect(JSON.stringify(events)).not.toContain(
      "synthetic publication rejection"
    );
  });
});
