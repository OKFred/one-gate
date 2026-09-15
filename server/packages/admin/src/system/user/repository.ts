import db from "@hodor/core/db/index";
import { userTable, type UserPOLike } from "./model";
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
import { DepartmentDeletionError } from "../department/errors";
import { BusinessError } from "@hodor/core/middleware/errorHandler/businessError";

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
  }

  async findAll(params: {
    keyword?: string;
    isEnabled?: boolean;
    orderBy?: keyof UserPOLike;
    descend?: boolean;
  }) {
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
  }

  async findById(id: number): Promise<UserPOLike | null> {
    const rows = await db
      .select()
      .from(userTable)
      .where(eq(userTable.id, id))
      .limit(1);
    return rows[0] || null;
  }

  async findByUsername(username: string): Promise<UserPOLike | null> {
    const rows = await db
      .select()
      .from(userTable)
      .where(eq(userTable.username, username))
      .limit(1);
    return rows[0] || null;
  }

  async countDepartmentUsers(
    departmentIds: number[],
    isEnabled: boolean
  ): Promise<number> {
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
  }

  async getUserNameById(userId: number): Promise<string | null> {
    const rows = await db
      .select({ username: userTable.username })
      .from(userTable)
      .where(eq(userTable.id, userId))
      .limit(1);
    return rows[0]?.username || null;
  }

  async getUserNameMapByIds(
    userIds: number[]
  ): Promise<Record<number, string>> {
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
  }

  async onInsert(
    data: Omit<
      InferInsertModel<typeof userTable>,
      "id" | "createTimeUtc" | "updateTimeUtc"
    >
  ): Promise<number> {
    if (data.departmentId !== undefined && data.departmentId !== null) {
      const rows = await db.all<{ id: number }>(sql`INSERT INTO system_user
        (username, password, lang_code, remark, region_id, department_id, role_id_arr, is_enabled, creator_id, updater_id, create_time_utc)
        SELECT ${data.username}, ${data.password}, ${data.langCode}, ${data.remark ?? null}, ${data.regionId ?? null}, ${data.departmentId}, ${JSON.stringify(data.roleIdArr)}, ${data.isEnabled ? 1 : 0}, ${data.creatorId}, ${data.updaterId ?? null}, ${Date.now()}
        WHERE ${activeDepartmentReference(data.departmentId)} RETURNING id`);
      if (!rows[0])
        throw new BusinessError(DepartmentDeletionError.REFERENCE_UNAVAILABLE);
      return rows[0].id;
    }
    const res = await db
      .insert(userTable)
      .values({
        ...data,
        createTimeUtc: Date.now(),
      })
      .returning({ id: userTable.id });
    return res[0].id;
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
    const res = await db
      .update(userTable)
      .set({
        ...data,
        updateTimeUtc: Date.now(),
      })
      .where(
        and(
          eq(userTable.id, id),
          data.departmentId !== undefined && data.departmentId !== null
            ? activeDepartmentReference(data.departmentId)
            : undefined
        )
      )
      .returning({ id: userTable.id });
    if (!res[0])
      throw new BusinessError(DepartmentDeletionError.REFERENCE_UNAVAILABLE);
    return res[0].id;
  }

  async onDelete(id: number): Promise<number> {
    const res = await db
      .delete(userTable)
      .where(eq(userTable.id, id))
      .returning({ id: userTable.id });
    return res[0].id;
  }
}

export const userRepository = new UserRepository();
