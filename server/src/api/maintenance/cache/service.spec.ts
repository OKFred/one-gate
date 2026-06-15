import { describe, it, expect, vi, beforeEach } from "vitest";
import cacheService from "./service";
import { kv } from "@/middleware/cache";

vi.mock("@/middleware/cache", () => {
  return {
    kv: {
      list: vi.fn(),
      get: vi.fn(),
      put: vi.fn(),
      delete: vi.fn(),
      clear: vi.fn(),
    },
  };
});

describe("Cache Service 单元测试", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("onListKeys", () => {
    it("应该正确调用 kv.list 并返回键列表", async () => {
      const mockResult = {
        keys: [{ name: "key1" }, { name: "key2" }],
        list_complete: true,
      };
      vi.mocked(kv.list).mockResolvedValue(mockResult);

      const res = await cacheService.listKeys.service({
        prefix: "pre_",
        limit: 10,
      });

      expect(kv.list).toHaveBeenCalledWith({ prefix: "pre_", limit: 10 });
      expect(res).toEqual(mockResult);
    });
  });

  describe("onGet", () => {
    it("应该正确读取缓存，返回是否存在及数值", async () => {
      vi.mocked(kv.get).mockResolvedValue({ foo: "bar" });

      const res = await cacheService.get.service({
        key: "test_key",
        type: "json",
      });

      expect(kv.get).toHaveBeenCalledWith("test_key", { type: "json" });
      expect(res).toEqual({
        value: { foo: "bar" },
        exists: true,
      });
    });

    it("键不存在时，exists 应返回 false", async () => {
      vi.mocked(kv.get).mockResolvedValue(null);

      const res = await cacheService.get.service({
        key: "missing_key",
        type: "text",
      });

      expect(kv.get).toHaveBeenCalledWith("missing_key", { type: "text" });
      expect(res).toEqual({
        value: null,
        exists: false,
      });
    });
  });

  describe("onPut", () => {
    it("应该正确存入缓存值", async () => {
      vi.mocked(kv.put).mockResolvedValue(undefined);

      const res = await cacheService.put.service({
        key: "my_key",
        value: "my_val",
        expirationTtl: 60,
      });

      expect(kv.put).toHaveBeenCalledWith("my_key", "my_val", {
        expirationTtl: 60,
      });
      expect(res).toEqual({ success: true });
    });
  });

  describe("onDelete", () => {
    it("应该成功删除指定键", async () => {
      vi.mocked(kv.delete).mockResolvedValue(undefined);

      const res = await cacheService.delete.service({ key: "del_key" });

      expect(kv.delete).toHaveBeenCalledWith("del_key");
      expect(res).toEqual({ success: true });
    });
  });

  describe("onClear", () => {
    it("应该成功清空所有缓存", async () => {
      vi.mocked(kv.clear).mockResolvedValue(undefined);

      const res = await cacheService.clear.service({});

      expect(kv.clear).toHaveBeenCalled();
      expect(res).toEqual({ success: true });
    });
  });
});
