import { describe, it, expect, vi, beforeEach } from "vitest";
import mailTemplateService from "./service";
import * as mailTemplateRepository from "./repository";

vi.mock("./repository", () => {
  return {
    findPageAll: vi.fn(),
    findPage: vi.fn(),
    findById: vi.fn(),
    findByName: vi.fn(),
    onInsert: vi.fn(),
    onUpdate: vi.fn(),
    onDelete: vi.fn(),
  };
});

describe("Mail Template Service 单元测试", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("onListAll", () => {
    it("应该正确调用 findPageAll 并返回结果", async () => {
      const mockResult = [
        {
          id: 1,
          name: "test_tmpl",
          title: "Test Title",
          langCode: "zh-CN",
          content: "Test Content",
          category: "test",
          isEnabled: true,
        },
      ];
      vi.mocked(mailTemplateRepository.findPageAll).mockResolvedValue(
        mockResult
      );

      const params = { keyword: "test", isEnabled: true };
      const res = await mailTemplateService.listAll.service(params);

      expect(mailTemplateRepository.findPageAll).toHaveBeenCalledWith(params);
      expect(res).toEqual(mockResult);
    });
  });

  describe("onList", () => {
    it("应该正确进行分页计算并返回列表和统计", async () => {
      const mockList = [
        {
          id: 1,
          name: "test_tmpl",
          title: "Test Title",
          langCode: "zh-CN",
          content: "Test Content",
          category: "test",
          isEnabled: true,
          creatorId: 1,
          createTimeUtc: 1234567,
        },
      ];
      vi.mocked(mailTemplateRepository.findPage).mockResolvedValue({
        total: 1,
        list: mockList as any,
      });

      const params = { pageNo: 1, pageSize: 10, keyword: "test" };
      const res = await mailTemplateService.list.service(params);

      expect(mailTemplateRepository.findPage).toHaveBeenCalledWith({
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
    it("应该保存模板，返回新模板 id", async () => {
      vi.mocked(mailTemplateRepository.onInsert).mockResolvedValue(100);

      const addData = {
        name: "welcome",
        title: "Welcome Title",
        langCode: "en-US",
        content: "Welcome Content",
        isEnabled: true,
        remark: "remark",
      };

      const res = await mailTemplateService.add.service(addData, {
        userId: 5,
      } as any);

      expect(mailTemplateRepository.onInsert).toHaveBeenCalledWith({
        name: "welcome",
        title: "Welcome Title",
        langCode: "en-US",
        content: "Welcome Content",
        isEnabled: true,
        remark: "remark",
        creatorId: 5,
      });
      expect(res).toBe(100);
    });
  });

  describe("onUpdate", () => {
    it("应该更新并返回 id", async () => {
      vi.mocked(mailTemplateRepository.onUpdate).mockResolvedValue({
        id: 2,
      } as any);

      const updateData = {
        id: 2,
        title: "New Title",
        content: "New Content",
      };

      const res = await mailTemplateService.update.service(updateData, {
        userId: 6,
      } as any);

      expect(mailTemplateRepository.onUpdate).toHaveBeenCalledWith(
        2,
        expect.objectContaining({
          title: "New Title",
          content: "New Content",
          updaterId: 6,
          updateTimeUtc: expect.any(Number),
        })
      );
      expect(res).toBe(2);
    });
  });

  describe("onDelete", () => {
    it("应该删除并返回 id", async () => {
      vi.mocked(mailTemplateRepository.onDelete).mockResolvedValue({
        id: 3,
      } as any);

      const res = await mailTemplateService.delete.service({ id: 3 }, {
        userId: 6,
      } as any);

      expect(mailTemplateRepository.onDelete).toHaveBeenCalledWith(3);
      expect(res).toBe(3);
    });
  });

  describe("onGet", () => {
    it("应该获取模板详情", async () => {
      const mockDetail = { id: 4, name: "get_tmpl" };
      vi.mocked(mailTemplateRepository.findById).mockResolvedValue(
        mockDetail as any
      );

      const res = await mailTemplateService.get.service({ id: 4 });

      expect(mailTemplateRepository.findById).toHaveBeenCalledWith(4);
      expect(res).toEqual(mockDetail);
    });
  });
});
