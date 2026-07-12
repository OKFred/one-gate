import { describe, it, expect, vi, beforeEach } from "vitest";
import cronService from "./service";
import * as cronRepository from "./repository";
import type { UserObj } from "@hodor/core/types/app";

vi.mock("./repository", () => {
  return {
    findPage: vi.fn(),
    findById: vi.fn(),
    onInsert: vi.fn(),
    onUpdate: vi.fn(),
    onDelete: vi.fn(),
    findLogsPage: vi.fn(),
  };
});

vi.mock("@hodor/core/utils/i18n/shared", () => {
  return {
    getTranslation: async (langCode: string, key: string) => {
      const mockDict: Record<string, string> = {
        "cron.frequency.minutes": "每 {minutes} 分钟",
        "cron.frequency.minutely": "每分钟",
        "cron.frequency.hourly": "每小时",
        "cron.frequency.daily": "每天",
        "cron.frequency.seconds": "每 {seconds} 秒",
        "cron.frequency.custom": "自定义频率",
      };
      return mockDict[key] || key;
    },
  };
});

describe("Cron Service 单元测试", () => {
  const userObj = { userId: 1, langCode: "zh-CN" } as unknown as UserObj;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("onList", () => {
    it("应该正确进行分页查询并返回结果", async () => {
      const mockResult = {
        total: 1,
        list: [{ id: 1, jobKey: "k1", name: "Job 1", status: true }],
      };
      vi.mocked(cronRepository.findPage).mockResolvedValue(mockResult as any);

      const res = await cronService.list.service(
        { pageNo: 1, pageSize: 10, status: true },
        userObj
      );

      expect(cronRepository.findPage).toHaveBeenCalledWith({
        pageNo: 1,
        pageSize: 10,
        orderBy: "id",
        descend: true,
        keyword: undefined,
        status: true,
      });
      expect(res).toEqual({
        total: 1,
        totalPage: 1,
        currentPage: 1,
        pageSize: 10,
        list: mockResult.list,
      });
    });
  });

  describe("onAdd", () => {
    it("状态启用且合法 Cron 表达式时应该成功插入并返回新ID", async () => {
      vi.mocked(cronRepository.onInsert).mockResolvedValue(101);

      const res = await cronService.add.service(
        {
          jobKey: "job_k",
          name: "测试任务",
          cronExpression: "0 0 * * *", // 每天零点
          status: true,
          parameters: "arg1",
        },
        userObj
      );

      expect(cronRepository.onInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          jobKey: "job_k",
          name: "测试任务",
          cronExpression: "0 0 * * *",
          status: true,
          parameters: "arg1",
          nextRunTimeUtc: expect.any(Number),
          creatorId: 1,
        })
      );
      expect(res).toBe(101);
    });

    it("状态禁用时应该成功插入且 nextRunTimeUtc 应当为 null", async () => {
      vi.mocked(cronRepository.onInsert).mockResolvedValue(102);

      const res = await cronService.add.service(
        {
          jobKey: "job_disabled",
          name: "测试禁用任务",
          cronExpression: "invalid-cron-is-ok-when-disabled-but-wait",
          // 实际上如果状态为 false，代码里不会去 parse，因此不会报错！
          status: false,
        },
        userObj
      );

      expect(cronRepository.onInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          status: false,
          nextRunTimeUtc: null,
        })
      );
      expect(res).toBe(102);
    });

    it("状态启用但 Cron 表达式不合法时应抛出 INVALID_PARAMS 错误", async () => {
      await expect(
        cronService.add.service(
          {
            jobKey: "job_invalid",
            name: "非法任务",
            cronExpression: "invalid-cron",
            status: true,
          },
          userObj
        )
      ).rejects.toThrow("INVALID_PARAMS");
    });
  });

  describe("onUpdate", () => {
    it("当修改为合法 Cron 且状态启用时，应重新计算 nextRunTimeUtc 并更新", async () => {
      vi.mocked(cronRepository.findById).mockResolvedValue({
        id: 200,
        jobKey: "old",
        cronExpression: "0 0 * * *",
        status: false,
        nextRunTimeUtc: null,
      } as any);

      vi.mocked(cronRepository.onUpdate).mockResolvedValue({ id: 200 } as any);

      const res = await cronService.update.service(
        {
          id: 200,
          cronExpression: "*/5 * * * *",
          status: true,
        },
        userObj
      );

      expect(cronRepository.onUpdate).toHaveBeenCalledWith(
        200,
        expect.objectContaining({
          cronExpression: "*/5 * * * *",
          status: true,
          nextRunTimeUtc: expect.any(Number),
          updaterId: 1,
        })
      );
      expect(res).toBe(200);
    });
  });

  describe("onDelete", () => {
    it("应该成功调用 repository.onDelete 进行级联删除", async () => {
      vi.mocked(cronRepository.findById).mockResolvedValue({ id: 300 } as any);
      vi.mocked(cronRepository.onDelete).mockResolvedValue({ id: 300 } as any);

      const res = await cronService.delete.service({ id: 300 }, userObj);

      expect(cronRepository.onDelete).toHaveBeenCalledWith(300);
      expect(res).toBe(300);
    });
  });

  describe("onGet", () => {
    it("应该正确返回详情", async () => {
      const mockDetail = { id: 400, name: "Detail" };
      vi.mocked(cronRepository.findById).mockResolvedValue(mockDetail as any);

      const res = await cronService.get.service({ id: 400 }, userObj);
      expect(res).toEqual(mockDetail);
    });
  });

  describe("onListLogs", () => {
    it("应该正确调用 findLogsPage 并返回分页日志", async () => {
      const mockLogs = {
        total: 1,
        list: [
          {
            id: 1,
            jobId: 100,
            status: true,
            startTimeUtc: 1000,
            endTimeUtc: 2000,
            durationMs: 1000,
          },
        ],
      };
      vi.mocked(cronRepository.findLogsPage).mockResolvedValue(mockLogs as any);

      const res = await cronService.listLogs.service(
        { jobId: 100, pageNo: 1, pageSize: 10 },
        userObj
      );

      expect(cronRepository.findLogsPage).toHaveBeenCalledWith({
        jobId: 100,
        pageNo: 1,
        pageSize: 10,
      });
      expect(res).toEqual({
        total: 1,
        totalPage: 1,
        currentPage: 1,
        pageSize: 10,
        list: mockLogs.list,
      });
    });
  });

  describe("onParse", () => {
    it("对于合法 Cron，应正确解析并返回前五次运行时间及频率提示", async () => {
      const res = await cronService.parse.service(
        { cronExpression: "*/5 * * * *" },
        userObj
      );

      expect(res.valid).toBe(true);
      expect(res.error).toBeNull();
      expect(res.frequency).toContain("每 5 分钟");
      expect(res.nextTimes).toHaveLength(5);
    });

    it("对于非法 Cron，应返回 valid: false 和错误提示", async () => {
      const res = await cronService.parse.service(
        { cronExpression: "bad-cron" },
        userObj
      );

      expect(res.valid).toBe(false);
      expect(res.error).not.toBeNull();
      expect(res.frequency).toBe("无法解析频率");
      expect(res.nextTimes).toHaveLength(0);
    });
  });
});
