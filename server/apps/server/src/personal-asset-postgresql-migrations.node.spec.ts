import { createHash } from "node:crypto";
import { readFileSync, readdirSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { postgresMigrations } from "../../../scripts/postgresql/migrate";
import { postgresTableNames } from "../../../scripts/postgresql/generate";

describe("personal asset PostgreSQL migration registration without a database", () => {
  it("registers every numbered migration in immutable order with exact file checksums", () => {
    const folder = new URL("../postgresql-migrations/", import.meta.url);
    const files = readdirSync(folder)
      .filter((name) => name.endsWith(".sql"))
      .sort();
    expect(postgresMigrations.map(({ id }) => id + ".sql")).toEqual(files);
    expect(postgresMigrations.map(({ id }) => id)).toEqual([
      "0001_core_enterprise",
      "0002_cloudflare_usage",
      "0003_personal_calendar",
      "0004_personal_calendar_subscription",
      "0005_personal_asset_placement",
      "0006_personal_asset_metadata",
    ]);
    for (const migration of postgresMigrations) {
      const sql = readFileSync(new URL(migration.id + ".sql", folder), "utf8");
      expect(migration.sql).toBe(sql);
      expect(migration.checksum).toBe(
        createHash("sha256").update(sql).digest("hex")
      );
    }
  });
  it("retains each earlier stage's cumulative table contract and adds placement before metadata", () => {
    const tables: string[] = [];
    for (const migration of postgresMigrations) {
      tables.push(
        ...[...migration.sql.matchAll(/^CREATE TABLE "([a-z0-9_]+)" \(/gm)].map(
          (match) => match[1]
        )
      );
      expect(migration.tableNames).toEqual([...tables].sort());
      expect(new Set(migration.tableNames).size).toBe(
        migration.tableNames.length
      );
    }
    expect(postgresMigrations[3].tableNames).not.toContain(
      "personal_asset_placement"
    );
    expect(postgresMigrations[4].tableNames).toEqual(
      [...postgresMigrations[3].tableNames, "personal_asset_placement"].sort()
    );
    expect(postgresMigrations[5].tableNames).toEqual(
      postgresMigrations[4].tableNames
    );
    expect(postgresMigrations[5].tableNames).toEqual(postgresTableNames);
    expect(postgresMigrations[5].sql).toContain("'personal.asset:read'");
    expect(postgresMigrations[5].sql).not.toMatch(/\bCREATE\s+TABLE\b/i);
  });
});
