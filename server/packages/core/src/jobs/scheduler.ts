import { eq, and, or, isNull, lte, sql } from "drizzle-orm";
import { db } from "../db/index";
import {
  cronTable,
  cronLogTable,
} from "../../../admin/src/maintenance/cron/model";
import { CronExpressionParser } from "cron-parser";
import { jobExecutors } from "./executor";

/**
 * 扫描并运行所有待执行的定时任务 (两端通用核心调度方法)
 */
export async function runPendingJobs() {
  const now = Date.now();

  // 1. 查询所有启用且已到达预定时间（或尚未初始化预定时间）的任务
  const pendingJobs = await db
    .select()
    .from(cronTable)
    .where(
      and(
        eq(cronTable.status, true),
        or(isNull(cronTable.nextRunTimeUtc), lte(cronTable.nextRunTimeUtc, now))
      )
    );

  if (pendingJobs.length === 0) {
    return;
  }

  for (const job of pendingJobs) {
    try {
      // 2. 使用 cron-parser 计算下一次预定执行的毫秒时间戳
      const interval = CronExpressionParser.parse(job.cronExpression, {
        currentDate: new Date(now),
      });
      const nextRunTime = interval.next().toDate().getTime();

      // 3. 乐观锁更新，防止在多实例并发时重复执行
      const updateRes = await db
        .update(cronTable)
        .set({
          lastRunTimeUtc: now,
          nextRunTimeUtc: nextRunTime,
          runCount: sql`${cronTable.runCount} + 1`,
          updateTimeUtc: now,
        })
        .where(
          and(
            eq(cronTable.id, job.id),
            job.nextRunTimeUtc !== null
              ? eq(cronTable.nextRunTimeUtc, job.nextRunTimeUtc)
              : isNull(cronTable.nextRunTimeUtc)
          )
        )
        .returning({ id: cronTable.id });

      // 如果更新影响行数为 0，说明有其他实例并发抢占成功，本轮跳过
      if (updateRes.length === 0) {
        console.log(
          `[Scheduler] 任务 [${job.name}] 乐观锁争抢失败，已被其他节点执行。`
        );
        continue;
      }

      console.log(`[Scheduler] 开始执行任务 [${job.name} (${job.jobKey})]...`);

      const startTime = Date.now();
      let status = true; // true: 成功, false: 失败
      let errorMessage: string | null = null;
      let responseBody: string | null = null;
      let executorFound = false;

      // 4. 遍历执行器链分发执行
      for (const executor of jobExecutors) {
        if (await executor.supports(job.jobKey)) {
          executorFound = true;
          try {
            const result = await executor.execute(job, db);
            status = result.status;
            errorMessage = result.errorMessage ?? null;
            responseBody = result.responseBody ?? null;
          } catch (err: unknown) {
            status = false;
            errorMessage = err instanceof Error ? err.message : String(err);
          }
          break;
        }
      }

      if (!executorFound) {
        status = false;
        errorMessage = `Job key "${job.jobKey}" 未在任何注册的执行器中找到对应的支持逻辑。`;
      }

      // 统一打印执行结果日志
      if (status) {
        console.log(`[Scheduler] 任务 [${job.name}] 执行完毕。`);
      } else {
        console.error(
          `[Scheduler] 任务 [${job.name}] 执行出错: ${errorMessage}`
        );
      }

      const endTime = Date.now();
      const durationMs = endTime - startTime;

      // 5. 记录日志到数据库
      await db.insert(cronLogTable).values({
        jobId: job.id,
        status,
        errorMessage,
        responseBody,
        startTimeUtc: startTime,
        endTimeUtc: endTime,
        durationMs,
      });
    } catch (err) {
      console.error(
        `[Scheduler] 调度处理任务 [${job.name}] 过程中发生异常:`,
        err
      );
    }
  }
}
export default runPendingJobs;
