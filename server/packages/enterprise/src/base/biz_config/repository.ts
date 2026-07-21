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
  baseBizConfigTable,
  type BaseBizConfigInsertPOLike,
  type BaseBizConfigPOLike,
} from "./model";

// 杈呭姪宸ュ叿锛氭牴鎹?key 浠庣粨鏋滀腑鎵惧埌瀵瑰簲鐨?config
export function pickConfig(
  configs: BaseBizConfigPOLike[],
  key: string
): BaseBizConfigPOLike | undefined {
  return configs.find((c) => c.configKey === key);
}

export async function findByNamespace(
  tenantId: string,
  namespace: string
): Promise<BaseBizConfigPOLike[]> {
  const conditions: SQL<unknown>[] = [
    eq(baseBizConfigTable.tenantId, tenantId),
    eq(baseBizConfigTable.namespace, namespace),
  ];
  return db
    .select()
    .from(baseBizConfigTable)
    .where(and(...conditions));
}

export async function findByNamespaceAndKey(
  tenantId: string,
  namespace: string,
  key: string
): Promise<BaseBizConfigPOLike | undefined> {
  const conditions: SQL<unknown>[] = [
    eq(baseBizConfigTable.tenantId, tenantId),
    eq(baseBizConfigTable.tenantId, tenantId),
    eq(baseBizConfigTable.namespace, namespace),
    eq(baseBizConfigTable.configKey, key),
  ];
  const result = await db
    .select()
    .from(baseBizConfigTable)
    .where(and(...conditions))
    .limit(1);
  return result[0];
}

export async function findPrimaryByNamespace(
  tenantId: string,
  namespace: string
): Promise<BaseBizConfigPOLike | undefined> {
  const conditions: SQL<unknown>[] = [
    eq(baseBizConfigTable.tenantId, tenantId),
    eq(baseBizConfigTable.tenantId, tenantId),
    eq(baseBizConfigTable.namespace, namespace),
    eq(baseBizConfigTable.isPrimary, true),
  ];
  const result = await db
    .select()
    .from(baseBizConfigTable)
    .where(and(...conditions))
    .limit(1);
  return result[0];
}

export async function findNamespaces(
  tenantId: string
): Promise<{ namespace: string }[]> {
  return db
    .selectDistinct({ namespace: baseBizConfigTable.namespace })
    .from(baseBizConfigTable)
    .where(eq(baseBizConfigTable.tenantId, tenantId))
    .orderBy(baseBizConfigTable.namespace);
}

export async function findPage(params: {
  tenantId: string;
  pageNo: number;
  pageSize: number;
  namespace?: string;
  keyword?: string;
  isEnabled?: boolean;
  orderBy?: keyof BaseBizConfigPOLike;
  descend?: boolean;
}): Promise<{
  total: number;
  pageNo: number;
  pageSize: number;
  list: BaseBizConfigPOLike[];
}> {
  const {
    pageNo,
    pageSize,
    namespace,
    keyword,
    isEnabled,
    orderBy,
    descend,
    tenantId,
  } = params;

  const conditions: SQL<unknown>[] = [
    eq(baseBizConfigTable.tenantId, tenantId),
  ];

  if (namespace) conditions.push(eq(baseBizConfigTable.namespace, namespace));
  if (isEnabled !== undefined)
    conditions.push(eq(baseBizConfigTable.isEnabled, isEnabled));

  if (keyword) {
    conditions.push(
      or(
        like(baseBizConfigTable.namespace, `%${keyword}%`),
        like(baseBizConfigTable.configKey, `%${keyword}%`)
      )!
    );
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const orderByClause = orderBy
    ? descend
      ? desc(baseBizConfigTable[orderBy])
      : baseBizConfigTable[orderBy]
    : desc(baseBizConfigTable.id);

  const listQuery = db
    .select()
    .from(baseBizConfigTable)
    .where(whereClause)
    .orderBy(orderByClause)
    .limit(pageSize)
    .offset((pageNo - 1) * pageSize);

  const [list, countResult] = await Promise.all([
    listQuery,
    db.$count(baseBizConfigTable, whereClause),
  ]);

  return {
    total: countResult,
    pageNo,
    pageSize,
    list,
  };
}

export async function findById(
  tenantId: string,
  id: number
): Promise<BaseBizConfigPOLike | undefined> {
  const result = await db
    .select()
    .from(baseBizConfigTable)
    .where(
      and(
        eq(baseBizConfigTable.id, id),
        eq(baseBizConfigTable.tenantId, tenantId)
      )
    )
    .limit(1);
  return result[0];
}

export async function findIdByCondition(
  tenantId: string,
  namespace: string,
  configKey: string,
  excludeId?: number
) {
  const records = await db
    .select({ id: baseBizConfigTable.id })
    .from(baseBizConfigTable)
    .where(
      and(
        eq(baseBizConfigTable.tenantId, tenantId),
        eq(baseBizConfigTable.namespace, namespace),
        eq(baseBizConfigTable.configKey, configKey),
        excludeId !== undefined
          ? ne(baseBizConfigTable.id, excludeId)
          : undefined
      )
    )
    .limit(1);
  return records[0]?.id || null;
}

export async function onInsert(
  data: InferInsertModel<typeof baseBizConfigTable>
) {
  const result = await db
    .insert(baseBizConfigTable)
    .values(data)
    .returning({ id: baseBizConfigTable.id });
  return result[0]?.id || null;
}

export async function onUpdate(
  tenantId: string,
  id: number,
  data: Partial<Omit<InferInsertModel<typeof baseBizConfigTable>, "id">>
) {
  const result = await db
    .update(baseBizConfigTable)
    .set(data)
    .where(
      and(
        eq(baseBizConfigTable.id, id),
        eq(baseBizConfigTable.tenantId, tenantId)
      )
    )
    .returning({ id: baseBizConfigTable.id });
  return result[0] || null;
}

export async function onDelete(tenantId: string, id: number) {
  const result = await db
    .delete(baseBizConfigTable)
    .where(
      and(
        eq(baseBizConfigTable.id, id),
        eq(baseBizConfigTable.tenantId, tenantId)
      )
    )
    .returning({ id: baseBizConfigTable.id });
  return result[0] || null;
}

export async function resetPrimaryFlags(
  tenantId: string,
  namespace: string,
  excludeId?: number
) {
  const updateQuery = db.update(baseBizConfigTable).set({ isPrimary: false });
  const conditions: SQL<unknown>[] = [
    eq(baseBizConfigTable.tenantId, tenantId),
    eq(baseBizConfigTable.namespace, namespace),
  ];
  if (excludeId !== undefined) {
    conditions.push(not(eq(baseBizConfigTable.id, excludeId)));
  }
  await updateQuery.where(and(...conditions));
}

export async function insert(
  tenantId: string,
  data: Omit<BaseBizConfigInsertPOLike, "creatorId" | "createTimeUtc">,
  userObj: UserObj
): Promise<number> {
  const insertData = {
    tenantId,
    ...data,
    creatorId: userObj.id,
    createTimeUtc: Date.now(),
  };

  const result = await db
    .insert(baseBizConfigTable)
    .values(insertData)
    .returning();
  return result[0].id;
}

export async function updateById(
  tenantId: string,
  id: number,
  data: Partial<Omit<BaseBizConfigInsertPOLike, "creatorId" | "createTimeUtc">>,
  userObj: UserObj
): Promise<number> {
  const updateData = {
    ...data,
    updaterId: userObj.id,
    updateTimeUtc: Date.now(),
  };

  await db
    .update(baseBizConfigTable)
    .set(updateData)
    .where(
      and(
        eq(baseBizConfigTable.id, id),
        eq(baseBizConfigTable.tenantId, tenantId)
      )
    );

  return id;
}

export async function deleteByIds(
  tenantId: string,
  ids: number[]
): Promise<number> {
  const result = await db
    .delete(baseBizConfigTable)
    .where(
      and(
        inArray(baseBizConfigTable.id, ids),
        eq(baseBizConfigTable.tenantId, tenantId)
      )
    );
  return result.rowsAffected;
}
