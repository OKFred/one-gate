import db from "@hodor/core/db/index";
import { rolePermissionTable, type RolePermissionPOLike } from "./model";
import { permissionTable, type PermissionPOLike } from "../permission/model";
import { roleTable } from "../role/model";
import {
  asc,
  count,
  desc,
  eq,
  and,
  inArray,
  sql,
  type SQL,
  type InferInsertModel,
} from "drizzle-orm";
import hasValue from "@hodor/core/utils/hasValue";
import { activeRoleIds } from "../role/reference-guards";
import { RoleDeletionError } from "../role/errors";
import { BusinessError } from "@hodor/core/middleware/errorHandler/businessError";

const activeOwner = sql`EXISTS (SELECT 1 FROM system_role AS association_owner WHERE association_owner.id = ${rolePermissionTable.roleId} AND association_owner.is_deleted = 0)`;

// Keep this immediately after the association mutation in the same transaction.
// A zero-row mutation must leave both counts and deletion versions untouched.
function updateOwnerCounts(roleIds: number[]) {
  return db
    .update(roleTable)
    .set({
      permissionCount: sql`(SELECT COUNT(*) FROM system_role_permission WHERE role_id = ${roleTable.id})`,
      updateTimeUtc: sql`MAX(${Date.now()}, COALESCE(${roleTable.updateTimeUtc}, 0) + 1)`,
    })
    .where(
      and(
        sql`changes() > 0`,
        sql`${roleTable.id} IN (SELECT value FROM json_each(${JSON.stringify(roleIds)}))`,
        eq(roleTable.isDeleted, false)
      )
    );
}

type AssociationInsert = Omit<
  InferInsertModel<typeof rolePermissionTable>,
  "id" | "createTimeUtc" | "updateTimeUtc"
>;

export const buildWhereCondition = (condition?: {
  roleId?: number;
  permissionId?: number;
}) => {
  const { roleId, permissionId } = condition || {};
  const conditions: SQL<unknown>[] = [activeOwner];
  if (hasValue(roleId))
    conditions.push(eq(rolePermissionTable.roleId, roleId as number));
  if (hasValue(permissionId))
    conditions.push(
      eq(rolePermissionTable.permissionId, permissionId as number)
    );

  return conditions.length > 0
    ? conditions.length === 1
      ? conditions[0]
      : and(...conditions)
    : undefined;
};

export class RolePermissionRepository {
  async findPage(params: {
    roleId?: number;
    permissionId?: number;
    orderBy?: keyof RolePermissionPOLike;
    descend?: boolean;
    pageNo: number;
    pageSize: number;
  }) {
    const {
      roleId,
      permissionId,
      orderBy = "id",
      descend = true,
      pageNo,
      pageSize,
    } = params;
    const offset = (pageNo - 1) * pageSize;
    const orderField = rolePermissionTable[orderBy] || rolePermissionTable.id;

    const countResult = await db
      .select({ total: count(rolePermissionTable.id).as("total") })
      .from(rolePermissionTable)
      .where(buildWhereCondition({ roleId, permissionId }));
    const total = countResult[0]?.total || 0;

    if (total === 0) {
      return { total, list: [] };
    }

    const rows = await db
      .select()
      .from(rolePermissionTable)
      .where(buildWhereCondition({ roleId, permissionId }))
      .orderBy(!descend ? asc(orderField) : desc(orderField))
      .limit(pageSize)
      .offset(offset);

    return { total, list: rows };
  }

  async findAll(params: {
    roleId?: number;
    permissionId?: number;
    orderBy?: keyof RolePermissionPOLike;
    descend?: boolean;
  }) {
    const { roleId, permissionId, orderBy = "id", descend = true } = params;
    const orderField = rolePermissionTable[orderBy] || rolePermissionTable.id;
    const maxLimit = 10000;

    const rows = await db
      .select()
      .from(rolePermissionTable)
      .where(buildWhereCondition({ roleId, permissionId }))
      .orderBy(!descend ? asc(orderField) : desc(orderField))
      .limit(maxLimit);

    return rows;
  }

  async findById(id: number): Promise<RolePermissionPOLike | null> {
    const rows = await db
      .select()
      .from(rolePermissionTable)
      .where(and(eq(rolePermissionTable.id, id), activeOwner))
      .limit(1);
    return rows[0] || null;
  }

  async getCurrentPermissionCount(roleId: number): Promise<number> {
    const countResult = await db
      .select({ count: count(rolePermissionTable.id).as("count") })
      .from(rolePermissionTable)
      .where(and(eq(rolePermissionTable.roleId, roleId), activeOwner));
    return countResult[0]?.count || 0;
  }

  async getPermissionsByRole(roleId: number): Promise<PermissionPOLike[]> {
    const rows = await db
      .select({
        id: permissionTable.id,
        code: permissionTable.code,
        name: permissionTable.name,
        category: permissionTable.category,
        resource: permissionTable.resource,
        business: permissionTable.business,
        remark: permissionTable.remark,
        isEnabled: permissionTable.isEnabled,
        creatorId: permissionTable.creatorId,
        updaterId: permissionTable.updaterId,
        createTimeUtc: permissionTable.createTimeUtc,
        updateTimeUtc: permissionTable.updateTimeUtc,
      })
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
      );
    return rows;
  }

  async getPermissionsByRoleIds(
    roleIds: number[]
  ): Promise<PermissionPOLike[]> {
    if (roleIds.length === 0) return [];
    const rows = await db
      .select({
        id: permissionTable.id,
        code: permissionTable.code,
        name: permissionTable.name,
        category: permissionTable.category,
        resource: permissionTable.resource,
        business: permissionTable.business,
        remark: permissionTable.remark,
        isEnabled: permissionTable.isEnabled,
        creatorId: permissionTable.creatorId,
        updaterId: permissionTable.updaterId,
        createTimeUtc: permissionTable.createTimeUtc,
        updateTimeUtc: permissionTable.updateTimeUtc,
      })
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
    return rows;
  }

  async verifyRecordExists(id: number): Promise<boolean> {
    const rows = await db
      .select({ id: rolePermissionTable.id })
      .from(rolePermissionTable)
      .where(and(eq(rolePermissionTable.id, id), activeOwner))
      .limit(1);
    return rows.length > 0;
  }

  async onInsert(data: AssociationInsert): Promise<number> {
    const [rows] = await db.batch([
      db
        .insert(rolePermissionTable)
        .select(
          sql`SELECT NULL, ${data.roleId}, ${data.permissionId}, ${data.creatorId}, ${data.updaterId ?? null}, ${Date.now()}, NULL
        WHERE ${activeRoleIds([data.roleId])}`
        )
        .returning({ id: rolePermissionTable.id }),
      updateOwnerCounts([data.roleId]),
    ]);
    if (!rows[0]) throw new BusinessError(RoleDeletionError.NOT_ACTIVE);
    return rows[0].id;
  }

  async onBatchInsert(values: AssociationInsert[]): Promise<number> {
    if (values.length === 0) return 0;
    const roleIds = [...new Set(values.map(({ roleId }) => roleId))];
    // One JSON parameter avoids the D1 parameter ceiling without partial chunks.
    const [rows] = await db.batch([
      db
        .insert(rolePermissionTable)
        .select(
          sql`SELECT NULL,
        json_extract(association.value, '$.roleId'), json_extract(association.value, '$.permissionId'),
        json_extract(association.value, '$.creatorId'), json_extract(association.value, '$.updaterId'), ${Date.now()}, NULL
        FROM json_each(${JSON.stringify(values)}) AS association WHERE ${activeRoleIds(roleIds)}`
        )
        .returning({ id: rolePermissionTable.id }),
      updateOwnerCounts(roleIds),
    ]);
    if (rows.length !== values.length)
      throw new BusinessError(RoleDeletionError.NOT_ACTIVE);
    return rows.length;
  }

  async onUpdate(
    id: number,
    data: Partial<AssociationInsert>
  ): Promise<number> {
    const current = await this.findById(id);
    if (!current) throw new BusinessError(RoleDeletionError.STATE_CONFLICT);
    const targetRoleId = data.roleId ?? current.roleId;
    const [rows] = await db.batch([
      db
        .update(rolePermissionTable)
        .set({
          ...data,
          updateTimeUtc: sql`MAX(${Date.now()}, COALESCE(${rolePermissionTable.updateTimeUtc}, 0) + 1)`,
        })
        .where(
          and(
            eq(rolePermissionTable.id, id),
            eq(rolePermissionTable.roleId, current.roleId),
            sql`${rolePermissionTable.updateTimeUtc} IS ${current.updateTimeUtc}`,
            activeRoleIds([current.roleId, targetRoleId])
          )
        )
        .returning({ id: rolePermissionTable.id }),
      updateOwnerCounts([current.roleId, targetRoleId]),
    ]);
    if (!rows[0]) throw new BusinessError(RoleDeletionError.STATE_CONFLICT);
    return rows[0].id;
  }

  async onDelete(id: number): Promise<number> {
    const current = await this.findById(id);
    if (!current) throw new BusinessError(RoleDeletionError.STATE_CONFLICT);
    const [rows] = await db.batch([
      db
        .delete(rolePermissionTable)
        .where(
          and(
            eq(rolePermissionTable.id, id),
            eq(rolePermissionTable.roleId, current.roleId),
            sql`${rolePermissionTable.updateTimeUtc} IS ${current.updateTimeUtc}`,
            activeRoleIds([current.roleId])
          )
        )
        .returning({ id: rolePermissionTable.id }),
      updateOwnerCounts([current.roleId]),
    ]);
    if (!rows[0]) throw new BusinessError(RoleDeletionError.STATE_CONFLICT);
    return rows[0].id;
  }

  async onBatchDelete(
    roleId: number,
    permissionIds: number[]
  ): Promise<number> {
    if (permissionIds.length === 0) return 0;
    const [rows] = await db.batch([
      db
        .delete(rolePermissionTable)
        .where(
          and(
            eq(rolePermissionTable.roleId, roleId),
            sql`${rolePermissionTable.permissionId} IN (SELECT value FROM json_each(${JSON.stringify(permissionIds)}))`,
            activeRoleIds([roleId])
          )
        )
        .returning({ id: rolePermissionTable.id }),
      updateOwnerCounts([roleId]),
    ]);
    if (!rows.length) {
      const active = await db
        .select({ id: roleTable.id })
        .from(roleTable)
        .where(and(eq(roleTable.id, roleId), eq(roleTable.isDeleted, false)));
      if (!active[0]) throw new BusinessError(RoleDeletionError.NOT_ACTIVE);
    }
    return rows.length;
  }
}

export const rolePermissionRepository = new RolePermissionRepository();
