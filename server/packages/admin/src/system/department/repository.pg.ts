import {
  getPostgresDb,
  withPostgresTransaction,
} from "@hodor/core/db/postgresql/runtime";
import {
  postgresNowMilliseconds,
  postgresSafeInteger,
} from "@hodor/core/db/postgresql/sql";
import { isPostgresUniqueConflict } from "@hodor/core/db/postgresql/errors";
import {
  SOFT_DELETE_RETENTION_MS,
  SOFT_DELETE_BATCH_SIZE,
  SOFT_DELETE_UNDO_WINDOW_MS,
} from "@hodor/core/db/soft-delete";
import { departmentTable } from "./schema.pg";
import type { DepartmentPOLike, DepartmentRecord } from "./model";
import {
  asc,
  count,
  desc,
  eq,
  like,
  and,
  inArray,
  sql,
  type SQL,
  type InferInsertModel,
} from "drizzle-orm";
import { BusinessError } from "@hodor/core/middleware/errorHandler/businessError";
import {
  activeDepartmentReference,
  departmentHasNoReferences,
} from "./reference-guards";
import { DepartmentDeletionError } from "./errors";
import {
  postgresActorCanDelete,
  assertPostgresDeletePermission,
  postgresActorCanRecover,
  assertPostgresRecoveryPermission,
} from "../soft-delete-authorization.pg";

function rethrowNameConflict(error: unknown): never {
  if (isPostgresUniqueConflict(error, "system_department_name_active_unique"))
    throw new BusinessError(DepartmentDeletionError.NAME_CONFLICT);
  throw error;
}
function numberSql(expression: SQL) {
  return sql<number>`${expression}`.mapWith(postgresSafeInteger);
}
function nullableNumberSql(expression: SQL) {
  return sql<number | null>`${expression}`.mapWith((value: unknown) =>
    value === null ? null : postgresSafeInteger(value)
  );
}
const publicColumns = {
  id: departmentTable.id,
  name: departmentTable.name,
  parentId: departmentTable.parentId,
  remark: departmentTable.remark,
  isEnabled: departmentTable.isEnabled,
  creatorId: departmentTable.creatorId,
  updaterId: departmentTable.updaterId,
  createTimeUtc: departmentTable.createTimeUtc,
  updateTimeUtc: departmentTable.updateTimeUtc,
};
type DepartmentInsert = Omit<
  InferInsertModel<typeof departmentTable>,
  "id" | "createTimeUtc" | "updateTimeUtc"
>;
export function buildWhereCondition(condition?: {
  keyword?: string;
  isEnabled?: boolean;
}) {
  return and(
    eq(departmentTable.isDeleted, false),
    condition?.keyword
      ? like(departmentTable.name, `%${condition.keyword}%`)
      : undefined,
    condition?.isEnabled === undefined
      ? undefined
      : eq(departmentTable.isEnabled, condition.isEnabled)
  );
}
function validParentForUpdate(id: number, parentId: number | null): SQL {
  return sql`${activeDepartmentReference(parentId)} AND NOT EXISTS (
    WITH RECURSIVE descendants(id) AS (SELECT ${id}::bigint UNION SELECT child.id FROM system_department AS child JOIN descendants ON child.parent_id=descendants.id)
    SELECT 1 FROM descendants WHERE id=${parentId})`;
}

export class DepartmentRepository {
  constructor(
    private readonly currentTimeSql: () => SQL = postgresNowMilliseconds
  ) {}
  private async lockAndNow(id: number): Promise<number> {
    const db = getPostgresDb();
    await db
      .select({ id: departmentTable.id })
      .from(departmentTable)
      .where(eq(departmentTable.id, id))
      .for("update");
    const result = await db.execute<{ now: unknown }>(
      sql`SELECT ${this.currentTimeSql()} AS now`
    );
    return postgresSafeInteger(result.rows[0]?.now);
  }
  async findPage(params: {
    keyword?: string;
    isEnabled?: boolean;
    orderBy?: keyof DepartmentPOLike;
    descend?: boolean;
    pageNo: number;
    pageSize: number;
  }) {
    return withPostgresTransaction(async () => {
      const db = getPostgresDb();

      const { orderBy = "id", descend = true, pageNo, pageSize } = params;
      const orderField = publicColumns[orderBy] || departmentTable.id;
      const where = buildWhereCondition(params);
      const totals = await db
        .select({ total: count() })
        .from(departmentTable)
        .where(where);
      const total = totals[0]?.total ?? 0;
      const list =
        total === 0
          ? []
          : await db
              .select(publicColumns)
              .from(departmentTable)
              .where(where)
              .orderBy(descend ? desc(orderField) : asc(orderField))
              .limit(pageSize)
              .offset((pageNo - 1) * pageSize);
      return { total, list };
    });
  }
  async findAll(params: {
    keyword?: string;
    isEnabled?: boolean;
    orderBy?: keyof DepartmentPOLike;
    descend?: boolean;
  }) {
    return withPostgresTransaction(async () => {
      const db = getPostgresDb();

      const { orderBy = "id", descend = true } = params;
      const orderField = publicColumns[orderBy] || departmentTable.id;
      return db
        .select({
          id: departmentTable.id,
          name: departmentTable.name,
          parentId: departmentTable.parentId,
          remark: departmentTable.remark,
          isEnabled: departmentTable.isEnabled,
          updateTimeUtc: departmentTable.updateTimeUtc,
        })
        .from(departmentTable)
        .where(buildWhereCondition(params))
        .orderBy(descend ? desc(orderField) : asc(orderField))
        .limit(10000);
    });
  }
  async findById(id: number): Promise<DepartmentPOLike | null> {
    return withPostgresTransaction(async () => {
      const db = getPostgresDb();

      const rows = await db
        .select(publicColumns)
        .from(departmentTable)
        .where(
          and(eq(departmentTable.id, id), eq(departmentTable.isDeleted, false))
        )
        .limit(1);
      return rows[0] ?? null;
    });
  }
  async findDeletedById(id: number): Promise<DepartmentRecord | null> {
    return withPostgresTransaction(async () => {
      const db = getPostgresDb();

      const rows = await db
        .select()
        .from(departmentTable)
        .where(
          and(eq(departmentTable.id, id), eq(departmentTable.isDeleted, true))
        )
        .limit(1);
      return rows[0] ?? null;
    });
  }
  async getDepartmentNameById(id: number): Promise<string | null> {
    return withPostgresTransaction(async () => {
      const db = getPostgresDb();

      const rows = await db
        .select({ name: departmentTable.name })
        .from(departmentTable)
        .where(
          and(eq(departmentTable.id, id), eq(departmentTable.isDeleted, false))
        )
        .limit(1);
      return rows[0]?.name ?? null;
    });
  }
  async getAllDepartments(
    isEnabled?: boolean
  ): Promise<{ name: string; id: number; parentId: number }[]> {
    return withPostgresTransaction(async () => {
      const db = getPostgresDb();

      const rows = await db
        .select({
          name: departmentTable.name,
          id: departmentTable.id,
          parentId: departmentTable.parentId,
        })
        .from(departmentTable)
        .where(buildWhereCondition({ isEnabled }));
      return rows.map((row) => ({ ...row, parentId: row.parentId ?? 0 }));
    });
  }
  async getTreeData(): Promise<DepartmentPOLike[]> {
    return withPostgresTransaction(async () => {
      const db = getPostgresDb();

      return db
        .select(publicColumns)
        .from(departmentTable)
        .where(eq(departmentTable.isDeleted, false))
        .orderBy(asc(departmentTable.id));
    });
  }

  async onInsert(data: DepartmentInsert): Promise<number> {
    return withPostgresTransaction(
      async () => {
        try {
          const result = await getPostgresDb().execute<{
            id: unknown;
          }>(sql`INSERT INTO system_department
          (name,parent_id,remark,is_enabled,creator_id,updater_id,create_time_utc,is_deleted,deleted_time_utc,deleter_id)
          SELECT ${data.name},${data.parentId ?? null},${data.remark ?? null},${data.isEnabled},${data.creatorId},${data.updaterId ?? null},${this.currentTimeSql()},FALSE,NULL,NULL
          WHERE ${activeDepartmentReference(data.parentId ?? null)} RETURNING id`);
          if (!result.rows[0])
            throw new BusinessError(DepartmentDeletionError.INVALID_PARENT);
          return postgresSafeInteger(result.rows[0].id);
        } catch (error: unknown) {
          rethrowNameConflict(error);
        }
      },
      { write: true }
    );
  }
  async onUpdate(
    id: number,
    data: Partial<
      Omit<DepartmentInsert, "isDeleted" | "deletedTimeUtc" | "deleterId">
    >
  ): Promise<number> {
    return withPostgresTransaction(
      async () => {
        try {
          const db = getPostgresDb();
          const rows = await db
            .update(departmentTable)
            .set({
              ...data,
              updateTimeUtc: sql`GREATEST(${this.currentTimeSql()},COALESCE(${departmentTable.updateTimeUtc},0)+1)`,
            })
            .where(
              and(
                eq(departmentTable.id, id),
                eq(departmentTable.isDeleted, false),
                data.parentId === undefined
                  ? undefined
                  : validParentForUpdate(id, data.parentId)
              )
            )
            .returning({ id: departmentTable.id });
          if (!rows[0])
            throw new BusinessError(DepartmentDeletionError.STATE_CONFLICT);
          return rows[0].id;
        } catch (error: unknown) {
          rethrowNameConflict(error);
        }
      },
      { write: true }
    );
  }
  async onDelete(
    id: number,
    actorId: number,
    fixedNow?: number
  ): Promise<number> {
    return withPostgresTransaction(
      async () => {
        const databaseNow = await this.lockAndNow(id);
        const now = fixedNow ?? databaseNow;
        await assertPostgresDeletePermission(
          actorId,
          "admin.system.department"
        );
        const db = getPostgresDb();
        const deletedTime = sql<number>`GREATEST(${now}::bigint,COALESCE(${departmentTable.updateTimeUtc},0)+1)`;
        const rows = await db
          .update(departmentTable)
          .set({
            isDeleted: true,
            deletedTimeUtc: deletedTime,
            deleterId: actorId,
            updaterId: actorId,
            updateTimeUtc: deletedTime,
          })
          .where(
            and(
              eq(departmentTable.id, id),
              eq(departmentTable.isDeleted, false),
              sql`COALESCE(${departmentTable.updateTimeUtc},0)<=${now}`,
              departmentHasNoReferences(sql`${departmentTable.id}`, false),
              postgresActorCanDelete(actorId, "admin.system.department")
            )
          )
          .returning({ id: departmentTable.id });
        if (rows[0]) return rows[0].id;
        const current = await this.findById(id);
        if (!current)
          throw new BusinessError(DepartmentDeletionError.NOT_ACTIVE);
        if (current.updateTimeUtc !== null && current.updateTimeUtc > now)
          throw new BusinessError(DepartmentDeletionError.CLOCK_CONFLICT);
        throw new BusinessError(DepartmentDeletionError.HAS_REFERENCES);
      },
      { write: true }
    );
  }
  async onDeleteWithUndo(
    id: number,
    expectedUpdateTimeUtc: number | null,
    actorId: number
  ) {
    return withPostgresTransaction(
      async () => {
        const now = await this.lockAndNow(id);
        await assertPostgresDeletePermission(
          actorId,
          "admin.system.department"
        );
        const db = getPostgresDb();
        const rows = await db
          .update(departmentTable)
          .set({
            isDeleted: true,
            deletedTimeUtc: now,
            deleterId: actorId,
            updaterId: actorId,
            updateTimeUtc: now,
          })
          .where(
            and(
              eq(departmentTable.id, id),
              eq(departmentTable.isDeleted, false),
              sql`${departmentTable.updateTimeUtc} IS NOT DISTINCT FROM ${expectedUpdateTimeUtc}::bigint`,
              sql`COALESCE(${departmentTable.updateTimeUtc},0)<${now}`,
              departmentHasNoReferences(sql`${departmentTable.id}`, false),
              postgresActorCanDelete(actorId, "admin.system.department")
            )
          )
          .returning({
            id: departmentTable.id,
            expectedDeletedTimeUtc: numberSql(
              sql`${departmentTable.deletedTimeUtc}`
            ),
          });
        if (rows[0]) return { ...rows[0], serverTimeUtc: now };
        const current = await this.findById(id);
        if (!current)
          throw new BusinessError(DepartmentDeletionError.NOT_ACTIVE);
        if (current.updateTimeUtc !== expectedUpdateTimeUtc)
          throw new BusinessError(DepartmentDeletionError.STATE_CONFLICT);
        if ((current.updateTimeUtc ?? 0) >= now)
          throw new BusinessError(DepartmentDeletionError.CLOCK_CONFLICT);
        throw new BusinessError(DepartmentDeletionError.HAS_REFERENCES);
      },
      { write: true }
    );
  }
  async findUndoState(id: number) {
    return withPostgresTransaction(async () => {
      const [row] = await getPostgresDb()
        .select({
          id: departmentTable.id,
          parentId: departmentTable.parentId,
          isDeleted: departmentTable.isDeleted,
          deletedTimeUtc: departmentTable.deletedTimeUtc,
          deleterId: departmentTable.deleterId,
          serverTimeUtc: numberSql(this.currentTimeSql()),
        })
        .from(departmentTable)
        .where(eq(departmentTable.id, id))
        .limit(1);
      return row ?? null;
    });
  }
  async undoDelete(
    id: number,
    expectedDeletedTimeUtc: number,
    actorId: number
  ): Promise<number | null> {
    return withPostgresTransaction(
      async () => {
        await this.lockAndNow(id);
        await assertPostgresDeletePermission(
          actorId,
          "admin.system.department",
          true
        );
        const now = this.currentTimeSql();
        try {
          const rows = await getPostgresDb()
            .update(departmentTable)
            .set({
              isDeleted: false,
              deletedTimeUtc: null,
              deleterId: null,
              updaterId: actorId,
              updateTimeUtc: sql`GREATEST(${now},${expectedDeletedTimeUtc}::bigint+1)`,
            })
            .where(
              and(
                eq(departmentTable.id, id),
                eq(departmentTable.isDeleted, true),
                eq(departmentTable.deletedTimeUtc, expectedDeletedTimeUtc),
                eq(departmentTable.deleterId, actorId),
                sql`${departmentTable.deletedTimeUtc}<=${now} AND ${departmentTable.deletedTimeUtc}>${now}-${SOFT_DELETE_UNDO_WINDOW_MS}`,
                sql`(${departmentTable.parentId} IS NULL OR EXISTS(SELECT 1 FROM system_department AS parent WHERE parent.id=${departmentTable.parentId} AND NOT parent.is_deleted))`,
                postgresActorCanDelete(actorId, "admin.system.department")
              )
            )
            .returning({ id: departmentTable.id });
          return rows[0]?.id ?? null;
        } catch (error: unknown) {
          rethrowNameConflict(error);
        }
      },
      { write: true }
    );
  }
  async listDeleted(params: {
    keyword?: string;
    pageNo: number;
    pageSize: number;
    now?: number;
  }) {
    return withPostgresTransaction(async () => {
      const db = getPostgresDb();
      const now = params.now ?? Date.now();
      const where = and(
        eq(departmentTable.isDeleted, true),
        params.keyword
          ? sql`strpos(${departmentTable.name},${params.keyword})>0`
          : undefined
      );
      const [totals] = await db
        .select({ total: count() })
        .from(departmentTable)
        .where(where);
      const rows = await db
        .select({
          id: departmentTable.id,
          name: departmentTable.name,
          deleterId: numberSql(sql`${departmentTable.deleterId}`),
          deleterName: sql<
            string | null
          >`(SELECT username FROM "system_user" WHERE id=${departmentTable.deleterId})`,
          deletedTimeUtc: numberSql(sql`${departmentTable.deletedTimeUtc}`),
        })
        .from(departmentTable)
        .where(where)
        .orderBy(desc(departmentTable.deletedTimeUtc), desc(departmentTable.id))
        .limit(params.pageSize)
        .offset((params.pageNo - 1) * params.pageSize);
      return {
        total: totals?.total ?? 0,
        list: rows.map((row) => ({
          ...row,
          expiresTimeUtc: row.deletedTimeUtc + SOFT_DELETE_RETENTION_MS,
          canRestore:
            row.deletedTimeUtc <= now &&
            row.deletedTimeUtc + SOFT_DELETE_RETENTION_MS > now,
        })),
      };
    });
  }
  async restore(
    id: number,
    expectedDeletedTimeUtc: number,
    actorId: number,
    _fixedNow: number
  ): Promise<number | null> {
    return withPostgresTransaction(
      async () => {
        await this.lockAndNow(id);
        await assertPostgresRecoveryPermission(
          actorId,
          "admin.system.department",
          "restore"
        );
        const now = this.currentTimeSql();
        try {
          const rows = await getPostgresDb()
            .update(departmentTable)
            .set({
              isDeleted: false,
              deletedTimeUtc: null,
              deleterId: null,
              updaterId: actorId,
              updateTimeUtc: sql`GREATEST(${now},${expectedDeletedTimeUtc}::bigint+1)`,
            })
            .where(
              and(
                eq(departmentTable.id, id),
                eq(departmentTable.isDeleted, true),
                eq(departmentTable.deletedTimeUtc, expectedDeletedTimeUtc),
                sql`${departmentTable.deletedTimeUtc}<=${now} AND ${departmentTable.deletedTimeUtc}>${now}-${SOFT_DELETE_RETENTION_MS}`,
                sql`(${departmentTable.parentId} IS NULL OR EXISTS(SELECT 1 FROM system_department AS parent WHERE parent.id=${departmentTable.parentId} AND NOT parent.is_deleted))`,
                postgresActorCanRecover(
                  actorId,
                  "admin.system.department",
                  "restore"
                )
              )
            )
            .returning({ id: departmentTable.id });
          return rows[0]?.id ?? null;
        } catch (error: unknown) {
          rethrowNameConflict(error);
        }
      },
      { write: true }
    );
  }
  async purge(
    id: number,
    expectedDeletedTimeUtc: number,
    actorId?: number
  ): Promise<number | null> {
    return withPostgresTransaction(
      async () => {
        await assertPostgresRecoveryPermission(
          actorId,
          "admin.system.department",
          "purge"
        );
        const rows = await getPostgresDb()
          .delete(departmentTable)
          .where(
            and(
              eq(departmentTable.id, id),
              eq(departmentTable.isDeleted, true),
              eq(departmentTable.deletedTimeUtc, expectedDeletedTimeUtc),
              departmentHasNoReferences(sql`${departmentTable.id}`, true),
              postgresActorCanRecover(
                actorId,
                "admin.system.department",
                "purge"
              )
            )
          )
          .returning({ id: departmentTable.id });
        return rows[0]?.id ?? null;
      },
      { write: true }
    );
  }
}
export const departmentRepository = new DepartmentRepository();

export async function purgeExpiredDepartments(input: {
  now: number;
  batchSize: number;
}) {
  return withPostgresTransaction(
    async () => {
      const db = getPostgresDb();
      const cutoff = input.now - SOFT_DELETE_RETENTION_MS;
      const limit = Math.max(
        1,
        Math.min(SOFT_DELETE_BATCH_SIZE, Math.floor(input.batchSize))
      );
      const where = and(
        eq(departmentTable.isDeleted, true),
        sql`${departmentTable.deletedTimeUtc}<=${cutoff}`
      );
      const candidates = await db
        .select({ id: departmentTable.id })
        .from(departmentTable)
        .where(
          and(
            where,
            departmentHasNoReferences(sql`${departmentTable.id}`, true)
          )
        )
        .orderBy(asc(departmentTable.deletedTimeUtc), asc(departmentTable.id))
        .limit(limit)
        .for("update");
      const removed = candidates.length
        ? await db
            .delete(departmentTable)
            .where(
              and(
                where,
                inArray(
                  departmentTable.id,
                  candidates.map((row) => row.id)
                ),
                departmentHasNoReferences(sql`${departmentTable.id}`, true)
              )
            )
            .returning({ id: departmentTable.id })
        : [];
      const [remaining] = await db
        .select({
          remainingExpired: count(),
          oldestExpiredTimeUtc: nullableNumberSql(
            sql`MIN(${departmentTable.deletedTimeUtc})+${SOFT_DELETE_RETENTION_MS}`
          ),
        })
        .from(departmentTable)
        .where(where);
      return {
        deletedCount: removed.length,
        remainingExpired: remaining?.remainingExpired ?? 0,
        oldestExpiredTimeUtc: remaining?.oldestExpiredTimeUtc ?? null,
      };
    },
    { write: true }
  );
}
