import db from "@hodor/core/db/index";
import { schemaFormTable, type SchemaFormPOLike } from "./model";
import {
  asc,
  count,
  desc,
  eq,
  or,
  and,
  like,
  inArray,
  type InferInsertModel,
} from "drizzle-orm";
import hasValue from "@hodor/core/utils/hasValue";

export const buildWhereCondition = (condition?: {
  id?: number;
  keyword?: string;
  isEnabled?: boolean;
}) => {
  const { id, keyword, isEnabled } = condition || {};
  const conditions = [];

  if (hasValue(id)) {
    conditions.push(eq(schemaFormTable.id, id!));
  }
  if (hasValue(keyword)) {
    conditions.push(
      or(
        like(schemaFormTable.name, `%${keyword}%`),
        like(schemaFormTable.code, `%${keyword}%`)
      )
    );
  }
  if (isEnabled !== undefined) {
    conditions.push(eq(schemaFormTable.isEnabled, isEnabled));
  }

  return conditions.length > 0
    ? conditions.length === 1
      ? conditions[0]
      : and(...conditions)
    : undefined;
};

export class SchemaFormRepository {
  async findPage(params: {
    keyword?: string;
    isEnabled?: boolean;
    orderBy?: keyof SchemaFormPOLike;
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
    const orderField = schemaFormTable[orderBy] || schemaFormTable.id;

    const countResult = await db
      .select({ total: count(schemaFormTable.id).as("total") })
      .from(schemaFormTable)
      .where(buildWhereCondition({ keyword, isEnabled }));
    const total = countResult[0]?.total || 0;

    if (total === 0) {
      return { total, list: [] };
    }

    const rows = await db
      .select()
      .from(schemaFormTable)
      .where(buildWhereCondition({ keyword, isEnabled }))
      .orderBy(!descend ? asc(orderField) : desc(orderField))
      .limit(pageSize)
      .offset(offset);

    return { total, list: rows };
  }

  async findById(id: number): Promise<SchemaFormPOLike | null> {
    const rows = await db
      .select()
      .from(schemaFormTable)
      .where(eq(schemaFormTable.id, id))
      .limit(1);
    return rows[0] || null;
  }

  async findByCode(code: string): Promise<SchemaFormPOLike | null> {
    const rows = await db
      .select()
      .from(schemaFormTable)
      .where(eq(schemaFormTable.code, code))
      .limit(1);
    return rows[0] || null;
  }

  /**
   * 按 code 列表批量查询 schema
   */
  async findByCodes(
    codes: string[]
  ): Promise<Pick<SchemaFormPOLike, "code" | "schemaData">[]> {
    if (codes.length === 0) return [];
    return db
      .select({
        code: schemaFormTable.code,
        schemaData: schemaFormTable.schemaData,
      })
      .from(schemaFormTable)
      .where(inArray(schemaFormTable.code, codes));
  }

  /**
   * 插入或更新系统来源的 schema（按 code upsert）
   */
  async upsertSystemSchema(data: {
    code: string;
    name: string;
    schemaData: string;
  }): Promise<void> {
    const existing = await this.findByCode(data.code);
    if (existing) {
      // 仅当 schemaData 变化时才更新
      if (existing.schemaData !== data.schemaData) {
        await db
          .update(schemaFormTable)
          .set({
            name: data.name,
            schemaData: data.schemaData,
            source: "system",
            updateTimeUtc: Date.now(),
          })
          .where(eq(schemaFormTable.id, existing.id));
      }
    } else {
      await db.insert(schemaFormTable).values({
        code: data.code,
        name: data.name,
        schemaData: data.schemaData,
        source: "system",
        isEnabled: true,
        creatorId: 0, // 系统自动生成
        creatorName: "System",
        createTimeUtc: Date.now(),
      });
    }
  }

  /**
   * 删除不再存在于 registry 的系统 schema 记录
   */
  async deleteStaleSystemSchemas(activeCodes: string[]): Promise<void> {
    if (activeCodes.length === 0) {
      // 删除所有系统来源的
      await db
        .delete(schemaFormTable)
        .where(eq(schemaFormTable.source, "system"));
    } else {
      // 删除 source='system' 且 code 不在 activeCodes 中的记录
      await db.delete(schemaFormTable).where(
        and(
          eq(schemaFormTable.source, "system")
          // SQLite 不支持 NOT IN + subquery，用 inArray 反转
          // 这里获取需要删除的记录
        )
      );
      // 简化实现：查出所有 system 记录，过滤后删除
      const allSystem = await db
        .select({ id: schemaFormTable.id, code: schemaFormTable.code })
        .from(schemaFormTable)
        .where(eq(schemaFormTable.source, "system"));
      const staleIds = allSystem
        .filter((r) => !activeCodes.includes(r.code))
        .map((r) => r.id);
      if (staleIds.length > 0) {
        await db
          .delete(schemaFormTable)
          .where(inArray(schemaFormTable.id, staleIds));
      }
    }
  }

  async onInsert(
    data: Omit<
      InferInsertModel<typeof schemaFormTable>,
      "id" | "createTimeUtc" | "updateTimeUtc"
    >
  ): Promise<number> {
    const res = await db
      .insert(schemaFormTable)
      .values({
        ...data,
        createTimeUtc: Date.now(),
      })
      .returning({ id: schemaFormTable.id });
    return res[0].id;
  }

  async onUpdate(
    id: number,
    data: Partial<
      Omit<
        InferInsertModel<typeof schemaFormTable>,
        "id" | "createTimeUtc" | "updateTimeUtc"
      >
    >
  ): Promise<number> {
    const res = await db
      .update(schemaFormTable)
      .set({
        ...data,
        updateTimeUtc: Date.now(),
      })
      .where(eq(schemaFormTable.id, id))
      .returning({ id: schemaFormTable.id });
    return res[0].id;
  }

  async onDelete(id: number): Promise<number> {
    const res = await db
      .delete(schemaFormTable)
      .where(eq(schemaFormTable.id, id))
      .returning({ id: schemaFormTable.id });
    return res[0].id;
  }
}

export const schemaFormRepository = new SchemaFormRepository();
