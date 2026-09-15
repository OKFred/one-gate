import db from "@hodor/core/db/index";
import { roleTable, type RolePOLike } from "./model";
import {
  asc,
  count,
  desc,
  eq,
  or,
  like,
  inArray,
  and,
  type SQL,
  type InferInsertModel,
} from "drizzle-orm";
import hasValue from "@hodor/core/utils/hasValue";
import { sql } from "drizzle-orm";
import {
  activeDepartmentIds,
  normalizeDepartmentIds,
} from "../department/reference-guards";
import { DepartmentDeletionError } from "../department/errors";
import { BusinessError } from "@hodor/core/middleware/errorHandler/businessError";

export type AuthorizationRole = Pick<
  typeof roleTable.$inferSelect,
  "id" | "dataScope" | "customDeptIds" | "updateTimeUtc"
>;

export const buildWhereCondition = (condition?: {
  keyword?: string;
  isEnabled?: boolean;
}) => {
  const { keyword, isEnabled } = condition || {};
  const conditions: SQL<unknown>[] = [];
  if (hasValue(keyword)) {
    conditions.push(or(like(roleTable.name, `%${keyword}%`)) as SQL<unknown>);
  }
  if (isEnabled !== undefined) {
    conditions.push(eq(roleTable.isEnabled, isEnabled));
  }
  return conditions.length > 0
    ? conditions.length === 1
      ? conditions[0]
      : and(...conditions)
    : undefined;
};

export class RoleRepository {
  async findPage(params: {
    keyword?: string;
    isEnabled?: boolean;
    orderBy?: keyof RolePOLike;
    descend?: boolean;
    pageNo: number;
    pageSize: number;
  }) {
    const {
      keyword,
      isEnabled,
      orderBy = "id",
      descend = true,
      pageNo,
      pageSize,
    } = params;
    const offset = (pageNo - 1) * pageSize;
    const orderField = roleTable[orderBy] || roleTable.id;

    const countResult = await db
      .select({ total: count(roleTable.id).as("total") })
      .from(roleTable)
      .where(buildWhereCondition({ keyword, isEnabled }));
    const total = countResult[0]?.total || 0;

    if (total === 0) {
      return { total, list: [] };
    }

    const rows = await db
      .select()
      .from(roleTable)
      .where(buildWhereCondition({ keyword, isEnabled }))
      .orderBy(!descend ? asc(orderField) : desc(orderField))
      .limit(pageSize)
      .offset(offset);

    return { total, list: rows };
  }

  async findAll(params: {
    keyword?: string;
    isEnabled?: boolean;
    orderBy?: keyof RolePOLike;
    descend?: boolean;
  }) {
    const { keyword, isEnabled, orderBy = "id", descend = true } = params;
    const orderField = roleTable[orderBy] || roleTable.id;
    const maxLimit = 10000;

    const rows = await db
      .select({
        id: roleTable.id,
        name: roleTable.name,
        remark: roleTable.remark,
        isEnabled: roleTable.isEnabled,
        dataScope: roleTable.dataScope,
      })
      .from(roleTable)
      .where(buildWhereCondition({ keyword, isEnabled }))
      .orderBy(!descend ? asc(orderField) : desc(orderField))
      .limit(maxLimit);

    return rows;
  }

  async findById(id: number): Promise<RolePOLike | null> {
    const rows = await db
      .select()
      .from(roleTable)
      .where(eq(roleTable.id, id))
      .limit(1);
    return rows[0] || null;
  }

  async getRolesByIds(
    ids: number[]
  ): Promise<{ value: number; label: string }[]> {
    if (ids.length === 0) return [];
    const rows = await db
      .select({ value: roleTable.id, label: roleTable.name })
      .from(roleTable)
      .where(inArray(roleTable.id, ids));
    return rows;
  }

  async getRoleDataScopes(roleIds: number[]) {
    if (roleIds.length === 0) return [];
    const rows = await db
      .select({
        dataScope: roleTable.dataScope,
        customDeptIds: roleTable.customDeptIds,
      })
      .from(roleTable)
      .where(
        and(inArray(roleTable.id, roleIds), eq(roleTable.isEnabled, true))
      );
    return rows;
  }

  async getAuthorizationRoles(ids: number[]): Promise<AuthorizationRole[]> {
    if (ids.length === 0) return [];
    return await db
      .select({
        id: roleTable.id,
        dataScope: roleTable.dataScope,
        customDeptIds: roleTable.customDeptIds,
        updateTimeUtc: roleTable.updateTimeUtc,
      })
      .from(roleTable)
      .where(and(inArray(roleTable.id, ids), eq(roleTable.isEnabled, true)))
      .orderBy(asc(roleTable.id));
  }

  async verifyRoleExists(roleId: number): Promise<boolean> {
    const rows = await db
      .select({ id: roleTable.id })
      .from(roleTable)
      .where(eq(roleTable.id, roleId))
      .limit(1);
    return rows.length > 0;
  }

  async updatePermissionCount(roleId: number, newCount: number): Promise<void> {
    await db
      .update(roleTable)
      .set({ permissionCount: newCount })
      .where(eq(roleTable.id, roleId));
  }

  async onInsert(
    data: Omit<
      InferInsertModel<typeof roleTable>,
      "id" | "createTimeUtc" | "updateTimeUtc"
    >
  ): Promise<number> {
    const customDeptIds = normalizeDepartmentIds(data.customDeptIds);
    if (customDeptIds && customDeptIds !== "[]") {
      const rows = await db.all<{ id: number }>(sql`INSERT INTO system_role
        (name, remark, is_enabled, permission_count, data_scope, custom_dept_ids, creator_id, updater_id, create_time_utc)
        SELECT ${data.name}, ${data.remark ?? null}, ${data.isEnabled ? 1 : 0}, ${data.permissionCount}, ${data.dataScope}, ${customDeptIds}, ${data.creatorId}, ${data.updaterId ?? null}, ${Date.now()}
        WHERE ${activeDepartmentIds(customDeptIds)} RETURNING id`);
      if (!rows[0])
        throw new BusinessError(DepartmentDeletionError.REFERENCE_UNAVAILABLE);
      return rows[0].id;
    }
    const res = await db
      .insert(roleTable)
      .values({
        ...data,
        customDeptIds,
        createTimeUtc: Date.now(),
      })
      .returning({ id: roleTable.id });
    return res[0].id;
  }

  async onUpdate(
    id: number,
    data: Partial<
      Omit<
        InferInsertModel<typeof roleTable>,
        "id" | "createTimeUtc" | "updateTimeUtc"
      >
    >
  ): Promise<number> {
    const customDeptIds = normalizeDepartmentIds(data.customDeptIds);
    const res = await db
      .update(roleTable)
      .set({
        ...data,
        customDeptIds,
        updateTimeUtc: sql`MAX(${Date.now()}, COALESCE(${roleTable.updateTimeUtc}, 0) + 1)`,
      })
      .where(
        and(
          eq(roleTable.id, id),
          customDeptIds && customDeptIds !== "[]"
            ? activeDepartmentIds(customDeptIds)
            : undefined
        )
      )
      .returning({ id: roleTable.id });
    if (!res[0])
      throw new BusinessError(DepartmentDeletionError.REFERENCE_UNAVAILABLE);
    return res[0].id;
  }

  async onDelete(id: number): Promise<number> {
    const res = await db
      .delete(roleTable)
      .where(eq(roleTable.id, id))
      .returning({ id: roleTable.id });
    return res[0].id;
  }
}

export const roleRepository = new RoleRepository();
