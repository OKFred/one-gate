import { describe, it, expect, vi, beforeEach } from "vitest";
import auditLoginService, { utils } from "./service";
import * as auditLoginRepository from "./repository";

vi.mock("./repository", () => {
  return {
    recordLogin: vi.fn(),
    findPage: vi.fn(),
  };
});

describe("Audit Login Service 单元测试", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("utils.recordLogin", () => {
    it("应该正确调用 repository.recordLogin 保存登录记录", async () => {
      await utils.recordLogin(123, "127.0.0.1", "Mozilla/5.0");

      expect(auditLoginRepository.recordLogin).toHaveBeenCalledWith(
        123,
        "127.0.0.1",
        "Mozilla/5.0"
      );
    });
  });

  describe("onList", () => {
    it("应该正确进行过滤与分页计算并返回结果", async () => {
      const mockList = [
        {
          id: 1,
          userId: 123,
          ip: "127.0.0.1",
          userAgent: "Mozilla/5.0",
          loginTimeUtc: 12345678,
        },
      ];
      vi.mocked(auditLoginRepository.findPage).mockResolvedValue({
        total: 1,
        list: mockList as any,
      });

      const params = { pageNo: 1, pageSize: 10, userId: 123 };
      const res = await auditLoginService.list.service(params);

      expect(auditLoginRepository.findPage).toHaveBeenCalledWith({
        pageNo: 1,
        pageSize: 10,
        orderBy: "id",
        descend: true,
        userId: 123,
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
});
