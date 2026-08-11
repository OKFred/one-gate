import { and, desc, eq, inArray, like, lt, sql } from "drizzle-orm";
import db from "@hodor/core/db";
import { mobileAsyncTaskTable } from "../model.js";
import type { DeviceTaskCompletion } from "../domain/task.js";
import type {
  DeviceTaskCreateRecord,
  DeviceTaskListParams,
  DeviceTaskPage,
  DeviceTaskRecord,
  DeviceTaskRepository,
} from "../application/ports.js";

/** 基于 Drizzle 的设备任务持久化适配器。 */
export class DrizzleDeviceTaskRepository implements DeviceTaskRepository {
  /** 新增一项设备异步任务。 */
  async add(data: DeviceTaskCreateRecord): Promise<number> {
    const [result] = await db
      .insert(mobileAsyncTaskTable)
      .values(data)
      .returning({ id: mobileAsyncTaskTable.id });
    return result.id;
  }

  /** 仅在任务仍为活动状态时写入终态结果。 */
  async completeByTaskId(
    taskId: string,
    clientId: string,
    data: DeviceTaskCompletion
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

  /** 按业务任务标识查询任务。 */
  async getByTaskId(taskId: string): Promise<DeviceTaskRecord | undefined> {
    const [result] = await db
      .select()
      .from(mobileAsyncTaskTable)
      .where(eq(mobileAsyncTaskTable.taskId, taskId));
    return result;
  }

  /** 分页查询设备异步任务。 */
  async list(params: DeviceTaskListParams): Promise<DeviceTaskPage> {
    const {
      pageNo,
      pageSize,
      clientId,
      keyword,
      status,
      priority,
      orderBy,
      descend: shouldDescend,
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
        query = query.orderBy(
          shouldDescend ? desc(priorityRank) : priorityRank
        );
      } else {
        query = query.orderBy(
          shouldDescend
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

  /** 写入旧手机客户端的兼容终态结果。 */
  async updateLegacyResult(
    taskId: string,
    data: {
      status: "SUCCESS" | "FAILURE";
      resultMessage: string | null;
      updaterId: number;
    }
  ): Promise<void> {
    await db
      .update(mobileAsyncTaskTable)
      .set({
        ...data,
        updateTimeUtc: sql`(CAST(strftime('%s', 'now') AS INTEGER) * 1000 + CAST(substr(strftime('%f', 'now'), 4, 3) AS INTEGER))`,
      })
      .where(eq(mobileAsyncTaskTable.taskId, taskId));
  }

  /** 将服务端等待过期的待执行/执行中任务置为超时。 */
  async timeoutPendingTasks(
    deadlineCutoff: number,
    finishedAtUtc: number
  ): Promise<number> {
    const result = await db
      .update(mobileAsyncTaskTable)
      .set({
        status: "TIMEOUT",
        resultCode: "SERVER_TIMEOUT",
        resultMessage: "服务端等待设备结果超时",
        finishedAtUtc,
        updaterId: 0,
        updateTimeUtc: finishedAtUtc,
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
