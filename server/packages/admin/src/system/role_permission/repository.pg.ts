import {
  and,
  asc,
  desc,
  eq,
  getTableColumns,
  inArray,
  sql,
  type SQL,
  type InferInsertModel,
} from "drizzle-orm";
import {
  getPostgresDb,
  withPostgresTransaction,
} from "@hodor/core/db/postgresql/runtime";
import {
  postgresNowMilliseconds,
  postgresSafeInteger,
} from "@hodor/core/db/postgresql/sql";
import { BusinessError } from "@hodor/core/middleware/errorHandler/businessError";
import { rolePermissionTable } from "./schema.pg";
import type { RolePermissionPOLike } from "./model";
import { permissionTable } from "../permission/schema.pg";
import type { PermissionPOLike } from "../permission/model";
import { roleTable } from "../role/schema.pg";
import { RoleDeletionError } from "../role/errors";

type AssociationInsert = Omit<
  InferInsertModel<typeof rolePermissionTable>,
  "id" | "createTimeUtc" | "updateTimeUtc"
>;
type Filters = { roleId?: number; permissionId?: number };
const activeOwner = sql`EXISTS (SELECT 1 FROM system_role AS association_owner
  WHERE association_owner.id = ${rolePermissionTable.roleId} AND NOT association_owner.is_deleted)`;
function activeRoles(roleIds: number[]): SQL {
  return sql`NOT EXISTS (SELECT 1 FROM jsonb_array_elements_text(${JSON.stringify(roleIds)}::jsonb) AS requested_role(value)
    WHERE NOT EXISTS (SELECT 1 FROM system_role AS referenced_role WHERE referenced_role.id = requested_role.value::bigint AND NOT referenced_role.is_deleted))`;
}
function where(condition: Filters = {}): SQL | undefined {
  return and(
    activeOwner,
    condition.roleId === undefined
      ? undefined
      : eq(rolePermissionTable.roleId, condition.roleId),
    condition.permissionId === undefined
      ? undefined
      : eq(rolePermissionTable.permissionId, condition.permissionId)
  );
}
function version(column: SQL): SQL<number> {
  return sql<number>`GREATEST(${postgresNowMilliseconds()}, COALESCE(${column}, 0) + 1)`;
}
function conflict(): never {
  throw new BusinessError(RoleDeletionError.STATE_CONFLICT);
}
async function updateCounts(roleIds: number[]): Promise<void> {
  if (!roleIds.length) return;
  const unique = [...new Set(roleIds)];
  const rows = await getPostgresDb()
    .update(roleTable)
    .set({
      permissionCount: sql`(SELECT COUNT(*) FROM system_role_permission WHERE role_id = ${roleTable.id})`,
      updateTimeUtc: version(sql`${roleTable.updateTimeUtc}`),
    })
    .where(and(inArray(roleTable.id, unique), eq(roleTable.isDeleted, false)))
    .returning({ id: roleTable.id });
  if (rows.length !== unique.length) conflict();
}

class PostgresRolePermissionRepository {
  findPage(
    params: Filters & {
      orderBy?: keyof RolePermissionPOLike;
      descend?: boolean;
      pageNo: number;
      pageSize: number;
    }
  ) {
    return withPostgresTransaction(async () => {
      const db = getPostgresDb();
      const order = rolePermissionTable[params.orderBy ?? "id"];
      const [count] = await db
        .select({ total: sql`count(*)`.mapWith(postgresSafeInteger) })
        .from(rolePermissionTable)
        .where(where(params));
      const list = await db
        .select()
        .from(rolePermissionTable)
        .where(where(params))
        .orderBy(params.descend === false ? asc(order) : desc(order))
        .limit(params.pageSize)
        .offset((params.pageNo - 1) * params.pageSize);
      return { total: count?.total ?? 0, list };
    });
  }
  findAll(
    params: Filters & {
      orderBy?: keyof RolePermissionPOLike;
      descend?: boolean;
    }
  ) {
    return withPostgresTransaction(async () => {
      const order = rolePermissionTable[params.orderBy ?? "id"];
      return getPostgresDb()
        .select()
        .from(rolePermissionTable)
        .where(where(params))
        .orderBy(params.descend === false ? asc(order) : desc(order))
        .limit(10000);
    });
  }
  findById(id: number): Promise<RolePermissionPOLike | null> {
    return withPostgresTransaction(async () => {
      const [row] = await getPostgresDb()
        .select()
        .from(rolePermissionTable)
        .where(and(eq(rolePermissionTable.id, id), activeOwner))
        .limit(1);
      return row ?? null;
    });
  }
  getCurrentPermissionCount(roleId: number): Promise<number> {
    return withPostgresTransaction(async () => {
      const [row] = await getPostgresDb()
        .select({ count: sql`count(*)`.mapWith(postgresSafeInteger) })
        .from(rolePermissionTable)
        .where(where({ roleId }));
      return row?.count ?? 0;
    });
  }
  getPermissionsByRole(roleId: number): Promise<PermissionPOLike[]> {
    return withPostgresTransaction(async () =>
      getPostgresDb()
        .select(getTableColumns(permissionTable))
        .from(rolePermissionTable)
        .innerJoin(
          permissionTable,
          eq(rolePermissionTable.permissionId, permissionTable.id)
        )
        .where(
          and(
            eq(rolePermissionTable.roleId, roleId),
            activeOwner,
            eq(permissionTable.isEnabled, true)
          )
        )
    );
  }
  getPermissionsByRoleIds(roleIds: number[]): Promise<PermissionPOLike[]> {
    return withPostgresTransaction(async () => {
      if (!roleIds.length) return [];
      return getPostgresDb()
        .select(getTableColumns(permissionTable))
        .from(rolePermissionTable)
        .innerJoin(
          permissionTable,
          eq(rolePermissionTable.permissionId, permissionTable.id)
        )
        .innerJoin(roleTable, eq(rolePermissionTable.roleId, roleTable.id))
        .where(
          and(
            inArray(rolePermissionTable.roleId, roleIds),
            eq(roleTable.isEnabled, true),
            eq(roleTable.isDeleted, false),
            eq(permissionTable.isEnabled, true)
          )
        );
    });
  }
  verifyRecordExists(id: number): Promise<boolean> {
    return withPostgresTransaction(
      async () => (await this.findById(id)) !== null
    );
  }
  onInsert(data: AssociationInsert): Promise<number> {
    return withPostgresTransaction(
      async () => {
        const result = await getPostgresDb().execute<{
          id: unknown;
        }>(sql`INSERT INTO system_role_permission (role_id, permission_id, creator_id, updater_id, create_time_utc, update_time_utc)
        SELECT ${data.roleId}, ${data.permissionId}, ${data.creatorId}, ${data.updaterId ?? null}, ${postgresNowMilliseconds()}, NULL WHERE ${activeRoles([data.roleId])} RETURNING id`);
        if (result.rows.length !== 1)
          throw new BusinessError(RoleDeletionError.NOT_ACTIVE);
        const id = postgresSafeInteger(result.rows[0].id);
        await updateCounts([data.roleId]);
        return id;
      },
      { write: true }
    );
  }
  onBatchInsert(values: AssociationInsert[]): Promise<number> {
    return withPostgresTransaction(
      async () => {
        if (!values.length) return 0;
        const roleIds = [...new Set(values.map((value) => value.roleId))];
        const result = await getPostgresDb().execute<{
          id: unknown;
        }>(sql`INSERT INTO system_role_permission (role_id, permission_id, creator_id, updater_id, create_time_utc, update_time_utc)
        SELECT association."roleId", association."permissionId", association."creatorId", association."updaterId", ${postgresNowMilliseconds()}, NULL
        FROM jsonb_to_recordset(${JSON.stringify(values)}::jsonb) AS association("roleId" bigint, "permissionId" bigint, "creatorId" bigint, "updaterId" bigint)
        WHERE ${activeRoles(roleIds)} RETURNING id`);
        if (result.rows.length !== values.length)
          throw new BusinessError(RoleDeletionError.NOT_ACTIVE);
        await updateCounts(roleIds);
        return result.rows.length;
      },
      { write: true }
    );
  }
  onUpdate(id: number, data: Partial<AssociationInsert>): Promise<number> {
    return withPostgresTransaction(
      async () => {
        const current = await this.findById(id);
        if (!current) conflict();
        const targetRoleId = data.roleId ?? current.roleId;
        const rows = await getPostgresDb()
          .update(rolePermissionTable)
          .set({
            ...data,
            updateTimeUtc: version(sql`${rolePermissionTable.updateTimeUtc}`),
          })
          .where(
            and(
              eq(rolePermissionTable.id, id),
              eq(rolePermissionTable.roleId, current.roleId),
              sql`${rolePermissionTable.updateTimeUtc} IS NOT DISTINCT FROM ${current.updateTimeUtc}`,
              activeRoles([current.roleId, targetRoleId])
            )
          )
          .returning({ id: rolePermissionTable.id });
        if (rows.length !== 1) conflict();
        await updateCounts([current.roleId, targetRoleId]);
        return rows[0].id;
      },
      { write: true }
    );
  }
  onDelete(id: number): Promise<number> {
    return withPostgresTransaction(
      async () => {
        const current = await this.findById(id);
        if (!current) conflict();
        const rows = await getPostgresDb()
          .delete(rolePermissionTable)
          .where(
            and(
              eq(rolePermissionTable.id, id),
              eq(rolePermissionTable.roleId, current.roleId),
              sql`${rolePermissionTable.updateTimeUtc} IS NOT DISTINCT FROM ${current.updateTimeUtc}`,
              activeRoles([current.roleId])
            )
          )
          .returning({ id: rolePermissionTable.id });
        if (rows.length !== 1) conflict();
        await updateCounts([current.roleId]);
        return rows[0].id;
      },
      { write: true }
    );
  }
  onBatchDelete(roleId: number, permissionIds: number[]): Promise<number> {
    return withPostgresTransaction(
      async () => {
        if (!permissionIds.length) return 0;
        const rows = await getPostgresDb()
          .delete(rolePermissionTable)
          .where(
            and(
              eq(rolePermissionTable.roleId, roleId),
              sql`${rolePermissionTable.permissionId} IN (SELECT value::bigint FROM jsonb_array_elements_text(${JSON.stringify(permissionIds)}::jsonb) AS requested_permission(value))`,
              activeRoles([roleId])
            )
          )
          .returning({ id: rolePermissionTable.id });
        if (rows.length) await updateCounts([roleId]);
        else {
          const active = await getPostgresDb()
            .select({ id: roleTable.id })
            .from(roleTable)
            .where(
              and(eq(roleTable.id, roleId), eq(roleTable.isDeleted, false))
            );
          if (!active.length)
            throw new BusinessError(RoleDeletionError.NOT_ACTIVE);
        }
        return rows.length;
      },
      { write: true }
    );
  }
}

export const postgresRolePermissionRepository =
  new PostgresRolePermissionRepository();
