import { describe, it, expect, vi, beforeEach } from "vitest";
import apiTaskService from "./service";
import * as apiTaskRepository from "./repository";
import { executeApiTask } from "../cron/executor";
import type { UserObj } from "@hodor/core/types/app";

vi.mock("./repository", () => {
  return {
    findPage: vi.fn(),
    findByKey: vi.fn(),
    findById: vi.fn(),
    onInsert: vi.fn(),
    onUpdate: vi.fn(),
    onDelete: vi.fn(),
  };
});

vi.mock("../cron/executor", () => {
  return {
    executeApiTask: vi.fn(),
  };
});

describe("API Task Service 单元测试", () => {
  const userObj = { userId: 1 } as unknown as UserObj;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("onList", () => {
    it("应该正确进行分页计算并返回列表和统计", async () => {
      const mockList = [
        {
          id: 1,
          taskKey: "test_key",
          name: "Test Task",
          isEnabled: true,
        },
      ];
      vi.mocked(apiTaskRepository.findPage).mockResolvedValue({
        total: 1,
        list: mockList as any,
      });

      const params = { pageNo: 1, pageSize: 10, isEnabled: true };
      const res = await apiTaskService.list.service(params, userObj);

      expect(apiTaskRepository.findPage).toHaveBeenCalledWith({
        ...params,
        pageSize: 10,
      });
      expect(res).toEqual({
        total: 1,
        totalPage: 1,
        currentPage: 1,
        pageSize: 10,
        list: mockList,
      });
    });
  });

  describe("onAdd", () => {
    it("若 Key 已存在，应该抛出无效参数错误", async () => {
      vi.mocked(apiTaskRepository.findByKey).mockResolvedValue({
        id: 1,
        taskKey: "duplicate_key",
      } as any);

      const addData = {
        taskKey: "duplicate_key",
        name: "Test Task",
        baseUrl: "http://localhost",
        path: "/test",
        method: "GET" as const,
        timeoutMs: 30000,
        isEnabled: true,
      };

      await expect(
        apiTaskService.add.service(addData, userObj)
      ).rejects.toThrow("INVALID_PARAMS");
    });

    it("若 Key 不存在，应该正常插入任务并返回 id", async () => {
      vi.mocked(apiTaskRepository.findByKey).mockResolvedValue(null);
      vi.mocked(apiTaskRepository.onInsert).mockResolvedValue(42);

      const addData = {
        taskKey: "unique_key",
        name: "Test Task",
        baseUrl: "http://localhost",
        path: "/test",
        method: "GET" as const,
        timeoutMs: 30000,
        isEnabled: true,
      };

      const res = await apiTaskService.add.service(addData, userObj);

      expect(apiTaskRepository.onInsert).toHaveBeenCalledWith({
        ...addData,
        creatorId: 1,
      });
      expect(res).toBe(42);
    });
  });

  describe("onUpdate", () => {
    it("更新非当前记录的唯一 Key 冲突时，应该抛出错误", async () => {
      vi.mocked(apiTaskRepository.findById).mockResolvedValue({
        id: 2,
        taskKey: "old_key",
      } as any);
      vi.mocked(apiTaskRepository.findByKey).mockResolvedValue({
        id: 3,
        taskKey: "conflict_key",
      } as any);

      const updateData = {
        id: 2,
        taskKey: "conflict_key",
      };

      await expect(
        apiTaskService.update.service(updateData, userObj)
      ).rejects.toThrow("INVALID_PARAMS");
    });

    it("更新成功应返回更新记录的 id", async () => {
      const mockRecord = {
        id: 2,
        taskKey: "old_key",
      };
      vi.mocked(apiTaskRepository.findById).mockResolvedValue(
        mockRecord as any
      );
      vi.mocked(apiTaskRepository.findByKey).mockResolvedValue(null);
      vi.mocked(apiTaskRepository.onUpdate).mockResolvedValue({
        id: 2,
      } as any);

      const updateData = {
        id: 2,
        name: "Updated Task",
      };

      const res = await apiTaskService.update.service(updateData, userObj);

      expect(apiTaskRepository.onUpdate).toHaveBeenCalledWith(
        2,
        expect.objectContaining({
          name: "Updated Task",
          updaterId: 1,
          updateTimeUtc: expect.any(Number),
        })
      );
      expect(res).toBe(2);
    });
  });

  describe("onDelete", () => {
    it("记录不存在时应抛出错误", async () => {
      vi.mocked(apiTaskRepository.findById).mockResolvedValue(null);

      await expect(
        apiTaskService.delete.service({ id: 99 }, userObj)
      ).rejects.toThrow();
    });

    it("记录存在时删除并返回删除记录的 id", async () => {
      vi.mocked(apiTaskRepository.findById).mockResolvedValue({
        id: 99,
      } as any);
      vi.mocked(apiTaskRepository.onDelete).mockResolvedValue({
        id: 99,
      } as any);

      const res = await apiTaskService.delete.service({ id: 99 }, userObj);

      expect(apiTaskRepository.onDelete).toHaveBeenCalledWith(99);
      expect(res).toBe(99);
    });
  });

  describe("onGet", () => {
    it("应该正确返回记录详情", async () => {
      const mockRecord = { id: 10, name: "Detail Task" };
      vi.mocked(apiTaskRepository.findById).mockResolvedValue(
        mockRecord as any
      );

      const res = await apiTaskService.get.service({ id: 10 }, userObj);
      expect(res).toEqual(mockRecord);
    });
  });

  describe("onRunTest", () => {
    it("参数非 JSON 时应抛出参数错误", async () => {
      vi.mocked(apiTaskRepository.findById).mockResolvedValue({ id: 5 } as any);

      await expect(
        apiTaskService.runTest.service(
          { id: 5, parameters: "{invalid_json}" },
          userObj
        )
      ).rejects.toThrow("INVALID_PARAMS");
    });

    it("应该调用 executeApiTask 并返回执行结果与 Schema 校验", async () => {
      const mockTask = {
        id: 5,
        responseSchema: JSON.stringify({
          type: "object",
          properties: { status: { type: "string" } },
        }),
      };
      vi.mocked(apiTaskRepository.findById).mockResolvedValue(mockTask as any);
      vi.mocked(executeApiTask).mockResolvedValue({
        success: true,
        statusCode: 200,
        responseBody: JSON.stringify({ status: "ok" }),
        headers: { "content-type": "application/json" },
        statusText: "OK",
        url: "http://localhost/test",
      });

      const res = await apiTaskService.runTest.service(
        { id: 5, parameters: JSON.stringify({ arg: 1 }) },
        userObj
      );

      expect(executeApiTask).toHaveBeenCalledWith(mockTask, { arg: 1 });
      expect(res.success).toBe(true);
      expect(res.statusCode).toBe(200);
      expect(res.schemaValidation.valid).toBe(true);
      expect(res.schemaValidation.hasSchema).toBe(true);
    });
  });

  describe("onBulkAdd", () => {
    it("应该批量添加任务并正确返回成功与失败个数", async () => {
      vi.mocked(apiTaskRepository.findByKey)
        .mockResolvedValueOnce(null) // 第一个 unique
        .mockResolvedValueOnce({ id: 10 } as any); // 第二个 duplicate

      vi.mocked(apiTaskRepository.onInsert).mockResolvedValue(100);

      const bulkParams = {
        tasks: [
          {
            taskKey: "t1",
            name: "Task 1",
            baseUrl: "http://localhost",
            path: "/t1",
            method: "GET" as const,
          },
          {
            taskKey: "t2",
            name: "Task 2",
            baseUrl: "http://localhost",
            path: "/t2",
            method: "GET" as const,
          },
        ],
      };

      const res = await apiTaskService.bulkAdd.service(bulkParams, userObj);

      expect(res.successCount).toBe(1);
      expect(res.failedCount).toBe(1);
      expect(res.errors[0].taskKey).toBe("t2");
      expect(res.errors[0].message).toContain("已存在");
    });
  });
});
