import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { sql } from "drizzle-orm";
import {
  createPostgresTestHarness,
  postgresTestsConfigured,
  type PostgresTestHarness,
} from "../test/postgresql";
import {
  getPostgresDb,
  getPostgresSchema,
  validatePostgresSchema,
  withPostgresTransaction,
  withPostgresWriteCheck,
} from "@hodor/core/db/postgresql/runtime";
import sqlite from "@hodor/core/db/index";
import { supportsPostgresPath } from "./postgresql-capabilities";
import {
  parsePostgresConnection,
  verifiedPostgresConnection,
} from "@hodor/core/db/postgresql/connection";

describe("PostgreSQL configuration boundary", () => {
  it("does not expose a malformed secret-bearing URL in an error", () => {
    const password = "synthetic-invalid-url-password";
    let caught: unknown;
    try {
      parsePostgresConnection(
        `postgresql://user:${password}@invalid host/database`
      );
    } catch (error) {
      caught = error;
    }
    expect(caught).toBeInstanceOf(Error);
    if (!(caught instanceof Error))
      throw new Error("Expected a sanitized connection error");
    expect(String(caught)).not.toContain(password);
    expect(Object.hasOwn(caught, "input")).toBe(false);
    expect(Object.hasOwn(caught, "cause")).toBe(false);
  });
  it("verifies remote TLS even when the URL requests a weaker mode", () => {
    const configuration = verifiedPostgresConnection(
      "postgresql://synthetic:synthetic@db.example.invalid/postgres?sslmode=disable",
      "synthetic-ca"
    );
    expect(configuration.ssl).toEqual({
      rejectUnauthorized: true,
      ca: "synthetic-ca",
    });
    expect(
      new URL(configuration.connectionString).searchParams.has("sslmode")
    ).toBe(false);
  });
  it("rejects shared and injected schema identifiers", () => {
    for (const name of [
      "public",
      "auth",
      "storage",
      "pg_catalog",
      "one_gate;drop schema public",
      "one_gate_" + "a".repeat(60),
    ])
      expect(() => validatePostgresSchema(name)).toThrow();
    expect(validatePostgresSchema("one_gate_validation")).toBe(
      "one_gate_validation"
    );
  });
  it("limits the first release to the supported closure", () => {
    for (const path of [
      "/enterprise/asset/mapping/resolve",
      "/admin/system/department/deleteWithUndo",
      "/admin/system/auth/login",
      "/admin/system/auth/gate/status",
    ])
      expect(supportsPostgresPath(path)).toBe(true);
    for (const path of [
      "/admin/mail/action/send",
      "/admin/maintenance/init/reset",
      "/admin/system/auth/ssoLogin",
      "/admin/mobile/device/list",
      "/enterprise/asset/unknown/nested",
    ])
      expect(supportsPostgresPath(path)).toBe(false);
  });
});

describe.skipIf(!postgresTestsConfigured)(
  "real PostgreSQL transaction lifecycle",
  () => {
    let harness: PostgresTestHarness;
    beforeAll(async () => {
      harness = await createPostgresTestHarness("runtime_tests");
    });
    afterAll(async () => {
      await harness?.close();
    });

    it("blocks SQLite fallback even after SQLite has been initialized", async () => {
      await harness.run(async () => {
        expect(() => sqlite.select()).toThrow(/PostgreSQL/);
      });
    });
    it("serializes concurrent transactions on one request scope", async () => {
      await harness.run(async () => {
        let active = 0;
        let maximum = 0;
        const values = await Promise.all(
          Array.from({ length: 5 }, (_, i) =>
            withPostgresTransaction(async (db) => {
              active++;
              maximum = Math.max(maximum, active);
              await db.execute(sql`SELECT pg_sleep(0.005)`);
              const { rows } = await db.execute<{ value: number }>(
                sql`SELECT ${i}::integer AS value`
              );
              active--;
              return rows[0].value;
            })
          )
        );
        expect(maximum).toBe(1);
        expect(values).toEqual([0, 1, 2, 3, 4]);
      });
    });
    it("rolls back nested business writes and keeps the queue usable", async () => {
      await harness.run(async () => {
        await expect(
          withPostgresTransaction(
            async () => {
              await getPostgresDb().execute(
                sql`DELETE FROM one_gate_write_guard WHERE id=1`
              );
              await withPostgresTransaction(
                async () => {
                  throw new Error("synthetic rollback");
                },
                { write: true }
              );
            },
            { write: true }
          )
        ).rejects.toThrow("synthetic rollback");
        const rows = await harness.query(
          sql`SELECT id FROM one_gate_write_guard`
        );
        expect(rows).toEqual([{ id: 1 }]);
      });
    });
    it("rejects a nested read-to-write upgrade", async () => {
      await harness.run(() =>
        withPostgresTransaction(async () => {
          await expect(
            withPostgresTransaction(async () => undefined, { write: true })
          ).rejects.toThrow(/upgraded/);
        })
      );
    });
    it("applies authorization to each write and rolls back a denied operation", async () => {
      let checks = 0;
      await harness.run(() =>
        withPostgresWriteCheck(
          async () => {
            checks++;
            throw new Error("synthetic revoked");
          },
          async () => {
            await expect(
              withPostgresTransaction(
                async (db) => {
                  await db.execute(
                    sql`UPDATE one_gate_write_guard SET id=2 WHERE id=1`
                  );
                },
                { write: true }
              )
            ).rejects.toThrow("synthetic revoked");
          }
        )
      );
      expect(checks).toBe(1);
      expect(
        await harness.query(sql`SELECT id FROM one_gate_write_guard`)
      ).toEqual([{ id: 1 }]);
    });
    it("drains started background work before closing the request scope", async () => {
      let completed = false;
      let late: (() => Promise<unknown>) | undefined;
      await harness.run(async () => {
        late = () => withPostgresTransaction(async () => undefined);
        // Retain the closure's original AsyncLocalStorage context after scope completion.
        const { AsyncResource } = await import("node:async_hooks");
        const resource = new AsyncResource("synthetic-postgres-late-work");
        late = () =>
          resource.runInAsyncScope(() =>
            withPostgresTransaction(async () => undefined)
          );
        void withPostgresTransaction(async (db) => {
          await db.execute(sql`SELECT pg_sleep(0.01)`);
          completed = true;
        });
      });
      expect(completed).toBe(true);
      await expect(late?.()).rejects.toThrow(/scope is missing/);
      expect(() => getPostgresDb()).toThrow();
      expect(() => getPostgresSchema()).toThrow();
    });
  }
);
