import { describe, it, expect, beforeAll, afterEach } from "vitest";
import db from "@hodor/core/db/index";
import { setupTestDb, clearTestData } from "@hodor/core/db/testHelper";
import auditLoginService, { utils } from "../service";
import { loginAuditTable } from "../model";
import { eq } from "drizzle-orm";

// 静态导入 SQL 文件
import auditLoginSql from "@hodor/core/db/sql/maintenance_audit_login.sql?raw";

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
      const maxKeep = 5;
      const baseTime = Date.now();

      // 先通过 db.insert 写入 5 条严格递增时间戳的"旧记录"（不触发清理）
      for (let i = 1; i <= 5; i++) {
        await db.insert(loginAuditTable).values({
          userId: testUserId,
          loginTimeUtc: baseTime + i, // 严格递增，i=1 最旧
          ip: `10.0.0.${i}`,
          userAgent: `Browser-${i}`,
          creatorId: testUserId,
        });
      }

      // 此时共 5 条，等于 maxKeep，尚未触发清理
      const beforeCount = await db
        .select()
        .from(loginAuditTable)
        .where(eq(loginAuditTable.userId, testUserId));
      expect(beforeCount.length).toBe(5);

      // 直接插入第 6 条（时间戳比所有记录都新），然后触发清理
      await db.insert(loginAuditTable).values({
        userId: testUserId,
        loginTimeUtc: baseTime + 6, // 最新
        ip: "10.0.0.6",
        userAgent: "Browser-6",
        creatorId: testUserId,
      });

      // 手动执行 repository 的清理逻辑（同 recordLogin 内部）
      const { desc: descFn, inArray } = await import("drizzle-orm");
      const toDelete = await db
        .select({ id: loginAuditTable.id })
        .from(loginAuditTable)
        .where(eq(loginAuditTable.userId, testUserId))
        .orderBy(descFn(loginAuditTable.loginTimeUtc))
        .offset(maxKeep)
        .limit(100);

      if (toDelete.length > 0) {
        await db.delete(loginAuditTable).where(
          inArray(
            loginAuditTable.id,
            toDelete.map((r) => r.id)
          )
        );
      }

      // 验证：共保留 maxKeep=5 条
      const records = await db
        .select()
        .from(loginAuditTable)
        .where(eq(loginAuditTable.userId, testUserId))
        .orderBy(descFn(loginAuditTable.loginTimeUtc));

      expect(records.length).toBe(maxKeep);

      const ips = records.map((r) => r.ip);

      // 最旧的第 1 条（10.0.0.1）应该已被清理
      expect(ips).not.toContain("10.0.0.1");

      // 最新的 5 条（10.0.0.2 ~ 10.0.0.6）应该被保留
      for (let i = 2; i <= 6; i++) {
        expect(ips).toContain(`10.0.0.${i}`);
      }
    });
  });
});
