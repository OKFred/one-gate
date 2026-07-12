import { describe, it, expect, vi, beforeEach } from "vitest";
import regionService, { utils } from "./service";
import * as regionRepository from "./repository";
import type { RegionPOLike, RegionAddVOLike } from "./model";
import type { UserObj } from "@hodor/core/types/app";

vi.mock("./repository", () => {
  return {
    findPageAll: vi.fn(),
    findPage: vi.fn(),
    findById: vi.fn(),
    findByCodes: vi.fn(),
    onInsert: vi.fn(),
    onUpdate: vi.fn(),
    onDelete: vi.fn(),
  };
});

describe("I18n Region Service 单元测试", () => {
  const userObj = { userId: 1 } as unknown as UserObj;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("onListAll", () => {
    it("应该正确调用 findPageAll 并返回列表", async () => {
      const mockResult = [{ id: 1, alpha2Code: "CN", labels: { zh: "中国" } }];
      vi.mocked(regionRepository.findPageAll).mockResolvedValue(
        mockResult as unknown as RegionPOLike[]
      );

      const params = { isEnabled: true };
      const res = await regionService.listAll.service(params);

      expect(regionRepository.findPageAll).toHaveBeenCalledWith(params);
      expect(res).toEqual(mockResult);
    });
  });

  describe("onList", () => {
    it("应该正确分页查询并计算分页", async () => {
      const mockList = [{ id: 1, alpha2Code: "CN" }];
      vi.mocked(regionRepository.findPage).mockResolvedValue({
        total: 10,
        list: mockList as unknown as RegionPOLike[],
      });

      const params = { pageNo: 1, pageSize: 5 };
      const res = await regionService.list.service(params);

      expect(regionRepository.findPage).toHaveBeenCalledWith({
        pageNo: 1,
        pageSize: 5,
        orderBy: "id",
        descend: true,
        keyword: undefined,
        isEnabled: undefined,
      });
      expect(res).toEqual({
        total: 10,
        totalPage: 2,
        currentPage: 1,
        pageSize: 5,
        list: mockList,
      });
    });
  });

  describe("onAdd", () => {
    it("应该调用 onInsert 插入国家并返回 ID", async () => {
      vi.mocked(regionRepository.onInsert).mockResolvedValue(15);

      const addData = {
        labels: { en: "China" },
        alpha2Code: "CN",
        alpha3Code: "CHN",
        numeric: 156,
        iso3166Independent: true,
        businessLanguages: ["zh-CN"],
        isEnabled: true,
        remark: "remark",
      };

      const res = await regionService.add.service(
        addData as unknown as RegionAddVOLike,
        userObj
      );

      expect(regionRepository.onInsert).toHaveBeenCalledWith({
        ...addData,
        creatorId: 1,
      });
      expect(res).toBe(15);
    });
  });

  describe("onUpdate", () => {
    it("更新成功时应该调用 onUpdate 并返回 ID", async () => {
      const mockRecord = { id: 2, alpha2Code: "US" };
      vi.mocked(regionRepository.findById).mockResolvedValue(
        mockRecord as unknown as RegionPOLike
      );
      vi.mocked(regionRepository.onUpdate).mockResolvedValue({
        id: 2,
      } as unknown as RegionPOLike);

      const updateData = { id: 2, alpha3Code: "USA" };
      const res = await regionService.update.service(
        updateData as any,
        userObj
      );

      expect(regionRepository.findById).toHaveBeenCalledWith(2);
      expect(regionRepository.onUpdate).toHaveBeenCalledWith(
        2,
        expect.objectContaining({
          alpha3Code: "USA",
          updaterId: 1,
          updateTimeUtc: expect.any(Number),
        })
      );
      expect(res).toBe(2);
    });
  });

  describe("onDelete", () => {
    it("应该调用 onDelete 并返回 ID", async () => {
      vi.mocked(regionRepository.onDelete).mockResolvedValue({
        id: 3,
      } as unknown as RegionPOLike);

      const res = await regionService.delete.service({ id: 3 });

      expect(regionRepository.onDelete).toHaveBeenCalledWith(3);
      expect(res).toBe(3);
    });
  });

  describe("onGet", () => {
    it("应该查询并返回详情", async () => {
      const mockRecord = { id: 4, alpha2Code: "JP" };
      vi.mocked(regionRepository.findById).mockResolvedValue(
        mockRecord as unknown as RegionPOLike
      );

      const res = await regionService.get.service({ id: 4 });

      expect(regionRepository.findById).toHaveBeenCalledWith(4);
      expect(res).toEqual(mockRecord);
    });

    it("不存在时应抛出错误", async () => {
      vi.mocked(regionRepository.findById).mockResolvedValue(null);

      await expect(regionService.get.service({ id: 99 })).rejects.toThrow();
    });
  });

  describe("utils.verifyRegion", () => {
    it("存在且可用时不报错", async () => {
      vi.mocked(regionRepository.findById).mockResolvedValue({
        id: 5,
        isEnabled: true,
      } as unknown as RegionPOLike);

      await expect(utils.verifyRegion(5)).resolves.not.toThrow();
    });

    it("不可用时应报错", async () => {
      vi.mocked(regionRepository.findById).mockResolvedValue({
        id: 5,
        isEnabled: false,
      } as unknown as RegionPOLike);

      await expect(utils.verifyRegion(5)).rejects.toThrow();
    });
  });

  describe("utils.verifyRegionCodeUnique", () => {
    it("唯一时返回 true", async () => {
      vi.mocked(regionRepository.findByCodes).mockResolvedValue(null);

      const res = await utils.verifyRegionCodeUnique({ alpha2Code: "CN" }, 2);

      expect(regionRepository.findByCodes).toHaveBeenCalledWith({
        alpha2Code: "CN",
        alpha3Code: undefined,
        numeric: undefined,
        excludeId: 2,
      });
      expect(res).toBe(true);
    });

    it("重复时返回 false", async () => {
      vi.mocked(regionRepository.findByCodes).mockResolvedValue({
        id: 3,
      } as unknown as RegionPOLike);

      const res = await utils.verifyRegionCodeUnique({ alpha2Code: "CN" });

      expect(res).toBe(false);
    });
  });
});
