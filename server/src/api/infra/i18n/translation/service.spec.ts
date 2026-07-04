import { describe, it, expect, vi, beforeEach } from "vitest";
import translationService, { utils } from "./service";
import * as translationRepository from "./repository";
import { kv } from "@/middleware/cache";
import type { TranslationPOLike } from "./model";
import type { UserObj } from "@/types/app";

vi.mock("./repository", () => {
  return {
    findPageAll: vi.fn(),
    findPage: vi.fn(),
    findById: vi.fn(),
    findByKeyAndLang: vi.fn(),
    findTranslationsByIds: vi.fn(),
    findDuplicates: vi.fn(),
    onInsert: vi.fn(),
    onUpdate: vi.fn(),
    onDelete: vi.fn(),
  };
});

vi.mock("@/middleware/cache", () => {
  return {
    kv: {
      put: vi.fn(),
      get: vi.fn(),
      delete: vi.fn(),
    },
  };
});

describe("I18n Translation Service 单元测试", () => {
  const userObj = { userId: 1 } as unknown as UserObj;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("onListAll", () => {
    it("应该正确调用 findPageAll 并返回列表", async () => {
      const mockResult = [
        { id: 1, application: "backend", tKey: "key1", tValue: "value1" },
      ];
      vi.mocked(translationRepository.findPageAll).mockResolvedValue(
        mockResult as unknown as TranslationPOLike[]
      );

      const params = { isEnabled: true };
      const res = await translationService.listAll.service(params);

      expect(translationRepository.findPageAll).toHaveBeenCalledWith(params);
      expect(res).toEqual(mockResult);
    });
  });

  describe("onList", () => {
    it("应该分页查询并计算分页信息", async () => {
      const mockList = [{ id: 1, tKey: "key" }];
      vi.mocked(translationRepository.findPage).mockResolvedValue({
        total: 10,
        list: mockList as unknown as TranslationPOLike[],
      });

      const params = { pageNo: 2, pageSize: 5 };
      const res = await translationService.list.service(params);

      expect(translationRepository.findPage).toHaveBeenCalledWith({
        pageNo: 2,
        pageSize: 5,
        orderBy: "id",
        descend: true,
        keyword: undefined,
        application: undefined,
        business: undefined,
        langCode: undefined,
        isEnabled: undefined,
      });
      expect(res).toEqual({
        total: 10,
        totalPage: 2,
        currentPage: 2,
        pageSize: 5,
        list: mockList,
      });
    });
  });

  describe("onAdd", () => {
    it("如果是 backend 应用，添加时同步写入 KV 缓存", async () => {
      vi.mocked(translationRepository.onInsert).mockResolvedValue(100);

      const addData = {
        application: "backend",
        business: "general",
        langCode: "zh-CN",
        tKey: "hello",
        tValue: "你好",
        isEnabled: true,
        remark: "remark",
        valueHash: "hash",
      };

      const res = await translationService.add.service(addData as any, userObj);

      expect(translationRepository.onInsert).toHaveBeenCalledWith({
        ...addData,
        creatorId: 1,
      });
      expect(kv.put).toHaveBeenCalledWith(
        "i18n.translation:zh-CN.hello",
        "你好"
      );
      expect(res).toBe(100);
    });

    it("如果是 frontend 应用，添加时不同步 KV 缓存", async () => {
      vi.mocked(translationRepository.onInsert).mockResolvedValue(101);

      const addData = {
        application: "frontend",
        business: "general",
        langCode: "zh-CN",
        tKey: "hello",
        tValue: "你好",
        isEnabled: true,
        remark: "remark",
        valueHash: "hash",
      };

      const res = await translationService.add.service(addData as any, userObj);

      expect(kv.put).not.toHaveBeenCalled();
      expect(res).toBe(101);
    });
  });

  describe("onUpdate", () => {
    it("如果是 backend 应用，更新时同步更新 KV 缓存", async () => {
      const mockRecord = {
        id: 2,
        application: "backend",
        langCode: "zh-CN",
        tKey: "hello",
        tValue: "旧值",
      };
      // 第一次 get 获取前置状态，第二次 get 获取当前状态
      vi.mocked(translationRepository.findById)
        .mockResolvedValueOnce(mockRecord as unknown as TranslationPOLike) // onGet for validation & previousRecord
        .mockResolvedValueOnce({
          ...mockRecord,
          tValue: "新值",
        } as unknown as TranslationPOLike); // onGet for current in cacheSync

      vi.mocked(translationRepository.onUpdate).mockResolvedValue({
        id: 2,
      } as unknown as TranslationPOLike);

      const updateData = { id: 2, application: "backend", tValue: "新值" };
      const res = await translationService.update.service(
        updateData as any,
        userObj
      );

      expect(translationRepository.onUpdate).toHaveBeenCalledWith(
        2,
        expect.objectContaining({
          tValue: "新值",
          updaterId: 1,
          updateTimeUtc: expect.any(Number),
        })
      );
      expect(kv.put).toHaveBeenCalledWith(
        "i18n.translation:zh-CN.hello",
        "新值"
      );
      expect(res).toBe(2);
    });

    it("如果从 backend 修改为 frontend，应该删除 KV 中的缓存", async () => {
      const mockRecord = {
        id: 3,
        application: "backend",
        langCode: "zh-CN",
        tKey: "hello",
      };
      vi.mocked(translationRepository.findById)
        .mockResolvedValueOnce(mockRecord as unknown as TranslationPOLike)
        .mockResolvedValueOnce({
          ...mockRecord,
          application: "frontend",
        } as unknown as TranslationPOLike);

      vi.mocked(translationRepository.onUpdate).mockResolvedValue({
        id: 3,
      } as unknown as TranslationPOLike);

      const updateData = { id: 3, application: "frontend" };
      const res = await translationService.update.service(
        updateData as any,
        userObj
      );

      expect(kv.delete).toHaveBeenCalledWith("i18n.translation:zh-CN.hello");
      expect(res).toBe(3);
    });
  });

  describe("onDelete", () => {
    it("如果是 backend 应用，删除时同步删除 KV 缓存", async () => {
      const mockRecord = {
        id: 4,
        application: "backend",
        langCode: "zh-CN",
        tKey: "hello",
      };
      vi.mocked(translationRepository.findById).mockResolvedValue(
        mockRecord as unknown as TranslationPOLike
      );
      vi.mocked(translationRepository.onDelete).mockResolvedValue({
        id: 4,
      } as unknown as TranslationPOLike);

      const res = await translationService.delete.service({ id: 4 });

      expect(kv.delete).toHaveBeenCalledWith("i18n.translation:zh-CN.hello");
      expect(res).toBe(4);
    });
  });

  describe("onCheckDuplicate", () => {
    it("发现重复文案时返回 hasDuplicate: true 并返回重复项", async () => {
      const mockDuplicate = {
        id: 5,
        tValue: "你好",
        application: "backend",
        tKey: "key",
      };
      vi.mocked(translationRepository.findDuplicates).mockResolvedValue([
        mockDuplicate as unknown as TranslationPOLike,
      ]);

      const res = await translationService.checkDuplicate.service({
        tValue: "你好",
        valueHash: "hash",
        excludeId: 1,
      });

      expect(translationRepository.findDuplicates).toHaveBeenCalledWith({
        valueHash: "hash",
        excludeId: 1,
      });
      expect(res).toEqual({
        hasDuplicate: true,
        duplicates: [mockDuplicate],
      });
    });
  });

  describe("utils.getTranslationsByIds", () => {
    it("应该返回对应的翻译键值对", async () => {
      const mockRes = [{ value: 1, label: "label" }];
      vi.mocked(translationRepository.findTranslationsByIds).mockResolvedValue(
        mockRes
      );

      const res = await utils.getTranslationsByIds([1]);

      expect(translationRepository.findTranslationsByIds).toHaveBeenCalledWith([
        1,
      ]);
      expect(res).toEqual(mockRes);
    });
  });

  describe("utils.calculateSHA256", () => {
    it("应该正确计算出 sha256 字符串", async () => {
      const res = await utils.calculateSHA256("test");
      expect(res).toBe(
        "9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08"
      );
    });
  });

  describe("utils.verifyTKeyUnique", () => {
    it("唯一时返回 true", async () => {
      vi.mocked(translationRepository.findByKeyAndLang).mockResolvedValue(null);

      const res = await utils.verifyTKeyUnique(
        { tKey: "hello", langCode: "zh-CN" },
        2
      );

      expect(translationRepository.findByKeyAndLang).toHaveBeenCalledWith({
        tKey: "hello",
        langCode: "zh-CN",
        excludeId: 2,
      });
      expect(res).toBe(true);
    });
  });
});
