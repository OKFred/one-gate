import db from "@hodor/core/db/index";
import { schemaFormDataTable, type SchemaFormDataPOLike } from "./model";
import { schemaFormTable } from "../schema_form/model";
import {
  asc,
  count,
  desc,
  eq,
  and,
  or,
  type SQL,
  type InferInsertModel,
} from "drizzle-orm";
import hasValue from "@hodor/core/utils/hasValue";

export const buildWhereCondition = (condition?: {
  id?: number;
  formCode?: string;
  businessId?: number;
}) => {
  const { id, formCode, businessId } = condition || {};
  const conditions: SQL<unknown>[] = [];

  if (hasValue(id)) {
    conditions.push(eq(schemaFormDataTable.id, id as number));
  }
  if (hasValue(formCode)) {
    conditions.push(eq(schemaFormDataTable.formCode, formCode as string));
  }
  if (hasValue(businessId)) {
    conditions.push(eq(schemaFormDataTable.businessId, businessId as number));
  }

  return conditions.length > 0
    ? conditions.length === 1
      ? conditions[0]
      : and(...conditions)
    : undefined;
};

export class SchemaFormDataRepository {
  async findPage(params: {
    formCode?: string;
    businessId?: number;
    orderBy?: keyof SchemaFormDataPOLike;
    descend?: boolean;
    pageNo: number;
    pageSize: number;
  }) {
    const {
      formCode,
      businessId,
      orderBy = "id",
      descend = true,
      pageNo,
      pageSize,
    } = params;
    const offset = (pageNo - 1) * pageSize;
    const orderField = schemaFormDataTable[orderBy] || schemaFormDataTable.id;

    const countResult = await db
      .select({ total: count(schemaFormDataTable.id).as("total") })
      .from(schemaFormDataTable)
      .where(buildWhereCondition({ formCode, businessId }));
    const total = countResult[0]?.total || 0;

    if (total === 0) {
      return { total, list: [] };
    }

    const rows = await db
      .select()
      .from(schemaFormDataTable)
      .where(buildWhereCondition({ formCode, businessId }))
      .orderBy(!descend ? asc(orderField) : desc(orderField))
      .limit(pageSize)
      .offset(offset);

    return { total, list: rows };
  }

  async findById(id: number): Promise<SchemaFormDataPOLike | null> {
    const rows = await db
      .select()
      .from(schemaFormDataTable)
      .where(eq(schemaFormDataTable.id, id))
      .limit(1);
    return rows[0] || null;
  }

  async findByFormCodeAndBusinessId(
    formCode: string,
    businessId: number
  ): Promise<SchemaFormDataPOLike | null> {
    const rows = await db
      .select()
      .from(schemaFormDataTable)
      .where(
        and(
          eq(schemaFormDataTable.formCode, formCode),
          eq(schemaFormDataTable.businessId, businessId)
        )
      )
      .limit(1);
    return rows[0] || null;
  }

  async findFormConfig(
    formCode: string
  ): Promise<{ schemaData: string } | null> {
    const formConfigs = await db
      .select({ schemaData: schemaFormTable.schemaData })
      .from(schemaFormTable)
      .where(
        and(
          eq(schemaFormTable.code, formCode),
          eq(schemaFormTable.isEnabled, true)
        )
      )
      .limit(1);
    return formConfigs[0] || null;
  }

  async onInsert(
    data: Omit<
      InferInsertModel<typeof schemaFormDataTable>,
      "id" | "createTimeUtc" | "updateTimeUtc"
    >
  ): Promise<number> {
    const res = await db
      .insert(schemaFormDataTable)
      .values({
        ...data,
        createTimeUtc: Date.now(),
      })
      .returning({ id: schemaFormDataTable.id });
    return res[0].id;
  }

  async onUpdate(
    id: number,
    data: Partial<
      Omit<
        InferInsertModel<typeof schemaFormDataTable>,
        "id" | "createTimeUtc" | "updateTimeUtc"
      >
    >
  ): Promise<number> {
    const res = await db
      .update(schemaFormDataTable)
      .set({
        ...data,
        updateTimeUtc: Date.now(),
      })
      .where(eq(schemaFormDataTable.id, id))
      .returning({ id: schemaFormDataTable.id });
    return res[0].id;
  }

  async onDelete(id: number): Promise<number> {
    const res = await db
      .delete(schemaFormDataTable)
      .where(eq(schemaFormDataTable.id, id))
      .returning({ id: schemaFormDataTable.id });
    return res[0].id;
  }
}

export const schemaFormDataRepository = new SchemaFormDataRepository();
