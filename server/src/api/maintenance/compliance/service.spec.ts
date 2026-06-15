import { describe, it, expect, vi, beforeEach } from "vitest";
import { exportDeletionRecord } from "./service";
import * as complianceRepository from "./repository";

vi.mock("./repository", () => {
  return {
    onInsert: vi.fn(),
    findPage: vi.fn(),
  };
});

describe("Compliance Service 单元测试", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("exportDeletionRecord", () => {
    it("应该正确组装默认值并调用 repository.onInsert 插入数据", async () => {
      vi.mocked(complianceRepository.onInsert).mockResolvedValue(100);

      const res = await exportDeletionRecord(
        {
          sourceTable: "users",
          sourcePrimaryKey: "42",
        },
        999
      );

      expect(complianceRepository.onInsert).toHaveBeenCalledWith({
        sourceSystem: "self",
        sourceDatabase: "self",
        sourceTable: "users",
        sourcePrimaryKey: "42",
        deleteReason: null,
        deleteType: null,
        recordSnapshot: null,
        remark: null,
        restorable: false,
        restoreUntilTimeUtc: null,
        restoredTimeUtc: null,
        restorerId: null,
        complianceNote: null,
        creatorId: 999,
      });
      expect(res).toBe(100);
    });

    it("应该支持传入自定义的归档字段", async () => {
      vi.mocked(complianceRepository.onInsert).mockResolvedValue(200);

      const customData = {
        sourceSystem: "order_sys",
        sourceDatabase: "orders_db",
        sourceTable: "t_order",
        sourcePrimaryKey: "ORD-12345",
        deleteReason: "personal_data",
        deleteType: "purge",
        recordSnapshot: '{"id":"ORD-12345","amount":100}',
        remark: "GDPR cleanup",
        restorable: true,
        restoreUntilTimeUtc: 1800000000000,
        complianceNote: "(EU) 2016/679",
      };

      const res = await exportDeletionRecord(customData, 888);

      expect(complianceRepository.onInsert).toHaveBeenCalledWith({
        ...customData,
        restoredTimeUtc: null,
        restorerId: null,
        creatorId: 888,
      });
      expect(res).toBe(200);
    });
  });
});
