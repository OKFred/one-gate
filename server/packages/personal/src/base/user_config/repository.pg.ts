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
import {
  BusinessError,
  BusinessErrorCode,
} from "@hodor/core/middleware/errorHandler/businessError";

import type { PgSelect } from "drizzle-orm/pg-core";
import type { InferInsertModel } from "drizzle-orm";

import { baseUserConfigTable } from "./schema.pg";
import {
  type BaseUserConfigInsertPOLike,
  type BaseUserConfigPOLike,
} from "./model";

// 杈呭姪宸ュ叿锛氭牴鎹?key 浠庣粨鏋滀腑鎵惧埌瀵瑰簲鐨?config
export function pickConfig(
  configs: BaseUserConfigPOLike[],
  key: string
): BaseUserConfigPOLike | undefined {
  return configs.find((c) => c.configKey === key);
}

export async function findByNamespace(
  userId: number,
  namespace: string
): Promise<BaseUserConfigPOLike[]> {
  return withPostgresTransaction(
    async () => {
      const db = getPostgresDb();
      const conditions: SQL<unknown>[] = [
        eq(baseUserConfigTable.userId, userId),
        eq(baseUserConfigTable.namespace, namespace),
      ];
      return db
        .select()
        .from(baseUserConfigTable)
        .where(and(...conditions));
    },
    { write: false }
  );
}

export async function findByNamespaceAndKey(
  userId: number,
  namespace: string,
  key: string
): Promise<BaseUserConfigPOLike | undefined> {
  return withPostgresTransaction(
    async () => {
      const db = getPostgresDb();
      const conditions: SQL<unknown>[] = [
        eq(baseUserConfigTable.userId, userId),
        eq(baseUserConfigTable.userId, userId),
        eq(baseUserConfigTable.namespace, namespace),
        eq(baseUserConfigTable.configKey, key),
      ];
      const result = await db
        .select()
        .from(baseUserConfigTable)
        .where(and(...conditions))
        .limit(1);
      return result[0];
    },
    { write: false }
  );
}

export async function findPrimaryByNamespace(
  userId: number,
  namespace: string
): Promise<BaseUserConfigPOLike | undefined> {
  return withPostgresTransaction(
    async () => {
      const db = getPostgresDb();
      const conditions: SQL<unknown>[] = [
        eq(baseUserConfigTable.userId, userId),
        eq(baseUserConfigTable.userId, userId),
        eq(baseUserConfigTable.namespace, namespace),
        eq(baseUserConfigTable.isPrimary, true),
      ];
      const result = await db
        .select()
        .from(baseUserConfigTable)
        .where(and(...conditions))
        .limit(1);
      return result[0];
    },
    { write: false }
  );
}

export async function findNamespaces(
  userId: number
): Promise<{ namespace: string }[]> {
  return withPostgresTransaction(
    async () => {
      const db = getPostgresDb();
      return db
        .selectDistinct({ namespace: baseUserConfigTable.namespace })
        .from(baseUserConfigTable)
        .where(eq(baseUserConfigTable.userId, userId))
        .orderBy(baseUserConfigTable.namespace);
    },
    { write: false }
  );
}

export async function findPage(params: {
  userId: number;
  pageNo: number;
  pageSize: number;
  namespace?: string;
  keyword?: string;
  isEnabled?: boolean;
  orderBy?: keyof BaseUserConfigPOLike;
  descend?: boolean;
}): Promise<{
  total: number;
  pageNo: number;
  pageSize: number;
  list: BaseUserConfigPOLike[];
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
        userId,
      } = params;

      const conditions: SQL<unknown>[] = [
        eq(baseUserConfigTable.userId, userId),
      ];

      if (namespace)
        conditions.push(eq(baseUserConfigTable.namespace, namespace));
      if (isEnabled !== undefined)
        conditions.push(eq(baseUserConfigTable.isEnabled, isEnabled));

      if (keyword) {
        conditions.push(
          or(
            like(baseUserConfigTable.namespace, `%${keyword}%`),
            like(baseUserConfigTable.configKey, `%${keyword}%`)
          )!
        );
      }

      const whereClause =
        conditions.length > 0 ? and(...conditions) : undefined;

      const orderByClause = orderBy
        ? descend
          ? desc(baseUserConfigTable[orderBy])
          : baseUserConfigTable[orderBy]
        : desc(baseUserConfigTable.id);

      const listQuery = db
        .select()
        .from(baseUserConfigTable)
        .where(whereClause)
        .orderBy(orderByClause)
        .limit(pageSize)
        .offset((pageNo - 1) * pageSize);

      const [list, countResult] = await Promise.all([
        listQuery,
        db.$count(baseUserConfigTable, whereClause),
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
  userId: number,
  id: number
): Promise<BaseUserConfigPOLike | undefined> {
  return withPostgresTransaction(
    async () => {
      const db = getPostgresDb();
      const result = await db
        .select()
        .from(baseUserConfigTable)
        .where(
          and(
            eq(baseUserConfigTable.id, id),
            eq(baseUserConfigTable.userId, userId)
          )
        )
        .limit(1);
      return result[0];
    },
    { write: false }
  );
}

export async function findIdByCondition(
  userId: number,
  namespace: string,
  configKey: string,
  excludeId?: number
) {
  return withPostgresTransaction(
    async () => {
      const db = getPostgresDb();
      const records = await db
        .select({ id: baseUserConfigTable.id })
        .from(baseUserConfigTable)
        .where(
          and(
            eq(baseUserConfigTable.userId, userId),
            eq(baseUserConfigTable.namespace, namespace),
            eq(baseUserConfigTable.configKey, configKey),
            excludeId !== undefined
              ? ne(baseUserConfigTable.id, excludeId)
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
  data: InferInsertModel<typeof baseUserConfigTable>
) {
  return withPostgresTransaction(
    async () => {
      const db = getPostgresDb();
      const result = await db
        .insert(baseUserConfigTable)
        .values(data)
        .returning({ id: baseUserConfigTable.id });
      return result[0]?.id || null;
    },
    { write: true }
  );
}

export async function onUpdate(
  userId: number,
  id: number,
  data: Partial<Omit<InferInsertModel<typeof baseUserConfigTable>, "id">>
) {
  return withPostgresTransaction(
    async () => {
      const db = getPostgresDb();
      const result = await db
        .update(baseUserConfigTable)
        .set(data)
        .where(
          and(
            eq(baseUserConfigTable.id, id),
            eq(baseUserConfigTable.userId, userId)
          )
        )
        .returning({ id: baseUserConfigTable.id });
      return result[0] || null;
    },
    { write: true }
  );
}

export async function onDelete(userId: number, id: number) {
  return withPostgresTransaction(
    async () => {
      const db = getPostgresDb();
      const result = await db
        .delete(baseUserConfigTable)
        .where(
          and(
            eq(baseUserConfigTable.id, id),
            eq(baseUserConfigTable.userId, userId)
          )
        )
        .returning({ id: baseUserConfigTable.id });
      return result[0] || null;
    },
    { write: true }
  );
}

export async function resetPrimaryFlags(
  userId: number,
  namespace: string,
  excludeId?: number
) {
  return withPostgresTransaction(
    async () => {
      const db = getPostgresDb();
      const updateQuery = db
        .update(baseUserConfigTable)
        .set({ isPrimary: false });
      const conditions: SQL<unknown>[] = [
        eq(baseUserConfigTable.userId, userId),
        eq(baseUserConfigTable.namespace, namespace),
      ];
      if (excludeId !== undefined) {
        conditions.push(not(eq(baseUserConfigTable.id, excludeId)));
      }
      await updateQuery.where(and(...conditions));
    },
    { write: true }
  );
}

export async function insert(
  userId: number,
  data: Omit<
    BaseUserConfigInsertPOLike,
    "creatorId" | "createTimeUtc" | "userId"
  >,
  userObj: UserObj
): Promise<number> {
  return withPostgresTransaction(
    async () => {
      const db = getPostgresDb();
      const insertData = {
        userId,
        ...data,
        creatorId: userObj.id,
        createTimeUtc: Date.now(),
      };

      const result = await db
        .insert(baseUserConfigTable)
        .values(insertData)
        .returning();
      return result[0].id;
    },
    { write: true }
  );
}

export async function updateById(
  userId: number,
  id: number,
  data: Partial<
    Omit<BaseUserConfigInsertPOLike, "creatorId" | "createTimeUtc" | "userId">
  >,
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

      const rows = await db
        .update(baseUserConfigTable)
        .set(updateData)
        .where(
          and(
            eq(baseUserConfigTable.id, id),
            eq(baseUserConfigTable.userId, userId)
          )
        )
        .returning({ id: baseUserConfigTable.id });

      if (rows.length !== 1)
        throw new BusinessError(BusinessErrorCode.NOT_EXIST_OR_DISABLED);

      return id;
    },
    { write: true }
  );
}

export async function deleteByIds(
  userId: number,
  ids: number[]
): Promise<number> {
  return withPostgresTransaction(
    async () => {
      const db = getPostgresDb();
      const result = await db
        .delete(baseUserConfigTable)
        .where(
          and(
            inArray(baseUserConfigTable.id, ids),
            eq(baseUserConfigTable.userId, userId)
          )
        );
      return result.rowCount ?? 0;
    },
    { write: true }
  );
}
