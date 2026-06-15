import db from "@/db/index";
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
    conditions.push(or(like(userTable.username, `%${keyword}%`)));
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

  async onInsert(
    data: Omit<
      InferInsertModel<typeof userTable>,
      "id" | "createTimeUtc" | "updateTimeUtc"
    >
  ): Promise<number> {
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
      .where(eq(userTable.id, id))
      .returning({ id: userTable.id });
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
