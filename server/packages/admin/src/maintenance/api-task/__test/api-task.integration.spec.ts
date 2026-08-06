import { describe, it, expect, beforeAll, afterEach, vi } from "vitest";
import db from "@hodor/core/db/index";
import { setupTestDb, clearTestData } from "@hodor/core/db/testHelper";
import apiTaskService from "../service";
import { runPendingJobs } from "../../cron/scheduler";
import { cronTable, cronLogTable } from "../../cron/model";
import { eq } from "drizzle-orm";
import type { UserObj } from "@hodor/core/types/app";
import { initAdminRegistry } from "../../../register";

// 静态导入 SQL 文件
import apiTaskSql from "@hodor/core/db/sql/maintenance_api_task.sql?raw";
import cronSql from "@hodor/core/db/sql/system_cron_job.sql?raw";
import cronLogSql from "@hodor/core/db/sql/system_cron_job_log.sql?raw";

describe("API Task 全链路集成测试", () => {
  const testTables = [
    "maintenance_api_task",
    "system_cron_job",
    "system_cron_job_log",
  ];
  const userObj = { userId: 1 } as unknown as UserObj;

  beforeAll(async () => {
    initAdminRegistry();
    // 设置测试数据库表结构
    await setupTestDb(db, [apiTaskSql, cronSql, cronLogSql]);
    await clearTestData(db, testTables);
  });

  afterEach(async () => {
    await clearTestData(db, testTables);
    vi.restoreAllMocks();
  });

  describe("API Task 管理 (CRUD)", () => {
    it("全流程增删改查及防重测试", async () => {
      // 1. 新增 (Add)
      const taskId = await apiTaskService.add.service(
        {
          taskKey: "get_user_info",
          name: "获取用户信息",
          description: "测试定时任务",
          baseUrl: "http://api.local",
          path: "/users/{userId}",
          method: "GET",
          headers: JSON.stringify({ Authorization: "Bearer test" }),
          timeoutMs: 30000,
          isEnabled: true,
        },
        userObj
      );
      expect(taskId).toBeGreaterThan(0);

      // 重复添加相同 key 应抛出冲突错误
      await expect(
        apiTaskService.add.service(
          {
            taskKey: "get_user_info",
            name: "获取用户信息2",
            baseUrl: "http://api.local",
            path: "/users",
            method: "GET",
            timeoutMs: 30000,
            isEnabled: true,
          },
          userObj
        )
      ).rejects.toThrow();

      // 2. 查询 (Get)
      const task = await apiTaskService.get.service({ id: taskId! }, userObj);
      expect(task?.taskKey).toBe("get_user_info");
      expect(task?.name).toBe("获取用户信息");

      // 3. 更新 (Update)
      const updatedId = await apiTaskService.update.service(
        {
          id: taskId!,
          name: "获取用户信息 - 已更新",
          baseUrl: "http://api.new",
        },
        userObj
      );
      expect(updatedId).toBe(taskId);

      const taskAfterUpdate = await apiTaskService.get.service(
        { id: taskId! },
        userObj
      );
      expect(taskAfterUpdate?.name).toBe("获取用户信息 - 已更新");
      expect(taskAfterUpdate?.baseUrl).toBe("http://api.new");

      // 4. 列表查询与过滤 (List)
      const listRes1 = await apiTaskService.list.service(
        {
          pageNo: 1,
          pageSize: 10,
          keyword: "已更新",
        },
        userObj
      );
      expect(listRes1.total).toBe(1);
      expect(listRes1.list[0].id).toBe(taskId);

      // 5. 删除 (Delete)
      const deletedId = await apiTaskService.delete.service(
        { id: taskId! },
        userObj
      );
      expect(deletedId).toBe(taskId);

      await expect(
        apiTaskService.get.service({ id: taskId! }, userObj)
      ).rejects.toThrow();
    });

    it("批量导入 (Bulk Add) 测试", async () => {
      const bulkRes = await apiTaskService.bulkAdd.service(
        {
          tasks: [
            {
              taskKey: "task_1",
              name: "任务一",
              baseUrl: "http://localhost",
              path: "/1",
              method: "GET",
            },
            {
              taskKey: "task_2",
              name: "任务二",
              baseUrl: "http://localhost",
              path: "/2",
              method: "POST",
            },
          ],
        },
        userObj
      );
      expect(bulkRes.successCount).toBe(2);
      expect(bulkRes.failedCount).toBe(0);

      // 重复批量添加相同 key 应返回错误列表
      const bulkResConflict = await apiTaskService.bulkAdd.service(
        {
          tasks: [
            {
              taskKey: "task_1",
              name: "任务一",
              baseUrl: "http://localhost",
              path: "/1",
              method: "GET",
            },
          ],
        },
        userObj
      );
      expect(bulkResConflict.successCount).toBe(0);
      expect(bulkResConflict.failedCount).toBe(1);
      expect(bulkResConflict.errors[0].taskKey).toBe("task_1");
    });
  });

  describe("API Task 测试执行 (runTest)", () => {
    it("模拟运行测试接口并且校验 Response Schema", async () => {
      const taskId = await apiTaskService.add.service(
        {
          taskKey: "schema_test",
          name: "Schema测试",
          baseUrl: "http://api.local",
          path: "/test",
          method: "POST",
          responseSchema: JSON.stringify({
            type: "object",
            properties: {
              code: { type: "number" },
              message: { type: "string" },
            },
            required: ["code", "message"],
          }),
          timeoutMs: 30000,
          isEnabled: true,
        },
        userObj
      );

      // Mock fetch 成功且数据格式正确
      const mockFetch = vi.fn().mockResolvedValue({
        status: 200,
        ok: true,
        text: async () => JSON.stringify({ code: 200, message: "success" }),
        headers: {
          forEach: (cb: any) => cb("application/json", "content-type"),
        },
        statusText: "OK",
        url: "http://api.local/test",
        redirected: false,
      });
      vi.stubGlobal("fetch", mockFetch);

      const runRes = await apiTaskService.runTest.service(
        {
          id: taskId!,
          parameters: JSON.stringify({
            body: { user: "test" },
          }),
        },
        userObj
      );

      expect(mockFetch).toHaveBeenCalled();
      expect(runRes.success).toBe(true);
      expect(runRes.statusCode).toBe(200);
      expect(runRes.schemaValidation?.hasSchema).toBe(true);
      expect(runRes.schemaValidation?.valid).toBe(true);

      // Mock fetch 返回非法 JSON
      mockFetch.mockResolvedValue({
        status: 200,
        ok: true,
        text: async () => "{invalid}",
        headers: {
          forEach: () => {},
        },
      });

      const runResInvalidJson = await apiTaskService.runTest.service(
        { id: taskId! },
        userObj
      );
      expect(runResInvalidJson.schemaValidation?.valid).toBe(false);
      expect(runResInvalidJson.schemaValidation?.errors[0]).toContain(
        "not valid JSON"
      );

      // Mock fetch 返回错误结构
      mockFetch.mockResolvedValue({
        status: 200,
        ok: true,
        text: async () => JSON.stringify({ code: "not_a_number" }), // code 必须是 number 且缺少 message
        headers: {
          forEach: () => {},
        },
      });

      const runResBadSchema = await apiTaskService.runTest.service(
        { id: taskId! },
        userObj
      );
      expect(runResBadSchema.schemaValidation?.valid).toBe(false);
      expect(runResBadSchema.schemaValidation?.errors.length).toBeGreaterThan(
        0
      );
    });
  });

  describe("API Task 定时调度与乐观锁并发竞争测试", () => {
    it("定时任务触发 HTTP API 执行并记录日志", async () => {
      // 1. 新建 API Task 注册定义
      await apiTaskService.add.service(
        {
          taskKey: "http_cron_trigger",
          name: "HTTP 定时任务",
          baseUrl: "http://api.local",
          path: "/cron/execute",
          method: "GET",
          timeoutMs: 30000,
          isEnabled: true,
        },
        userObj
      );

      // 2. 在 Cron 表中添加一个待调度的任务，关联上述 API Task Key
      const now = Date.now();
      const [insertedCron] = await db
        .insert(cronTable)
        .values({
          jobKey: "http_cron_trigger",
          name: "HTTP定时任务调度",
          cronExpression: "*/5 * * * *", // 每5分钟
          status: true,
          nextRunTimeUtc: now - 1000, // 设为过去的时间，立刻待执行
          runCount: 0,
          creatorId: 1,
        })
        .returning({ id: cronTable.id });

      // 3. Mock fetch 请求
      const mockFetch = vi.fn().mockResolvedValue({
        status: 200,
        ok: true,
        text: async () => "Job executed successfully",
        headers: {
          forEach: () => {},
        },
        statusText: "OK",
        url: "http://api.local/cron/execute",
      });
      vi.stubGlobal("fetch", mockFetch);

      // 4. 运行调度程序扫描并执行
      await runPendingJobs();

      expect(mockFetch).toHaveBeenCalled();

      // 5. 校验运行日志和执行计数
      const [cronJob] = await db
        .select()
        .from(cronTable)
        .where(eq(cronTable.id, insertedCron.id));
      expect(cronJob.runCount).toBe(1);
      expect(cronJob.nextRunTimeUtc).toBeGreaterThan(now);

      const logs = await db
        .select()
        .from(cronLogTable)
        .where(eq(cronLogTable.jobId, insertedCron.id));
      expect(logs.length).toBe(1);
      expect(logs[0].status).toBe(true);
      expect(logs[0].responseBody).toBe("Job executed successfully");
    });

    it("模拟多实例并发调度时，乐观锁抢占测试", async () => {
      // 1. 注册 API 任务和 Cron 任务
      await apiTaskService.add.service(
        {
          taskKey: "concurrency_test",
          name: "并发抢锁任务",
          baseUrl: "http://api.local",
          path: "/concurrency",
          method: "GET",
          timeoutMs: 30000,
          isEnabled: true,
        },
        userObj
      );

      const now = Date.now();
      const [insertedCron] = await db
        .insert(cronTable)
        .values({
          jobKey: "concurrency_test",
          name: "并发调度测试",
          cronExpression: "*/5 * * * *",
          status: true,
          nextRunTimeUtc: now - 5000, // 设为过去时间，立刻待执行
          runCount: 0,
          creatorId: 1,
        })
        .returning({ id: cronTable.id });

      // 2. Mock fetch
      const mockFetch = vi.fn().mockResolvedValue({
        status: 200,
        ok: true,
        text: async () => "Success",
        headers: {
          forEach: () => {},
        },
      });
      vi.stubGlobal("fetch", mockFetch);

      // 3. 同时并发调用两次调度扫描 (模拟两台物理服务器同时被 cron 触发)
      await Promise.all([runPendingJobs(), runPendingJobs()]);

      // 4. 验证 fetch 被调用的次数应该正好是 1 次，而不是 2 次
      expect(mockFetch).toHaveBeenCalledTimes(1);

      // 5. 校验执行计数与日志仅有 1 次记录
      const [cronJob] = await db
        .select()
        .from(cronTable)
        .where(eq(cronTable.id, insertedCron.id));
      expect(cronJob.runCount).toBe(1);

      const logs = await db
        .select()
        .from(cronLogTable)
        .where(eq(cronLogTable.jobId, insertedCron.id));
      expect(logs.length).toBe(1);
    });
  });
});
