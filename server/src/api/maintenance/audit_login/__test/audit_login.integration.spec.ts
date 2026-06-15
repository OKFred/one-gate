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

      // 循环写入 35 条记录，验证只保留了最近的 30 条记录 (默认 maxKeep = 30)
      for (let i = 1; i <= 35; i++) {
        // 加上极微的时间间隔或不同 IP 区分
        await utils.recordLogin(testUserId, `10.0.0.${i}`, `Browser-${i}`);
      }

      // 获取当前用户的所有记录
      const records = await db
        .select()
        .from(loginAuditTable)
        .where(eq(loginAuditTable.userId, testUserId));

      expect(records.length).toBe(30);

      // 验证最旧的 5 条记录 (1 到 5) 已被清理，保留了最新的 6 到 35
      const ips = records.map((r) => r.ip);
      for (let i = 1; i <= 5; i++) {
        expect(ips).not.toContain(`10.0.0.${i}`);
      }
      for (let i = 6; i <= 35; i++) {
        expect(ips).toContain(`10.0.0.${i}`);
      }
    });
  });
});
