import {
  getPostgresDb,
  withPostgresTransaction,
} from "@hodor/core/db/postgresql/runtime";

import { userTable } from "./schema.pg";
import { type UserPOLike } from "./model";
import {
  asc,
  count,
  desc,
  eq,
  or,
  like,
  and,
  inArray,
  sql,
  type SQL,
  type InferInsertModel,
} from "drizzle-orm";
import hasValue from "@hodor/core/utils/hasValue";
import { activeDepartmentReference } from "../department/reference-guards";
import { activeRoleIds } from "../role/reference-guards";
import { RoleDeletionError } from "../role/errors";
import { DepartmentDeletionError } from "../department/errors";
import { BusinessError } from "@hodor/core/middleware/errorHandler/businessError";
import { postgresSafeInteger } from "@hodor/core/db/postgresql/sql";

export const buildWhereCondition = (condition?: {
  keyword?: string;
  isEnabled?: boolean;
}) => {
  const { keyword, isEnabled } = condition || {};
  const conditions: SQL<unknown>[] = [];
  if (hasValue(keyword)) {
    conditions.push(
      or(like(userTable.username, `%${keyword}%`)) as SQL<unknown>
    );
  }
  if (isEnabled !== undefined) {
    conditions.push(eq(userTable.isEnabled, isEnabled));
  }
  return conditions.length > 0
    ? conditions.length === 1
      ? conditions[0]
      : and(...conditions)
    : undefined;
};

export class UserRepository {
  async findPage(params: {
    keyword?: string;
    isEnabled?: boolean;
    orderBy?: keyof UserPOLike;
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
          orderBy = "id",
          descend = true,
          pageNo,
          pageSize,
        } = params;
        const offset = (pageNo - 1) * pageSize;
        const orderField = userTable[orderBy] || userTable.id;

        // 查询总数
        const countResult = await db
          .select({ total: count(userTable.id).as("total") })
          .from(userTable)
          .where(buildWhereCondition({ keyword, isEnabled }));
        const total = countResult[0]?.total || 0;

        if (total === 0) {
          return { total, list: [] };
        }

        // 查询列表数据
        const rows = await db
          .select()
          .from(userTable)
          .where(buildWhereCondition({ keyword, isEnabled }))
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
    orderBy?: keyof UserPOLike;
    descend?: boolean;
  }) {
    return withPostgresTransaction(
      async () => {
        const db = getPostgresDb();
        const { keyword, isEnabled, orderBy = "id", descend = true } = params;
        const orderField = userTable[orderBy] || userTable.id;
        const maxLimit = 10000;

        const rows = await db
          .select({
            id: userTable.id,
            username: userTable.username,
            langCode: userTable.langCode,
            remark: userTable.remark,
            departmentId: userTable.departmentId,
            roleIdArr: userTable.roleIdArr,
            isEnabled: userTable.isEnabled,
          })
          .from(userTable)
          .where(buildWhereCondition({ keyword, isEnabled }))
          .orderBy(!descend ? asc(orderField) : desc(orderField))
          .limit(maxLimit);

        return rows;
      },
      { write: false }
    );
  }

  async findById(id: number): Promise<UserPOLike | null> {
    return withPostgresTransaction(
      async () => {
        const db = getPostgresDb();
        const rows = await db
          .select()
          .from(userTable)
          .where(eq(userTable.id, id))
          .limit(1);
        return rows[0] || null;
      },
      { write: false }
    );
  }

  async findByUsername(username: string): Promise<UserPOLike | null> {
    return withPostgresTransaction(
      async () => {
        const db = getPostgresDb();
        const rows = await db
          .select()
          .from(userTable)
          .where(eq(userTable.username, username))
          .limit(1);
        return rows[0] || null;
      },
      { write: false }
    );
  }

  async countDepartmentUsers(
    departmentIds: number[],
    isEnabled: boolean
  ): Promise<number> {
    return withPostgresTransaction(
      async () => {
        const db = getPostgresDb();
        if (!departmentIds || departmentIds.length === 0) return 0;
        const result = await db
          .select({ count: count(userTable.id) })
          .from(userTable)
          .where(
            and(
              inArray(userTable.departmentId, departmentIds),
              eq(userTable.isEnabled, isEnabled)
            )
          );
        return result[0]?.count || 0;
      },
      { write: false }
    );
  }

  async getUserNameById(userId: number): Promise<string | null> {
    return withPostgresTransaction(
      async () => {
        const db = getPostgresDb();
        const rows = await db
          .select({ username: userTable.username })
          .from(userTable)
          .where(eq(userTable.id, userId))
          .limit(1);
        return rows[0]?.username || null;
      },
      { write: false }
    );
  }

  async getUserNameMapByIds(
    userIds: number[]
  ): Promise<Record<number, string>> {
    return withPostgresTransaction(
      async () => {
        const db = getPostgresDb();
        if (!userIds || userIds.length === 0) return {};
        const rows = await db
          .select({ id: userTable.id, username: userTable.username })
          .from(userTable)
          .where(inArray(userTable.id, userIds));
        const map: Record<number, string> = {};
        rows.forEach((r) => {
          map[r.id] = r.username;
        });
        return map;
      },
      { write: false }
    );
  }

  async onInsert(
    data: Omit<
      InferInsertModel<typeof userTable>,
      "id" | "createTimeUtc" | "updateTimeUtc"
    >
  ): Promise<number> {
    return withPostgresTransaction(
      async () => {
        const db = getPostgresDb();
        const result = await db.execute<{
          id: number | string;
        }>(sql`INSERT INTO "system_user"
        (username, password, lang_code, remark, region_id, department_id, role_id_arr, is_enabled, creator_id, updater_id, create_time_utc)
        SELECT ${data.username}, ${data.password}, ${data.langCode}, ${data.remark ?? null}, ${data.regionId ?? null}, ${data.departmentId ?? null}, ${JSON.stringify(data.roleIdArr)}::jsonb, ${data.isEnabled}, ${data.creatorId}, ${data.updaterId ?? null}, ${Date.now()}
        WHERE ${activeDepartmentReference(data.departmentId ?? null)} AND ${activeRoleIds(data.roleIdArr)} RETURNING id`);
        const rows = result.rows;
        if (!rows[0]) {
          const {
            rows: [department],
          } = await db.execute<{ available: boolean }>(
            sql`SELECT ${activeDepartmentReference(data.departmentId ?? null)} AS available`
          );
          throw new BusinessError(
            department?.available
              ? RoleDeletionError.NOT_ACTIVE
              : DepartmentDeletionError.REFERENCE_UNAVAILABLE
          );
        }
        return postgresSafeInteger(rows[0].id);
      },
      { write: true }
    );
  }

  async onUpdate(
    id: number,
    data: Partial<
      Omit<
        InferInsertModel<typeof userTable>,
        "id" | "createTimeUtc" | "updateTimeUtc"
      >
    >
  ): Promise<number> {
    return withPostgresTransaction(
      async () => {
        const db = getPostgresDb();
        const res = await db
          .update(userTable)
          .set({
            ...data,
            updateTimeUtc: Date.now(),
          })
          .where(
            and(
              eq(userTable.id, id),
              data.departmentId !== undefined
                ? activeDepartmentReference(data.departmentId)
                : undefined,
              data.roleIdArr !== undefined
                ? activeRoleIds(data.roleIdArr)
                : undefined
            )
          )
          .returning({ id: userTable.id });
        if (!res[0]) {
          const {
            rows: [department],
          } = await db.execute<{ available: boolean }>(
            sql`SELECT ${activeDepartmentReference(data.departmentId ?? null)} AS available`
          );
          throw new BusinessError(
            department?.available
              ? RoleDeletionError.NOT_ACTIVE
              : DepartmentDeletionError.REFERENCE_UNAVAILABLE
          );
        }
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
          .delete(userTable)
          .where(eq(userTable.id, id))
          .returning({ id: userTable.id });
        return res[0].id;
      },
      { write: true }
    );
  }
}

export const userRepository = new UserRepository();
