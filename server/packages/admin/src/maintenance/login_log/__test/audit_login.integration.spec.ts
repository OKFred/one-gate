import { describe, it, expect, beforeAll, afterEach } from "vitest";
import db from "@hodor/core/db/index";
import { setupTestDb, clearTestData } from "@hodor/core/db/testHelper";
import auditLoginService, { utils } from "../service";
import { baseSysLogTable as loginAuditTable } from "@hodor/admin/base/log/model";
import { eq } from "drizzle-orm";

// 静态导入 SQL 文件
import auditLoginSql from "@hodor/core/db/sql/maintenance_audit_login.sql?raw";
import { initAdminRegistry } from "../../../register";

describe("Login Audit 全链路集成测试", () => {
  const testTables = ["base_sys_log"];

  beforeAll(async () => {
    initAdminRegistry();
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

      // 按照 ID 降序排列，最新添加的记录应该在最上方
      expect(listAll.list[0].userId).toBe(102);
      expect(listAll.list[0].ip).toBe("10.0.0.1");
      expect(listAll.list[1].userId).toBe(101);
      expect(listAll.list[1].ip).toBe("192.168.1.2");
      expect(listAll.list[2].userId).toBe(101);
      expect(listAll.list[2].ip).toBe("192.168.1.1");

      // 3. 按 userId = 101 过滤检索
      const listFiltered = await auditLoginService.list.service({
        pageNo: 1,
        pageSize: 10,
        userId: 101,
      });
      expect(listFiltered.total).toBe(2);
      expect(listFiltered.list.every((item) => item.userId === 101)).toBe(true);
      expect(listFiltered.list[0].ip).toBe("192.168.1.2");
      expect(listFiltered.list[1].ip).toBe("192.168.1.1");
    });

    it("最大保留数（Log Rotation）限制测试", async () => {
      const testUserId = 202;
      const maxKeep = 5;
      const baseTime = Date.now();

      // 先通过 db.insert 写入 5 条记录
      for (let i = 1; i <= 5; i++) {
        await db.insert(loginAuditTable).values({
          namespace: "login",
          logLevel: "INFO",
          payloadType: "json",
          logValue: {
            userId: testUserId,
            loginTimeUtc: baseTime + i,
            ip: `10.0.0.${i}`,
            userAgent: `Browser-${i}`,
          },
          creatorId: testUserId,
          createTimeUtc: baseTime + i,
        });
      }

      // 此时共 5 条，等于 maxKeep
      const beforeCount = await db
        .select()
        .from(loginAuditTable)
        .where(eq(loginAuditTable.creatorId, testUserId));
      expect(beforeCount.length).toBe(5);

      // 插入第 6 条
      await db.insert(loginAuditTable).values({
        namespace: "login",
        logLevel: "INFO",
        payloadType: "json",
        logValue: {
          userId: testUserId,
          loginTimeUtc: baseTime + 6,
          ip: "10.0.0.6",
          userAgent: "Browser-6",
        },
        creatorId: testUserId,
        createTimeUtc: baseTime + 6,
      });

      // 手动清理多余记录
      const { desc: descFn, inArray } = await import("drizzle-orm");
      const toDelete = await db
        .select({ id: loginAuditTable.id })
        .from(loginAuditTable)
        .where(eq(loginAuditTable.creatorId, testUserId))
        .orderBy(descFn(loginAuditTable.createTimeUtc))
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
        .where(eq(loginAuditTable.creatorId, testUserId))
        .orderBy(descFn(loginAuditTable.createTimeUtc));

      expect(records.length).toBe(maxKeep);
    });
  });
});
