import { eq, and, or, isNull, lte, sql } from "drizzle-orm";
import { db } from "@/db/index";
import { cronTable, cronLogTable } from "@/api/maintenance/cron/model";
import { jobsRegistry } from "./registry";
import { CronExpressionParser } from "cron-parser";

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
        eq(cronTable.status, 1),
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
      let status = 1; // 1: 成功, 0: 失败
      let errorMessage: string | null = null;
      let responseBody: string | null = null;

      // 4. 优先从静态注册表获取 handler
      const staticHandler = jobsRegistry[job.jobKey];

      if (staticHandler) {
        // 4a. 静态注册的内置任务
        try {
          const params = job.parameters ? JSON.parse(job.parameters) : {};
          await staticHandler({ params, db });
          console.log(`[Scheduler] 任务 [${job.name}] 执行完毕。`);
        } catch (err: unknown) {
          status = 0;
          errorMessage = err instanceof Error ? err.message : String(err);
          console.error(`[Scheduler] 任务 [${job.name}] 执行出错:`, err);
        }
      } else {
        // 4b. 从数据库查询 API Task 定义
        const { apiTaskTable } =
          await import("@/api/maintenance/api-task/model");
        const { executeApiTask } = await import("./executor");

        const apiTasks = await db
          .select()
          .from(apiTaskTable)
          .where(
            and(
              eq(apiTaskTable.taskKey, job.jobKey),
              eq(apiTaskTable.isEnabled, true)
            )
          )
          .limit(1);

        const apiTask = apiTasks[0];

        if (!apiTask) {
          status = 0;
          errorMessage = `Job key "${job.jobKey}" 未在静态注册表中找到，也未找到匹配的 API Task 定义。`;
          console.error(
            `[Scheduler] 任务 [${job.name}] 执行失败: ${errorMessage}`
          );
        } else {
          try {
            const params: Record<string, unknown> = job.parameters
              ? JSON.parse(job.parameters)
              : {};
            const result = await executeApiTask(apiTask, params);
            responseBody = result.responseBody;
            if (result.success) {
              console.log(
                `[Scheduler] 任务 [${job.name}] 执行完毕，HTTP ${result.statusCode}。`
              );
            } else {
              status = 0;
              errorMessage = `HTTP ${result.statusCode}: ${result.responseBody.slice(0, 500)}`;
              console.error(
                `[Scheduler] 任务 [${job.name}] 请求失败: ${errorMessage}`
              );
            }
          } catch (err: unknown) {
            status = 0;
            errorMessage = err instanceof Error ? err.message : String(err);
            console.error(`[Scheduler] 任务 [${job.name}] 执行出错:`, err);
          }
        }
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
