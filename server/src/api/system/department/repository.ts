import db from "@/db/index";
import { departmentTable, type DepartmentPOLike } from "./model";
import {
  asc,
  count,
  desc,
  eq,
  or,
  like,
  and,
  type InferInsertModel,
} from "drizzle-orm";
import hasValue from "@/utils/hasValue";

export const buildWhereCondition = (condition?: {
  keyword?: string;
  isEnabled?: boolean;
}) => {
  const { keyword, isEnabled } = condition || {};
  const conditions = [];
  if (hasValue(keyword)) {
    conditions.push(or(like(departmentTable.name, `%${keyword}%`)));
  }
  if (isEnabled !== undefined) {
    conditions.push(eq(departmentTable.isEnabled, isEnabled));
  }
  return conditions.length > 0
    ? conditions.length === 1
      ? conditions[0]
      : and(...conditions)
    : undefined;
};

export class DepartmentRepository {
  async findPage(params: {
    keyword?: string;
    isEnabled?: boolean;
    orderBy?: keyof DepartmentPOLike;
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
    const orderField = departmentTable[orderBy] || departmentTable.id;

    const countResult = await db
      .select({ total: count(departmentTable.id).as("total") })
      .from(departmentTable)
      .where(buildWhereCondition({ keyword, isEnabled }));
    const total = countResult[0]?.total || 0;

    if (total === 0) {
      return { total, list: [] };
    }

    const rows = await db
      .select()
      .from(departmentTable)
      .where(buildWhereCondition({ keyword, isEnabled }))
      .orderBy(!descend ? asc(orderField) : desc(orderField))
      .limit(pageSize)
      .offset(offset);

    return { total, list: rows };
  }

  async findAll(params: {
    keyword?: string;
    isEnabled?: boolean;
    orderBy?: keyof DepartmentPOLike;
    descend?: boolean;
  }) {
    const { keyword, isEnabled, orderBy = "id", descend = true } = params;
    const orderField = departmentTable[orderBy] || departmentTable.id;
    const maxLimit = 10000;

    const rows = await db
      .select({
        id: departmentTable.id,
        name: departmentTable.name,
        parentId: departmentTable.parentId,
        remark: departmentTable.remark,
        isEnabled: departmentTable.isEnabled,
      })
      .from(departmentTable)
      .where(buildWhereCondition({ keyword, isEnabled }))
      .orderBy(!descend ? asc(orderField) : desc(orderField))
      .limit(maxLimit);

    return rows;
  }

  async findById(id: number): Promise<DepartmentPOLike | null> {
    const rows = await db
      .select()
      .from(departmentTable)
      .where(eq(departmentTable.id, id))
      .limit(1);
    return rows[0] || null;
  }

  async getDepartmentNameById(id: number): Promise<string | null> {
    const rows = await db
      .select({ name: departmentTable.name })
      .from(departmentTable)
      .where(eq(departmentTable.id, id))
      .limit(1);
    return rows[0]?.name || null;
  }

  async getAllDepartments(
    isEnabled?: boolean
  ): Promise<{ name: string; id: number; parentId: number }[]> {
    const rows = await db
      .select({
        name: departmentTable.name,
        id: departmentTable.id,
        parentId: departmentTable.parentId,
      })
      .from(departmentTable)
      .where(
        isEnabled !== undefined
          ? eq(departmentTable.isEnabled, isEnabled)
          : undefined
      );
    // Map null parentId to 0 to keep the structure expected by the service
    return rows.map((r) => ({
      name: r.name,
      id: r.id,
      parentId: r.parentId || 0,
    }));
  }

  async getTreeData(): Promise<DepartmentPOLike[]> {
    const rows = await db
      .select()
      .from(departmentTable)
      .orderBy(asc(departmentTable.id));
    return rows;
  }

  async onInsert(
    data: Omit<
      InferInsertModel<typeof departmentTable>,
      "id" | "createTimeUtc" | "updateTimeUtc"
    >
  ): Promise<number> {
    const res = await db
      .insert(departmentTable)
      .values({
        ...data,
        createTimeUtc: Date.now(),
      })
      .returning({ id: departmentTable.id });
    return res[0].id;
  }

  async onUpdate(
    id: number,
    data: Partial<
      Omit<
        InferInsertModel<typeof departmentTable>,
        "id" | "createTimeUtc" | "updateTimeUtc"
      >
    >
  ): Promise<number> {
    const res = await db
      .update(departmentTable)
      .set({
        ...data,
        updateTimeUtc: Date.now(),
      })
      .where(eq(departmentTable.id, id))
      .returning({ id: departmentTable.id });
    return res[0].id;
  }

  async onDelete(id: number): Promise<number> {
    const res = await db
      .delete(departmentTable)
      .where(eq(departmentTable.id, id))
      .returning({ id: departmentTable.id });
    return res[0].id;
  }
}

export const departmentRepository = new DepartmentRepository();
