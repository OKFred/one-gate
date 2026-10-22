import {
  getPostgresDb,
  withPostgresTransaction,
} from "@hodor/core/db/postgresql/runtime";

import { permissionTable } from "./schema.pg";
import { type PermissionPOLike } from "./model";
import {
  asc,
  count,
  desc,
  eq,
  or,
  like,
  and,
  inArray,
  type SQL,
  type InferInsertModel,
} from "drizzle-orm";
import hasValue from "@hodor/core/utils/hasValue";

export const buildWhereCondition = (condition?: {
  keyword?: string;
  isEnabled?: boolean;
  code?: string;
  name?: string;
  category?: string;
}) => {
  const { keyword, isEnabled, code, name, category } = condition || {};
  const conditions: SQL<unknown>[] = [];
  if (hasValue(keyword)) {
    conditions.push(
      or(
        like(permissionTable.code, `%${keyword}%`),
        like(permissionTable.name, `%${keyword}%`)
      ) as SQL<unknown>
    );
  }
  if (hasValue(code)) {
    conditions.push(eq(permissionTable.code, code as string));
  }
  if (hasValue(name)) {
    conditions.push(eq(permissionTable.name, name as string));
  }
  if (isEnabled !== undefined) {
    conditions.push(eq(permissionTable.isEnabled, isEnabled));
  }
  if (category !== undefined) {
    conditions.push(eq(permissionTable.category, category as string));
  }
  return conditions.length > 0
    ? conditions.length === 1
      ? conditions[0]
      : and(...conditions)
    : undefined;
};

export class PermissionRepository {
  async findPage(params: {
    keyword?: string;
    isEnabled?: boolean;
    code?: string;
    name?: string;
    category?: string;
    orderBy?: keyof PermissionPOLike;
    descend?: boolean;
    pageNo: number;
    pageSize: number;
  }) {
    return withPostgresTransaction(
      async () => {
        const db = getPostgresDb();
        const {
          keyword,
          isEnabled,
          code,
          name,
          category,
          orderBy = "id",
          descend = true,
          pageNo,
          pageSize,
        } = params;
        const offset = (pageNo - 1) * pageSize;
        const orderField = permissionTable[orderBy] || permissionTable.id;

        const countResult = await db
          .select({ total: count(permissionTable.id).as("total") })
          .from(permissionTable)
          .where(
            buildWhereCondition({ keyword, isEnabled, code, name, category })
          );
        const total = countResult[0]?.total || 0;

        if (total === 0) {
          return { total, list: [] };
        }

        const rows = await db
          .select()
          .from(permissionTable)
          .where(
            buildWhereCondition({ keyword, isEnabled, code, name, category })
          )
          .orderBy(!descend ? asc(orderField) : desc(orderField))
          .limit(pageSize)
          .offset(offset);

        return { total, list: rows };
      },
      { write: false }
    );
  }

  async findAll(params: {
    keyword?: string;
    isEnabled?: boolean;
    code?: string;
    name?: string;
    category?: string;
    orderBy?: keyof PermissionPOLike;
    descend?: boolean;
  }) {
    return withPostgresTransaction(
      async () => {
        const db = getPostgresDb();
        const {
          keyword,
          isEnabled,
          code,
          name,
          category,
          orderBy = "id",
          descend = true,
        } = params;
        const orderField = permissionTable[orderBy] || permissionTable.id;
        const maxLimit = 10000;

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
          })
          .from(permissionTable)
          .where(
            buildWhereCondition({ keyword, isEnabled, code, name, category })
          )
          .orderBy(!descend ? asc(orderField) : desc(orderField))
          .limit(maxLimit);

        return rows;
      },
      { write: false }
    );
  }

  async findById(id: number): Promise<PermissionPOLike | null> {
    return withPostgresTransaction(
      async () => {
        const db = getPostgresDb();
        const rows = await db
          .select()
          .from(permissionTable)
          .where(eq(permissionTable.id, id))
          .limit(1);
        return rows[0] || null;
      },
      { write: false }
    );
  }

  async getAllPermissions(): Promise<PermissionPOLike[]> {
    return withPostgresTransaction(
      async () => {
        const db = getPostgresDb();
        const rows = await db.select().from(permissionTable);
        return rows;
      },
      { write: false }
    );
  }

  async onInsert(
    data: Omit<
      InferInsertModel<typeof permissionTable>,
      "id" | "createTimeUtc" | "updateTimeUtc"
    >
  ): Promise<number> {
    return withPostgresTransaction(
      async () => {
        const db = getPostgresDb();
        const res = await db
          .insert(permissionTable)
          .values({
            ...data,
            createTimeUtc: Date.now(),
          })
          .returning({ id: permissionTable.id });
        return res[0].id;
      },
      { write: true }
    );
  }

  async onUpdate(
    id: number,
    data: Partial<
      Omit<
        InferInsertModel<typeof permissionTable>,
        "id" | "createTimeUtc" | "updateTimeUtc"
      >
    >
  ): Promise<number> {
    return withPostgresTransaction(
      async () => {
        const db = getPostgresDb();
        const res = await db
          .update(permissionTable)
          .set({
            ...data,
            updateTimeUtc: Date.now(),
          })
          .where(eq(permissionTable.id, id))
          .returning({ id: permissionTable.id });
        return res[0].id;
      },
      { write: true }
    );
  }

  async onDelete(id: number): Promise<number> {
    return withPostgresTransaction(
      async () => {
        const db = getPostgresDb();
        const res = await db
          .delete(permissionTable)
          .where(eq(permissionTable.id, id))
          .returning({ id: permissionTable.id });
        return res[0].id;
      },
      { write: true }
    );
  }
}

export const permissionRepository = new PermissionRepository();
