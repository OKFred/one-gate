import db from "@hodor/core/db/index";
import { apiTokenTable, type ApiTokenPOLike } from "./model";
import {
  asc,
  count,
  desc,
  eq,
  like,
  and,
  type SQL,
  type InferInsertModel,
} from "drizzle-orm";
import hasValue from "@hodor/core/utils/hasValue";

/**
 * 构建 API 令牌列表查询条件
 * @param condition 查询条件
 * @returns Drizzle SQL 条件
 */
export const buildWhereCondition = (condition?: {
  keyword?: string;
  status?: string;
}) => {
  const { keyword, status } = condition || {};
  const conditions: SQL<unknown>[] = [];
  if (hasValue(keyword)) {
    conditions.push(like(apiTokenTable.name, `%${keyword}%`));
  }
  if (hasValue(status)) {
    conditions.push(eq(apiTokenTable.status, status as string));
  }
  return conditions.length > 0
    ? conditions.length === 1
      ? conditions[0]
      : and(...conditions)
    : undefined;
};

export class ApiTokenRepository {
  /**
   * 分页查询 API 令牌列表（排除 tokenHash）
   * @param params 分页与筛选参数
   * @returns 分页结果
   */
  async findPage(params: {
    keyword?: string;
    status?: string;
    orderBy?: keyof ApiTokenPOLike;
    descend?: boolean;
    pageNo: number;
    pageSize: number;
  }) {
    const {
      keyword,
      status,
      orderBy = "id",
      descend = true,
      pageNo,
      pageSize,
    } = params;
    const offset = (pageNo - 1) * pageSize;
    const orderField = apiTokenTable[orderBy] || apiTokenTable.id;

    const countResult = await db
      .select({ total: count(apiTokenTable.id).as("total") })
      .from(apiTokenTable)
      .where(buildWhereCondition({ keyword, status }));
    const total = countResult[0]?.total || 0;

    if (total === 0) {
      return { total, list: [] };
    }

    const rows = await db
      .select({
        id: apiTokenTable.id,
        name: apiTokenTable.name,
        tokenPrefix: apiTokenTable.tokenPrefix,
        permissions: apiTokenTable.permissions,
        ipWhitelist: apiTokenTable.ipWhitelist,
        startTimeUtc: apiTokenTable.startTimeUtc,
        expireTimeUtc: apiTokenTable.expireTimeUtc,
        lastUsedTimeUtc: apiTokenTable.lastUsedTimeUtc,
        status: apiTokenTable.status,
        remark: apiTokenTable.remark,
        creatorId: apiTokenTable.creatorId,
        updaterId: apiTokenTable.updaterId,
        createTimeUtc: apiTokenTable.createTimeUtc,
        updateTimeUtc: apiTokenTable.updateTimeUtc,
      })
      .from(apiTokenTable)
      .where(buildWhereCondition({ keyword, status }))
      .orderBy(!descend ? asc(orderField) : desc(orderField))
      .limit(pageSize)
      .offset(offset);

    return { total, list: rows };
  }

  /**
   * 通过 ID 查询单条 API 令牌（排除 tokenHash）
   * @param id 令牌 ID
   * @returns 令牌记录或 null
   */
  async findById(id: number) {
    const rows = await db
      .select({
        id: apiTokenTable.id,
        name: apiTokenTable.name,
        tokenPrefix: apiTokenTable.tokenPrefix,
        permissions: apiTokenTable.permissions,
        ipWhitelist: apiTokenTable.ipWhitelist,
        startTimeUtc: apiTokenTable.startTimeUtc,
        expireTimeUtc: apiTokenTable.expireTimeUtc,
        lastUsedTimeUtc: apiTokenTable.lastUsedTimeUtc,
        status: apiTokenTable.status,
        remark: apiTokenTable.remark,
        creatorId: apiTokenTable.creatorId,
        updaterId: apiTokenTable.updaterId,
        createTimeUtc: apiTokenTable.createTimeUtc,
        updateTimeUtc: apiTokenTable.updateTimeUtc,
      })
      .from(apiTokenTable)
      .where(eq(apiTokenTable.id, id))
      .limit(1);
    return rows[0] || null;
  }

  /**
   * 通过令牌哈希查找完整记录（鉴权用）
   * @param tokenHash SHA-256 哈希值
   * @returns 完整令牌记录或 null
   */
  async findByTokenHash(tokenHash: string): Promise<ApiTokenPOLike | null> {
    const rows = await db
      .select()
      .from(apiTokenTable)
      .where(eq(apiTokenTable.tokenHash, tokenHash))
      .limit(1);
    return rows[0] || null;
  }

  /**
   * 插入新令牌
   * @param data 令牌数据
   * @returns 新记录 ID
   */
  async onInsert(
    data: Omit<
      InferInsertModel<typeof apiTokenTable>,
      "id" | "createTimeUtc" | "updateTimeUtc"
    >
  ): Promise<number> {
    const res = await db
      .insert(apiTokenTable)
      .values({
        ...data,
        createTimeUtc: Date.now(),
      })
      .returning({ id: apiTokenTable.id });
    return res[0].id;
  }

  /**
   * 更新令牌
   * @param id 令牌 ID
   * @param data 更新数据
   * @returns 更新的记录 ID
   */
  async onUpdate(
    id: number,
    data: Partial<
      Omit<
        InferInsertModel<typeof apiTokenTable>,
        "id" | "createTimeUtc" | "updateTimeUtc" | "tokenHash" | "tokenPrefix"
      >
    >
  ): Promise<number> {
    const res = await db
      .update(apiTokenTable)
      .set({
        ...data,
        updateTimeUtc: Date.now(),
      })
      .where(eq(apiTokenTable.id, id))
      .returning({ id: apiTokenTable.id });
    return res[0].id;
  }

  /**
   * 删除令牌
   * @param id 令牌 ID
   * @returns 删除的记录 ID
   */
  async onDelete(id: number): Promise<number> {
    const res = await db
      .delete(apiTokenTable)
      .where(eq(apiTokenTable.id, id))
      .returning({ id: apiTokenTable.id });
    return res[0].id;
  }

  /**
   * 更新令牌最后使用时间（异步，鉴权成功后调用）
   * @param id 令牌 ID
   */
  async updateLastUsedTime(id: number): Promise<void> {
    await db
      .update(apiTokenTable)
      .set({ lastUsedTimeUtc: Date.now() })
      .where(eq(apiTokenTable.id, id));
  }
}

export const apiTokenRepository = new ApiTokenRepository();
