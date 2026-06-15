import { describe, it, expect, vi, beforeEach } from "vitest";
import languageService, { utils } from "./service";
import * as languageRepository from "./repository";
import type { LanguagePOLike } from "./model";
import type { UserObj } from "@/types/app";

vi.mock("./repository", () => {
  return {
    findPageAll: vi.fn(),
    findPage: vi.fn(),
    findById: vi.fn(),
    findByLangCode: vi.fn(),
    onInsert: vi.fn(),
    onUpdate: vi.fn(),
    onDelete: vi.fn(),
  };
});

describe("I18n Language Service 单元测试", () => {
  const userObj = { userId: 1 } as unknown as UserObj;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("onListAll", () => {
    it("应该正确调用 findPageAll 并返回列表", async () => {
      const mockResult = [{ id: 1, langCode: "zh-CN", nativeName: "中文" }];
      vi.mocked(languageRepository.findPageAll).mockResolvedValue(
        mockResult as unknown as LanguagePOLike[]
      );

      const params = { isEnabled: true };
      const res = await languageService.listAll.service(params);

      expect(languageRepository.findPageAll).toHaveBeenCalledWith(params);
      expect(res).toEqual(mockResult);
    });
  });

  describe("onList", () => {
    it("应该正确调用 findPage 并计算分页", async () => {
      const mockList = [{ id: 1, langCode: "zh-CN" }];
      vi.mocked(languageRepository.findPage).mockResolvedValue({
        total: 5,
        list: mockList as unknown as LanguagePOLike[],
      });

      const params = { pageNo: 1, pageSize: 10, keyword: "zh" };
      const res = await languageService.list.service(params);

      expect(languageRepository.findPage).toHaveBeenCalledWith({
        pageNo: 1,
        pageSize: 10,
        orderBy: "sortOrder",
        descend: false,
        keyword: "zh",
        isEnabled: undefined,
      });
      expect(res).toEqual({
        total: 5,
        totalPage: 1,
        currentPage: 1,
        pageSize: 10,
        list: mockList,
      });
    });
  });

  describe("onAdd", () => {
    it("应该调用 onInsert 插入语言并返回 ID", async () => {
      vi.mocked(languageRepository.onInsert).mockResolvedValue(10);

      const addData = {
        langCode: "en-US",
        nativeName: "English",
        isEnabled: true,
        sortOrder: 1,
      };

      const res = await languageService.add.service(addData, userObj);

      expect(languageRepository.onInsert).toHaveBeenCalledWith({
        ...addData,
        creatorId: 1,
      });
      expect(res).toBe(10);
    });
  });

  describe("onUpdate", () => {
    it("更新成功时应该调用 onUpdate 并返回 ID", async () => {
      const mockRecord = { id: 2, langCode: "zh-CN" };
      vi.mocked(languageRepository.findById).mockResolvedValue(
        mockRecord as unknown as LanguagePOLike
      );
      vi.mocked(languageRepository.onUpdate).mockResolvedValue({
        id: 2,
      } as unknown as LanguagePOLike);

      const updateData = { id: 2, nativeName: "Chinese" };
      const res = await languageService.update.service(updateData, userObj);

      expect(languageRepository.findById).toHaveBeenCalledWith(2);
      expect(languageRepository.onUpdate).toHaveBeenCalledWith(
        2,
        expect.objectContaining({
          nativeName: "Chinese",
          updaterId: 1,
          updateTimeUtc: expect.any(Number),
        })
      );
      expect(res).toBe(2);
    });
  });

  describe("onDelete", () => {
    it("应该调用 onDelete 并返回 ID", async () => {
      vi.mocked(languageRepository.onDelete).mockResolvedValue({
        id: 3,
      } as unknown as LanguagePOLike);

      const res = await languageService.delete.service({ id: 3 });

      expect(languageRepository.onDelete).toHaveBeenCalledWith(3);
      expect(res).toBe(3);
    });
  });

  describe("onGet", () => {
    it("应该查询并返回详情", async () => {
      const mockRecord = { id: 4, langCode: "fr-FR" };
      vi.mocked(languageRepository.findById).mockResolvedValue(
        mockRecord as unknown as LanguagePOLike
      );

      const res = await languageService.get.service({ id: 4 });

      expect(languageRepository.findById).toHaveBeenCalledWith(4);
      expect(res).toEqual(mockRecord);
    });

    it("不存在时应抛出错误", async () => {
      vi.mocked(languageRepository.findById).mockResolvedValue(null);

      await expect(languageService.get.service({ id: 99 })).rejects.toThrow();
    });
  });

  describe("utils.verifyLangCode", () => {
    it("存在且可用时不报错", async () => {
      vi.mocked(languageRepository.findByLangCode).mockResolvedValue({
        id: 5,
      } as unknown as LanguagePOLike);

      await expect(utils.verifyLangCode("zh-CN")).resolves.not.toThrow();
      expect(languageRepository.findByLangCode).toHaveBeenCalledWith({
        langCode: "zh-CN",
        isEnabled: true,
      });
    });

    it("不存在或不可用时报错", async () => {
      vi.mocked(languageRepository.findByLangCode).mockResolvedValue(null);

      await expect(utils.verifyLangCode("zh-CN")).rejects.toThrow();
    });
  });

  describe("utils.verifyLangCodeUnique", () => {
    it("唯一时返回 true", async () => {
      vi.mocked(languageRepository.findByLangCode).mockResolvedValue(null);

      const res = await utils.verifyLangCodeUnique("zh-CN", 2);

      expect(languageRepository.findByLangCode).toHaveBeenCalledWith({
        langCode: "zh-CN",
        excludeId: 2,
      });
      expect(res).toBe(true);
    });

    it("重复时返回 false", async () => {
      vi.mocked(languageRepository.findByLangCode).mockResolvedValue({
        id: 3,
      } as unknown as LanguagePOLike);

      const res = await utils.verifyLangCodeUnique("zh-CN");

      expect(res).toBe(false);
    });
  });
});
