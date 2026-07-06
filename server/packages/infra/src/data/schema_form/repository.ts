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
