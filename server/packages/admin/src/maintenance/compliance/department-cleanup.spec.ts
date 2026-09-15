import { beforeAll, beforeEach, describe, expect, it } from "vitest";
import db from "@hodor/core/db/index";
import { setupTestDb, clearTestData } from "@hodor/core/db/testHelper";
import { SOFT_DELETE_RETENTION_MS } from "@hodor/core/db/soft-delete";
import { complianceArchiveTable as archive } from "./model";
import { purgeExpiredDepartmentArchives } from "./department-cleanup";
import archiveSql from "@hodor/core/db/sql/admin/compliance_archives.sql?raw";

describe("historical department retention", () => {
  const now = 2_000_000_000_000;
  const cutoff = now - SOFT_DELETE_RETENTION_MS;
  const row = (sourceTable: string, createTimeUtc: number) => ({
    sourceSystem: "self",
    sourceDatabase: "self",
    sourceTable,
    sourcePrimaryKey: "1",
    restorable: true,
    creatorId: 1,
    createTimeUtc,
    recordSnapshot: '{"name":"do not copy"}',
  });
  beforeAll(async () => {
    await setupTestDb(db, [archiveSql]);
  });
  beforeEach(async () => {
    await clearTestData(db, ["compliance_archives"]);
  });

  it("uses original deletion time and never touches another source", async () => {
    await db
      .insert(archive)
      .values([
        row("department", cutoff),
        row("system_department", cutoff - 1),
        row("department", cutoff + 1),
        row("user", cutoff - 1),
        { ...row("department", cutoff - 1), sourceSystem: "other" },
        { ...row("department", cutoff - 1), sourceDatabase: "other" },
      ]);
    expect(
      await purgeExpiredDepartmentArchives({ now, batchSize: 100 })
    ).toEqual({
      deletedCount: 2,
      remainingExpired: 0,
      oldestExpiredTimeUtc: null,
    });
    expect(await db.select().from(archive)).toHaveLength(4);
    expect(
      await purgeExpiredDepartmentArchives({ now, batchSize: 100 })
    ).toEqual({
      deletedCount: 0,
      remainingExpired: 0,
      oldestExpiredTimeUtc: null,
    });
  });

  it("caps each tick and drains the remainder on retry", async () => {
    for (let i = 0; i < 11; i++) {
      await db
        .insert(archive)
        .values(
          Array.from({ length: i === 10 ? 5 : 10 }, () =>
            row("department", cutoff)
          )
        );
    }
    expect(
      await purgeExpiredDepartmentArchives({ now, batchSize: 999 })
    ).toEqual({
      deletedCount: 100,
      remainingExpired: 5,
      oldestExpiredTimeUtc: now,
    });
    expect(
      await purgeExpiredDepartmentArchives({ now, batchSize: 100 })
    ).toEqual({
      deletedCount: 5,
      remainingExpired: 0,
      oldestExpiredTimeUtc: null,
    });
  });
});
