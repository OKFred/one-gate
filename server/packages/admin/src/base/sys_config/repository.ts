import {
  eq,
  and,
  desc,
  inArray,
  like,
  or,
  ne,
  not,
  type SQL,
} from "drizzle-orm";
import type { UserObj } from "@hodor/core/types/app";
import db from "@hodor/core/db/index";
import type { SQLiteSelect } from "drizzle-orm/sqlite-core";
import type { InferInsertModel } from "drizzle-orm";

import {
  baseSysConfigTable,
  type BaseSysConfigInsertPOLike,
  type BaseSysConfigPOLike,
} from "./model";

// 杈呭姪宸ュ叿锛氭牴鎹?key 浠庣粨鏋滀腑鎵惧埌瀵瑰簲鐨?config
export function pickConfig(
  configs: BaseSysConfigPOLike[],
  key: string
): BaseSysConfigPOLike | undefined {
  return configs.find((c) => c.configKey === key);
}

export async function findByNamespace(
  namespace: string
): Promise<BaseSysConfigPOLike[]> {
  const conditions = [eq(baseSysConfigTable.namespace, namespace)];
  return db
    .select()
    .from(baseSysConfigTable)
    .where(and(...conditions));
}

export async function findByNamespaceAndKey(
  namespace: string,
  key: string
): Promise<BaseSysConfigPOLike | undefined> {
  const conditions = [
    eq(baseSysConfigTable.namespace, namespace),
    eq(baseSysConfigTable.configKey, key),
  ];
  const result = await db
    .select()
    .from(baseSysConfigTable)
    .where(and(...conditions))
    .limit(1);
  return result[0];
}

export async function findPrimaryByNamespace(
  namespace: string
): Promise<BaseSysConfigPOLike | undefined> {
  const conditions = [
    eq(baseSysConfigTable.namespace, namespace),
    eq(baseSysConfigTable.isPrimary, true),
  ];
  const result = await db
    .select()
    .from(baseSysConfigTable)
    .where(and(...conditions))
    .limit(1);
  return result[0];
}

export async function findNamespaces(): Promise<{ namespace: string }[]> {
  return db
    .selectDistinct({ namespace: baseSysConfigTable.namespace })
    .from(baseSysConfigTable)
    .orderBy(baseSysConfigTable.namespace);
}

export async function findPage(params: {
  pageNo: number;
  pageSize: number;
  namespace?: string;
  keyword?: string;
  isEnabled?: boolean;
  orderBy?: keyof BaseSysConfigPOLike;
  descend?: boolean;
}): Promise<{
  total: number;
  pageNo: number;
  pageSize: number;
  list: BaseSysConfigPOLike[];
}> {
  const { pageNo, pageSize, namespace, keyword, isEnabled, orderBy, descend } =
    params;

  const conditions: SQL<unknown>[] = [];

  if (namespace) conditions.push(eq(baseSysConfigTable.namespace, namespace));
  if (isEnabled !== undefined)
    conditions.push(eq(baseSysConfigTable.isEnabled, isEnabled));

  if (keyword) {
    conditions.push(
      or(
        like(baseSysConfigTable.namespace, `%${keyword}%`),
        like(baseSysConfigTable.configKey, `%${keyword}%`)
      )!
    );
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const orderByClause = orderBy
    ? descend
      ? desc(baseSysConfigTable[orderBy])
      : baseSysConfigTable[orderBy]
    : desc(baseSysConfigTable.id);

  const listQuery = db
    .select()
    .from(baseSysConfigTable)
    .where(whereClause)
    .orderBy(orderByClause)
    .limit(pageSize)
    .offset((pageNo - 1) * pageSize);

  const [list, countResult] = await Promise.all([
    listQuery,
    db.$count(baseSysConfigTable, whereClause),
  ]);

  return {
    total: countResult,
    pageNo,
    pageSize,
    list,
  };
}

export async function findById(
  id: number
): Promise<BaseSysConfigPOLike | undefined> {
  const result = await db
    .select()
    .from(baseSysConfigTable)
    .where(eq(baseSysConfigTable.id, id))
    .limit(1);
  return result[0];
}

export async function findIdByCondition(
  namespace: string,
  configKey: string,
  excludeId?: number
) {
  const records = await db
    .select({ id: baseSysConfigTable.id })
    .from(baseSysConfigTable)
    .where(
      and(
        eq(baseSysConfigTable.namespace, namespace),
        eq(baseSysConfigTable.configKey, configKey),
        excludeId !== undefined
          ? ne(baseSysConfigTable.id, excludeId)
          : undefined
      )
    )
    .limit(1);
  return records[0]?.id || null;
}

export async function onInsert(
  data: InferInsertModel<typeof baseSysConfigTable>
) {
  const result = await db
    .insert(baseSysConfigTable)
    .values(data)
    .returning({ id: baseSysConfigTable.id });
  return result[0]?.id || null;
}

export async function onUpdate(
  id: number,
  data: Partial<Omit<InferInsertModel<typeof baseSysConfigTable>, "id">>
) {
  const result = await db
    .update(baseSysConfigTable)
    .set(data)
    .where(eq(baseSysConfigTable.id, id))
    .returning({ id: baseSysConfigTable.id });
  return result[0] || null;
}

export async function onDelete(id: number) {
  const result = await db
    .delete(baseSysConfigTable)
    .where(eq(baseSysConfigTable.id, id))
    .returning({ id: baseSysConfigTable.id });
  return result[0] || null;
}

export async function resetPrimaryFlags(namespace: string, excludeId?: number) {
  const updateQuery = db.update(baseSysConfigTable).set({ isPrimary: false });
  const conditions: SQL<unknown>[] = [
    eq(baseSysConfigTable.namespace, namespace),
  ];
  if (excludeId !== undefined) {
    conditions.push(not(eq(baseSysConfigTable.id, excludeId)));
  }
  await updateQuery.where(and(...conditions));
}

export async function insert(
  data: Omit<BaseSysConfigInsertPOLike, "creatorId" | "createTimeUtc">,
  userObj: UserObj
): Promise<number> {
  const insertData = {
    ...data,
    creatorId: userObj.id,
    createTimeUtc: Date.now(),
  };

  const result = await db
    .insert(baseSysConfigTable)
    .values(insertData)
    .returning();
  return result[0].id;
}

export async function updateById(
  id: number,
  data: Partial<Omit<BaseSysConfigInsertPOLike, "creatorId" | "createTimeUtc">>,
  userObj: UserObj
): Promise<number> {
  const updateData = {
    ...data,
    updaterId: userObj.id,
    updateTimeUtc: Date.now(),
  };

  await db
    .update(baseSysConfigTable)
    .set(updateData)
    .where(eq(baseSysConfigTable.id, id));

  return id;
}

export async function deleteByIds(ids: number[]): Promise<number> {
  const result = await db
    .delete(baseSysConfigTable)
    .where(inArray(baseSysConfigTable.id, ids));
  return result.rowsAffected;
}
