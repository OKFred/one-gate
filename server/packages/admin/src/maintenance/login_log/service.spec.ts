import { describe, it, expect, vi, beforeEach } from "vitest";
import auditLoginService, { utils } from "./service";
import { registry } from "../../common/registry";

vi.mock("../../common/registry", () => {
  return {
    registry: {
      base: {
        log: {
          sys: {
            add: vi.fn(),
            list: vi.fn(),
          },
        },
      },
    },
  };
});

describe("Audit Login Service 单元测试", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("utils.recordLogin", () => {
    it("应该正确调用 registry.base.log.sys.add 保存登录记录", async () => {
      await utils.recordLogin(123, "127.0.0.1", "Mozilla/5.0");

      expect(registry.base.log.sys.add).toHaveBeenCalledWith(
        expect.objectContaining({
          namespace: "login",
          logLevel: "INFO",
          payloadType: "json",
          creatorId: 123,
          logValue: expect.objectContaining({
            userId: 123,
            ip: "127.0.0.1",
            userAgent: "Mozilla/5.0",
          }),
        })
      );
    });
  });

  describe("onList", () => {
    it("应该正确进行过滤与分页计算并返回结果", async () => {
      const mockResult = {
        total: 1,
        totalPage: 1,
        currentPage: 1,
        pageSize: 10,
        list: [
          {
            id: 1,
            namespace: "login",
            logLevel: "INFO",
            payloadType: "json",
            logValue: {
              userId: 123,
              ip: "127.0.0.1",
              userAgent: "Mozilla/5.0",
            },
            creatorId: 123,
          },
        ],
      };
      vi.mocked(registry.base.log.sys.list).mockResolvedValue(
        mockResult as any
      );

      const params = { pageNo: 1, pageSize: 10, userId: 123 };
      const res = await auditLoginService.list.service(params);

      expect(registry.base.log.sys.list).toHaveBeenCalledWith(
        expect.objectContaining({
          namespace: "login",
          pageNo: 1,
          pageSize: 10,
        })
      );
      expect(res.total).toBe(1);
      expect(res.list[0].userId).toBe(123);
      expect(res.list[0].ip).toBe("127.0.0.1");
    });
  });
});
