import db from "@/db/index";
import { swarmDockerConfigTable, type SwarmDockerConfigPOLike } from "./model";
import { eq, and, or, like, not, count, asc, desc } from "drizzle-orm";
import type { InferInsertModel } from "drizzle-orm";
import hasValue from "@/utils/hasValue";

export type SwarmDockerConfigInsertModel = InferInsertModel<
  typeof swarmDockerConfigTable
>;

export interface FindPageParams {
  keyword?: string;
  isEnabled?: boolean;
  pageNo: number;
  pageSize: number;
  orderBy?: keyof SwarmDockerConfigPOLike;
  descend?: boolean;
}

export interface FindAllParams {
  keyword?: string;
  isEnabled?: boolean;
  orderBy?: keyof SwarmDockerConfigPOLike;
  descend?: boolean;
}

// 辅助方法：构建查询条件
function buildWhereCondition(params: {
  keyword?: string;
  isEnabled?: boolean;
}) {
  const conditions = [];
  if (hasValue(params.keyword)) {
    conditions.push(
      or(like(swarmDockerConfigTable.name, `%${params.keyword}%`))
    );
  }
  if (params.isEnabled !== undefined) {
    conditions.push(eq(swarmDockerConfigTable.isEnabled, params.isEnabled));
  }
  return conditions.length > 0
    ? conditions.length === 1
      ? conditions[0]
      : and(...conditions)
    : undefined;
}

export async function findPage(params: FindPageParams) {
  const { orderBy = "id", descend = true, pageNo, pageSize } = params;
  const offset = (pageNo - 1) * pageSize;
  const orderField =
    swarmDockerConfigTable[orderBy] || swarmDockerConfigTable.id;

  const whereCondition = buildWhereCondition(params);

  const countResult = await db
    .select({ total: count(swarmDockerConfigTable.id).as("total") })
    .from(swarmDockerConfigTable)
    .where(whereCondition);

  const total = countResult[0]?.total || 0;
  const list = await db
    .select()
    .from(swarmDockerConfigTable)
    .where(whereCondition)
    .orderBy(!descend ? asc(orderField) : desc(orderField))
    .limit(pageSize)
    .offset(offset);

  return {
    list,
    total,
  };
}

export async function findAll(params: FindAllParams) {
  const { orderBy = "id", descend = true } = params;
  const orderField =
    swarmDockerConfigTable[orderBy] || swarmDockerConfigTable.id;
  const whereCondition = buildWhereCondition(params);

  return await db
    .select({
      id: swarmDockerConfigTable.id,
      name: swarmDockerConfigTable.name,
      host: swarmDockerConfigTable.host,
      isEnabled: swarmDockerConfigTable.isEnabled,
      isDefault: swarmDockerConfigTable.isDefault,
    })
    .from(swarmDockerConfigTable)
    .where(whereCondition)
    .orderBy(!descend ? asc(orderField) : desc(orderField))
    .limit(1000);
}

export async function findById(id: number) {
  const rows = await db
    .select()
    .from(swarmDockerConfigTable)
    .where(eq(swarmDockerConfigTable.id, id))
    .limit(1);
  return rows[0] || null;
}

export async function findDefaultActiveConfig() {
  const rows = await db
    .select()
    .from(swarmDockerConfigTable)
    .where(
      and(
        eq(swarmDockerConfigTable.isEnabled, true),
        eq(swarmDockerConfigTable.isDefault, true)
      )
    )
    .limit(1);
  return rows[0] || null;
}

export async function clearAllDefaults(excludeId?: number) {
  const condition =
    excludeId !== undefined
      ? and(
          eq(swarmDockerConfigTable.isDefault, true),
          not(eq(swarmDockerConfigTable.id, excludeId))
        )
      : eq(swarmDockerConfigTable.isDefault, true);

  await db
    .update(swarmDockerConfigTable)
    .set({ isDefault: false })
    .where(condition);
}

export async function onInsert(data: SwarmDockerConfigInsertModel) {
  const result = await db
    .insert(swarmDockerConfigTable)
    .values(data)
    .returning({ id: swarmDockerConfigTable.id });
  return result[0] || null;
}

export async function onUpdate(
  id: number,
  data: Partial<
    Omit<SwarmDockerConfigInsertModel, "id" | "createTimeUtc" | "creatorId">
  > & { updateTimeUtc: number }
) {
  const result = await db
    .update(swarmDockerConfigTable)
    .set(data)
    .where(eq(swarmDockerConfigTable.id, id))
    .returning({ id: swarmDockerConfigTable.id });
  return result[0] || null;
}

export async function onDelete(id: number) {
  const result = await db
    .delete(swarmDockerConfigTable)
    .where(eq(swarmDockerConfigTable.id, id))
    .returning({ id: swarmDockerConfigTable.id });
  return result[0] || null;
}
