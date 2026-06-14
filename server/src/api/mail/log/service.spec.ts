import { describe, it, expect, vi, beforeEach } from "vitest";
import mailLogService from "./service";
import * as mailLogRepository from "./repository";

vi.mock("./repository", () => {
  return {
    findPageAll: vi.fn(),
    findPage: vi.fn(),
    findById: vi.fn(),
    onInsert: vi.fn(),
    onUpdate: vi.fn(),
    onDelete: vi.fn(),
  };
});

describe("Mail Log Service 单元测试", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("onListAll", () => {
    it("应该正确调用 findPageAll 并返回日志结果", async () => {
      const mockResult = [
        {
          id: 1,
          mailTo: "to@example.com",
          mailFrom: "from@example.com",
          title: "Title",
          sendStatus: true,
        },
      ];
      vi.mocked(mailLogRepository.findPageAll).mockResolvedValue(mockResult);

      const params = { keyword: "to@example.com", sendStatus: true };
      const res = await mailLogService.listAll.service(params);

      expect(mailLogRepository.findPageAll).toHaveBeenCalledWith(params);
      expect(res).toEqual(mockResult);
    });
  });

  describe("onList", () => {
    it("应该正确进行分页计算并返回日志列表和统计", async () => {
      const mockList = [
        {
          id: 1,
          mailTo: "to@example.com",
          mailFrom: "from@example.com",
          title: "Title",
          sendStatus: true,
          creatorId: 1,
          createTimeUtc: 1234567,
        },
      ];
      vi.mocked(mailLogRepository.findPage).mockResolvedValue({
        total: 1,
        list: mockList as any,
      });

      const params = { pageNo: 1, pageSize: 10, keyword: "to@example.com" };
      const res = await mailLogService.list.service(params);

      expect(mailLogRepository.findPage).toHaveBeenCalledWith({
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
    it("应该保存日志，返回新日志 id", async () => {
      vi.mocked(mailLogRepository.onInsert).mockResolvedValue(200);

      const addData = {
        mailTo: "to@example.com",
        mailFrom: "from@example.com",
        title: "Welcome Title",
        sendStatus: true,
        remark: "log remark",
      };

      const res = await mailLogService.add.service(addData, {
        userId: 7,
      } as any);

      expect(mailLogRepository.onInsert).toHaveBeenCalledWith({
        mailTo: "to@example.com",
        mailFrom: "from@example.com",
        title: "Welcome Title",
        sendStatus: true,
        remark: "log remark",
        creatorId: 7,
      });
      expect(res).toBe(200);
    });
  });

  describe("onUpdate", () => {
    it("应该更新日志并返回 id", async () => {
      vi.mocked(mailLogRepository.onUpdate).mockResolvedValue({ id: 5 } as any);

      const updateData = {
        id: 5,
        remark: "new log remark",
      };

      const res = await mailLogService.update.service(updateData, {
        userId: 8,
      } as any);

      expect(mailLogRepository.onUpdate).toHaveBeenCalledWith(
        5,
        expect.objectContaining({
          remark: "new log remark",
          updaterId: 8,
          updateTimeUtc: expect.any(Number),
        })
      );
      expect(res).toBe(5);
    });
  });

  describe("onDelete", () => {
    it("应该删除日志并返回 id", async () => {
      vi.mocked(mailLogRepository.onDelete).mockResolvedValue({ id: 9 } as any);

      const res = await mailLogService.delete.service({ id: 9 }, {
        userId: 8,
      } as any);

      expect(mailLogRepository.onDelete).toHaveBeenCalledWith(9);
      expect(res).toBe(9);
    });
  });

  describe("onGet", () => {
    it("应该获取日志详情", async () => {
      const mockDetail = { id: 10, mailTo: "get@example.com" };
      vi.mocked(mailLogRepository.findById).mockResolvedValue(
        mockDetail as any
      );

      const res = await mailLogService.get.service({ id: 10 });

      expect(mailLogRepository.findById).toHaveBeenCalledWith(10);
      expect(res).toEqual(mockDetail);
    });
  });
});
