import {
  getPostgresDb,
  withPostgresTransaction,
} from "@hodor/core/db/postgresql/runtime";
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

import type { PgSelect } from "drizzle-orm/pg-core";
import type { InferInsertModel } from "drizzle-orm";

import { baseSysConfigTable } from "./schema.pg";
import {
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
  return withPostgresTransaction(
    async () => {
      const db = getPostgresDb();
      const conditions = [eq(baseSysConfigTable.namespace, namespace)];
      return db
        .select()
        .from(baseSysConfigTable)
        .where(and(...conditions));
    },
    { write: false }
  );
}

export async function findByNamespaceAndKey(
  namespace: string,
  key: string
): Promise<BaseSysConfigPOLike | undefined> {
  return withPostgresTransaction(
    async () => {
      const db = getPostgresDb();
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
    },
    { write: false }
  );
}

export async function findPrimaryByNamespace(
  namespace: string
): Promise<BaseSysConfigPOLike | undefined> {
  return withPostgresTransaction(
    async () => {
      const db = getPostgresDb();
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
    },
    { write: false }
  );
}

export async function findNamespaces(): Promise<{ namespace: string }[]> {
  return withPostgresTransaction(
    async () => {
      const db = getPostgresDb();
      return db
        .selectDistinct({ namespace: baseSysConfigTable.namespace })
        .from(baseSysConfigTable)
        .orderBy(baseSysConfigTable.namespace);
    },
    { write: false }
  );
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
  return withPostgresTransaction(
    async () => {
      const db = getPostgresDb();
      const {
        pageNo,
        pageSize,
        namespace,
        keyword,
        isEnabled,
        orderBy,
        descend,
      } = params;

      const conditions: SQL<unknown>[] = [];

      if (namespace)
        conditions.push(eq(baseSysConfigTable.namespace, namespace));
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

      const whereClause =
        conditions.length > 0 ? and(...conditions) : undefined;

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
    },
    { write: false }
  );
}

export async function findById(
  id: number
): Promise<BaseSysConfigPOLike | undefined> {
  return withPostgresTransaction(
    async () => {
      const db = getPostgresDb();
      const result = await db
        .select()
        .from(baseSysConfigTable)
        .where(eq(baseSysConfigTable.id, id))
        .limit(1);
      return result[0];
    },
    { write: false }
  );
}

export async function findIdByCondition(
  namespace: string,
  configKey: string,
  excludeId?: number
) {
  return withPostgresTransaction(
    async () => {
      const db = getPostgresDb();
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
    },
    { write: false }
  );
}

export async function onInsert(
  data: InferInsertModel<typeof baseSysConfigTable>
) {
  return withPostgresTransaction(
    async () => {
      const db = getPostgresDb();
      const result = await db
        .insert(baseSysConfigTable)
        .values(data)
        .returning({ id: baseSysConfigTable.id });
      return result[0]?.id || null;
    },
    { write: true }
  );
}

export async function onUpdate(
  id: number,
  data: Partial<Omit<InferInsertModel<typeof baseSysConfigTable>, "id">>
) {
  return withPostgresTransaction(
    async () => {
      const db = getPostgresDb();
      const result = await db
        .update(baseSysConfigTable)
        .set(data)
        .where(eq(baseSysConfigTable.id, id))
        .returning({ id: baseSysConfigTable.id });
      return result[0] || null;
    },
    { write: true }
  );
}

export async function onDelete(id: number) {
  return withPostgresTransaction(
    async () => {
      const db = getPostgresDb();
      const result = await db
        .delete(baseSysConfigTable)
        .where(eq(baseSysConfigTable.id, id))
        .returning({ id: baseSysConfigTable.id });
      return result[0] || null;
    },
    { write: true }
  );
}

export async function resetPrimaryFlags(namespace: string, excludeId?: number) {
  return withPostgresTransaction(
    async () => {
      const db = getPostgresDb();
      const updateQuery = db
        .update(baseSysConfigTable)
        .set({ isPrimary: false });
      const conditions: SQL<unknown>[] = [
        eq(baseSysConfigTable.namespace, namespace),
      ];
      if (excludeId !== undefined) {
        conditions.push(not(eq(baseSysConfigTable.id, excludeId)));
      }
      await updateQuery.where(and(...conditions));
    },
    { write: true }
  );
}

export async function insert(
  data: Omit<BaseSysConfigInsertPOLike, "creatorId" | "createTimeUtc">,
  userObj: UserObj
): Promise<number> {
  return withPostgresTransaction(
    async () => {
      const db = getPostgresDb();
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
    },
    { write: true }
  );
}

export async function updateById(
  id: number,
  data: Partial<Omit<BaseSysConfigInsertPOLike, "creatorId" | "createTimeUtc">>,
  userObj: UserObj
): Promise<number> {
  return withPostgresTransaction(
    async () => {
      const db = getPostgresDb();
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
    },
    { write: true }
  );
}

export async function deleteByIds(ids: number[]): Promise<number> {
  return withPostgresTransaction(
    async () => {
      const db = getPostgresDb();
      const result = await db
        .delete(baseSysConfigTable)
        .where(inArray(baseSysConfigTable.id, ids));
      return result.rowCount ?? 0;
    },
    { write: true }
  );
}
