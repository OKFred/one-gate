import { describe, it, expect, beforeAll, afterEach, vi } from "vitest";
import db from "@/db/index";
import { setupTestDb, clearTestData } from "@/db/testHelper";
import cronService from "../service";
import { cronLogTable } from "../model";
import type { UserObj } from "@/types/app";

// 静态导入 SQL 文件
import cronSql from "@/db/sql/system_cron_job.sql?raw";
import cronLogSql from "@/db/sql/system_cron_job_log.sql?raw";

// Mock 翻译辅助函数，避免因为缺少 i18n 表或缓存未命中报错
vi.mock("@/utils/i18n/shared", () => {
  return {
    getTranslation: async (langCode: string, key: string) => {
      const mockDict: Record<string, string> = {
        "cron.frequency.minutes": "每 {minutes} 分钟",
        "cron.frequency.minutely": "每分钟",
        "cron.frequency.hours": "每 {hours} 小时",
        "cron.frequency.hourly": "每小时",
        "cron.frequency.days": "每 {days} 天",
        "cron.frequency.daily": "每天",
        "cron.frequency.seconds": "每 {seconds} 秒",
        "cron.frequency.custom": "自定义频率",
      };
      return mockDict[key] || key;
    },
  };
});

describe("Cron 计划任务全链路集成测试", () => {
  const testTables = ["system_cron_job", "system_cron_job_log"];
  const userObj = { userId: 1, langCode: "zh-CN" } as unknown as UserObj;

  beforeAll(async () => {
    await setupTestDb(db, [cronSql, cronLogSql]);
    await clearTestData(db, testTables);
  });

  afterEach(async () => {
    await clearTestData(db, testTables);
  });

  describe("Cron 任务管理 (CRUD)", () => {
    it("全流程增删改查及 Cron 校验测试", async () => {
      // 1. Add (启用状态下，会自动计算下次运行时间)
      const cronId = await cronService.add.service(
        {
          jobKey: "test_job",
          name: "测试任务",
          cronExpression: "0 0 * * *", // 每天零点
          status: true,
          parameters: "test_param",
        },
        userObj
      );
      expect(cronId).toBeGreaterThan(0);

      // 2. Get
      const cron = await cronService.get.service({ id: cronId! });
      expect(cron.jobKey).toBe("test_job");
      expect(cron.name).toBe("测试任务");
      expect(cron.cronExpression).toBe("0 0 * * *");
      expect(cron.status).toBe(true);
      expect(cron.parameters).toBe("test_param");
      expect(cron.nextRunTimeUtc).toBeGreaterThan(0);

      // 3. Update (修改为禁用状态，下次运行时间应设为 null)
      const updatedId = await cronService.update.service(
        {
          id: cronId!,
          jobKey: "test_job_updated",
          name: "测试任务更新",
          status: false,
        },
        userObj
      );
      expect(updatedId).toBe(cronId);

      const cronAfterUpdate = await cronService.get.service({ id: cronId! });
      expect(cronAfterUpdate.name).toBe("测试任务更新");
      expect(cronAfterUpdate.jobKey).toBe("test_job_updated");
      expect(cronAfterUpdate.status).toBe(false);
      expect(cronAfterUpdate.nextRunTimeUtc).toBeNull();

      // 4. Delete
      const deletedId = await cronService.delete.service(
        { id: cronId! },
        userObj
      );
      expect(deletedId).toBe(cronId);

      await expect(cronService.get.service({ id: cronId! })).rejects.toThrow();
    });

    it("列表查询测试 (list)", async () => {
      await cronService.add.service(
        {
          jobKey: "job_1",
          name: "任务1",
          cronExpression: "*/5 * * * *",
          status: true,
        },
        userObj
      );
      await cronService.add.service(
        {
          jobKey: "job_2",
          name: "任务2",
          cronExpression: "0 0 1 * *",
          status: false,
        },
        userObj
      );

      // 1. 无过滤条件列表查询
      const pageResult1 = await cronService.list.service({
        pageNo: 1,
        pageSize: 10,
      });
      expect(pageResult1.total).toBe(2);
      expect(pageResult1.list.length).toBe(2);

      // 2. 状态过滤查询
      const pageResult2 = await cronService.list.service({
        pageNo: 1,
        pageSize: 10,
        status: true,
      });
      expect(pageResult2.total).toBe(1);
      expect(pageResult2.list[0].jobKey).toBe("job_1");

      // 3. 关键词模糊匹配
      const pageResult3 = await cronService.list.service({
        pageNo: 1,
        pageSize: 10,
        keyword: "2",
      });
      expect(pageResult3.total).toBe(1);
      expect(pageResult3.list[0].jobKey).toBe("job_2");
    });

    it("新增非法 Cron 表达式应该抛出错误", async () => {
      await expect(
        cronService.add.service(
          {
            jobKey: "invalid_job",
            name: "非法任务",
            cronExpression: "invalid-cron-expr",
            status: true,
          },
          userObj
        )
      ).rejects.toThrow();
    });
  });

  describe("Cron 运行日志与级联删除测试", () => {
    it("运行日志的写入、查询和级联删除", async () => {
      // 1. 新建一个任务
      const cronId = await cronService.add.service(
        {
          jobKey: "log_job",
          name: "日志测试任务",
          cronExpression: "0 0 * * *",
          status: true,
        },
        userObj
      );

      // 2. 直接在数据库中模拟插入 2 条日志记录
      await db.insert(cronLogTable).values([
        {
          jobId: cronId!,
          status: true,
          startTimeUtc: Date.now() - 10000,
          endTimeUtc: Date.now() - 9900,
          durationMs: 100,
        },
        {
          jobId: cronId!,
          status: false,
          errorMessage: "Timeout",
          startTimeUtc: Date.now() - 5000,
          endTimeUtc: Date.now() - 4800,
          durationMs: 200,
        },
      ]);

      // 3. 查询日志列表
      const logsResult = await cronService.listLogs.service({
        jobId: cronId!,
        pageNo: 1,
        pageSize: 10,
      });
      expect(logsResult.total).toBe(2);
      expect(logsResult.list.length).toBe(2);
      expect(logsResult.list[0].status).toBe(false); // 按 id 倒序，最新的一条在最前面
      expect(logsResult.list[0].errorMessage).toBe("Timeout");

      // 4. 删除任务，应该级联删除所有日志
      await cronService.delete.service({ id: cronId! }, userObj);

      // 验证日志被清理
      const logsAfterDelete = await cronService.listLogs.service({
        jobId: cronId!,
        pageNo: 1,
        pageSize: 10,
      });
      expect(logsAfterDelete.total).toBe(0);
      expect(logsAfterDelete.list.length).toBe(0);
    });
  });

  describe("Cron 表达式解析功能测试 (Parse)", () => {
    it("合法的 Cron 表达式解析", async () => {
      const res = await cronService.parse.service(
        { cronExpression: "*/5 * * * *" },
        userObj
      );
      expect(res.valid).toBe(true);
      expect(res.error).toBeNull();
      expect(res.frequency).toContain("每 5 分钟");
      expect(res.nextTimes.length).toBe(5);
    });

    it("非法的 Cron 表达式解析", async () => {
      const res = await cronService.parse.service(
        { cronExpression: "invalid-cron" },
        userObj
      );
      expect(res.valid).toBe(false);
      expect(res.error).not.toBeNull();
      expect(res.frequency).toBe("无法解析频率");
      expect(res.nextTimes.length).toBe(0);
    });
  });
});
