import { describe, it, expect, vi, beforeEach } from "vitest";
import aiLlmConfigService from "./service";
import * as aiLlmConfigRepository from "./repository";

vi.mock("./repository", () => {
  return {
    findPageAll: vi.fn(),
    findPage: vi.fn(),
    findById: vi.fn(),
    getDefaultConfig: vi.fn(),
    disableOtherDefaults: vi.fn(),
    onInsert: vi.fn(),
    onUpdate: vi.fn(),
    onDelete: vi.fn(),
  };
});

describe("AI Config Service 单元测试", () => {
  const userObj = { userId: 1 } as any;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.unstubAllGlobals();
  });

  describe("onListAll", () => {
    it("应该调用 findPageAll 并返回列表", async () => {
      const mockList = [
        {
          id: 1,
          name: "Config 1",
          provider: "OpenAI",
          isEnabled: true,
          isDefault: true,
        },
      ];
      vi.mocked(aiLlmConfigRepository.findPageAll).mockResolvedValue(
        mockList as any
      );

      const params = { isEnabled: true };
      const res = await aiLlmConfigService.listAll.service(params);

      expect(aiLlmConfigRepository.findPageAll).toHaveBeenCalledWith(params);
      expect(res).toEqual(mockList);
    });
  });

  describe("onList", () => {
    it("应该分页查询并计算分页元数据", async () => {
      const mockList = [{ id: 1, name: "Config 1", provider: "OpenAI" }];
      vi.mocked(aiLlmConfigRepository.findPage).mockResolvedValue({
        total: 15,
        list: mockList as any,
      });

      const params = { pageNo: 2, pageSize: 10 };
      const res = await aiLlmConfigService.list.service(params);

      expect(aiLlmConfigRepository.findPage).toHaveBeenCalledWith({
        ...params,
        pageNo: 2,
        pageSize: 10,
      });
      expect(res).toEqual({
        total: 15,
        totalPage: 2,
        currentPage: 2,
        pageSize: 10,
        list: mockList,
      });
    });
  });

  describe("onAdd", () => {
    it("如果是默认配置，应该先取消其他默认配置，再插入新配置并返回 ID", async () => {
      vi.mocked(aiLlmConfigRepository.onInsert).mockResolvedValue(42);

      const addData = {
        name: "New LLM",
        provider: "OpenAI",
        apiKey: "key",
        model: "model",
        isEnabled: true,
        isDefault: true,
      };

      const res = await aiLlmConfigService.add.service(addData, userObj);

      expect(aiLlmConfigRepository.disableOtherDefaults).toHaveBeenCalledTimes(
        1
      );
      expect(aiLlmConfigRepository.onInsert).toHaveBeenCalledWith({
        ...addData,
        creatorId: 1,
      });
      expect(res).toBe(42);
    });

    it("如果不是默认配置，不需要取消其他默认配置", async () => {
      vi.mocked(aiLlmConfigRepository.onInsert).mockResolvedValue(43);

      const addData = {
        name: "New LLM",
        provider: "OpenAI",
        apiKey: "key",
        model: "model",
        isEnabled: true,
        isDefault: false,
      };

      const res = await aiLlmConfigService.add.service(addData, userObj);

      expect(aiLlmConfigRepository.disableOtherDefaults).not.toHaveBeenCalled();
      expect(aiLlmConfigRepository.onInsert).toHaveBeenCalledWith({
        ...addData,
        creatorId: 1,
      });
      expect(res).toBe(43);
    });
  });

  describe("onUpdate", () => {
    it("如果设为默认，应该更新时取消其他默认配置，并返回 ID", async () => {
      const mockRecord = { id: 5, name: "Old Name", isDefault: false };
      vi.mocked(aiLlmConfigRepository.findById).mockResolvedValue(
        mockRecord as any
      );
      vi.mocked(aiLlmConfigRepository.onUpdate).mockResolvedValue({
        id: 5,
      } as any);

      const updateData = {
        id: 5,
        name: "New Name",
        isDefault: true,
      };

      const res = await aiLlmConfigService.update.service(updateData, userObj);

      expect(aiLlmConfigRepository.findById).toHaveBeenCalledWith(5);
      expect(aiLlmConfigRepository.disableOtherDefaults).toHaveBeenCalledWith(
        5
      );
      expect(aiLlmConfigRepository.onUpdate).toHaveBeenCalledWith(
        5,
        expect.objectContaining({
          name: "New Name",
          isDefault: true,
          updaterId: 1,
          updateTimeUtc: expect.any(Number),
        })
      );
      expect(res).toBe(5);
    });
  });

  describe("onGet", () => {
    it("获取成功应该返回详情记录", async () => {
      const mockRecord = { id: 5, name: "Name" };
      vi.mocked(aiLlmConfigRepository.findById).mockResolvedValue(
        mockRecord as any
      );

      const res = await aiLlmConfigService.get.service({ id: 5 });

      expect(aiLlmConfigRepository.findById).toHaveBeenCalledWith(5);
      expect(res).toEqual(mockRecord);
    });

    it("记录不存在时应该抛出异常", async () => {
      vi.mocked(aiLlmConfigRepository.findById).mockResolvedValue(null);

      await expect(
        aiLlmConfigService.get.service({ id: 99 })
      ).rejects.toThrow();
    });
  });

  describe("onDelete", () => {
    it("应该删除并返回被删除记录 ID", async () => {
      vi.mocked(aiLlmConfigRepository.onDelete).mockResolvedValue({
        id: 6,
      } as any);

      const res = await aiLlmConfigService.delete.service({ id: 6 });

      expect(aiLlmConfigRepository.onDelete).toHaveBeenCalledWith(6);
      expect(res).toBe(6);
    });
  });

  describe("onVerify", () => {
    it("模型连接验证成功应该返回 true", async () => {
      const mockRecord = {
        id: 7,
        baseUrl: "https://api.test.com",
        apiKey: "secret",
      };
      vi.mocked(aiLlmConfigRepository.findById).mockResolvedValue(
        mockRecord as any
      );

      const mockFetch = vi.fn().mockResolvedValue({
        json: async () => ({
          object: "list",
          data: [{ id: "model-1" }],
        }),
      });
      vi.stubGlobal("fetch", mockFetch);

      const res = await aiLlmConfigService.verify.service({ id: 7 });

      expect(mockFetch).toHaveBeenCalledWith(
        "https://api.test.com/models",
        expect.objectContaining({
          headers: {
            Authorization: "Bearer secret",
          },
        })
      );
      expect(res).toBe(true);
    });

    it("连通性故障时应该返回 false", async () => {
      const mockRecord = {
        id: 7,
        baseUrl: "https://api.test.com",
        apiKey: "secret",
      };
      vi.mocked(aiLlmConfigRepository.findById).mockResolvedValue(
        mockRecord as any
      );

      const mockFetch = vi.fn().mockRejectedValue(new Error("Network Error"));
      vi.stubGlobal("fetch", mockFetch);

      const res = await aiLlmConfigService.verify.service({ id: 7 });

      expect(res).toBe(false);
    });
  });
});
