import db from "@hodor/core/db/index";
import { rolePermissionTable, type RolePermissionPOLike } from "./model";
import { permissionTable, type PermissionPOLike } from "../permission/model";
import {
  asc,
  count,
  desc,
  eq,
  and,
  inArray,
  type InferInsertModel,
} from "drizzle-orm";
import hasValue from "@hodor/core/utils/hasValue";

export const buildWhereCondition = (condition?: {
  roleId?: number;
  permissionId?: number;
}) => {
  const { roleId, permissionId } = condition || {};
  const conditions = [];
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
      .where(eq(rolePermissionTable.id, id))
      .limit(1);
    return rows[0] || null;
  }

  async getCurrentPermissionCount(roleId: number): Promise<number> {
    const countResult = await db
      .select({ count: count(rolePermissionTable.id).as("count") })
      .from(rolePermissionTable)
      .where(eq(rolePermissionTable.roleId, roleId));
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
          eq(permissionTable.isEnabled, true)
        )
      );
    return rows;
  }

  async getPermissionsByRoleIds(
    filteredRoleIds: number[]
  ): Promise<PermissionPOLike[]> {
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
          inArray(rolePermissionTable.roleId, filteredRoleIds),
          eq(permissionTable.isEnabled, true)
        )
      );
    return rows;
  }

  async verifyRecordExists(id: number): Promise<boolean> {
    const rows = await db
      .select({ id: rolePermissionTable.id })
      .from(rolePermissionTable)
      .where(eq(rolePermissionTable.id, id))
      .limit(1);
    return rows.length > 0;
  }

  async onInsert(
    data: Omit<
      InferInsertModel<typeof rolePermissionTable>,
      "id" | "createTimeUtc" | "updateTimeUtc"
    >
  ): Promise<number> {
    const res = await db
      .insert(rolePermissionTable)
      .values({
        ...data,
        createTimeUtc: Date.now(),
      })
      .returning({ id: rolePermissionTable.id });
    return res[0].id;
  }

  async onBatchInsert(
    values: Omit<
      InferInsertModel<typeof rolePermissionTable>,
      "id" | "createTimeUtc" | "updateTimeUtc"
    >[]
  ): Promise<number> {
    if (values.length === 0) return 0;
    // 批量插入，分片处理以避免 D1 变量限制 (通常为 100)
    // 每行 3 个变量，取 25 行为一组 (75 变量)
    const chunkSize = 25;
    const batches = [];
    for (let i = 0; i < values.length; i += chunkSize) {
      const chunk = values.slice(i, i + chunkSize);
      const chunkValues = chunk.map((v) => ({
        ...v,
        createTimeUtc: Date.now(),
      }));
      batches.push(
        db
          .insert(rolePermissionTable)
          .values(chunkValues)
          .returning({ id: rolePermissionTable.id })
      );
    }
    const results =
      batches.length > 0
        ? await db.batch(batches as unknown as Parameters<typeof db.batch>[0])
        : [];
    const totalAdded = (results as { id: number }[][]).reduce(
      (acc: number, curr) => acc + curr.length,
      0
    );
    return totalAdded;
  }

  async onUpdate(
    id: number,
    data: Partial<
      Omit<
        InferInsertModel<typeof rolePermissionTable>,
        "id" | "createTimeUtc" | "updateTimeUtc"
      >
    >
  ): Promise<number> {
    const res = await db
      .update(rolePermissionTable)
      .set({
        ...data,
        updateTimeUtc: Date.now(),
      })
      .where(eq(rolePermissionTable.id, id))
      .returning({ id: rolePermissionTable.id });
    return res[0].id;
  }

  async onDelete(id: number): Promise<number> {
    const res = await db
      .delete(rolePermissionTable)
      .where(eq(rolePermissionTable.id, id))
      .returning({ id: rolePermissionTable.id });
    return res[0].id;
  }

  async onBatchDelete(
    roleId: number,
    permissionIds: number[]
  ): Promise<number> {
    if (permissionIds.length === 0) return 0;
    // 分片删除以避免 D1 变量限制 (通常为 100)
    // inArray 会产生 N 个变量，取 50 为一组
    const chunkSize = 50;
    const batches = [];
    for (let i = 0; i < permissionIds.length; i += chunkSize) {
      const chunk = permissionIds.slice(i, i + chunkSize);
      batches.push(
        db
          .delete(rolePermissionTable)
          .where(
            and(
              eq(rolePermissionTable.roleId, roleId),
              inArray(rolePermissionTable.permissionId, chunk)
            )
          )
          .returning({ id: rolePermissionTable.id })
      );
    }
    const results =
      batches.length > 0
        ? await db.batch(batches as unknown as Parameters<typeof db.batch>[0])
        : [];
    const totalDeleted = (results as { id: number }[][]).reduce(
      (acc: number, curr) => acc + curr.length,
      0
    );
    return totalDeleted;
  }
}

export const rolePermissionRepository = new RolePermissionRepository();
