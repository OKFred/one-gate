import { describe, expect, it, vi } from "vitest";
import {
  CloudflareUsageClient,
  UsageSourceError,
  retryAfter,
  type Fetcher,
} from "./client";
import { normalizeBilling, sumDecimal } from "./normalize";
import { ANALYTICS_ADAPTERS, advanceAnalytics } from "./analytics";
import { DAY_MS, type UsageCursor } from "./types";
const accountId = "a".repeat(32);
const configuration = {
  accountId,
  billingToken: "synthetic-secret",
  analyticsToken: "synthetic-secret-analytics",
};
const now = Date.UTC(2026, 9, 25, 12);
const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), { status });
describe("Cloudflare official metadata adapters", () => {
  it("rejects GraphQL HTTP200 errors without leaking provider text or secrets", async () => {
    const fetcher: Fetcher = async () =>
      json({
        errors: [{ message: "synthetic-secret and sensitive provider detail" }],
        data: { viewer: {} },
      });
    await expect(
      new CloudflareUsageClient(configuration, fetcher).graphql("{}", {}, now)
    ).rejects.toMatchObject({
      code: "graphql_error",
      message: "graphql_error",
    });
  });
  it("bounds bodies, rejects endpoint escape/redirects, parses bounded retry-after", async () => {
    const fetcher = vi.fn<Fetcher>(
      async () =>
        new Response("x", { headers: { "content-length": "3000000" } })
    );
    const client = new CloudflareUsageClient(configuration, fetcher);
    await expect(
      client.request("https://example.com", "billing")
    ).rejects.toMatchObject({ code: "invalid_endpoint" });
    expect(fetcher).not.toHaveBeenCalled();
    await expect(
      client.request(`/accounts/${accountId}/billable-usage`, "billing")
    ).rejects.toMatchObject({ code: "response_too_large" });
    expect(fetcher.mock.calls[0][1]?.redirect).toBe("error");
    const rateClient = new CloudflareUsageClient(
      configuration,
      async () =>
        new Response(null, { status: 429, headers: { "Retry-After": "120" } })
    );
    await expect(
      rateClient.request(`/accounts/${accountId}/billable-usage`, "billing", {
        now,
      })
    ).rejects.toMatchObject({
      code: "rate_limited",
      retryTimeUtc: now + 120000,
    });
    expect(retryAfter("9999999", now)).toBe(now + DAY_MS);
  });
  it("keeps every unknown official meter, missing quantities, currencies and decimal costs distinct", () => {
    const row = {
      BillingAccountId: accountId,
      BillingAccountName: "Synthetic",
      x_BillableMetricId: "unmapped",
      x_BillableMetricName: "New official meter",
      x_ProductFamilyName: "New product",
      ConsumedUnit: "new-unit",
      BillingPeriodStart: "2026-10-08T00:00:00Z",
      BillingPeriodEnd: "2026-11-08T00:00:00Z",
      ChargePeriodStart: "2026-10-24T00:00:00Z",
      ChargePeriodEnd: "2026-10-25T00:00:00Z",
      BillingCurrency: "USD",
      ContractedCost: 0.1,
    };
    const result = normalizeBilling(
      [
        row,
        { ...row, ContractedCost: 0.2 },
        { ...row, BillingCurrency: "EUR", ConsumedQuantity: 3 },
      ],
      {
        accountId,
        source: "billing-v2",
        now,
        cycleStart: null,
        cycleEnd: null,
        plan: "unknown",
      }
    );
    expect(result.metrics).toHaveLength(1);
    expect(result.metrics[0]).toMatchObject({
      product: "New product",
      used: null,
      limit: null,
      percentage: null,
    });
    expect(result.costs).toHaveLength(2);
    expect(result.costs.find((c) => c.currency === "USD")?.amount).toBe("0.3");
    expect(result.history[0].value).toBeNull();
    expect(sumDecimal("-0.1", "0.2")).toBe("0.1");
    expect(() =>
      normalizeBilling([{ ...row, BillingAccountId: "b".repeat(32) }], {
        accountId,
        source: "billing-v2",
        now,
        cycleStart: null,
        cycleEnd: null,
        plan: "unknown",
      })
    ).toThrow(UsageSourceError);
  });
  it("does not fabricate zero from an empty v2 response or from a missing meter amount", () => {
    const result = normalizeBilling([], {
      accountId,
      source: "billing-v2",
      now,
      cycleStart: null,
      cycleEnd: null,
      plan: "unknown",
    });
    expect(result.metrics).toEqual([]);
    expect(result.costs).toEqual([]);
    expect(result.coverage[0].reason).toContain("not_zero_usage");
  });
  it("rejects malformed account identities and keeps overlapping billing periods separate", () => {
    const row = {
      BillingAccountId: accountId,
      x_BillableMetricName: "Workers requests",
      x_ProductFamilyName: "Workers",
      x_BillableMetricId: "requests",
      ConsumedUnit: "requests",
      ConsumedQuantity: 6000000,
      BillingPeriodStart: "2026-10-01T00:00:00Z",
      BillingPeriodEnd: "2026-11-01T00:00:00Z",
      ChargePeriodStart: "2026-10-24T00:00:00Z",
      ChargePeriodEnd: "2026-10-25T00:00:00Z",
    };
    const options = {
      accountId,
      source: "billing-v2" as const,
      now,
      cycleStart: null,
      cycleEnd: null,
      plan: "standard" as const,
    };
    for (const invalid of [null, 123, ""])
      expect(() =>
        normalizeBilling([{ ...row, BillingAccountId: invalid }], options)
      ).toThrow(UsageSourceError);
    const result = normalizeBilling(
      [
        row,
        {
          ...row,
          BillingPeriodStart: "2026-10-08T00:00:00Z",
          BillingPeriodEnd: "2026-11-08T00:00:00Z",
        },
      ],
      options
    );
    expect(result.metrics).toHaveLength(2);
    expect(result.metrics.map((m) => m.used)).toEqual([6000000, 6000000]);
    expect(new Set(result.metrics.map((m) => m.id)).size).toBe(2);
    const shared = normalizeBilling(
      [
        { ...row, SubAccountId: "one" },
        { ...row, SubAccountId: "two" },
      ],
      options
    );
    expect(shared.metrics.map((m) => m.limit)).toEqual([null, null]);
    expect(
      shared.metrics.every((m) => m.reason?.includes("shared_pool_ambiguous"))
    ).toBe(true);
  });
  it("does not treat missing billing end as perpetually current and only supplements an exact official start", () => {
    const row = {
      BillingAccountId: accountId,
      ServiceName: "R2 Data Storage (First 10GB-Month included)",
      ServiceFamilyName: "R2",
      ConsumedUnit: "GB-months",
      ConsumedQuantity: 0.2,
      BillingPeriodStart: "2026-09-08T00:00:00Z",
      ChargePeriodStart: "2026-09-24T00:00:00Z",
      ChargePeriodEnd: "2026-09-25T00:00:00Z",
      BilledCost: 0.1,
      BillingCurrency: "USD",
    };
    const options = {
      accountId,
      source: "billing-v1" as const,
      now,
      cycleStart: Date.UTC(2026, 9, 8),
      cycleEnd: Date.UTC(2026, 10, 8),
      plan: "unknown" as const,
    };
    const old = normalizeBilling([row], options);
    expect(old.costs).toEqual([]);
    expect(old.metrics[0].used).toBeNull();
    expect(old.history[0].value).toBe(0.2);
    const current = normalizeBilling(
      [
        {
          ...row,
          BillingPeriodStart: "2026-10-08T00:00:00Z",
          ChargePeriodStart: "2026-10-24T00:00:00Z",
          ChargePeriodEnd: "2026-10-25T00:00:00Z",
        },
      ],
      { ...options, r2Standard: true }
    );
    expect(current.metrics[0]).toMatchObject({
      used: 0.2,
      limit: 10,
      periodEndUtc: Date.UTC(2026, 10, 8),
    });
    expect(current.costs[0].amount).toBe("0.1");
    expect(
      normalizeBilling([row], { ...options, cycleStart: null, cycleEnd: null })
        .costs
    ).toEqual([]);
  });
  it("chooses one official cost basis per record including billed-only and negative corrections", () => {
    const row = {
      BillingAccountId: accountId,
      ServiceName: "Meter",
      ServiceFamilyName: "Other",
      ConsumedUnit: "count",
      ConsumedQuantity: 1,
      BillingPeriodStart: "2026-10-08T00:00:00Z",
      BillingPeriodEnd: "2026-11-08T00:00:00Z",
      ChargePeriodStart: "2026-10-24T00:00:00Z",
      ChargePeriodEnd: "2026-10-25T00:00:00Z",
      BillingCurrency: "USD",
    };
    const options = {
      accountId,
      source: "billing-v2" as const,
      now,
      cycleStart: null,
      cycleEnd: null,
      plan: "unknown" as const,
    };
    const result = normalizeBilling(
      [
        { ...row, BilledCost: 0.3, ContractedCost: 0.9, EffectiveCost: 1.1 },
        { ...row, BilledCost: -0.1 },
      ],
      options
    );
    expect(result.costs).toHaveLength(1);
    expect(result.costs[0]).toMatchObject({
      amount: "0.2",
      status: "official_usage_cost_billed",
    });
    expect(
      normalizeBilling([{ ...row, EffectiveCost: 0.4 }], options).costs[0]
    ).toMatchObject({ amount: "0.4", status: "official_usage_cost_effective" });
  });
  it("checks schema/settings, continues complete windows and never publishes a truncated source", async () => {
    const adapter = ANALYTICS_ADAPTERS.find((a) => a.product === "D1")!;
    const cursor: UsageCursor = {
      version: 1,
      step: 7,
      startedTimeUtc: now,
      snapshots: [],
      coverage: [],
      metadata: {
        plan: "free",
        cycleStart: null,
        cycleEnd: null,
        covered: true,
        anchor: null,
        subscriptionPage: 1,
        datasetNames: [adapter.dataset],
      },
    };
    let dataCalls = 0;
    const fetcher: Fetcher = async (_url, init) => {
      const request: unknown = JSON.parse(String(init?.body));
      if (
        typeof request === "object" &&
        request !== null &&
        "query" in request &&
        String(request.query).includes("UsageSettings")
      )
        return json({
          data: {
            viewer: {
              accounts: [
                {
                  settings: {
                    [adapter.dataset]: {
                      enabled: true,
                      maxPageSize: 1000,
                      maxDuration: 86400,
                      notOlderThan: 31 * 86400,
                      availableFields: [
                        "dimensions_date",
                        "sum_rowsRead",
                        "sum_rowsWritten",
                      ],
                    },
                  },
                },
              ],
            },
          },
        });
      dataCalls++;
      return json({
        data: { viewer: { accounts: [{ [adapter.dataset]: [] }] } },
      });
    };
    const client = new CloudflareUsageClient(configuration, fetcher);
    expect(await advanceAnalytics(client, adapter, cursor, now)).toBeNull();
    expect(cursor.snapshots).toEqual([]);
    expect(dataCalls).toBe(1);
    cursor.metadata!.analytics!.nextStartUtc =
      Math.floor(now / DAY_MS) * DAY_MS;
    const complete = await advanceAnalytics(client, adapter, cursor, now);
    expect(complete?.metrics).toEqual([]);
    expect(complete?.coverage[0].reason).toContain("not_zero_usage");
    const truncated: Fetcher = async () =>
      json({
        data: {
          viewer: {
            accounts: [
              { [adapter.dataset]: Array.from({ length: 2 }, () => ({})) },
            ],
          },
        },
      });
    cursor.metadata!.analytics = {
      nextStartUtc: now - 1000,
      retainedStartUtc: now - DAY_MS,
      maxDurationMs: DAY_MS,
      pageLimit: 2,
      fields: ["rowsRead"],
      history: [],
    };
    await expect(
      advanceAnalytics(
        new CloudflareUsageClient(configuration, truncated),
        adapter,
        cursor,
        now
      )
    ).rejects.toMatchObject({ code: "truncated_window" });
  });
});
