import { eq, like, and, desc, sql, lt, inArray } from "drizzle-orm";
import db from "@hodor/core/db";
import {
  mobileAsyncTaskTable,
  type MobileAsyncTaskAddVOLike,
  type MobileAsyncTaskUpdateVOLike,
  type MobileAsyncTaskPOLike,
} from "./model";

/** 设备异步任务持久化仓库。 */
export class MobileAsyncTaskRepository {
  /** 新增一项设备异步任务。 */
  async add(
    data: MobileAsyncTaskAddVOLike & { creatorId: number }
  ): Promise<number> {
    const [result] = await db
      .insert(mobileAsyncTaskTable)
      .values(data)
      .returning({ id: mobileAsyncTaskTable.id });
    return result.id;
  }

  /** 按主键更新任务。 */
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

  /** 按业务任务标识更新任务。 */
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

  /**
   * 仅在任务仍处于执行前/执行中状态时写入终态结果。
   *
   * @returns 是否实际更新了一条任务。
   */
  async completeByTaskId(
    taskId: string,
    clientId: string,
    data: {
      status: "SUCCESS" | "FAILURE" | "TIMEOUT" | "REJECTED" | "CANCELLED";
      resultCode: string;
      resultMessage: string | null;
      resultDataJson: string | null;
      preemptedByTaskId: string | null;
      startedAtUtc: number | null;
      finishedAtUtc: number;
      updaterId: number;
    }
  ): Promise<boolean> {
    const result = await db
      .update(mobileAsyncTaskTable)
      .set({
        ...data,
        updateTimeUtc: sql`(CAST(strftime('%s', 'now') AS INTEGER) * 1000 + CAST(substr(strftime('%f', 'now'), 4, 3) AS INTEGER))`,
      })
      .where(
        and(
          eq(mobileAsyncTaskTable.taskId, taskId),
          eq(mobileAsyncTaskTable.clientId, clientId),
          inArray(mobileAsyncTaskTable.status, ["PENDING", "RUNNING"])
        )
      );
    return result.rowsAffected > 0;
  }

  /** 按主键删除任务。 */
  async delete(id: number): Promise<void> {
    await db
      .delete(mobileAsyncTaskTable)
      .where(eq(mobileAsyncTaskTable.id, id));
  }

  /** 按主键查询任务。 */
  async getById(id: number): Promise<MobileAsyncTaskPOLike | undefined> {
    const [result] = await db
      .select()
      .from(mobileAsyncTaskTable)
      .where(eq(mobileAsyncTaskTable.id, id));
    return result;
  }

  /** 按业务任务标识查询任务。 */
  async getByTaskId(
    taskId: string
  ): Promise<MobileAsyncTaskPOLike | undefined> {
    const [result] = await db
      .select()
      .from(mobileAsyncTaskTable)
      .where(eq(mobileAsyncTaskTable.taskId, taskId));
    return result;
  }

  /** 分页查询设备异步任务。 */
  async list(params: {
    pageNo: number;
    pageSize: number;
    clientId?: string;
    keyword?: string;
    status?: MobileAsyncTaskPOLike["status"];
    priority?: MobileAsyncTaskPOLike["priority"];
    orderBy?: keyof MobileAsyncTaskPOLike;
    descend?: boolean;
  }) {
    const {
      pageNo,
      pageSize,
      clientId,
      keyword,
      status,
      priority,
      orderBy,
      descend,
    } = params;
    const conditions = [];

    if (keyword) {
      conditions.push(like(mobileAsyncTaskTable.taskId, `%${keyword}%`));
    }
    const whereCondition = and(
      conditions.length > 0 ? sql`(${conditions[0]})` : undefined,
      status ? eq(mobileAsyncTaskTable.status, status) : undefined,
      priority ? eq(mobileAsyncTaskTable.priority, priority) : undefined,
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
      if (orderBy === "priority") {
        const priorityRank = sql<number>`CASE ${mobileAsyncTaskTable.priority} WHEN 'HIGH' THEN 3 WHEN 'NORMAL' THEN 2 ELSE 1 END`;
        query = query.orderBy(descend ? desc(priorityRank) : priorityRank);
      } else {
        query = query.orderBy(
          descend
            ? desc(mobileAsyncTaskTable[orderBy])
            : mobileAsyncTaskTable[orderBy]
        );
      }
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

  /** 将服务端等待过期的待执行/执行中任务置为超时。 */
  async timeoutPendingTasks(resultGraceMs: number): Promise<number> {
    const now = Date.now();
    const deadlineCutoff = now - resultGraceMs;
    const result = await db
      .update(mobileAsyncTaskTable)
      .set({
        status: "TIMEOUT",
        resultCode: "SERVER_TIMEOUT",
        resultMessage: "服务端等待设备结果超时",
        finishedAtUtc: now,
        updaterId: 0,
        updateTimeUtc: now,
      })
      .where(
        and(
          inArray(mobileAsyncTaskTable.status, ["PENDING", "RUNNING"]),
          lt(mobileAsyncTaskTable.expiresAtUtc, deadlineCutoff)
        )
      );
    return result.rowsAffected;
  }
}

export const mobileAsyncTaskRepo = new MobileAsyncTaskRepository();
