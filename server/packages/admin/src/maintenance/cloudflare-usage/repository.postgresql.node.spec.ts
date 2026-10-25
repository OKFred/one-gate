import { beforeAll, afterAll, beforeEach, describe, expect, it } from "vitest";
import { sql } from "drizzle-orm";
import {
  createPostgresTestHarness,
  postgresTestsConfigured,
  type PostgresTestHarness,
} from "../../../../../apps/server/test/postgresql";
import { createPostgresUsageRepository } from "./repository.pg";
import { LEASE_MS, type SourceSnapshot } from "./types";
describe.skipIf(!postgresTestsConfigured)(
  "PostgreSQL Cloudflare usage fencing and atomicity",
  () => {
    let harness: PostgresTestHarness;
    const now = Date.UTC(2026, 9, 25);
    const snapshot: SourceSnapshot = {
      source: "billing-usage",
      accountName: null,
      metrics: [],
      costs: [],
      history: [
        {
          metricId: "synthetic",
          dayUtc: now,
          value: 3,
          kind: "daily_usage",
          source: "billing-v2",
        },
      ],
      coverage: [],
      collectedTimeUtc: now,
    };
    beforeAll(async () => {
      harness = await createPostgresTestHarness("cf_usage");
    });
    afterAll(() => harness?.close());
    beforeEach(() => harness.reset());
    it.each([6, 14, 15, 31, 159])(
      "publishes VALUES chunks with nullable quantities (%i history rows)",
      async (size) => {
        const repository = createPostgresUsageRepository();
        await harness.run(() => repository.request("values", now, "job", true));
        const lease = (await harness.run(() =>
          repository.claim("values", now, "run")
        ))!;
        const source = {
          ...snapshot,
          history: Array.from({ length: size }, (_, i) => ({
            ...snapshot.history[0],
            metricId: `synthetic:metric-${i}`,
            value: i % 4 === 0 ? null : i,
          })),
        };
        expect(
          await harness.run(() =>
            repository.publish(
              lease,
              { ...lease.cursor, snapshots: [source], coverage: [] },
              now + 1
            )
          )
        ).toBe(true);
        const stored = await harness.run(() => repository.read("values", 0));
        expect(stored.history).toHaveLength(size);
        expect(stored.history.filter((h) => h.value === null)).toHaveLength(
          Math.ceil(size / 4)
        );
        expect(stored.snapshots).toHaveLength(1);
      }
    );
    it("serializes concurrent claims, fences expired work and isolates accounts", async () => {
      const repository = createPostgresUsageRepository();
      await harness.run(() =>
        repository.request("a", now, "business-job", true)
      );
      const leases = await Promise.all(
        Array.from({ length: 4 }, (_, i) =>
          harness.run(() => repository.claim("a", now, `minute-${i}`))
        )
      );
      expect(leases.filter(Boolean)).toHaveLength(1);
      const first = leases.find((l) => l !== null)!;
      const second = (await harness.run(() =>
        repository.claim("a", now + LEASE_MS, "replacement")
      ))!;
      expect(second.generation).toBe(first.generation + 1);
      expect(
        await harness.run(() =>
          repository.publish(
            first,
            { ...first.cursor, snapshots: [snapshot] },
            now + LEASE_MS + 1
          )
        )
      ).toBe(false);
      expect(
        await harness.run(() =>
          repository.publish(
            second,
            { ...second.cursor, snapshots: [snapshot] },
            now + LEASE_MS + 1
          )
        )
      ).toBe(true);
      expect(
        (await harness.run(() => repository.read("a", 0))).history[0].value
      ).toBe(3);
      expect(
        (await harness.run(() => repository.read("b", 0))).snapshots
      ).toEqual([]);
    });
    it("rolls back snapshots, history and sync when a later publish statement fails", async () => {
      const repository = createPostgresUsageRepository();
      await harness.query(
        sql`ALTER TABLE cloudflare_usage_snapshot ADD CONSTRAINT synthetic_source_reject CHECK (source <> 'synthetic-reject')`,
        true
      );
      await harness.run(() => repository.request("a", now, "job", true));
      const lease = (await harness.run(() =>
        repository.claim("a", now, "run")
      ))!;
      await expect(
        harness.run(() =>
          repository.publish(
            lease,
            {
              ...lease.cursor,
              snapshots: [
                snapshot,
                { ...snapshot, source: "synthetic-reject" },
              ],
            },
            now + 1
          )
        )
      ).rejects.toBeDefined();
      const stored = await harness.run(() => repository.read("a", 0));
      expect(stored.snapshots).toEqual([]);
      expect(stored.history).toEqual([]);
      expect(stored.sync.state).toBe("running");
    });
    it("reads snapshot, history and sync consistently while another transaction publishes", async () => {
      const repository = createPostgresUsageRepository();
      await Promise.all([
        (async () => {
          for (let i = 0; i < 6; i++) {
            const stamp = now + i * 86400000;
            await harness.run(() =>
              repository.request("race", stamp, `job-${i}`, true)
            );
            const lease = (await harness.run(() =>
              repository.claim("race", stamp, `writer-${i}`)
            ))!;
            await harness.run(() =>
              repository.publish(
                lease,
                {
                  ...lease.cursor,
                  snapshots: [
                    {
                      ...snapshot,
                      collectedTimeUtc: stamp,
                      history: [{ ...snapshot.history[0], value: stamp }],
                    },
                  ],
                },
                stamp + 1
              )
            );
          }
        })(),
        (async () => {
          for (let i = 0; i < 20; i++) {
            const stored = await harness.run(() => repository.read("race", 0));
            if (stored.snapshots.length) {
              expect(stored.history[0].value).toBe(
                stored.snapshots[0].collectedTimeUtc
              );
              expect(stored.sync.lastSuccessTimeUtc).toBe(
                stored.snapshots[0].collectedTimeUtc + 1
              );
            }
          }
        })(),
      ]);
    });
  }
);
