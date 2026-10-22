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
  SOFT_DELETE_UNDO_WINDOW_MS,
  SOFT_DELETE_BATCH_SIZE,
  type SoftDeleteCleanupInput,
} from "@hodor/core/db/soft-delete";
import { roleTable } from "./schema.pg";
import type { RolePOLike, RoleRecord } from "./model";
import { rolePermissionTable } from "../role_permission/schema.pg";
import {
  asc,
  count,
  desc,
  eq,
  like,
  inArray,
  and,
  sql,
  type SQL,
  type InferInsertModel,
} from "drizzle-orm";
import {
  activeDepartmentIds,
  normalizeDepartmentIds,
} from "../department/reference-guards";
import { DepartmentDeletionError } from "../department/errors";
import { BusinessError } from "@hodor/core/middleware/errorHandler/businessError";
import { SUPER_ADMIN_ROLE_ID } from "@hodor/core/db/init";
import { ErrorCodes } from "./prevention";
import { RoleDeletionError } from "./errors";
import {
  roleHasNoUserReferences,
  activeSavedRoleDepartments,
} from "./reference-guards";
import {
  postgresActorCanDelete,
  assertPostgresDeletePermission,
  postgresActorCanRecover,
  assertPostgresRecoveryPermission,
} from "../soft-delete-authorization.pg";

function rethrowNameConflict(error: unknown): never {
  if (isPostgresUniqueConflict(error, "system_role_name_active_unique"))
    throw new BusinessError(RoleDeletionError.NAME_CONFLICT);
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
  id: roleTable.id,
  name: roleTable.name,
  remark: roleTable.remark,
  isEnabled: roleTable.isEnabled,
  permissionCount: roleTable.permissionCount,
  dataScope: roleTable.dataScope,
  customDeptIds: roleTable.customDeptIds,
  creatorId: roleTable.creatorId,
  updaterId: roleTable.updaterId,
  createTimeUtc: roleTable.createTimeUtc,
  updateTimeUtc: roleTable.updateTimeUtc,
};
type RoleInsert = Omit<
  InferInsertModel<typeof roleTable>,
  | "id"
  | "createTimeUtc"
  | "updateTimeUtc"
  | "isDeleted"
  | "deletedTimeUtc"
  | "deleterId"
> & {
  isDeleted?: false;
  deletedTimeUtc?: null;
  deleterId?: null;
};
type AuthorizationRole = Pick<
  RolePOLike,
  "id" | "dataScope" | "customDeptIds" | "updateTimeUtc"
>;
export const buildWhereCondition = (condition?: {
  keyword?: string;
  isEnabled?: boolean;
}) =>
  and(
    eq(roleTable.isDeleted, false),
    condition?.keyword
      ? like(roleTable.name, `%${condition.keyword}%`)
      : undefined,
    condition?.isEnabled !== undefined
      ? eq(roleTable.isEnabled, condition.isEnabled)
      : undefined
  );
function purgeGuard(
  target: SQL,
  deletedTime: SQL,
  expectedDeletedTimeUtc: number,
  cutoff?: number
): SQL {
  return sql`${target} != ${SUPER_ADMIN_ROLE_ID} AND ${deletedTime} = ${expectedDeletedTimeUtc}
    ${cutoff === undefined ? sql`` : sql`AND ${deletedTime} <= ${cutoff}`}
    AND ${roleHasNoUserReferences(target)}`;
}

export class RoleRepository {
  constructor(
    private readonly currentTimeSql: () => SQL = postgresNowMilliseconds
  ) {}
  private async lockAndNow(id: number): Promise<number> {
    const db = getPostgresDb();
    await db
      .select({ id: roleTable.id })
      .from(roleTable)
      .where(eq(roleTable.id, id))
      .for("update");
    const result = await db.execute<{ now: unknown }>(
      sql`SELECT ${this.currentTimeSql()} AS now`
    );
    return postgresSafeInteger(result.rows[0]?.now);
  }
  async findPage(params: {
    keyword?: string;
    isEnabled?: boolean;
    orderBy?: keyof RolePOLike;
    descend?: boolean;
    pageNo: number;
    pageSize: number;
  }) {
    return withPostgresTransaction(async () => {
      const db = getPostgresDb();

      const { orderBy = "id", descend = true, pageNo, pageSize } = params;
      const where = buildWhereCondition(params);
      const totals = await db
        .select({ total: count() })
        .from(roleTable)
        .where(where);
      const total = totals[0]?.total ?? 0;
      const field = publicColumns[orderBy] || roleTable.id;
      const list =
        total === 0
          ? []
          : await db
              .select(publicColumns)
              .from(roleTable)
              .where(where)
              .orderBy(descend ? desc(field) : asc(field))
              .limit(pageSize)
              .offset((pageNo - 1) * pageSize);
      return { total, list };
    });
  }
  async findAll(params: {
    keyword?: string;
    isEnabled?: boolean;
    orderBy?: keyof RolePOLike;
    descend?: boolean;
  }) {
    return withPostgresTransaction(async () => {
      const db = getPostgresDb();

      const { orderBy = "id", descend = true } = params;
      const field = publicColumns[orderBy] || roleTable.id;
      return db
        .select({
          id: roleTable.id,
          name: roleTable.name,
          remark: roleTable.remark,
          isEnabled: roleTable.isEnabled,
          dataScope: roleTable.dataScope,
          updateTimeUtc: roleTable.updateTimeUtc,
        })
        .from(roleTable)
        .where(buildWhereCondition(params))
        .orderBy(descend ? desc(field) : asc(field))
        .limit(10000);
    });
  }
  async findById(id: number): Promise<RolePOLike | null> {
    return withPostgresTransaction(async () => {
      const db = getPostgresDb();

      const [row] = await db
        .select(publicColumns)
        .from(roleTable)
        .where(and(eq(roleTable.id, id), eq(roleTable.isDeleted, false)))
        .limit(1);
      return row ?? null;
    });
  }
  async findDeletedById(id: number): Promise<RoleRecord | null> {
    return withPostgresTransaction(async () => {
      const db = getPostgresDb();

      const [row] = await db
        .select()
        .from(roleTable)
        .where(and(eq(roleTable.id, id), eq(roleTable.isDeleted, true)))
        .limit(1);
      return row ?? null;
    });
  }
  async getRolesByIds(
    ids: number[]
  ): Promise<{ value: number; label: string }[]> {
    return withPostgresTransaction(async () => {
      const db = getPostgresDb();

      if (!ids.length) return [];
      return db
        .select({ value: roleTable.id, label: roleTable.name })
        .from(roleTable)
        .where(and(inArray(roleTable.id, ids), eq(roleTable.isDeleted, false)));
    });
  }
  async getRoleDataScopes(ids: number[]) {
    return withPostgresTransaction(async () => {
      const db = getPostgresDb();

      if (!ids.length) return [];
      return db
        .select({
          dataScope: roleTable.dataScope,
          customDeptIds: roleTable.customDeptIds,
        })
        .from(roleTable)
        .where(
          and(
            inArray(roleTable.id, ids),
            eq(roleTable.isEnabled, true),
            eq(roleTable.isDeleted, false)
          )
        );
    });
  }
  async getAuthorizationRoles(ids: number[]): Promise<AuthorizationRole[]> {
    return withPostgresTransaction(async () => {
      const db = getPostgresDb();

      if (!ids.length) return [];
      return db
        .select({
          id: roleTable.id,
          dataScope: roleTable.dataScope,
          customDeptIds: roleTable.customDeptIds,
          updateTimeUtc: roleTable.updateTimeUtc,
        })
        .from(roleTable)
        .where(
          and(
            inArray(roleTable.id, ids),
            eq(roleTable.isEnabled, true),
            eq(roleTable.isDeleted, false)
          )
        )
        .orderBy(asc(roleTable.id));
    });
  }
  async verifyRoleExists(id: number): Promise<boolean> {
    return withPostgresTransaction(async () => {
      const db = getPostgresDb();

      return (await this.findById(id)) !== null;
    });
  }

  async updatePermissionCount(roleId: number, newCount: number): Promise<void> {
    return withPostgresTransaction(
      async () => {
        await getPostgresDb()
          .update(roleTable)
          .set({
            permissionCount: newCount,
            updateTimeUtc: sql`GREATEST(${this.currentTimeSql()},COALESCE(${roleTable.updateTimeUtc},0)+1)`,
          })
          .where(and(eq(roleTable.id, roleId), eq(roleTable.isDeleted, false)));
      },
      { write: true }
    );
  }
  async onInsert(data: RoleInsert): Promise<number> {
    return withPostgresTransaction(
      async () => {
        const customDeptIds =
          normalizeDepartmentIds(data.customDeptIds) ?? null;
        try {
          const result = await getPostgresDb().execute<{
            id: unknown;
          }>(sql`INSERT INTO system_role
          (name,remark,is_enabled,permission_count,data_scope,custom_dept_ids,creator_id,updater_id,create_time_utc,is_deleted,deleted_time_utc,deleter_id)
          SELECT ${data.name},${data.remark ?? null},${data.isEnabled},${data.permissionCount},${data.dataScope},${customDeptIds},${data.creatorId},${data.updaterId ?? null},${this.currentTimeSql()},FALSE,NULL,NULL
          WHERE ${activeDepartmentIds(customDeptIds)} RETURNING id`);
          if (!result.rows[0])
            throw new BusinessError(
              DepartmentDeletionError.REFERENCE_UNAVAILABLE
            );
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
      Omit<RoleInsert, "isDeleted" | "deletedTimeUtc" | "deleterId">
    >
  ): Promise<number> {
    return withPostgresTransaction(
      async () => {
        const customDeptIds = normalizeDepartmentIds(data.customDeptIds);
        try {
          const [row] = await getPostgresDb()
            .update(roleTable)
            .set({
              ...data,
              customDeptIds,
              updateTimeUtc: sql`GREATEST(${this.currentTimeSql()},COALESCE(${roleTable.updateTimeUtc},0)+1)`,
            })
            .where(
              and(
                eq(roleTable.id, id),
                eq(roleTable.isDeleted, false),
                customDeptIds === undefined
                  ? undefined
                  : activeDepartmentIds(customDeptIds)
              )
            )
            .returning({ id: roleTable.id });
          if (!row) {
            if (!(await this.findById(id)))
              throw new BusinessError(RoleDeletionError.NOT_ACTIVE);
            throw new BusinessError(
              DepartmentDeletionError.REFERENCE_UNAVAILABLE
            );
          }
          return row.id;
        } catch (error: unknown) {
          rethrowNameConflict(error);
        }
      },
      { write: true }
    );
  }
  private async softDelete(
    id: number,
    actorId: number,
    expectedUpdateTimeUtc?: number | null,
    fixedNow?: number
  ) {
    return withPostgresTransaction(
      async () => {
        const databaseNow = await this.lockAndNow(id);
        const now = fixedNow ?? databaseNow;
        await assertPostgresDeletePermission(actorId, "admin.system.role");
        const [row] = await getPostgresDb()
          .update(roleTable)
          .set({
            isDeleted: true,
            deletedTimeUtc: now,
            deleterId: actorId,
            updaterId: actorId,
            updateTimeUtc: now,
          })
          .where(
            and(
              eq(roleTable.id, id),
              eq(roleTable.isDeleted, false),
              sql`${roleTable.id} != ${SUPER_ADMIN_ROLE_ID}`,
              expectedUpdateTimeUtc === undefined
                ? undefined
                : sql`${roleTable.updateTimeUtc} IS NOT DISTINCT FROM ${expectedUpdateTimeUtc}::bigint`,
              sql`COALESCE(${roleTable.updateTimeUtc},0)<${now}`,
              roleHasNoUserReferences(sql`${roleTable.id}`),
              postgresActorCanDelete(actorId, "admin.system.role")
            )
          )
          .returning({
            id: roleTable.id,
            expectedDeletedTimeUtc: numberSql(sql`${roleTable.deletedTimeUtc}`),
          });
        if (row) return { ...row, serverTimeUtc: now };
        if (id === SUPER_ADMIN_ROLE_ID)
          throw new BusinessError(ErrorCodes.SUPER_ADMIN_DELETE);
        const state = await this.findUndoState(id);
        if (!state || state.isDeleted)
          throw new BusinessError(RoleDeletionError.NOT_ACTIVE);
        if (
          expectedUpdateTimeUtc !== undefined &&
          state.updateTimeUtc !== expectedUpdateTimeUtc
        )
          throw new BusinessError(RoleDeletionError.STATE_CONFLICT);
        if ((state.updateTimeUtc ?? 0) >= now)
          throw new BusinessError(RoleDeletionError.CLOCK_CONFLICT);
        throw new BusinessError(RoleDeletionError.HAS_REFERENCES);
      },
      { write: true }
    );
  }
  async onDelete(id: number, actorId: number, now?: number): Promise<number> {
    return (await this.softDelete(id, actorId, undefined, now)).id;
  }
  async onDeleteWithUndo(
    id: number,
    expectedUpdateTimeUtc: number | null,
    actorId: number
  ) {
    return this.softDelete(id, actorId, expectedUpdateTimeUtc);
  }
  async findUndoState(id: number) {
    return withPostgresTransaction(async () => {
      const [row] = await getPostgresDb()
        .select({
          id: roleTable.id,
          isDeleted: roleTable.isDeleted,
          deletedTimeUtc: roleTable.deletedTimeUtc,
          deleterId: roleTable.deleterId,
          updateTimeUtc: roleTable.updateTimeUtc,
          customDeptIds: roleTable.customDeptIds,
          departmentsAvailable: numberSql(
            sql`CASE WHEN ${activeSavedRoleDepartments(sql`${roleTable.customDeptIds}`)} THEN 1 ELSE 0 END`
          ),
          serverTimeUtc: numberSql(this.currentTimeSql()),
        })
        .from(roleTable)
        .where(eq(roleTable.id, id))
        .limit(1);
      return row ?? null;
    });
  }
  private async recover(
    id: number,
    expectedDeletedTimeUtc: number,
    actorId: number,
    undo: boolean
  ): Promise<number | null> {
    return withPostgresTransaction(
      async () => {
        await this.lockAndNow(id);
        if (undo)
          await assertPostgresDeletePermission(
            actorId,
            "admin.system.role",
            true
          );
        else
          await assertPostgresRecoveryPermission(
            actorId,
            "admin.system.role",
            "restore"
          );
        const now = this.currentTimeSql();
        try {
          const [row] = await getPostgresDb()
            .update(roleTable)
            .set({
              isDeleted: false,
              deletedTimeUtc: null,
              deleterId: null,
              updaterId: actorId,
              updateTimeUtc: sql`GREATEST(${now},${expectedDeletedTimeUtc}::bigint+1)`,
              permissionCount: sql`(SELECT COUNT(*) FROM system_role_permission AS saved_binding WHERE saved_binding.role_id=${roleTable.id})`,
            })
            .where(
              and(
                eq(roleTable.id, id),
                eq(roleTable.isDeleted, true),
                eq(roleTable.deletedTimeUtc, expectedDeletedTimeUtc),
                undo ? eq(roleTable.deleterId, actorId) : undefined,
                sql`${roleTable.deletedTimeUtc}<=${now} AND ${roleTable.deletedTimeUtc}>${now}-${undo ? SOFT_DELETE_UNDO_WINDOW_MS : SOFT_DELETE_RETENTION_MS}`,
                activeSavedRoleDepartments(sql`${roleTable.customDeptIds}`),
                undo
                  ? postgresActorCanDelete(actorId, "admin.system.role")
                  : postgresActorCanRecover(
                      actorId,
                      "admin.system.role",
                      "restore"
                    )
              )
            )
            .returning({ id: roleTable.id });
          return row?.id ?? null;
        } catch (error: unknown) {
          rethrowNameConflict(error);
        }
      },
      { write: true }
    );
  }
  async undoDelete(
    id: number,
    expectedDeletedTimeUtc: number,
    actorId: number
  ): Promise<number | null> {
    return this.recover(id, expectedDeletedTimeUtc, actorId, true);
  }
  async restore(
    id: number,
    expectedDeletedTimeUtc: number,
    actorId: number
  ): Promise<number | null> {
    return this.recover(id, expectedDeletedTimeUtc, actorId, false);
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
        eq(roleTable.isDeleted, true),
        params.keyword
          ? sql`strpos(${roleTable.name},${params.keyword})>0`
          : undefined
      );
      const [totals] = await db
        .select({ total: count() })
        .from(roleTable)
        .where(where);
      const rows = await db
        .select({
          id: roleTable.id,
          name: roleTable.name,
          deleterId: roleTable.deleterId,
          deleterName: sql<
            string | null
          >`(SELECT username FROM "system_user" WHERE id=${roleTable.deleterId})`,
          deletedTimeUtc: numberSql(sql`${roleTable.deletedTimeUtc}`),
        })
        .from(roleTable)
        .where(where)
        .orderBy(desc(roleTable.deletedTimeUtc), desc(roleTable.id))
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
  async purge(
    id: number,
    expectedDeletedTimeUtc: number,
    cutoff?: number,
    actorId?: number
  ): Promise<number | null> {
    return withPostgresTransaction(
      async () => {
        await assertPostgresRecoveryPermission(
          actorId,
          "admin.system.role",
          "purge"
        );
        const db = getPostgresDb();
        const where = and(
          eq(roleTable.id, id),
          eq(roleTable.isDeleted, true),
          postgresActorCanRecover(actorId, "admin.system.role", "purge"),
          purgeGuard(
            sql`${roleTable.id}`,
            sql`${roleTable.deletedTimeUtc}`,
            expectedDeletedTimeUtc,
            cutoff
          )
        );
        const [eligible] = await db
          .select({ id: roleTable.id })
          .from(roleTable)
          .where(where)
          .for("update");
        if (!eligible) return null;
        await db
          .delete(rolePermissionTable)
          .where(
            sql`EXISTS(SELECT 1 FROM system_role AS owner WHERE owner.id=${rolePermissionTable.roleId} AND owner.id=${id} AND owner.is_deleted AND ${purgeGuard(sql`owner.id`, sql`owner.deleted_time_utc`, expectedDeletedTimeUtc, cutoff)})`
          );
        const [removed] = await db
          .delete(roleTable)
          .where(where)
          .returning({ id: roleTable.id });
        if (!removed) throw new BusinessError(RoleDeletionError.STATE_CONFLICT);
        return removed.id;
      },
      { write: true }
    );
  }
}
export const roleRepository = new RoleRepository();

export async function purgeExpiredRoles({
  now,
  batchSize,
}: SoftDeleteCleanupInput) {
  return withPostgresTransaction(
    async () => {
      const db = getPostgresDb();
      const cutoff = now - SOFT_DELETE_RETENTION_MS;
      const limit = Math.max(
        1,
        Math.min(SOFT_DELETE_BATCH_SIZE, Math.floor(batchSize))
      );
      const candidates = await db
        .select({
          id: roleTable.id,
          deletedTimeUtc: numberSql(sql`${roleTable.deletedTimeUtc}`),
        })
        .from(roleTable)
        .where(
          and(
            eq(roleTable.isDeleted, true),
            sql`${roleTable.id} != ${SUPER_ADMIN_ROLE_ID}`,
            sql`${roleTable.deletedTimeUtc}<=${cutoff}`,
            roleHasNoUserReferences(sql`${roleTable.id}`)
          )
        )
        .orderBy(asc(roleTable.deletedTimeUtc), asc(roleTable.id))
        .limit(limit)
        .for("update");
      let deletedCount = 0;
      if (candidates.length) {
        const versions = JSON.stringify(candidates);
        const eligible = (
          id: SQL,
          deletedTime: SQL
        ) => sql`${id} != ${SUPER_ADMIN_ROLE_ID} AND ${deletedTime}<=${cutoff}
        AND EXISTS(SELECT 1 FROM jsonb_to_recordset(${versions}::jsonb) AS candidate(id bigint,"deletedTimeUtc" bigint)
          WHERE candidate.id=${id} AND candidate."deletedTimeUtc"=${deletedTime}) AND ${roleHasNoUserReferences(id)}`;
        await db
          .delete(rolePermissionTable)
          .where(
            sql`EXISTS(SELECT 1 FROM system_role AS owner WHERE owner.id=${rolePermissionTable.roleId} AND owner.is_deleted AND ${eligible(sql`owner.id`, sql`owner.deleted_time_utc`)})`
          );
        const removed = await db
          .delete(roleTable)
          .where(
            and(
              eq(roleTable.isDeleted, true),
              eligible(sql`${roleTable.id}`, sql`${roleTable.deletedTimeUtc}`)
            )
          )
          .returning({ id: roleTable.id });
        if (removed.length !== candidates.length)
          throw new BusinessError(RoleDeletionError.STATE_CONFLICT);
        deletedCount = removed.length;
      }
      const [remaining] = await db
        .select({
          remainingExpired: count(),
          oldestExpiredTimeUtc: nullableNumberSql(
            sql`MIN(${roleTable.deletedTimeUtc})+${SOFT_DELETE_RETENTION_MS}`
          ),
        })
        .from(roleTable)
        .where(
          and(
            eq(roleTable.isDeleted, true),
            sql`${roleTable.id} != ${SUPER_ADMIN_ROLE_ID}`,
            sql`${roleTable.deletedTimeUtc}<=${cutoff}`
          )
        );
      return {
        deletedCount,
        remainingExpired: remaining?.remainingExpired ?? 0,
        oldestExpiredTimeUtc: remaining?.oldestExpiredTimeUtc ?? null,
      };
    },
    { write: true }
  );
}
