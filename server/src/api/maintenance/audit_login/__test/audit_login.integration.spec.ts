import { describe, it, expect, beforeAll, afterEach } from "vitest";
import db from "@/db/index";
import { setupTestDb, clearTestData } from "@/db/testHelper";
import auditLoginService, { utils } from "../service";
import { loginAuditTable } from "../model";
import { eq } from "drizzle-orm";

// 静态导入 SQL 文件
import auditLoginSql from "@/db/sql/maintenance_audit_login.sql?raw";

describe("Login Audit 全链路集成测试", () => {
  const testTables = ["maintenance_audit_login"];

  beforeAll(async () => {
    await setupTestDb(db, [auditLoginSql]);
    await clearTestData(db, testTables);
  });

  afterEach(async () => {
    await clearTestData(db, testTables);
  });

  describe("记录与检索登录审计日志", () => {
    it("录入审计日志并按用户ID分页查询", async () => {
      // 1. 录入几条登录记录
      await utils.recordLogin(101, "192.168.1.1", "Chrome");
      await utils.recordLogin(101, "192.168.1.2", "Safari");
      await utils.recordLogin(102, "10.0.0.1", "Firefox"); // 不同用户

      // 2. 检索全部记录 (不限用户)
      const listAll = await auditLoginService.list.service({
        pageNo: 1,
        pageSize: 10,
      });
      expect(listAll.total).toBe(3);
      expect(listAll.list.length).toBe(3);

      // 按照 ID 降序排列，最新添加的应该在最上面
      expect(listAll.list[0].userId).toBe(102);
      expect(listAll.list[1].userId).toBe(101);
      expect(listAll.list[1].ip).toBe("192.168.1.2");

      // 3. 按 userId = 101 过滤检索
      const listFiltered = await auditLoginService.list.service({
        pageNo: 1,
        pageSize: 10,
        userId: 101,
      });
      expect(listFiltered.total).toBe(2);
      expect(listFiltered.list.every((item) => item.userId === 101)).toBe(true);
    });

    it("最大保留数（Log Rotation）限制测试", async () => {
      const testUserId = 202;
      const baseTime = Date.now();

      // 直接 db.insert 保证时间戳严格递增（每条 +1ms），绕开同毫秒不确定性
      for (let i = 1; i <= 35; i++) {
        await db.insert(loginAuditTable).values({
          userId: testUserId,
          loginTimeUtc: baseTime + i, // 严格递增，i=1 最旧，i=35 最新
          ip: `10.0.0.${i}`,
          userAgent: `Browser-${i}`,
          creatorId: testUserId,
        });
      }

      // 模拟再调用一次 recordLogin，触发 Log Rotation（保留最新 30 条，清理超额的旧条目）
      // 先写入第 36 条（比所有已有的都新），触发对该用户历史记录的清理
      await utils.recordLogin(testUserId, "10.0.0.36", "Browser-36");

      // 获取当前用户的所有记录
      const records = await db
        .select()
        .from(loginAuditTable)
        .where(eq(loginAuditTable.userId, testUserId));

      // 共 36 条，保留最新的 30 条（7 到 36），清理最旧的 6 条（1 到 6）
      expect(records.length).toBe(30);

      const ips = records.map((r) => r.ip);

      // 最旧的 6 条（1~6）应该已被清理
      for (let i = 1; i <= 6; i++) {
        expect(ips).not.toContain(`10.0.0.${i}`);
      }
      // 最新的 30 条（7~36）应该被保留
      for (let i = 7; i <= 36; i++) {
        expect(ips).toContain(`10.0.0.${i}`);
      }
    });
  });
});
