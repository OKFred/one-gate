process.env.DB_FILE_NAME = "file:cron-test.db";

import {
  describe,
  it,
  expect,
  beforeAll,
  afterEach,
  afterAll,
  vi,
} from "vitest";
import { sql } from "drizzle-orm";
import fs from "fs";
import db, { closeDb } from "@/db/index";
import { setupTestDb, clearTestData } from "@/db/testHelper";
import cronService from "../service";
import { cronLogTable } from "../model";
import type { UserObj } from "@/types/app";

// 静态导入 SQL 文件
import cronSql from "@/db/sql/system_cron_job.sql?raw";
import cronLogSql from "@/db/sql/system_cron_job_log.sql?raw";

vi.mock("@/utils/i18n/shared", () => {
  return {
    getTranslation: async (lang: string, key: string) => {
      if (key === "cron.frequency.minutely") return "每分钟";
      if (key === "cron.frequency.minutes") return "每{minutes}分钟";
      if (key === "cron.frequency.hourly") return "每小时";
      if (key === "cron.frequency.hours") return "每{hours}小时";
      if (key === "cron.frequency.daily") return "每天";
      if (key === "cron.frequency.days") return "每{days}天";
      if (key === "cron.frequency.seconds") return "每{seconds}秒";
      return key;
    },
  };
});

describe("Cron 模块全链路集成测试", () => {
  const testTables = ["system_cron_job", "system_cron_job_log"];
  const userObj = { userId: 1 } as unknown as UserObj;

  beforeAll(async () => {
    try {
      console.log("Running custom db setup");
      const statements = [
        ...cronSql
          .split(";")
          .map((s) => s.trim())
          .filter(Boolean),
        ...cronLogSql
          .split(";")
          .map((s) => s.trim())
          .filter(Boolean),
      ];
      for (const stmt of statements) {
        console.log("Executing SQL statement:", stmt);
        await db.run(sql.raw(stmt));
      }

      const tables = await db.run(
        sql`SELECT name FROM sqlite_master WHERE type='table'`
      );
      console.log("Final tables list in DB:", tables);

      await db.run(sql`DELETE FROM system_cron_job`);
      await db.run(sql`DELETE FROM system_cron_job_log`);
      console.log("Cleared test data successfully");
    } catch (err) {
      console.error("Setup DB failed with error:", err);
      throw err;
    }
  });

  afterEach(async () => {
    try {
      await db.run(sql`DELETE FROM system_cron_job`);
      await db.run(sql`DELETE FROM system_cron_job_log`);
    } catch (err) {
      console.error("afterEach clear failed:", err);
    }
  });

  describe("计划任务配置 (CRUD)", () => {
    it("全流程增删改查测试", async () => {
      const tables = await db.run(
        sql`SELECT name FROM sqlite_master WHERE type='table'`
      );
      console.log("Tables before insert in test:", tables);

      // 1. Add
      const jobId = await cronService.add.service(
        {
          jobKey: "test_job_key",
          name: "Test Job",
          cronExpression: "*/5 * * * *",
          status: true,
          parameters: "{}",
        },
        userObj
      );
      expect(jobId).toBeGreaterThan(0);

      // 2. Get
      const job = await cronService.get.service({ id: jobId! });
      expect(job?.jobKey).toBe("test_job_key");
      expect(job?.name).toBe("Test Job");
      expect(job?.cronExpression).toBe("*/5 * * * *");
      expect(job?.status).toBe(true);

      // 3. Update
      const updatedId = await cronService.update.service(
        {
          id: jobId!,
          name: "Updated Test Job",
          cronExpression: "0 0 * * *",
          status: false,
        },
        userObj
      );
      expect(updatedId).toBe(jobId);

      const jobAfterUpdate = await cronService.get.service({ id: jobId! });
      expect(jobAfterUpdate?.name).toBe("Updated Test Job");
      expect(jobAfterUpdate?.cronExpression).toBe("0 0 * * *");
      expect(jobAfterUpdate?.status).toBe(false);

      // 4. Delete
      const deletedId = await cronService.delete.service(
        { id: jobId! },
        userObj
      );
      expect(deletedId).toBe(jobId);

      await expect(cronService.get.service({ id: jobId! })).rejects.toThrow();
    });

    it("列表查询分页过滤测试", async () => {
      await cronService.add.service(
        {
          jobKey: "job_1",
          name: "Daily Job",
          cronExpression: "0 0 * * *",
          status: true,
        },
        userObj
      );
      await cronService.add.service(
        {
          jobKey: "job_2",
          name: "Weekly Job",
          cronExpression: "0 0 * * 0",
          status: false,
        },
        userObj
      );

      // 1. 查询全部启用状态
      const result1 = await cronService.list.service({
        status: true,
        pageNo: 1,
        pageSize: 10,
      });
      expect(result1.total).toBe(1);
      expect(result1.list[0].jobKey).toBe("job_1");

      // 2. 关键词模糊查询
      const result2 = await cronService.list.service({
        keyword: "weekly",
        pageNo: 1,
        pageSize: 10,
      });
      expect(result2.total).toBe(1);
      expect(result2.list[0].jobKey).toBe("job_2");
    });
  });

  describe("任务运行日志测试", () => {
    it("日志分页查询与级联删除测试", async () => {
      // 1. 创建任务
      const jobId = await cronService.add.service(
        {
          jobKey: "log_test_job",
          name: "Log Test Job",
          cronExpression: "0 0 * * *",
          status: true,
        },
        userObj
      );

      // 2. 直接向数据库插入该任务的运行日志记录
      await db.insert(cronLogTable).values([
        {
          jobId: jobId!,
          status: true,
          startTimeUtc: Date.now() - 5000,
          endTimeUtc: Date.now() - 4000,
          durationMs: 1000,
          responseBody: "success",
        },
        {
          jobId: jobId!,
          status: false,
          errorMessage: "some error occurred",
          startTimeUtc: Date.now() - 2000,
          endTimeUtc: Date.now() - 1000,
          durationMs: 1000,
        },
      ]);

      // 3. 调用 listLogs 接口
      const logResult = await cronService.listLogs.service({
        jobId: jobId!,
        pageNo: 1,
        pageSize: 10,
      });
      expect(logResult.total).toBe(2);
      expect(logResult.list[0].status).toBe(false);
      expect(logResult.list[0].errorMessage).toBe("some error occurred");
      expect(logResult.list[1].status).toBe(true);

      // 4. 删除任务，并检查级联日志删除是否生效
      await cronService.delete.service({ id: jobId! }, userObj);

      const logResultAfterDelete = await cronService.listLogs.service({
        jobId: jobId!,
        pageNo: 1,
        pageSize: 10,
      });
      expect(logResultAfterDelete.total).toBe(0);
      expect(logResultAfterDelete.list.length).toBe(0);
    });
  });

  describe("Cron 表达式解析与频率提示测试", () => {
    it("合法表达式解析", async () => {
      const parseResult = await cronService.parse.service(
        { cronExpression: "*/5 * * * *" },
        userObj
      );
      expect(parseResult.valid).toBe(true);
      expect(parseResult.error).toBeNull();
      expect(parseResult.frequency).toBe("每5分钟");
      expect(parseResult.nextTimes.length).toBe(5);
    });

    it("非法表达式解析", async () => {
      const parseResult = await cronService.parse.service(
        { cronExpression: "invalid-cron-exp" },
        userObj
      );
      expect(parseResult.valid).toBe(false);
      expect(parseResult.error).not.toBeNull();
      expect(parseResult.nextTimes.length).toBe(0);
    });
  });

  afterAll(async () => {
    try {
      await closeDb();
      if (fs.existsSync("cron-test.db")) fs.unlinkSync("cron-test.db");
      if (fs.existsSync("cron-test.db-shm")) fs.unlinkSync("cron-test.db-shm");
      if (fs.existsSync("cron-test.db-wal")) fs.unlinkSync("cron-test.db-wal");
    } catch (err) {
      console.error("Failed to clean up test db files:", err);
    }
  });
});
