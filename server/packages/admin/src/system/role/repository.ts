import { isPostgresBackend } from "@hodor/core/db/postgresql/runtime";
import * as postgresRepositoryImplementation from "./repository.pg";
import db from "@hodor/core/db/index";
import { getCurrentTimestampUtcSql } from "@hodor/core/utils/timestamp";
import {
  SOFT_DELETE_RETENTION_MS,
  SOFT_DELETE_UNDO_WINDOW_MS,
  SOFT_DELETE_BATCH_SIZE,
  type SoftDeleteCleanupInput,
} from "@hodor/core/db/soft-delete";
import { roleTable, type RolePOLike, type RoleRecord } from "./model";
import { rolePermissionTable } from "../role_permission/model";
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
import { RoleDeletionError, rethrowRoleNameConflict } from "./errors";
import {
  roleHasNoUserReferences,
  activeSavedRoleDepartments,
} from "./reference-guards";

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
export type AuthorizationRole = Pick<
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
    private readonly currentTimeSql: () => SQL = getCurrentTimestampUtcSql
  ) {}

  async findPage(params: {
    keyword?: string;
    isEnabled?: boolean;
    orderBy?: keyof RolePOLike;
    descend?: boolean;
    pageNo: number;
    pageSize: number;
  }) {
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
  }

  async findAll(params: {
    keyword?: string;
    isEnabled?: boolean;
    orderBy?: keyof RolePOLike;
    descend?: boolean;
  }) {
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
  }

  async findById(id: number): Promise<RolePOLike | null> {
    const [row] = await db
      .select(publicColumns)
      .from(roleTable)
      .where(and(eq(roleTable.id, id), eq(roleTable.isDeleted, false)))
      .limit(1);
    return row ?? null;
  }
  async findDeletedById(id: number): Promise<RoleRecord | null> {
    const [row] = await db
      .select()
      .from(roleTable)
      .where(and(eq(roleTable.id, id), eq(roleTable.isDeleted, true)))
      .limit(1);
    return row ?? null;
  }
  async getRolesByIds(
    ids: number[]
  ): Promise<{ value: number; label: string }[]> {
    if (!ids.length) return [];
    return db
      .select({ value: roleTable.id, label: roleTable.name })
      .from(roleTable)
      .where(and(inArray(roleTable.id, ids), eq(roleTable.isDeleted, false)));
  }
  async getRoleDataScopes(ids: number[]) {
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
  }
  async getAuthorizationRoles(ids: number[]): Promise<AuthorizationRole[]> {
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
  }
  async verifyRoleExists(id: number): Promise<boolean> {
    return (await this.findById(id)) !== null;
  }
  async updatePermissionCount(roleId: number, newCount: number): Promise<void> {
    await db
      .update(roleTable)
      .set({
        permissionCount: newCount,
        updateTimeUtc: sql`MAX(${Date.now()}, COALESCE(${roleTable.updateTimeUtc}, 0) + 1)`,
      })
      .where(and(eq(roleTable.id, roleId), eq(roleTable.isDeleted, false)));
  }

  async onInsert(data: RoleInsert): Promise<number> {
    const customDeptIds = normalizeDepartmentIds(data.customDeptIds) ?? null;
    try {
      const [row] = await db.all<{ id: number }>(sql`INSERT INTO system_role
        (name, remark, is_enabled, permission_count, data_scope, custom_dept_ids, creator_id, updater_id, create_time_utc, is_deleted, deleted_time_utc, deleter_id)
        SELECT ${data.name}, ${data.remark ?? null}, ${data.isEnabled ? 1 : 0}, ${data.permissionCount}, ${data.dataScope}, ${customDeptIds}, ${data.creatorId}, ${data.updaterId ?? null}, ${Date.now()}, 0, NULL, NULL
        WHERE ${activeDepartmentIds(customDeptIds)} RETURNING id`);
      if (!row)
        throw new BusinessError(DepartmentDeletionError.REFERENCE_UNAVAILABLE);
      return row.id;
    } catch (error) {
      rethrowRoleNameConflict(error);
    }
  }
  async onUpdate(
    id: number,
    data: Partial<
      Omit<RoleInsert, "isDeleted" | "deletedTimeUtc" | "deleterId">
    >
  ): Promise<number> {
    const customDeptIds = normalizeDepartmentIds(data.customDeptIds);
    try {
      const [row] = await db
        .update(roleTable)
        .set({
          ...data,
          customDeptIds,
          updateTimeUtc: sql`MAX(${Date.now()}, COALESCE(${roleTable.updateTimeUtc}, 0) + 1)`,
        })
        .where(
          and(
            eq(roleTable.id, id),
            eq(roleTable.isDeleted, false),
            customDeptIds !== undefined
              ? activeDepartmentIds(customDeptIds)
              : undefined
          )
        )
        .returning({ id: roleTable.id });
      if (!row) {
        if (!(await this.findById(id)))
          throw new BusinessError(RoleDeletionError.NOT_ACTIVE);
        throw new BusinessError(DepartmentDeletionError.REFERENCE_UNAVAILABLE);
      }
      return row.id;
    } catch (error) {
      rethrowRoleNameConflict(error);
    }
  }

  private async softDelete(
    id: number,
    actorId: number,
    expectedUpdateTimeUtc?: number | null,
    fixedNow?: number
  ) {
    const now =
      fixedNow === undefined ? this.currentTimeSql() : sql`${fixedNow}`;
    const [row] = await db
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
          expectedUpdateTimeUtc !== undefined
            ? sql`${roleTable.updateTimeUtc} IS ${expectedUpdateTimeUtc}`
            : undefined,
          sql`COALESCE(${roleTable.updateTimeUtc}, 0) < ${now}`,
          roleHasNoUserReferences(sql`${roleTable.id}`)
        )
      )
      .returning({
        id: roleTable.id,
        expectedDeletedTimeUtc: sql<number>`${roleTable.deletedTimeUtc}`,
        serverTimeUtc: sql<number>`${now}`,
      });
    if (row) return row;
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
    if ((state.updateTimeUtc ?? 0) >= (fixedNow ?? state.serverTimeUtc))
      throw new BusinessError(RoleDeletionError.CLOCK_CONFLICT);
    throw new BusinessError(RoleDeletionError.HAS_REFERENCES);
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
    const [row] = await db
      .select({
        id: roleTable.id,
        isDeleted: roleTable.isDeleted,
        deletedTimeUtc: roleTable.deletedTimeUtc,
        deleterId: roleTable.deleterId,
        updateTimeUtc: roleTable.updateTimeUtc,
        customDeptIds: roleTable.customDeptIds,
        departmentsAvailable: sql<number>`${activeSavedRoleDepartments(sql`${roleTable.customDeptIds}`)}`,
        serverTimeUtc: sql<number>`${this.currentTimeSql()}`,
      })
      .from(roleTable)
      .where(eq(roleTable.id, id))
      .limit(1);
    return row ?? null;
  }

  private async recover(
    id: number,
    expectedDeletedTimeUtc: number,
    actorId: number,
    undo: boolean
  ): Promise<number | null> {
    const now = this.currentTimeSql();
    try {
      const [row] = await db
        .update(roleTable)
        .set({
          isDeleted: false,
          deletedTimeUtc: null,
          deleterId: null,
          updaterId: actorId,
          updateTimeUtc: sql`MAX(${now}, ${expectedDeletedTimeUtc} + 1)`,
          permissionCount: sql`(SELECT COUNT(*) FROM system_role_permission AS saved_binding WHERE saved_binding.role_id = ${roleTable.id})`,
        })
        .where(
          and(
            eq(roleTable.id, id),
            eq(roleTable.isDeleted, true),
            eq(roleTable.deletedTimeUtc, expectedDeletedTimeUtc),
            undo ? eq(roleTable.deleterId, actorId) : undefined,
            sql`${roleTable.deletedTimeUtc} <= ${now}`,
            sql`${roleTable.deletedTimeUtc} > ${now} - ${undo ? SOFT_DELETE_UNDO_WINDOW_MS : SOFT_DELETE_RETENTION_MS}`,
            activeSavedRoleDepartments(sql`${roleTable.customDeptIds}`)
          )
        )
        .returning({ id: roleTable.id });
      return row?.id ?? null;
    } catch (error) {
      rethrowRoleNameConflict(error);
    }
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
    const now = params.now ?? Date.now();
    const where = and(
      eq(roleTable.isDeleted, true),
      params.keyword
        ? sql`instr(${roleTable.name}, ${params.keyword}) > 0`
        : undefined
    );
    const totals = await db
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
        >`(SELECT username FROM system_user WHERE id = ${roleTable.deleterId})`,
        deletedTimeUtc: sql<number>`${roleTable.deletedTimeUtc}`,
      })
      .from(roleTable)
      .where(where)
      .orderBy(desc(roleTable.deletedTimeUtc), desc(roleTable.id))
      .limit(params.pageSize)
      .offset((params.pageNo - 1) * params.pageSize);
    return {
      total: totals[0]?.total ?? 0,
      list: rows.map((row) => ({
        ...row,
        expiresTimeUtc: row.deletedTimeUtc + SOFT_DELETE_RETENTION_MS,
        canRestore:
          row.deletedTimeUtc <= now &&
          row.deletedTimeUtc + SOFT_DELETE_RETENTION_MS > now,
      })),
    };
  }

  /** Both statements observe the same role version under the driver's atomic batch. */
  async purge(
    id: number,
    expectedDeletedTimeUtc: number,
    cutoff?: number,
    _actorId?: number
  ): Promise<number | null> {
    const [, removed] = await db.batch([
      db
        .delete(rolePermissionTable)
        .where(
          sql`EXISTS (SELECT 1 FROM system_role AS owner
        WHERE owner.id = ${rolePermissionTable.roleId} AND owner.id = ${id} AND owner.is_deleted = 1
        AND ${purgeGuard(sql`owner.id`, sql`owner.deleted_time_utc`, expectedDeletedTimeUtc, cutoff)})`
        )
        .returning({ id: rolePermissionTable.id }),
      db
        .delete(roleTable)
        .where(
          and(
            eq(roleTable.id, id),
            eq(roleTable.isDeleted, true),
            purgeGuard(
              sql`${roleTable.id}`,
              sql`${roleTable.deletedTimeUtc}`,
              expectedDeletedTimeUtc,
              cutoff
            )
          )
        )
        .returning({ id: roleTable.id }),
    ]);
    return removed[0]?.id ?? null;
  }
}

const sqliteRepositoryImplementation = new RoleRepository();
export const roleRepository = {
  findPage: (
    ...args: Parameters<RoleRepository["findPage"]>
  ): ReturnType<RoleRepository["findPage"]> =>
    isPostgresBackend()
      ? postgresRepositoryImplementation.roleRepository.findPage(...args)
      : sqliteRepositoryImplementation.findPage(...args),
  findAll: (
    ...args: Parameters<RoleRepository["findAll"]>
  ): ReturnType<RoleRepository["findAll"]> =>
    isPostgresBackend()
      ? postgresRepositoryImplementation.roleRepository.findAll(...args)
      : sqliteRepositoryImplementation.findAll(...args),
  findById: (
    ...args: Parameters<RoleRepository["findById"]>
  ): ReturnType<RoleRepository["findById"]> =>
    isPostgresBackend()
      ? postgresRepositoryImplementation.roleRepository.findById(...args)
      : sqliteRepositoryImplementation.findById(...args),
  findDeletedById: (
    ...args: Parameters<RoleRepository["findDeletedById"]>
  ): ReturnType<RoleRepository["findDeletedById"]> =>
    isPostgresBackend()
      ? postgresRepositoryImplementation.roleRepository.findDeletedById(...args)
      : sqliteRepositoryImplementation.findDeletedById(...args),
  getRolesByIds: (
    ...args: Parameters<RoleRepository["getRolesByIds"]>
  ): ReturnType<RoleRepository["getRolesByIds"]> =>
    isPostgresBackend()
      ? postgresRepositoryImplementation.roleRepository.getRolesByIds(...args)
      : sqliteRepositoryImplementation.getRolesByIds(...args),
  getRoleDataScopes: (
    ...args: Parameters<RoleRepository["getRoleDataScopes"]>
  ): ReturnType<RoleRepository["getRoleDataScopes"]> =>
    isPostgresBackend()
      ? postgresRepositoryImplementation.roleRepository.getRoleDataScopes(
          ...args
        )
      : sqliteRepositoryImplementation.getRoleDataScopes(...args),
  getAuthorizationRoles: (
    ...args: Parameters<RoleRepository["getAuthorizationRoles"]>
  ): ReturnType<RoleRepository["getAuthorizationRoles"]> =>
    isPostgresBackend()
      ? postgresRepositoryImplementation.roleRepository.getAuthorizationRoles(
          ...args
        )
      : sqliteRepositoryImplementation.getAuthorizationRoles(...args),
  verifyRoleExists: (
    ...args: Parameters<RoleRepository["verifyRoleExists"]>
  ): ReturnType<RoleRepository["verifyRoleExists"]> =>
    isPostgresBackend()
      ? postgresRepositoryImplementation.roleRepository.verifyRoleExists(
          ...args
        )
      : sqliteRepositoryImplementation.verifyRoleExists(...args),
  updatePermissionCount: (
    ...args: Parameters<RoleRepository["updatePermissionCount"]>
  ): ReturnType<RoleRepository["updatePermissionCount"]> =>
    isPostgresBackend()
      ? postgresRepositoryImplementation.roleRepository.updatePermissionCount(
          ...args
        )
      : sqliteRepositoryImplementation.updatePermissionCount(...args),
  onInsert: (
    ...args: Parameters<RoleRepository["onInsert"]>
  ): ReturnType<RoleRepository["onInsert"]> =>
    isPostgresBackend()
      ? postgresRepositoryImplementation.roleRepository.onInsert(...args)
      : sqliteRepositoryImplementation.onInsert(...args),
  onUpdate: (
    ...args: Parameters<RoleRepository["onUpdate"]>
  ): ReturnType<RoleRepository["onUpdate"]> =>
    isPostgresBackend()
      ? postgresRepositoryImplementation.roleRepository.onUpdate(...args)
      : sqliteRepositoryImplementation.onUpdate(...args),
  onDelete: (
    ...args: Parameters<RoleRepository["onDelete"]>
  ): ReturnType<RoleRepository["onDelete"]> =>
    isPostgresBackend()
      ? postgresRepositoryImplementation.roleRepository.onDelete(...args)
      : sqliteRepositoryImplementation.onDelete(...args),
  onDeleteWithUndo: (
    ...args: Parameters<RoleRepository["onDeleteWithUndo"]>
  ): ReturnType<RoleRepository["onDeleteWithUndo"]> =>
    isPostgresBackend()
      ? postgresRepositoryImplementation.roleRepository.onDeleteWithUndo(
          ...args
        )
      : sqliteRepositoryImplementation.onDeleteWithUndo(...args),
  findUndoState: (
    ...args: Parameters<RoleRepository["findUndoState"]>
  ): ReturnType<RoleRepository["findUndoState"]> =>
    isPostgresBackend()
      ? postgresRepositoryImplementation.roleRepository.findUndoState(...args)
      : sqliteRepositoryImplementation.findUndoState(...args),
  undoDelete: (
    ...args: Parameters<RoleRepository["undoDelete"]>
  ): ReturnType<RoleRepository["undoDelete"]> =>
    isPostgresBackend()
      ? postgresRepositoryImplementation.roleRepository.undoDelete(...args)
      : sqliteRepositoryImplementation.undoDelete(...args),
  restore: (
    ...args: Parameters<RoleRepository["restore"]>
  ): ReturnType<RoleRepository["restore"]> =>
    isPostgresBackend()
      ? postgresRepositoryImplementation.roleRepository.restore(...args)
      : sqliteRepositoryImplementation.restore(...args),
  listDeleted: (
    ...args: Parameters<RoleRepository["listDeleted"]>
  ): ReturnType<RoleRepository["listDeleted"]> =>
    isPostgresBackend()
      ? postgresRepositoryImplementation.roleRepository.listDeleted(...args)
      : sqliteRepositoryImplementation.listDeleted(...args),
  purge: (
    ...args: Parameters<RoleRepository["purge"]>
  ): ReturnType<RoleRepository["purge"]> =>
    isPostgresBackend()
      ? postgresRepositoryImplementation.roleRepository.purge(...args)
      : sqliteRepositoryImplementation.purge(...args),
};

async function purgeExpiredRolesSqlite({
  now,
  batchSize,
}: SoftDeleteCleanupInput) {
  const cutoff = now - SOFT_DELETE_RETENTION_MS;
  const limit = Math.max(
    1,
    Math.min(SOFT_DELETE_BATCH_SIZE, Math.floor(batchSize))
  );
  const candidates = await db
    .select({
      id: roleTable.id,
      deletedTimeUtc: sql<number>`${roleTable.deletedTimeUtc}`,
    })
    .from(roleTable)
    .where(
      and(
        eq(roleTable.isDeleted, true),
        sql`${roleTable.id} != ${SUPER_ADMIN_ROLE_ID}`,
        sql`${roleTable.deletedTimeUtc} <= ${cutoff}`,
        roleHasNoUserReferences(sql`${roleTable.id}`)
      )
    )
    .orderBy(asc(roleTable.deletedTimeUtc), asc(roleTable.id))
    .limit(limit);
  let deletedCount = 0;
  if (candidates.length) {
    // One JSON parameter avoids D1 bind-variable limits while retaining each candidate's exact version.
    const versions = JSON.stringify(candidates);
    const eligible = (
      id: SQL,
      deletedTime: SQL
    ) => sql`${id} != ${SUPER_ADMIN_ROLE_ID} AND ${deletedTime} <= ${cutoff}
      AND EXISTS (SELECT 1 FROM json_each(${versions}) AS candidate WHERE json_extract(candidate.value, '$.id') = ${id}
        AND json_extract(candidate.value, '$.deletedTimeUtc') = ${deletedTime}) AND ${roleHasNoUserReferences(id)}`;
    const [, removed] = await db.batch([
      db
        .delete(rolePermissionTable)
        .where(
          sql`EXISTS (SELECT 1 FROM system_role AS owner WHERE owner.id = ${rolePermissionTable.roleId}
        AND owner.is_deleted = 1 AND ${eligible(sql`owner.id`, sql`owner.deleted_time_utc`)})`
        )
        .returning({ id: rolePermissionTable.id }),
      db
        .delete(roleTable)
        .where(
          and(
            eq(roleTable.isDeleted, true),
            eligible(sql`${roleTable.id}`, sql`${roleTable.deletedTimeUtc}`)
          )
        )
        .returning({ id: roleTable.id }),
    ]);
    deletedCount = removed.length;
  }
  const [remaining] = await db
    .select({
      remainingExpired: count(),
      oldestExpiredTimeUtc: sql<
        number | null
      >`MIN(${roleTable.deletedTimeUtc}) + ${SOFT_DELETE_RETENTION_MS}`,
    })
    .from(roleTable)
    .where(
      and(
        eq(roleTable.isDeleted, true),
        sql`${roleTable.id} != ${SUPER_ADMIN_ROLE_ID}`,
        sql`${roleTable.deletedTimeUtc} <= ${cutoff}`
      )
    );
  return {
    deletedCount,
    remainingExpired: remaining?.remainingExpired ?? 0,
    oldestExpiredTimeUtc: remaining?.oldestExpiredTimeUtc ?? null,
  };
}

export function purgeExpiredRoles(
  input: SoftDeleteCleanupInput
): ReturnType<typeof purgeExpiredRolesSqlite> {
  return isPostgresBackend()
    ? postgresRepositoryImplementation.purgeExpiredRoles(input)
    : purgeExpiredRolesSqlite(input);
}
