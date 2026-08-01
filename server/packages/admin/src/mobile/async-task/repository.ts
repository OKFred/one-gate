import { eq, like, and, desc, sql, lt } from "drizzle-orm";
import db from "@hodor/core/db";
import {
  mobileAsyncTaskTable,
  type MobileAsyncTaskAddVOLike,
  type MobileAsyncTaskUpdateVOLike,
  type MobileAsyncTaskPOLike,
} from "./model";

export class MobileAsyncTaskRepository {
  async add(
    data: MobileAsyncTaskAddVOLike & { creatorId: number }
  ): Promise<number> {
    const [result] = await db
      .insert(mobileAsyncTaskTable)
      .values(data)
      .returning({ id: mobileAsyncTaskTable.id });
    return result.id;
  }

  async update(
    data: MobileAsyncTaskUpdateVOLike & { updaterId: number }
  ): Promise<void> {
    await db
      .update(mobileAsyncTaskTable)
      .set({
        ...data,
        updateTimeUtc: sql`(CAST(strftime('%s', 'now') AS INTEGER) * 1000 + CAST(substr(strftime('%f', 'now'), 4, 3) AS INTEGER))`,
      })
      .where(eq(mobileAsyncTaskTable.id, data.id));
  }

  async updateByTaskId(
    taskId: string,
    data: Partial<MobileAsyncTaskUpdateVOLike> & { updaterId: number }
  ): Promise<void> {
    await db
      .update(mobileAsyncTaskTable)
      .set({
        ...data,
        updateTimeUtc: sql`(CAST(strftime('%s', 'now') AS INTEGER) * 1000 + CAST(substr(strftime('%f', 'now'), 4, 3) AS INTEGER))`,
      })
      .where(eq(mobileAsyncTaskTable.taskId, taskId));
  }

  async delete(id: number): Promise<void> {
    await db
      .delete(mobileAsyncTaskTable)
      .where(eq(mobileAsyncTaskTable.id, id));
  }

  async getById(id: number): Promise<MobileAsyncTaskPOLike | undefined> {
    const [result] = await db
      .select()
      .from(mobileAsyncTaskTable)
      .where(eq(mobileAsyncTaskTable.id, id));
    return result;
  }

  async getByTaskId(
    taskId: string
  ): Promise<MobileAsyncTaskPOLike | undefined> {
    const [result] = await db
      .select()
      .from(mobileAsyncTaskTable)
      .where(eq(mobileAsyncTaskTable.taskId, taskId));
    return result;
  }

  async list(params: {
    pageNo: number;
    pageSize: number;
    clientId?: string;
    keyword?: string;
    status?: "PENDING" | "SUCCESS" | "FAILURE" | "TIMEOUT";
    orderBy?: keyof MobileAsyncTaskPOLike;
    descend?: boolean;
  }) {
    const { pageNo, pageSize, clientId, keyword, status, orderBy, descend } =
      params;
    const conditions = [];

    if (keyword) {
      conditions.push(like(mobileAsyncTaskTable.taskId, `%${keyword}%`));
    }
    const whereCondition = and(
      conditions.length > 0 ? sql`(${conditions[0]})` : undefined,
      status ? eq(mobileAsyncTaskTable.status, status) : undefined,
      clientId ? eq(mobileAsyncTaskTable.clientId, clientId) : undefined
    );

    const [{ count }] = await db
      .select({ count: sql<number>`count(*)` })
      .from(mobileAsyncTaskTable)
      .where(whereCondition);

    let query = db
      .select()
      .from(mobileAsyncTaskTable)
      .where(whereCondition)
      .$dynamic();

    if (orderBy) {
      query = query.orderBy(
        descend
          ? desc(mobileAsyncTaskTable[orderBy])
          : mobileAsyncTaskTable[orderBy]
      );
    } else {
      query = query.orderBy(desc(mobileAsyncTaskTable.createTimeUtc));
    }

    const list = await query.limit(pageSize).offset((pageNo - 1) * pageSize);

    return {
      list,
      total: count,
      totalPage: Math.ceil(count / pageSize),
      currentPage: pageNo,
      pageNo,
      pageSize,
    };
  }

  async timeoutPendingTasks(): Promise<number> {
    const now = Date.now();
    const result = await db
      .update(mobileAsyncTaskTable)
      .set({ status: "TIMEOUT" })
      .where(
        and(
          eq(mobileAsyncTaskTable.status, "PENDING"),
          lt(mobileAsyncTaskTable.expiresAtUtc, now)
        )
      );
    return result.rowsAffected;
  }
}

export const mobileAsyncTaskRepo = new MobileAsyncTaskRepository();
