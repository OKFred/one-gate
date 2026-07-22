import { describe, it, expect, vi, beforeEach } from "vitest";
import mailLogService from "./service";
import { registry } from "../../common/registry";

vi.mock("../../common/registry", () => {
  return {
    registry: {
      base: {
        log: {
          biz: {
            list: vi.fn(),
            add: vi.fn(),
            detail: vi.fn(),
          },
        },
      },
    },
  };
});

describe("Mail Log Service 单元测试", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("onListAll", () => {
    it("应该正确调用 registry.biz.list 并返回日志结果", async () => {
      const mockList = [
        {
          id: 1,
          namespace: "mail",
          logValue: {
            mailTo: "to@example.com",
            mailFrom: "from@example.com",
            title: "Title",
            sendStatus: true,
          },
          creatorId: 1,
          creatorName: "admin",
          createTimeUtc: 1234567,
        },
      ];
      vi.mocked(registry.base.log.biz.list).mockResolvedValue({
        list: mockList,
        total: 1,
      } as any);

      const params = {};
      const res = await mailLogService.listAll.service(params);

      expect(registry.base.log.biz.list).toHaveBeenCalledWith(
        expect.objectContaining({
          namespace: "mail",
        })
      );
      expect(res.length).toBe(1);
      expect(res[0].mailTo).toBe("to@example.com");
    });
  });

  describe("onList", () => {
    it("应该正确进行分页计算并返回日志列表和统计", async () => {
      const mockList = [
        {
          id: 1,
          namespace: "mail",
          logValue: {
            mailTo: "to@example.com",
            mailFrom: "from@example.com",
            title: "Title",
            sendStatus: true,
          },
          creatorId: 1,
          creatorName: "admin",
          createTimeUtc: 1234567,
        },
      ];
      vi.mocked(registry.base.log.biz.list).mockResolvedValue({
        list: mockList,
        total: 1,
      } as any);

      const params = { pageNo: 1, pageSize: 10 };
      const res = await mailLogService.list.service(params);

      expect(registry.base.log.biz.list).toHaveBeenCalledWith(
        expect.objectContaining({
          namespace: "mail",
          pageNo: 1,
          pageSize: 10,
        })
      );
      expect(res.total).toBe(1);
      expect(res.list.length).toBe(1);
    });
  });

  describe("onAdd", () => {
    it("应该正确组装数据并返回新插入的 ID", async () => {
      vi.mocked(registry.base.log.biz.add).mockResolvedValue(100 as any);

      const params = {
        title: "Test",
        mailTo: "to@example.com",
        mailFrom: "from@example.com",
        sendStatus: false,
      };
      const userObj = {
        id: 2,
        username: "user",
        realName: "User Name",
      } as any;

      const res = await mailLogService.add.service(params, userObj);

      expect(registry.base.log.biz.add).toHaveBeenCalledWith(
        expect.objectContaining({
          namespace: "mail",
          logValue: params,
          creatorId: 2,
        })
      );
      expect(res).toBe(100);
    });
  });

  describe("onGet", () => {
    it("应该返回对应的记录", async () => {
      const mockRecord = {
        id: 1,
        namespace: "mail",
        logValue: {
          mailTo: "to@example.com",
          mailFrom: "from@example.com",
          title: "Title",
          sendStatus: true,
        },
        creatorId: 1,
        creatorName: "admin",
        createTimeUtc: 1234567,
      };
      vi.mocked(registry.base.log.biz.detail).mockResolvedValue(
        mockRecord as any
      );

      const params = { id: 1 };
      const res = await mailLogService.get.service(params);

      expect(registry.base.log.biz.detail).toHaveBeenCalledWith(1);
      expect(res?.mailTo).toBe("to@example.com");
    });
  });
});
